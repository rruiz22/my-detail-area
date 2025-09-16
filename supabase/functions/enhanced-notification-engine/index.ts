import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

interface NotificationData {
  title?: string;
  content?: string;
  message?: string;
  subject?: string;
  html?: string;
  body?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

interface UserNotificationPreferences {
  user_id: string;
  dealer_id: number;
  channel_preferences: {
    sms?: { enabled: boolean };
    email?: { enabled: boolean };
    push?: { enabled: boolean };
    in_app?: { enabled: boolean };
  };
}

interface DealerNotificationConfig {
  dealer_id: number;
  channels: {
    sms?: boolean;
    email?: boolean;
    push?: boolean;
    in_app?: boolean;
  };
}

interface NotificationTemplate {
  id: string;
  channels: {
    [channel: string]: string | {
      title?: string;
      content?: string;
      subject?: string;
      html?: string;
      body?: string;
    };
  };
}

interface ProcessChannelResult {
  success: boolean;
  channel: string;
  error?: string;
  responseTime?: number;
}

interface ProcessNotificationResult {
  success: boolean;
  error?: string;
  channels?: ProcessChannelResult[];
}

interface UserProfile {
  id: string;
  phone?: string;
  email?: string;
}

interface AnalyticsEvent {
  dealer_id: number;
  user_id?: string;
  notification_id?: string;
  batch_id?: string;
  channel: string;
  event_type: string;
  notification_type: string;
  entity_type?: string;
  entity_id?: string;
  template_id?: string;
  response_time_ms?: number;
  metadata?: Record<string, unknown>;
}

interface NotificationQueueItem {
  id: string;
  batch_id?: string;
  user_id: string;
  dealer_id: number;
  notification_type: string;
  entity_type?: string;
  entity_id?: string;
  channels: string[];
  notification_data: NotificationData;
  template_id?: string;
  priority: string;
  scheduled_for: string;
  status: string;
  attempts: number;
  max_attempts: number;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { notificationId, batchId } = await req.json();
    console.log('Processing notification:', { notificationId, batchId });

    // Get notification(s) to process
    let query = supabase
      .from('notification_queue')
      .select('*')
      .eq('status', 'queued')
      .lte('scheduled_for', new Date().toISOString());

    if (notificationId) {
      query = query.eq('id', notificationId);
    } else if (batchId) {
      query = query.eq('batch_id', batchId);
    } else {
      // Process up to 50 pending notifications
      query = query.limit(50);
    }

    const { data: notifications, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch notifications: ${fetchError.message}`);
    }

    if (!notifications || notifications.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No notifications to process' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Processing ${notifications.length} notifications`);

    const results = await Promise.all(
      notifications.map(notification => processNotification(notification))
    );

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return new Response(JSON.stringify({
      success: true,
      processed: notifications.length,
      successful,
      failed,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Enhanced notification engine error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function processNotification(notification: NotificationQueueItem): Promise<ProcessNotificationResult> {
  try {
    console.log(`Processing notification ${notification.id} for user ${notification.user_id}`);

    // Mark as processing
    await supabase
      .from('notification_queue')
      .update({ 
        status: 'processing', 
        last_attempt_at: new Date().toISOString(),
        attempts: notification.attempts + 1
      })
      .eq('id', notification.id);

    // Get user preferences and dealer config
    const [userPrefs, dealerConfig, template] = await Promise.all([
      getUserPreferences(notification.user_id, notification.dealer_id),
      getDealerConfig(notification.dealer_id),
      notification.template_id ? getTemplate(notification.template_id) : null
    ]);

    // Process each channel
    const channelResults = await Promise.all(
      notification.channels.map(channel => 
        processChannel(channel, notification, userPrefs, dealerConfig, template)
      )
    );

    const allSuccessful = channelResults.every(r => r.success);
    const hasFailures = channelResults.some(r => !r.success);

    // Update notification status
    const finalStatus = allSuccessful ? 'completed' : 
                       hasFailures && notification.attempts >= notification.max_attempts ? 'failed' : 
                       'queued'; // Retry later

    await supabase
      .from('notification_queue')
      .update({ 
        status: finalStatus,
        processed_at: allSuccessful ? new Date().toISOString() : null,
        error_message: hasFailures ? channelResults.filter(r => !r.success).map(r => r.error).join('; ') : null
      })
      .eq('id', notification.id);

    // Track analytics for each channel
    await Promise.all(
      channelResults.map(result => 
        trackAnalytics({
          dealer_id: notification.dealer_id,
          user_id: notification.user_id,
          notification_id: notification.id,
          batch_id: notification.batch_id,
          channel: result.channel,
          event_type: result.success ? 'sent' : 'failed',
          notification_type: notification.notification_type,
          entity_type: notification.entity_type,
          entity_id: notification.entity_id,
          template_id: notification.template_id,
          response_time_ms: result.responseTime,
          metadata: { 
            success: result.success,
            error: result.error,
            priority: notification.priority
          }
        })
      )
    );

    return {
      success: allSuccessful,
      error: hasFailures ? channelResults.filter(r => !r.success).map(r => r.error).join('; ') : undefined,
      channels: channelResults
    };

  } catch (error: unknown) {
    console.error(`Error processing notification ${notification.id}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Mark as failed if max attempts reached
    const finalStatus = notification.attempts >= notification.max_attempts ? 'failed' : 'queued';

    await supabase
      .from('notification_queue')
      .update({
        status: finalStatus,
        error_message: errorMessage,
        last_attempt_at: new Date().toISOString()
      })
      .eq('id', notification.id);

    return { success: false, error: errorMessage };
  }
}

async function processChannel(
  channel: string,
  notification: NotificationQueueItem,
  userPrefs: UserNotificationPreferences | null,
  dealerConfig: DealerNotificationConfig | null,
  template: NotificationTemplate | null
): Promise<ProcessChannelResult> {
  const startTime = Date.now();

  try {
    // Check if channel is enabled
    if (!isChannelEnabled(channel, userPrefs, dealerConfig)) {
      return { 
        success: false, 
        channel, 
        error: 'Channel disabled in preferences or config',
        responseTime: Date.now() - startTime
      };
    }

    // Get content from template or use notification data
    const content = template ? 
      renderTemplate(template, channel, notification.notification_data) : 
      notification.notification_data;

    let result: boolean = false;

    switch (channel) {
      case 'sms':
        result = await sendSMS(notification, content, dealerConfig);
        break;
      case 'email':
        result = await sendEmail(notification, content, dealerConfig);
        break;
      case 'push':
        result = await sendPushNotification(notification, content, dealerConfig);
        break;
      case 'in_app':
        result = await sendInAppNotification(notification, content);
        break;
      default:
        throw new Error(`Unknown channel: ${channel}`);
    }

    return {
      success: result,
      channel,
      responseTime: Date.now() - startTime
    };

  } catch (error: unknown) {
    console.error(`Error processing channel ${channel}:`, error);
    return {
      success: false,
      channel,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime
    };
  }
}

async function sendSMS(notification: NotificationQueueItem, content: NotificationData, dealerConfig: DealerNotificationConfig | null): Promise<boolean> {
  try {
    // Get user's phone number
    const { data: profile } = await supabase
      .from('profiles')
      .select('phone')
      .eq('id', notification.user_id)
      .single();

    if (!profile?.phone) {
      console.log('No phone number for SMS notification');
      return false;
    }

    // Call existing SMS function
    const { error } = await supabase.functions.invoke('send-sms', {
      body: {
        to: profile.phone,
        message: content.content || content.message || JSON.stringify(content),
        dealerId: notification.dealer_id
      }
    });

    if (error) throw error;
    return true;
  } catch (error: unknown) {
    console.error('SMS send error:', error);
    return false;
  }
}

async function sendEmail(notification: NotificationQueueItem, content: NotificationData, dealerConfig: DealerNotificationConfig | null): Promise<boolean> {
  try {
    // Get user's email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', notification.user_id)
      .single();

    if (!profile?.email) {
      console.log('No email for email notification');
      return false;
    }

    // Call existing email function  
    const { error } = await supabase.functions.invoke('send-order-email', {
      body: {
        to: profile.email,
        subject: content.subject || 'Notification',
        html: content.html || content.content || JSON.stringify(content),
        dealerId: notification.dealer_id
      }
    });

    if (error) throw error;
    return true;
  } catch (error: unknown) {
    console.error('Email send error:', error);
    return false;
  }
}

async function sendPushNotification(notification: NotificationQueueItem, content: NotificationData, dealerConfig: DealerNotificationConfig | null): Promise<boolean> {
  try {
    // This would integrate with Firebase Cloud Messaging or similar
    // For now, we'll just log it and return success
    console.log('Push notification would be sent:', {
      userId: notification.user_id,
      title: content.title,
      body: content.body || content.content,
      data: content.data || notification.notification_data
    });
    return true;
  } catch (error: unknown) {
    console.error('Push notification error:', error);
    return false;
  }
}

async function sendInAppNotification(notification: NotificationQueueItem, content: NotificationData): Promise<boolean> {
  try {
    // Insert into existing notification_log table
    const { error } = await supabase
      .from('notification_log')
      .insert({
        user_id: notification.user_id,
        dealer_id: notification.dealer_id,
        title: content.title || 'Notification',
        message: content.content || content.message || JSON.stringify(content),
        type: notification.notification_type,
        entity_type: notification.entity_type,
        entity_id: notification.entity_id,
        priority: notification.priority,
        metadata: {
          source: 'enhanced_engine',
          original_data: notification.notification_data
        }
      });

    if (error) throw error;
    return true;
  } catch (error: unknown) {
    console.error('In-app notification error:', error);
    return false;
  }
}

async function getUserPreferences(userId: string, dealerId: number): Promise<UserNotificationPreferences | null> {
  try {
    const { data, error } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('dealer_id', dealerId)
      .single();

    if (error && error.code !== 'PGRST116') { // Not found is ok
      console.error('Get user preferences error:', error);
    }

    return data;
  } catch (error) {
    console.error('Get user preferences error:', error);
    return null;
  }
}

async function getDealerConfig(dealerId: number): Promise<DealerNotificationConfig | null> {
  try {
    const { data, error } = await supabase
      .from('dealer_notification_configs')
      .select('*')
      .eq('dealer_id', dealerId)
      .single();

    if (error && error.code !== 'PGRST116') { // Not found is ok
      console.error('Get dealer config error:', error);
    }

    return data;
  } catch (error) {
    console.error('Get dealer config error:', error);
    return null;
  }
}

async function getTemplate(templateId: string): Promise<NotificationTemplate | null> {
  try {
    const { data, error } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error) {
      console.error('Get template error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Get template error:', error);
    return null;
  }
}

function isChannelEnabled(channel: string, userPrefs: UserNotificationPreferences | null, dealerConfig: DealerNotificationConfig | null): boolean {
  // Check dealer config
  if (dealerConfig?.channels && !dealerConfig.channels[channel]) {
    return false;
  }

  // Check user preferences
  if (userPrefs?.channel_preferences && !userPrefs.channel_preferences[channel]?.enabled) {
    return false;
  }

  return true;
}

function renderTemplate(template: NotificationTemplate, channel: string, data: NotificationData): NotificationData {
  try {
    if (!template.channels || !template.channels[channel]) {
      return data;
    }

    const channelTemplate = template.channels[channel];
    
    // Simple template interpolation
    const interpolate = (text: string, data: NotificationData): string => {
      return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return (data[key] ? String(data[key]) : match);
      });
    };

    if (typeof channelTemplate === 'string') {
      return interpolate(channelTemplate, data);
    }

    if (typeof channelTemplate === 'object') {
      const result: NotificationData = {};
      for (const [key, value] of Object.entries(channelTemplate)) {
        if (typeof value === 'string') {
          result[key] = interpolate(value, data);
        } else {
          result[key] = value;
        }
      }
      return result;
    }

    return channelTemplate;
  } catch (error) {
    console.error('Template render error:', error);
    return data;
  }
}

async function trackAnalytics(event: AnalyticsEvent): Promise<void> {
  try {
    await supabase
      .from('notification_analytics')
      .insert(event);
  } catch (error) {
    console.error('Track analytics error:', error);
  }
}