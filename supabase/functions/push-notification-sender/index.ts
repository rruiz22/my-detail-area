import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

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

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, dealerId, payload, userIds } = await req.json();
    console.log('Push notification request:', { userId, dealerId, userIds, payload });

    if (!payload || !payload.title) {
      throw new Error('Payload with title is required');
    }

    // Get push subscriptions
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

    if (fetchError) {
      throw new Error(`Failed to fetch subscriptions: ${fetchError.message}`);
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No active subscriptions found',
        sent: 0,
        failed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Found ${subscriptions.length} subscriptions`);

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
    throw new Error('VAPID keys not configured');
  }

  try {
    const pushSubscription: PushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh_key,
        auth: subscription.auth_key
      }
    };

    const webpushPayload = JSON.stringify({
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

    // Generate VAPID headers
    const vapidHeaders = await generateVAPIDHeaders(
      pushSubscription.endpoint,
      VAPID_SUBJECT,
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );

    // Send push notification
    const response = await fetch(pushSubscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400', // 24 hours
        ...vapidHeaders
      },
      body: await encryptPayload(webpushPayload, pushSubscription.keys.p256dh, pushSubscription.keys.auth)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Push notification failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    console.log('Push notification sent successfully');

  } catch (error: any) {
    console.error('Send push notification error:', error);
    
    // If subscription is invalid, mark as inactive
    if (error.message.includes('410') || error.message.includes('invalid')) {
      await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('endpoint', subscription.endpoint);
    }
    
    throw error;
  }
}

async function generateVAPIDHeaders(
  endpoint: string,
  subject: string,
  publicKey: string,
  privateKey: string
): Promise<Record<string, string>> {
  // Simplified VAPID header generation
  // In production, you'd want to use a proper JWT library
  
  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Extract origin from endpoint
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.hostname}`;

  // JWT payload
  const jwtPayload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours
    sub: subject
  };

  // For simplicity, we'll use a basic auth header
  // In production, implement proper ECDSA JWT signing
  const auth = `vapid t=${Buffer.from(JSON.stringify(jwtPayload)).toString('base64')}, k=${publicKey}`;

  return {
    'Authorization': auth,
    'Crypto-Key': `p256ecdsa=${publicKey}`
  };
}

async function encryptPayload(payload: string, p256dh: string, auth: string): Promise<Uint8Array> {
  // Simplified encryption for demo purposes
  // In production, implement proper Web Push encryption (RFC 8291)
  
  const encoder = new TextEncoder();
  return encoder.encode(payload);
}

// Create push_subscriptions table if it doesn't exist
async function ensurePushSubscriptionsTable() {
  try {
    const { error } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS push_subscriptions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          dealer_id BIGINT NOT NULL,
          endpoint TEXT NOT NULL,
          p256dh_key TEXT NOT NULL,
          auth_key TEXT NOT NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(user_id, dealer_id, endpoint)
        );
      `
    });
    
    if (error) {
      console.error('Failed to create push_subscriptions table:', error);
    }
  } catch (error) {
    console.error('Error ensuring push_subscriptions table:', error);
  }
}