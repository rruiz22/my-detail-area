import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// =====================================================
// Types - V6 Followers + Permissions Integration
// =====================================================
// ARCHITECTURE: Only ORDER FOLLOWERS with SMS permissions receive notifications
// This combines: Followers + Custom Role Permissions + User Preferences + Rate Limiting

type OrderSMSEvent =
  | 'order_created'
  | 'order_assigned'
  | 'status_changed'
  | 'field_updated'
  | 'comment_added'
  | 'attachment_added'
  | 'follower_added'
  | 'due_date_approaching'
  | 'overdue'
  | 'priority_changed';

interface SMSNotificationRequest {
  orderId: string;
  dealerId: number;
  module: 'sales_orders' | 'service_orders' | 'recon_orders' | 'car_wash';
  eventType: OrderSMSEvent;
  eventData: {
    orderNumber: string;
    customerName?: string;
    vehicleInfo?: string;
    shortLink?: string;
    newStatus?: string;
    oldStatus?: string;
    fieldName?: string;
    oldValue?: string;
    newValue?: string;
    assignedToUserId?: string;
    assignedToName?: string;
    commentText?: string;
    commenterName?: string;
    minutesUntilDue?: number;
    dueDateTime?: string;
    newPriority?: string;
    oldPriority?: string;
  };
  triggeredBy?: string;
}

interface SMSRecipient {
  id: string;
  name: string;
  phone_number: string;
  role_name?: string;
  notification_level?: 'all' | 'important' | 'none';
}

interface SMSPreferences {
  user_id: string;
  event_preferences: any;
  max_sms_per_hour: number;
  max_sms_per_day: number;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

// =====================================================
// Main Handler
// =====================================================

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate Twilio credentials
    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      throw new Error('Twilio credentials not configured');
    }

    const request: SMSNotificationRequest = await req.json();
    console.log('📱 SMS Notification Request:', request);

    // 1. Get followers of this order who have SMS permission
    const usersWithPermission = await getUsersWithSMSPermission(
      request.dealerId,
      request.module,
      request.orderId
    );
    console.log(`✅ Found ${usersWithPermission.length} followers with SMS permission for order ${request.orderId}`);

    if (usersWithPermission.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          sent: 0,
          failed: 0,
          recipients: 0,
          message: 'No users with SMS permission found'
        }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // 2. Filter users by their granular preferences
    const eligibleUsers = await filterByPreferences(
      usersWithPermission,
      request.dealerId,
      request.module,
      request.eventType,
      request.eventData
    );
    console.log(`📋 After preference filtering: ${eligibleUsers.length} users`);

    if (eligibleUsers.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          sent: 0,
          failed: 0,
          recipients: usersWithPermission.length,
          message: 'No users match event preferences'
        }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // 3. Check rate limits for each user
    const usersAfterRateLimit = await checkRateLimits(eligibleUsers, request.dealerId);
    console.log(`⏱️ After rate limit check: ${usersAfterRateLimit.length} users`);

    if (usersAfterRateLimit.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          sent: 0,
          failed: 0,
          recipients: eligibleUsers.length,
          message: 'All users hit rate limits'
        }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // 4. Remove the user who triggered the event (no self-notification)
    const finalUsers = usersAfterRateLimit.filter(u => u.id !== request.triggeredBy);
    console.log(`👤 After removing trigger user: ${finalUsers.length} users`);

    if (finalUsers.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          sent: 0,
          failed: 0,
          recipients: usersAfterRateLimit.length,
          message: 'Only trigger user would receive notification'
        }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // 5. Generate personalized messages
    const messages = generateMessages(finalUsers, request.eventType, request.eventData);
    console.log(`💬 Generated ${messages.length} messages`);

    // 6. Send SMS via Twilio in parallel
    const results = await Promise.allSettled(
      messages.map(({ user, message }) =>
        sendSMS(user.phone_number, message, request.orderId)
      )
    );

    // 7. Record in sms_send_history
    await recordSMSHistory(
      results,
      finalUsers,
      messages,
      request.dealerId,
      request.module,
      request.eventType,
      request.orderId
    );

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failedCount = results.filter(r => r.status === 'rejected').length;

    // Include recipient names for better UX in frontend toasts
    const recipientNames = finalUsers.map(u => u.name);

    console.log(`✅ SMS Sent: ${successCount} successful, ${failedCount} failed to: ${recipientNames.join(', ')}`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failedCount,
        recipients: finalUsers.length,
        recipientNames: recipientNames
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );

  } catch (error: any) {
    console.error('❌ SMS Notification Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
};

// =====================================================
// Helper Functions
// =====================================================

async function getUsersWithSMSPermission(
  dealerId: number,
  module: string,
  orderId: string
): Promise<SMSRecipient[]> {
  // Query followers of this specific order who have SMS permissions
  // This combines 3 filters:
  // 1. User is a follower of this order (entity_followers)
  // 2. User has receive_sms_notifications permission in their role
  // 3. User has phone number configured

  const { data, error } = await supabase
    .from('entity_followers')
    .select(`
      user_id,
      notification_level,
      dealer_id,
      profiles!inner(
        id,
        first_name,
        last_name,
        phone_number
      ),
      dealer_memberships!inner(
        is_active,
        custom_role_id,
        dealer_custom_roles!inner(
          id,
          role_name,
          role_module_permissions_new!inner(
            module_permissions!inner(
              module,
              permission_key
            )
          )
        )
      )
    `)
    .eq('entity_type', 'order')
    .eq('entity_id', orderId)
    .eq('is_active', true)
    .neq('notification_level', 'none')
    .eq('dealer_id', dealerId)
    .eq('dealer_memberships.is_active', true)
    .eq('dealer_memberships.dealer_custom_roles.role_module_permissions_new.module_permissions.module', module)
    .eq('dealer_memberships.dealer_custom_roles.role_module_permissions_new.module_permissions.permission_key', 'receive_sms_notifications')
    .not('profiles.phone_number', 'is', null);

  if (error) {
    console.error('Error fetching followers with SMS permission:', error);
    console.error('Error details:', JSON.stringify(error));
    return [];
  }

  if (!data || data.length === 0) {
    console.log(`No followers with SMS permission found for order ${orderId}`);
    return [];
  }

  const users = data.map((m: any) => ({
    id: m.profiles.id,
    name: `${m.profiles.first_name} ${m.profiles.last_name}`.trim(),
    phone_number: m.profiles.phone_number,
    role_name: m.dealer_memberships?.dealer_custom_roles?.role_name,
    notification_level: m.notification_level
  }));

  console.log(`✅ Found ${users.length} followers with SMS permission:`, users.map(u => `${u.name} (${u.notification_level})`));

  return users;
}

async function filterByPreferences(
  users: SMSRecipient[],
  dealerId: number,
  module: string,
  eventType: OrderSMSEvent,
  eventData: any
): Promise<SMSRecipient[]> {
  const { data: preferences, error } = await supabase
    .from('user_sms_notification_preferences')
    .select('*')
    .in('user_id', users.map(u => u.id))
    .eq('dealer_id', dealerId)
    .eq('module', module)
    .eq('sms_enabled', true);

  if (error) {
    console.error('Error fetching SMS preferences:', error);
    return [];
  }

  if (!preferences || preferences.length === 0) {
    return []; // No preferences = no SMS
  }

  return users.filter(user => {
    const prefs = preferences.find((p: any) => p.user_id === user.id);
    if (!prefs) return false;

    // Check follower notification level
    // If user only wants 'important' notifications, filter non-important events
    if (user.notification_level === 'important') {
      const importantEvents: OrderSMSEvent[] = [
        'order_assigned',
        'status_changed',
        'due_date_approaching',
        'overdue',
        'priority_changed'
      ];
      if (!importantEvents.includes(eventType)) {
        console.log(`[Follower Filter] User ${user.name} has notification_level='important', skipping non-important event '${eventType}'`);
        return false;
      }
    }

    const eventPrefs = prefs.event_preferences || {};

    // Check specific event preference
    switch (eventType) {
      case 'status_changed':
        const statusPref = eventPrefs.status_changed;
        if (!statusPref?.enabled) return false;
        // Check if this specific status should trigger SMS
        if (statusPref.statuses && Array.isArray(statusPref.statuses) && statusPref.statuses.length > 0) {
          return statusPref.statuses.includes(eventData.newStatus);
        }
        return true;

      case 'field_updated':
        const fieldPref = eventPrefs.field_updated;
        if (!fieldPref?.enabled) return false;
        // Check if this specific field should trigger SMS
        if (fieldPref.fields && Array.isArray(fieldPref.fields) && fieldPref.fields.length > 0) {
          return fieldPref.fields.includes(eventData.fieldName);
        }
        return false; // By default, don't SMS on field updates

      case 'due_date_approaching':
        const duePref = eventPrefs.due_date_approaching;
        return duePref?.enabled === true;

      case 'order_assigned':
        // Special case: only notify the user who was assigned
        if (eventData.assignedToUserId && eventData.assignedToUserId !== user.id) {
          return false;
        }
        return eventPrefs.order_assigned === true;

      default:
        return eventPrefs[eventType] === true;
    }
  });
}

async function checkRateLimits(
  users: SMSRecipient[],
  dealerId: number
): Promise<SMSRecipient[]> {
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const today = now.toISOString().split('T')[0];

  const eligible: SMSRecipient[] = [];

  for (const user of users) {
    // Get user's rate limits from preferences
    const { data: prefs } = await supabase
      .from('user_sms_notification_preferences')
      .select('max_sms_per_hour, max_sms_per_day, quiet_hours_enabled, quiet_hours_start, quiet_hours_end')
      .eq('user_id', user.id)
      .eq('dealer_id', dealerId)
      .single();

    if (!prefs) {
      console.log(`⚠️ No preferences found for user ${user.id}, skipping`);
      continue;
    }

    const maxPerHour = prefs.max_sms_per_hour || 10;
    const maxPerDay = prefs.max_sms_per_day || 50;

    // Check quiet hours
    if (prefs.quiet_hours_enabled) {
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeMinutes = currentHour * 60 + currentMinute;

      const [quietStartHour, quietStartMin] = (prefs.quiet_hours_start || '22:00').split(':').map(Number);
      const [quietEndHour, quietEndMin] = (prefs.quiet_hours_end || '08:00').split(':').map(Number);
      const quietStartMinutes = quietStartHour * 60 + quietStartMin;
      const quietEndMinutes = quietEndHour * 60 + quietEndMin;

      // Handle overnight quiet hours (e.g., 22:00 to 08:00)
      const isInQuietHours = quietStartMinutes > quietEndMinutes
        ? (currentTimeMinutes >= quietStartMinutes || currentTimeMinutes <= quietEndMinutes)
        : (currentTimeMinutes >= quietStartMinutes && currentTimeMinutes <= quietEndMinutes);

      if (isInQuietHours) {
        console.log(`🌙 User ${user.id} is in quiet hours, skipping`);
        continue;
      }
    }

    // Count SMS sent in last hour
    const { count: hourCount } = await supabase
      .from('sms_send_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('dealer_id', dealerId)
      .gte('sent_at', hourAgo.toISOString())
      .in('status', ['sent', 'delivered']);

    if (hourCount && hourCount >= maxPerHour) {
      console.log(`⏱️ User ${user.id} hit hourly limit (${hourCount}/${maxPerHour})`);
      continue;
    }

    // Count SMS sent today
    const { count: dayCount } = await supabase
      .from('sms_send_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('dealer_id', dealerId)
      .eq('sent_day', today)
      .in('status', ['sent', 'delivered']);

    if (dayCount && dayCount >= maxPerDay) {
      console.log(`📅 User ${user.id} hit daily limit (${dayCount}/${maxPerDay})`);
      continue;
    }

    eligible.push(user);
  }

  return eligible;
}

function generateMessages(
  users: SMSRecipient[],
  eventType: OrderSMSEvent,
  eventData: any
): Array<{ user: SMSRecipient; message: string }> {
  const shortLink = eventData.shortLink || `https://app.mydetailarea.com/orders/${eventData.orderNumber}`;

  const templates: Record<OrderSMSEvent, string> = {
    order_assigned: `🚗 You've been assigned to Order #${eventData.orderNumber}.${eventData.customerName ? ` Customer: ${eventData.customerName}` : ''} View: ${shortLink}`,

    status_changed: `📋 Order #${eventData.orderNumber} status changed to "${eventData.newStatus}". View: ${shortLink}`,

    comment_added: `💬 ${eventData.commenterName} commented on Order #${eventData.orderNumber}: "${(eventData.commentText || '').substring(0, 50)}${(eventData.commentText || '').length > 50 ? '...' : ''}" View: ${shortLink}`,

    due_date_approaching: `⏰ REMINDER: Order #${eventData.orderNumber} is due in ${eventData.minutesUntilDue || 30} minutes!${eventData.vehicleInfo ? ` ${eventData.vehicleInfo}` : ''} View: ${shortLink}`,

    overdue: `🚨 Order #${eventData.orderNumber} is OVERDUE! Please update status. View: ${shortLink}`,

    priority_changed: `⚡ Order #${eventData.orderNumber} priority changed to ${eventData.newPriority || 'high'}. Check details: ${shortLink}`,

    attachment_added: `📎 New attachment added to Order #${eventData.orderNumber}. View: ${shortLink}`,

    order_created: `✨ New Order #${eventData.orderNumber} created.${eventData.customerName ? ` ${eventData.customerName}` : ''} View: ${shortLink}`,

    follower_added: `👁️ You're now following Order #${eventData.orderNumber}. View: ${shortLink}`,

    field_updated: `✏️ Order #${eventData.orderNumber} - ${eventData.fieldName} updated. View: ${shortLink}`
  };

  const message = templates[eventType] || `Order #${eventData.orderNumber} updated. View: ${shortLink}`;

  return users.map(user => ({ user, message }));
}

async function sendSMS(
  phoneNumber: string,
  message: string,
  orderId: string
): Promise<{ sid: string; status: string }> {
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;

  const body = new URLSearchParams({
    To: phoneNumber,
    From: twilioPhoneNumber!,
    Body: message
  });

  const response = await fetch(twilioUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Twilio API error: ${response.status} - ${errorData}`);
  }

  const result = await response.json();
  return { sid: result.sid, status: result.status };
}

async function recordSMSHistory(
  results: PromiseSettledResult<any>[],
  users: SMSRecipient[],
  messages: Array<{ user: SMSRecipient; message: string }>,
  dealerId: number,
  module: string,
  eventType: OrderSMSEvent,
  entityId: string
): Promise<void> {
  const records = results.map((result, index) => {
    const user = users[index];
    const message = messages[index];

    if (result.status === 'fulfilled') {
      return {
        user_id: user.id,
        dealer_id: dealerId,
        module,
        event_type: eventType,
        entity_id: entityId,
        phone_number: user.phone_number,
        message_content: message.message,
        twilio_sid: result.value.sid,
        status: 'sent',
        cost_cents: 7 // Approximate cost: $0.0075 per SMS
      };
    } else {
      return {
        user_id: user.id,
        dealer_id: dealerId,
        module,
        event_type: eventType,
        entity_id: entityId,
        phone_number: user.phone_number,
        message_content: message.message,
        status: 'failed',
        error_message: result.reason?.message || 'Unknown error'
      };
    }
  });

  const { error } = await supabase
    .from('sms_send_history')
    .insert(records);

  if (error) {
    console.error('Error recording SMS history:', error);
  }
}

serve(handler);
