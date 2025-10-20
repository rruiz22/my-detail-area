import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { create, getNumericDate } from 'https://deno.land/x/djwt@v3.0.1/mod.ts';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface FCMNotification {
  title: string;
  body: string;
  image?: string;
}

interface FCMData {
  [key: string]: string;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Firebase Service Account Configuration (from Firebase Console > Project Settings > Service Accounts)
const FIREBASE_PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID') || 'my-detail-area';
const FIREBASE_CLIENT_EMAIL = Deno.env.get('FIREBASE_CLIENT_EMAIL');
const FIREBASE_PRIVATE_KEY = Deno.env.get('FIREBASE_PRIVATE_KEY');

// FCM v1 API endpoint
const FCM_ENDPOINT = `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`;
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const SCOPES = 'https://www.googleapis.com/auth/firebase.messaging';

/**
 * Enhanced logging to database
 */
async function logToDatabase(
  level: 'info' | 'warn' | 'error' | 'debug',
  message: string,
  data?: any,
  errorDetails?: any
) {
  try {
    await supabase.from('edge_function_logs').insert({
      function_name: 'push-notification-fcm',
      level,
      message,
      data: data ? JSON.parse(JSON.stringify(data)) : null,
      error_details: errorDetails ? JSON.parse(JSON.stringify(errorDetails)) : null,
    });
  } catch (err) {
    console.error('[FCM] Failed to write log to database:', err);
  }
}

/**
 * Generate OAuth2 Access Token using Service Account
 * Uses JWT signed with private key to exchange for access token
 */
async function getAccessToken(): Promise<string> {
  if (!FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    throw new Error('Firebase Service Account credentials not configured');
  }

  try {
    // Clean and normalize private key
    // Handle both formats: with real newlines or with \n literals
    let privateKey = FIREBASE_PRIVATE_KEY;

    // If key contains literal \n strings, replace with actual newlines
    if (privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }

    // Remove any extra whitespace or formatting issues
    privateKey = privateKey.trim();

    // Ensure proper PEM format
    if (!privateKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
      throw new Error('Invalid private key format: missing BEGIN marker');
    }
    if (!privateKey.endsWith('-----END PRIVATE KEY-----')) {
      throw new Error('Invalid private key format: missing END marker');
    }

    console.log('[FCM] Private key format validated');

    // Convert PEM to DER format for crypto.subtle
    const pemHeader = '-----BEGIN PRIVATE KEY-----';
    const pemFooter = '-----END PRIVATE KEY-----';
    const pemContents = privateKey
      .replace(pemHeader, '')
      .replace(pemFooter, '')
      .replace(/\s/g, '');

    // Decode base64 to binary
    const binaryString = atob(pemContents);
    const binaryDer = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      binaryDer[i] = binaryString.charCodeAt(i);
    }

    // Import private key for signing
    const key = await crypto.subtle.importKey(
      'pkcs8',
      binaryDer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Create JWT
    const now = Math.floor(Date.now() / 1000);
    const jwt = await create(
      { alg: 'RS256', typ: 'JWT' },
      {
        iss: FIREBASE_CLIENT_EMAIL,
        sub: FIREBASE_CLIENT_EMAIL,
        aud: GOOGLE_TOKEN_ENDPOINT,
        scope: SCOPES,
        iat: now,
        exp: now + 3600, // 1 hour
      },
      key
    );

    console.log('[FCM] JWT created, requesting access token');

    // Exchange JWT for access token
    const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get access token: ${response.status} - ${errorText}`);
    }

    const tokenData = await response.json();
    console.log('[FCM] Access token obtained');

    return tokenData.access_token;
  } catch (error: any) {
    console.error('[FCM] Error getting access token:', error);
    await logToDatabase('error', 'Failed to get OAuth2 access token', {}, {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Send FCM notification using HTTP v1 API with OAuth2
 * https://firebase.google.com/docs/cloud-messaging/send-message
 */
async function sendFCMNotification(
  fcmToken: string,
  notification: FCMNotification,
  data?: FCMData
): Promise<boolean> {
  try {
    // Get OAuth2 access token
    const accessToken = await getAccessToken();

    // FCM API requires all data values to be strings
    // Convert any non-string values to strings
    const stringifiedData: FCMData = {};
    if (data) {
      for (const [key, value] of Object.entries(data)) {
        stringifiedData[key] = typeof value === 'string' ? value : String(value);
      }
    }

    // Build FCM v1 message payload
    const message = {
      message: {
        token: fcmToken,
        notification: {
          title: notification.title,
          body: notification.body,
          ...(notification.image && { image: notification.image }),
        },
        data: stringifiedData,
        webpush: {
          fcm_options: {
            link: data?.url || '/',
          },
          notification: {
            icon: '/favicon-mda.svg',
            badge: '/favicon-mda.svg',
          },
        },
      },
    };

    console.log('[FCM v1] Sending notification to token:', fcmToken.substring(0, 20) + '...');

    await logToDatabase('debug', 'Sending FCM v1 notification', {
      token_preview: fcmToken.substring(0, 20) + '...',
      notification,
    });

    // Send to FCM v1 API
    const response = await fetch(FCM_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(message),
    });

    const responseText = await response.text();
    console.log('[FCM v1] Response status:', response.status);

    if (!response.ok) {
      console.error('[FCM v1] Response body:', responseText);

      await logToDatabase('error', 'FCM v1 API error', {
        status: response.status,
        response: responseText,
        token_preview: fcmToken.substring(0, 20) + '...',
      });

      // Parse error response
      try {
        const errorData = JSON.parse(responseText);
        const errorCode = errorData.error?.details?.[0]?.errorCode || errorData.error?.status;

        // Mark token as invalid for specific errors
        if (
          errorCode === 'UNREGISTERED' ||
          errorCode === 'INVALID_ARGUMENT' ||
          errorData.error?.message?.includes('not a valid FCM registration token')
        ) {
          console.log('[FCM v1] Marking token as invalid');
          await supabase
            .from('fcm_tokens')
            .update({ is_active: false })
            .eq('fcm_token', fcmToken);
        }
      } catch (parseError) {
        console.error('[FCM v1] Failed to parse error response:', parseError);
      }

      return false;
    }

    const result = JSON.parse(responseText);
    console.log('[FCM v1] Success, message name:', result.name);

    await logToDatabase('info', 'FCM v1 notification sent successfully', {
      message_name: result.name,
    });

    return true;
  } catch (error: any) {
    console.error('[FCM v1] Send error:', error);
    await logToDatabase('error', 'FCM v1 send exception', {}, {
      message: error.message,
      stack: error.stack,
    });
    return false;
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, dealerId, notification, data, userIds } = await req.json();

    console.log('[FCM v1] Request received:', {
      userId,
      dealerId,
      hasNotification: !!notification,
      userIds,
    });

    // Validate notification
    if (!notification || !notification.title) {
      throw new Error('Notification with title is required');
    }

    // Validate Service Account configuration
    if (!FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
      throw new Error('Firebase Service Account not configured. Set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY secrets.');
    }

    // Get FCM tokens from database
    let query = supabase
      .from('fcm_tokens')
      .select('*')
      .eq('is_active', true);

    if (dealerId) {
      query = query.eq('dealer_id', dealerId);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    } else if (userIds && Array.isArray(userIds)) {
      query = query.in('user_id', userIds);
    }

    const { data: tokens, error: fetchError } = await query;

    console.log('[FCM v1] Found tokens:', tokens?.length || 0);

    if (fetchError) {
      throw new Error(`Failed to fetch FCM tokens: ${fetchError.message}`);
    }

    if (!tokens || tokens.length === 0) {
      console.log('[FCM v1] No active tokens found');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No active FCM tokens found',
          sentCount: 0,
          failedCount: 0,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Send notifications to all tokens
    const results = await Promise.allSettled(
      tokens.map((tokenRecord) =>
        sendFCMNotification(tokenRecord.fcm_token, notification, data)
      )
    );

    const successCount = results.filter((r) => r.status === 'fulfilled' && r.value === true).length;
    const failedCount = results.length - successCount;

    console.log('[FCM v1] Results:', { successCount, failedCount, total: results.length });

    await logToDatabase('info', 'FCM v1 batch send completed', {
      total: results.length,
      success: successCount,
      failed: failedCount,
    });

    return new Response(
      JSON.stringify({
        success: true,
        sentCount: successCount,
        failedCount,
        totalTokens: tokens.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[FCM v1] Error:', error);
    await logToDatabase('error', 'FCM v1 handler error', {}, {
      message: error.message,
      stack: error.stack,
    });

    return new Response(
      JSON.stringify({
        error: error.message,
        success: false,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
