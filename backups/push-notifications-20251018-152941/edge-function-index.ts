import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "npm:web-push@3.6.7";

// CORS headers - embedded to avoid import issues during deployment
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  url?: string;
}

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY');
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:support@mydetailarea.com';

// Enhanced logging function that writes to database
async function logToDatabase(
  level: 'info' | 'warn' | 'error' | 'debug',
  message: string,
  data?: any,
  errorDetails?: any
) {
  try {
    await supabase.from('edge_function_logs').insert({
      function_name: 'push-notification-sender',
      level,
      message,
      data: data ? JSON.parse(JSON.stringify(data)) : null,
      error_details: errorDetails ? JSON.parse(JSON.stringify(errorDetails)) : null
    });
  } catch (err) {
    console.error('Failed to write log to database:', err);
  }
}

// Configure web-push with VAPID details
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, dealerId, payload, userIds } = await req.json();

    // 🔍 DEBUG Logging
    console.log('📥 Request received - userId:', userId, 'type:', typeof userId);
    console.log('📥 Request received - dealerId:', dealerId, 'type:', typeof dealerId);
    console.log('📥 Request received - userIds:', userIds);

    if (!payload || !payload.title) {
      throw new Error('Payload with title is required');
    }

    // Get push subscriptions
    console.log('🔍 Query filters: is_active=true, dealerId=', dealerId, ', userId=', userId);

    let query = supabase
      .from('push_subscriptions')
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

    const { data: subscriptions, error: fetchError } = await query;

    console.log('📊 Query results: found', subscriptions?.length || 0, 'subscriptions');
    if (subscriptions && subscriptions.length > 0) {
      subscriptions.forEach((sub, i) => {
        console.log(`  [${i}] user: ${sub.user_id}, dealer: ${sub.dealer_id}`);
      });
    }

    if (fetchError) {
      throw new Error(`Failed to fetch subscriptions: ${fetchError.message}`);
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('⚠️ No subscriptions found - returning sent:0');
      return new Response(JSON.stringify({
        success: true,
        message: 'No active subscriptions found',
        sent: 0,
        failed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`✅ Found ${subscriptions.length} subscriptions - proceeding to send`);

    // Send push notifications
    const results = await Promise.allSettled(
      subscriptions.map(subscription => sendPushNotification(subscription, payload))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    // Log failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Push notification failed for subscription ${index}:`, result.reason);
      }
    });

    return new Response(JSON.stringify({
      success: true,
      sent: successful,
      failed: failed,
      total: subscriptions.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Push notification error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function sendPushNotification(subscription: any, payload: PushPayload): Promise<void> {
  if (!VAPID_PRIVATE_KEY || !VAPID_PUBLIC_KEY) {
    const error = 'VAPID keys not configured';
    await logToDatabase('error', error, { subscription_id: subscription.id });
    throw new Error(error);
  }

  try {
    // Construct the push subscription object in the format web-push expects
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh_key,
        auth: subscription.auth_key
      }
    };

    // Create the notification payload
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/favicon-mda.svg',
      badge: payload.badge || '/favicon-mda.svg',
      tag: payload.tag || 'default',
      data: {
        ...payload.data,
        url: payload.url,
        timestamp: Date.now()
      },
      actions: payload.actions || [
        { action: 'view', title: 'View' },
        { action: 'dismiss', title: 'Dismiss' }
      ],
      requireInteraction: payload.requireInteraction || false,
      silent: false,
      vibrate: [200, 100, 200]
    });

    console.log('🔔 Sending push notification to:', pushSubscription.endpoint.substring(0, 50) + '...');
    console.log('📦 Payload:', notificationPayload.substring(0, 100) + '...');

    await logToDatabase('debug', 'Attempting to send push notification', {
      endpoint_preview: pushSubscription.endpoint.substring(0, 100),
      payload_preview: notificationPayload.substring(0, 200),
      has_vapid_keys: !!VAPID_PRIVATE_KEY && !!VAPID_PUBLIC_KEY,
      subscription_id: subscription.id
    });

    // Send using web-push library (handles VAPID JWT signing and encryption automatically)
    const response = await webpush.sendNotification(
      pushSubscription,
      notificationPayload,
      {
        TTL: 86400, // 24 hours
        urgency: 'high',
        topic: payload.tag || 'default'
      }
    );

    console.log('✅ Push notification sent successfully:', {
      statusCode: response.statusCode,
      headers: response.headers
    });

    await logToDatabase('info', 'Push notification sent successfully', {
      subscription_id: subscription.id,
      status_code: response.statusCode,
      endpoint_preview: pushSubscription.endpoint.substring(0, 100)
    });

  } catch (error: any) {
    const errorDetails = {
      message: error.message,
      statusCode: error.statusCode,
      body: error.body,
      endpoint: subscription.endpoint,
      stack: error.stack,
      name: error.name,
      // Capture ALL properties from the error object
      ...error
    };

    console.error('❌ Send push notification error:', errorDetails);

    await logToDatabase('error', 'Push notification send failed', {
      subscription_id: subscription.id,
      endpoint: subscription.endpoint,
      user_id: subscription.user_id,
      dealer_id: subscription.dealer_id
    }, errorDetails);

    // If subscription is invalid (410 Gone or 404 Not Found), mark as inactive
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.log('🗑️ Marking subscription as inactive:', subscription.endpoint);
      await logToDatabase('warn', 'Marking subscription as inactive', {
        subscription_id: subscription.id,
        status_code: error.statusCode
      });

      await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('endpoint', subscription.endpoint);
    }

    throw error;
  }
}
