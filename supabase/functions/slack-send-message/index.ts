// =====================================================
// SLACK MULTI-CHANNEL NOTIFICATION SENDER
// Updated: 2025-12-02
// Description: Send order notifications to specific Slack channels based on module routing
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Format ISO datetime to human-readable format in New York timezone
 * Example: "2025-11-17T13:00:00+00:00" → "Nov 17, 1pm ET"
 */
function formatDueDate(isoString: string): string {
  try {
    const date = new Date(isoString);

    // Convert to New York timezone (America/New_York)
    const nyFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      hour12: true
    });

    const parts = nyFormatter.formatToParts(date);
    const month = parts.find(p => p.type === 'month')?.value || '';
    const day = parts.find(p => p.type === 'day')?.value || '';
    const hour = parts.find(p => p.type === 'hour')?.value || '';
    const dayPeriod = parts.find(p => p.type === 'dayPeriod')?.value.toLowerCase() || '';

    return `${month} ${day}, ${hour}${dayPeriod} ET`;
  } catch (error) {
    console.warn('Failed to format date:', error);
    return isoString; // Fallback to original if parsing fails
  }
}

interface SlackNotificationRequest {
  dealerId: number;
  module: 'sales_orders' | 'service_orders' | 'recon_orders' | 'car_wash' | 'get_ready' | 'stock' | 'contacts';
  eventType: 'order_created' | 'order_status_changed' | 'order_completed' | 'order_deleted' | 'order_assigned' | 'comment_added' | 'file_uploaded' | 'user_mentioned' | 'follower_added' | 'vehicle_added' | 'vehicle_step_changed' | 'vehicle_completed' | 'vehicle_blocked';
  eventData: {
    orderNumber?: string;
    stockNumber?: string;
    tag?: string;
    vinNumber?: string;
    vehicleInfo?: string;
    services?: string;
    dueDateTime?: string;
    shortLink: string;
    status?: string;
    oldStatus?: string;
    assignedTo?: string;
    changedBy?: string;
    commenterName?: string;
    commentPreview?: string;
    // New fields for enhanced notifications
    fileName?: string;
    createdBy?: string;
    completedBy?: string;
    deletedBy?: string;
    assignedBy?: string;
    uploadedBy?: string;
    mentionedUser?: string;
    followerName?: string;
    addedBy?: string;
    blockReason?: string;
    blockedBy?: string;
    stepName?: string;
    oldStepName?: string;
  };
}

interface SlackPostMessageResponse {
  ok: boolean;
  channel?: string;
  ts?: string;
  error?: string;
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
    const { dealerId, module, eventType, eventData } = payload;

    console.log('📨 Slack notification request:', { dealerId, module, eventType });

    // Validate required parameters
    if (!dealerId || !module || !eventType) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: dealerId, module, eventType' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Get webhook_id from event preferences (supports shared OAuth model)
    const { data: eventPref, error: eventPrefError } = await supabase
      .from('dealer_slack_event_preferences')
      .select('webhook_id, enabled')
      .eq('dealer_id', dealerId)
      .eq('module', module)
      .eq('event_type', eventType)
      .single();

    if (eventPrefError || !eventPref || !eventPref.webhook_id) {
      console.warn('⚠️ No event preference found for dealer:', dealerId, 'module:', module, 'event:', eventType);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'No Slack configuration found for this event'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if event is enabled
    if (!eventPref.enabled) {
      console.log(`🔕 Event ${eventType} is disabled for module ${module}`);
      return new Response(
        JSON.stringify({
          success: true,
          message: `Event ${eventType} is disabled for this module`,
          skipped: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Get active Slack integration (shared OAuth model - may belong to different dealer)
    const { data: integration, error: integrationError } = await supabase
      .from('dealer_integrations')
      .select('id, oauth_access_token, enabled, status')
      .eq('id', eventPref.webhook_id)
      .eq('integration_type', 'slack')
      .eq('status', 'active')
      .eq('enabled', true)
      .single();

    if (integrationError || !integration) {
      console.warn('⚠️ Slack integration not active:', eventPref.webhook_id);
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Slack integration is not active'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!integration.oauth_access_token) {
      console.error('❌ Missing Slack access token for integration:', integration.id);
      return new Response(
        JSON.stringify({ error: 'Slack integration missing access token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Get channel mapping for this dealer + module
    const { data: channelMapping, error: mappingError } = await supabase
      .from('dealer_slack_channel_mappings')
      .select('channel_id, channel_name, enabled')
      .eq('dealer_id', dealerId)
      .eq('integration_id', integration.id)
      .eq('module', module)
      .eq('enabled', true)
      .single();

    if (mappingError || !channelMapping) {
      console.warn(`⚠️ No channel mapping found for dealer ${dealerId}, module ${module}`);
      return new Response(
        JSON.stringify({
          success: false,
          message: `No Slack channel configured for module: ${module}`
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📢 Sending to channel: ${channelMapping.channel_name} (${channelMapping.channel_id})`);

    // Event is already verified as enabled in step 1 (eventPref exists)
    // No need to check again - proceed with sending message

    // 4. Format message text
    let messageText = '';
    const orderIdentifier = eventData.orderNumber || eventData.stockNumber || eventData.tag || 'N/A';
    const moduleDisplay = module.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const formattedDueDate = eventData.dueDateTime ? formatDueDate(eventData.dueDateTime) : null;

    // =======================
    // ORDER EVENTS (Grupo 1)
    // =======================

    if (eventType === 'order_created') {
      const emoji = module === 'sales_orders' ? '🚗' : module === 'service_orders' ? '🔧' : module === 'car_wash' ? '💦' : '✨';

      const details = [
        eventData.vehicleInfo,
        formattedDueDate ? `Due: ${formattedDueDate}` : null,
        eventData.assignedTo ? `Assigned to: ${eventData.assignedTo}` : null,
        eventData.createdBy ? `Created by: ${eventData.createdBy}` : null
      ].filter(Boolean).join(' • ');

      messageText = `${emoji} New ${moduleDisplay} Order ${orderIdentifier} created${details ? `\n${details}` : ''}`;

    } else if (eventType === 'order_status_changed') {
      const oldStatusFormatted = eventData.oldStatus?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';
      const newStatusFormatted = eventData.status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';

      const details = [
        eventData.vehicleInfo,
        eventData.vinNumber ? `VIN: ${eventData.vinNumber}` : null,
        formattedDueDate ? `Due: ${formattedDueDate}` : null,
        eventData.assignedTo ? `Assigned to: ${eventData.assignedTo}` : null,
        eventData.changedBy ? `Changed by: ${eventData.changedBy}` : null
      ].filter(Boolean).join(' • ');

      messageText = `📊 Order ${orderIdentifier} status changed: "${oldStatusFormatted}" → "${newStatusFormatted}"${details ? `\n${details}` : ''}`;

    } else if (eventType === 'order_completed') {
      const details = [
        eventData.vehicleInfo,
        eventData.completedBy ? `Completed by: ${eventData.completedBy}` : null
      ].filter(Boolean).join(' • ');

      messageText = `✅ Order ${orderIdentifier} completed${details ? `\n${details}` : ''}`;

    } else if (eventType === 'order_assigned') {
      const details = [
        eventData.vehicleInfo,
        eventData.assignedBy ? `Assigned by: ${eventData.assignedBy}` : null
      ].filter(Boolean).join(' • ');

      messageText = `👤 Order ${orderIdentifier} assigned to ${eventData.assignedTo || 'team member'}${details ? `\n${details}` : ''}`;

    } else if (eventType === 'order_deleted') {
      const details = [
        eventData.vehicleInfo,
        eventData.deletedBy ? `Deleted by: ${eventData.deletedBy}` : null
      ].filter(Boolean).join(' • ');

      messageText = `🗑️ Order ${orderIdentifier} deleted${details ? `\n${details}` : ''}`;

    } else if (eventType === 'comment_added') {
      const commenterName = eventData.commenterName || 'Someone';
      const preview = eventData.commentPreview ? `\n"${eventData.commentPreview}"` : '';
      const details = eventData.vehicleInfo ? `\n${eventData.vehicleInfo}` : '';

      messageText = `💬 ${commenterName} commented on Order ${orderIdentifier}${preview}${details}`;

    } else if (eventType === 'file_uploaded') {
      const details = [
        eventData.uploadedBy ? `Uploaded by: ${eventData.uploadedBy}` : null,
        eventData.fileName ? `File: ${eventData.fileName}` : null,
        eventData.vehicleInfo
      ].filter(Boolean).join(' • ');

      messageText = `📎 File uploaded to Order ${orderIdentifier}${details ? `\n${details}` : ''}`;

    } else if (eventType === 'user_mentioned') {
      const mentionedUser = eventData.mentionedUser || 'You';
      const preview = eventData.commentPreview ? `\n"${eventData.commentPreview}"` : '';
      const details = eventData.vehicleInfo ? `\n${eventData.vehicleInfo}` : '';

      messageText = `@${mentionedUser} mentioned you in Order ${orderIdentifier}${preview}${details}`;

    // =======================
    // FOLLOWER EVENTS (Grupo 2)
    // =======================

    } else if (eventType === 'follower_added') {
      const followerName = eventData.followerName || 'Someone';
      const details = [
        eventData.vehicleInfo,
        eventData.addedBy ? `Added by: ${eventData.addedBy}` : null
      ].filter(Boolean).join(' • ');

      messageText = `👁️ ${followerName} added as follower to Order ${orderIdentifier}${details ? `\n${details}` : ''}`;

    // =======================
    // GET READY EVENTS (Grupo 3)
    // =======================

    } else if (eventType === 'vehicle_added') {
      const details = [
        eventData.vehicleInfo,
        eventData.vinNumber ? `VIN: ${eventData.vinNumber}` : null,
        eventData.addedBy ? `Added by: ${eventData.addedBy}` : null
      ].filter(Boolean).join(' • ');

      messageText = `✨ New vehicle added to Get Ready${details ? `\n${details}` : ''}`;

    } else if (eventType === 'vehicle_step_changed') {
      const oldStep = eventData.oldStepName || 'Unknown';
      const newStep = eventData.stepName || 'Unknown';

      const details = [
        eventData.vehicleInfo,
        eventData.vinNumber ? `VIN: ${eventData.vinNumber}` : null,
        eventData.changedBy ? `Changed by: ${eventData.changedBy}` : null
      ].filter(Boolean).join(' • ');

      messageText = `📋 Vehicle step changed: "${oldStep}" → "${newStep}"${details ? `\n${details}` : ''}`;

    } else if (eventType === 'vehicle_completed') {
      const details = [
        eventData.vehicleInfo,
        eventData.vinNumber ? `VIN: ${eventData.vinNumber}` : null,
        eventData.completedBy ? `Completed by: ${eventData.completedBy}` : null
      ].filter(Boolean).join(' • ');

      messageText = `🎉 Vehicle ready for delivery${details ? `\n${details}` : ''}`;

    } else if (eventType === 'vehicle_blocked') {
      const details = [
        eventData.vehicleInfo,
        eventData.vinNumber ? `VIN: ${eventData.vinNumber}` : null,
        eventData.blockReason ? `Reason: ${eventData.blockReason}` : null,
        eventData.blockedBy ? `Blocked by: ${eventData.blockedBy}` : null
      ].filter(Boolean).join(' • ');

      messageText = `🚫 Vehicle blocked${details ? `\n${details}` : ''}`;

    } else {
      // Generic fallback
      messageText = `📢 ${eventType.replace(/_/g, ' ')} - Order ${orderIdentifier}`;
    }

    // 5. Create Slack message payload with blocks for rich formatting
    const slackPayload = {
      channel: channelMapping.channel_id,
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
                text: 'View Order',
                emoji: false
              },
              url: eventData.shortLink,
              style: 'primary'
            }
          ]
        }
      ]
    };

    // Add context block for additional info (with timestamp for status changes)
    if (eventData.vehicleInfo || module) {
      // Get current time in Eastern Time for status changes
      const now = new Date();
      const timeFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      const currentTime = timeFormatter.format(now);

      // Add timestamp only for status change events
      const timestampText = eventType === 'order_status_changed' ? ` | ${currentTime} ET` : '';

      slackPayload.blocks.splice(1, 0, {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `*Module:* ${moduleDisplay}${eventData.vehicleInfo ? ` | *Vehicle:* ${eventData.vehicleInfo}` : ''}${timestampText}`
          }
        ]
      });
    }

    console.log('📤 Sending to Slack API (chat.postMessage)...');

    // 6. Send to Slack using chat.postMessage API
    const slackResponse = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${integration.oauth_access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(slackPayload)
    });

    const slackData: SlackPostMessageResponse = await slackResponse.json();

    if (!slackData.ok) {
      console.error('❌ Slack API error:', slackData.error);
      throw new Error(`Slack API error: ${slackData.error}`);
    }

    console.log('✅ Slack notification sent successfully to', channelMapping.channel_name);

    // 7. Log notification delivery (optional, for audit)
    try {
      await supabase.from('notification_delivery_logs').insert({
        dealer_id: dealerId,
        notification_type: 'slack',
        event_type: eventType,
        recipient: channelMapping.channel_name,
        status: 'delivered',
        message_preview: messageText.substring(0, 100),
        metadata: {
          module,
          orderIdentifier,
          channelId: channelMapping.channel_id,
          channelName: channelMapping.channel_name,
          slackTs: slackData.ts
        }
      });
    } catch (logError) {
      console.warn('⚠️ Failed to log notification delivery:', logError);
      // Don't fail the request if logging fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Slack notification sent successfully',
        channel: channelMapping.channel_name,
        messagePreview: messageText
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('❌ Error in slack-send-message:', error);

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
