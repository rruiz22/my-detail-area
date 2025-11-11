// =====================================================
// SLACK WEBHOOK NOTIFICATION SENDER
// Created: 2025-11-10
// Description: Send order notifications to Slack via webhook
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Format ISO datetime to human-readable format
 * Example: "2025-11-17T13:00:00+00:00" → "Nov 17, 1pm"
 */
function formatDueDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const hours = date.getHours();
    const ampm = hours >= 12 ? 'pm' : 'am';
    const displayHour = hours % 12 || 12;
    return `${month} ${day}, ${displayHour}${ampm}`;
  } catch (error) {
    console.warn('Failed to format date:', error);
    return isoString; // Fallback to original if parsing fails
  }
}

interface SlackNotificationRequest {
  dealerId: number;
  orderType: 'sales' | 'service' | 'recon' | 'carwash';
  eventType: 'order_created' | 'status_changed' | 'comment_added';
  eventData: {
    orderNumber?: string;
    stockNumber?: string;
    tag?: string;
    vehicleInfo?: string;
    services?: string;
    dueDateTime?: string;
    shortLink: string;
    status?: string;
    oldStatus?: string;
    assignedTo?: string;
    commenterName?: string;
    commentPreview?: string;
  };
}

interface SlackWebhookConfig {
  url: string;
  enabled: boolean;
  channel?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const payload: SlackNotificationRequest = await req.json();
    const { dealerId, orderType, eventType, eventData } = payload;

    console.log('=� Slack notification request:', { dealerId, orderType, eventType });

    // 1. Get Slack webhook configuration from system_settings (global config, no dealer_id)
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'slack_webhook_url')
      .single();

    if (settingsError) {
      console.error('❌ Error fetching Slack settings:', settingsError);
      return new Response(
        JSON.stringify({ error: 'Slack webhook not configured', details: settingsError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const config: SlackWebhookConfig = settings?.setting_value;

    if (!config?.url) {
      console.warn('� Slack webhook URL not found');
      return new Response(
        JSON.stringify({ error: 'Slack webhook URL not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!config.enabled) {
      console.log('� Slack notifications disabled for this dealership');
      return new Response(
        JSON.stringify({ success: true, message: 'Slack notifications are disabled' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Format message (same format as SMS notifications)
    let messageText = '';
    const orderIdentifier = eventData.orderNumber || eventData.stockNumber || eventData.tag || 'N/A';

    if (eventType === 'order_created') {
      // Format due date if available
      const formattedDate = eventData.dueDateTime ? formatDueDate(eventData.dueDateTime) : null;

      // Build details string with formatted date and assigned user
      const details = [
        eventData.vehicleInfo,
        eventData.services,
        formattedDate,
        eventData.assignedTo ? `Assigned: ${eventData.assignedTo}` : null
      ].filter(Boolean).join(' - ');

      const emoji = orderType === 'sales' ? '🚗' : orderType === 'service' ? '🔧' : '✨';
      messageText = `${emoji} New ${orderType.charAt(0).toUpperCase() + orderType.slice(1)} Order ${orderIdentifier}${details ? ` - ${details}` : ''} View: ${eventData.shortLink}`;
    } else if (eventType === 'status_changed') {
      const oldStatusFormatted = eventData.oldStatus?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';
      const newStatusFormatted = eventData.status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';
      messageText = `📊 Order ${orderIdentifier} status: "${oldStatusFormatted}" → "${newStatusFormatted}". View: ${eventData.shortLink}`;
    } else if (eventType === 'comment_added') {
      const commenterName = eventData.commenterName || 'Someone';
      const preview = eventData.commentPreview ? `: "${eventData.commentPreview}"` : '';
      messageText = `💬 ${commenterName} commented on Order ${orderIdentifier}${preview}. View: ${eventData.shortLink}`;
    }

    // 3. Create Slack message payload with blocks for rich formatting
    const slackPayload = {
      text: messageText, // Fallback text for notifications
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: messageText
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '=A View Order',
                emoji: true
              },
              url: eventData.shortLink,
              style: 'primary'
            }
          ]
        }
      ]
    };

    // Add context block for additional info
    if (eventData.vehicleInfo || orderType) {
      slackPayload.blocks.splice(1, 0, {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `*Order Type:* ${orderType.charAt(0).toUpperCase() + orderType.slice(1)}${eventData.vehicleInfo ? ` | *Vehicle:* ${eventData.vehicleInfo}` : ''}`
          }
        ]
      });
    }

    console.log('=� Sending to Slack webhook:', config.url.substring(0, 50) + '...');

    // 4. Send to Slack webhook
    const slackResponse = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(slackPayload)
    });

    if (!slackResponse.ok) {
      const errorText = await slackResponse.text();
      console.error('L Slack API error:', slackResponse.status, errorText);
      throw new Error(`Slack API error: ${slackResponse.status} - ${errorText}`);
    }

    console.log(' Slack notification sent successfully');

    // 5. Log notification delivery (optional, for audit)
    try {
      await supabase.from('notification_delivery_logs').insert({
        dealer_id: dealerId,
        notification_type: 'slack',
        event_type: eventType,
        recipient: config.channel || 'default',
        status: 'delivered',
        message_preview: messageText.substring(0, 100),
        metadata: {
          orderType,
          orderIdentifier,
          webhookUrl: config.url.substring(0, 50) + '...' // Log partial URL for security
        }
      });
    } catch (logError) {
      console.warn('� Failed to log notification delivery:', logError);
      // Don't fail the request if logging fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Slack notification sent successfully',
        messagePreview: messageText
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('L Error in slack-send-message:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
