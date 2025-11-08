import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

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
    stockNumber?: string;
    tag?: string;
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
    console.log(`🔍 [DEBUG] Trigger user ID: ${request.triggeredBy}`);

    // =========================================================================
    // 3-LEVEL VALIDATION ARCHITECTURE:
    // Level 1: User must be FOLLOWER of the order
    // Level 2: Custom ROLE must allow this event
    // Level 3: USER must have channel enabled in preferences
    // =========================================================================

    // 1. Check if this event is enabled in dealer_notification_rules (NEW SYSTEM)
    const isEventEnabled = await checkNotificationRules(
      request.dealerId,
      request.module,
      request.eventType
    );

    if (!isEventEnabled) {
      console.log(`⚠️ [SMS Filter] Event "${request.eventType}" not enabled in dealer_notification_rules for module "${request.module}"`);
      return new Response(
        JSON.stringify({
          success: true,
          sent: 0,
          failed: 0,
          recipients: 0,
          message: `Event "${request.eventType}" not configured for SMS in notification rules`
        }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // 2. Apply 3-level validation: Follower → Custom Role → User Preferences
    console.log(`🔐 Starting 3-level validation for order ${request.orderId}`);
    const eligibleUsers = await getUsersEligibleForNotification(
      request.dealerId,
      request.module,
      request.orderId,
      request.eventType,
      request.eventData
    );
    console.log(`✅ 3-level validation complete: ${eligibleUsers.length} eligible users`);
    console.log(`🔍 [DEBUG] Eligible users:`, eligibleUsers.map(u => ({ id: u.id, name: u.name, phone: u.phone_number })));

    if (eligibleUsers.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          sent: 0,
          failed: 0,
          recipients: 0,
          message: 'No eligible users after 3-level validation (follower + role + preferences)'
        }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // 3. Check rate limits for each eligible user
    const usersAfterRateLimit = await checkRateLimits(eligibleUsers, request.dealerId, request.module);
    console.log(`⏱️ After rate limit check: ${usersAfterRateLimit.length} users`);
    console.log(`🔍 [DEBUG] Users after rate limit:`, usersAfterRateLimit.map(u => ({ id: u.id, name: u.name })));
    if (usersAfterRateLimit.length < eligibleUsers.length) {
      const filtered = eligibleUsers.filter(u => !usersAfterRateLimit.find(e => e.id === u.id));
      console.log(`❌ [DEBUG] Filtered by rate limit:`, filtered.map(u => ({ id: u.id, name: u.name })));
    }

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
    console.log(`🔍 [DEBUG] Final users to notify:`, finalUsers.map(u => ({ id: u.id, name: u.name })));
    if (finalUsers.length < usersAfterRateLimit.length) {
      const filtered = usersAfterRateLimit.filter(u => !finalUsers.find(e => e.id === u.id));
      console.log(`❌ [DEBUG] Filtered as trigger user:`, filtered.map(u => ({ id: u.id, name: u.name, triggeredBy: request.triggeredBy })));
    }

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

/**
 * Check if the event is enabled for SMS notifications in dealer_notification_rules
 * Returns true if at least one rule exists for this dealer/module/event with SMS channel enabled
 */
async function checkNotificationRules(
  dealerId: number,
  module: string,
  eventType: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('dealer_notification_rules')
    .select('id')
    .eq('dealer_id', dealerId)
    .eq('module', module)
    .eq('event', eventType)
    .eq('enabled', true)
    .contains('channels', ['sms']);

  if (error) {
    console.error('[checkNotificationRules] Error querying dealer_notification_rules:', error);
    // Fail open: if we can't check the rules, allow the notification
    return true;
  }

  const isEnabled = (data && data.length > 0);
  console.log(`[checkNotificationRules] Event "${eventType}" for module "${module}": ${isEnabled ? 'ENABLED' : 'DISABLED'} (${data?.length || 0} rules found)`);

  return isEnabled;
}

/**
 * NEW: 3-LEVEL VALIDATION ARCHITECTURE
 * Gets users eligible for SMS notifications based on 3 levels:
 * Level 1: User must be FOLLOWER of the order
 * Level 2: User's Custom ROLE must allow this event
 * Level 3: USER must have SMS enabled in preferences
 */
async function getUsersEligibleForNotification(
  dealerId: number,
  module: string,
  orderId: string,
  eventType: OrderSMSEvent,
  eventData: any
): Promise<SMSRecipient[]> {

  console.log(`\n🔍 === STARTING 3-LEVEL VALIDATION ===`);
  console.log(`Order: ${orderId}, Event: ${eventType}, Module: ${module}`);

  // =========================================================================
  // LEVEL 1: Get FOLLOWERS of this order
  // =========================================================================
  console.log(`\n1️⃣ LEVEL 1: Fetching FOLLOWERS of order ${orderId}...`);

  const { data: followers, error: followersError } = await supabase
    .from('entity_followers')
    .select(`
      user_id,
      notification_level,
      dealer_id,
      profiles!inner(
        id,
        first_name,
        last_name,
        phone_number,
        dealer_memberships!inner(
          is_active,
          custom_role_id,
          dealer_id,
          dealer_custom_roles!inner(
            id,
            role_name
          )
        )
      )
    `)
    .eq('entity_type', 'order')
    .eq('entity_id', orderId)
    .eq('is_active', true)
    .neq('notification_level', 'none')
    .eq('dealer_id', dealerId)
    .eq('profiles.dealer_memberships.is_active', true)
    .eq('profiles.dealer_memberships.dealer_id', dealerId)
    .not('profiles.phone_number', 'is', null);

  if (followersError) {
    console.error('❌ Error fetching followers:', followersError);
    return [];
  }

  if (!followers || followers.length === 0) {
    console.log(`⚠️ No followers found for order ${orderId}`);
    return [];
  }

  console.log(`✅ LEVEL 1 PASSED: Found ${followers.length} followers`);
  followers.forEach(f => {
    console.log(`   - ${f.profiles.first_name} ${f.profiles.last_name} (${f.profiles.dealer_memberships.dealer_custom_roles.role_name})`);
  });

  // =========================================================================
  // LEVEL 2 & 3: Validate ROLE permissions and USER preferences
  // =========================================================================
  console.log(`\n2️⃣ 3️⃣ LEVEL 2 & 3: Validating ROLE permissions and USER preferences...`);

  const eligibleUsers: SMSRecipient[] = [];

  for (const follower of followers) {
    const userId = follower.profiles.id;
    const roleId = follower.profiles.dealer_memberships.custom_role_id;
    const roleName = follower.profiles.dealer_memberships.dealer_custom_roles.role_name;
    const userName = `${follower.profiles.first_name} ${follower.profiles.last_name}`;

    console.log(`\n   Checking user: ${userName} (Role: ${roleName})`);

    // LEVEL 2: Check if Custom Role allows this event
    const { data: roleEventConfig, error: roleEventError } = await supabase
      .from('role_notification_events')
      .select('*')
      .eq('role_id', roleId)
      .eq('module', module)
      .eq('event_type', eventType)
      .eq('enabled', true)
      .single();

    if (roleEventError || !roleEventConfig) {
      console.log(`   ❌ LEVEL 2 FAILED: Role "${roleName}" does NOT allow event "${eventType}"`);
      continue;
    }

    console.log(`   ✅ LEVEL 2 PASSED: Role "${roleName}" allows event "${eventType}"`);

    // Validate event-specific config (e.g., status_changed → allowed_statuses)
    if (eventType === 'status_changed') {
      const allowedStatuses = roleEventConfig.event_config?.allowed_statuses || [];

      if (allowedStatuses.length > 0 && !allowedStatuses.includes(eventData.newStatus)) {
        console.log(`   ❌ Status "${eventData.newStatus}" not in role's allowed list: [${allowedStatuses.join(', ')}]`);
        continue;
      }

      console.log(`   ✅ Status "${eventData.newStatus}" is allowed by role`);
    }

    // LEVEL 3: Check if USER has SMS enabled in preferences
    console.log(`   3️⃣ LEVEL 3: Checking USER preferences...`);

    const { data: userPrefs, error: userPrefsError } = await supabase
      .from('user_sms_notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('dealer_id', dealerId)
      .eq('module', module)
      .single();

    if (userPrefsError || !userPrefs) {
      console.log(`   ⚠️ User has no notification preferences set`);
      continue;
    }

    if (!userPrefs.sms_enabled) {
      console.log(`   ❌ LEVEL 3 FAILED: User has SMS globally disabled`);
      continue;
    }

    // Check event-specific SMS preference
    const eventPref = userPrefs.event_preferences?.[eventType];

    if (!eventPref) {
      console.log(`   ❌ LEVEL 3 FAILED: User has no preference for event "${eventType}"`);
      continue;
    }

    // Support multi-channel format: check SMS specifically
    const smsEnabled = typeof eventPref === 'boolean'
      ? eventPref
      : (eventPref.sms === true || eventPref.enabled === true);

    if (!smsEnabled) {
      console.log(`   ❌ LEVEL 3 FAILED: User has SMS disabled for event "${eventType}"`);
      continue;
    }

    console.log(`   ✅ LEVEL 3 PASSED: User has SMS enabled for event "${eventType}"`);

    // Additional: Check notification_level from follower
    if (follower.notification_level === 'important') {
      const importantEvents: OrderSMSEvent[] = [
        'order_assigned',
        'status_changed',
        'due_date_approaching',
        'overdue',
        'priority_changed'
      ];

      if (!importantEvents.includes(eventType)) {
        console.log(`   ⚠️ User has notification_level='important', skipping non-important event`);
        continue;
      }
    }

    // User passed all 3 validations!
    eligibleUsers.push({
      id: userId,
      name: userName,
      phone_number: follower.profiles.phone_number,
      role_name: roleName,
      notification_level: follower.notification_level
    });

    console.log(`   ✅✅✅ USER ELIGIBLE: ${userName}`);
  }

  console.log(`\n🎯 === VALIDATION COMPLETE ===`);
  console.log(`Total eligible users: ${eligibleUsers.length} out of ${followers.length} followers`);

  return eligibleUsers;
}

// DEPRECATED: Old function kept for backward compatibility
// Will be removed in future version
// ========================================
// LEGACY FUNCTIONS REMOVED (2025-11-08)
// ========================================
// The following functions have been removed and replaced by getUsersEligibleForNotification():
// - getUsersWithSMSPermission() - Replaced by 3-level validation architecture
// - filterByPreferences() - Now integrated into getUsersEligibleForNotification()
//
// New architecture implements:
// Level 1: User must be FOLLOWER of the order (entity_followers)
// Level 2: Custom Role must allow the event (role_notification_events)
// Level 3: User must have SMS enabled in preferences (user_sms_notification_preferences)

async function checkRateLimits(
  users: SMSRecipient[],
  dealerId: number,
  module: string
): Promise<SMSRecipient[]> {
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const today = now.toISOString().split('T')[0];

  const eligible: SMSRecipient[] = [];

  for (const user of users) {
    // Get user's rate limits from preferences for THIS MODULE
    const { data: prefs } = await supabase
      .from('user_sms_notification_preferences')
      .select('max_sms_per_hour, max_sms_per_day, quiet_hours_enabled, quiet_hours_start, quiet_hours_end')
      .eq('user_id', user.id)
      .eq('dealer_id', dealerId)
      .eq('module', module)
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

// Helper function to format status for display
function formatStatus(status: string): string {
  if (!status) return '';
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function generateMessages(
  users: SMSRecipient[],
  eventType: OrderSMSEvent,
  eventData: any
): Array<{ user: SMSRecipient; message: string }> {
  const shortLink = eventData.shortLink || `https://app.mydetailarea.com/orders/${eventData.orderNumber}`;

  // Build order identifier with stock number (sales/recon) or tag (service)
  let orderIdentifier = `#${eventData.orderNumber}`;
  if (eventData.stockNumber) {
    orderIdentifier = `#${eventData.orderNumber} (Stock: ${eventData.stockNumber})`;
  } else if (eventData.tag) {
    orderIdentifier = `#${eventData.orderNumber} (Tag: ${eventData.tag})`;
  }

  // Format status for better readability
  const formattedStatus = formatStatus(eventData.newStatus || '');

  // Build additional details for order_created message
  let createdDetails = '';
  if (eventType === 'order_created') {
    // Add vehicle info if available
    if (eventData.vehicleInfo && eventData.vehicleInfo.trim()) {
      createdDetails += ` ${eventData.vehicleInfo}`;
    }
    // Add services if available
    if (eventData.services && eventData.services.trim()) {
      createdDetails += ` - ${eventData.services}`;
    }
    // Add due date for service orders
    if (eventData.dueDateTime) {
      const dueDate = new Date(eventData.dueDateTime);
      const dueStr = dueDate.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      createdDetails += ` | Due: ${dueStr}`;
    }
  }

  const templates: Record<OrderSMSEvent, string> = {
    order_assigned: `🚗 You've been assigned to Order ${orderIdentifier}.${eventData.vehicleInfo ? ` ${eventData.vehicleInfo}` : ''} View: ${shortLink}`,

    status_changed: `📋 Order ${orderIdentifier} status changed to "${formattedStatus}". View: ${shortLink}`,

    comment_added: `💬 ${eventData.commenterName} commented on Order ${orderIdentifier}: "${(eventData.commentText || '').substring(0, 50)}${(eventData.commentText || '').length > 50 ? '...' : ''}" View: ${shortLink}`,

    due_date_approaching: `⏰ REMINDER: Order ${orderIdentifier} is due in ${eventData.minutesUntilDue || 30} minutes!${eventData.vehicleInfo ? ` ${eventData.vehicleInfo}` : ''} View: ${shortLink}`,

    overdue: `🚨 Order ${orderIdentifier} is OVERDUE! Please update status. View: ${shortLink}`,

    priority_changed: `⚡ Order ${orderIdentifier} priority changed to ${eventData.newPriority || 'high'}. Check details: ${shortLink}`,

    attachment_added: `📎 New attachment added to Order ${orderIdentifier}. View: ${shortLink}`,

    order_created: createdDetails
      ? `✨ New Order ${orderIdentifier} -${createdDetails} View: ${shortLink}`
      : `✨ New Order ${orderIdentifier} created. View: ${shortLink}`,

    follower_added: `👁️ You're now following Order ${orderIdentifier}. View: ${shortLink}`,

    field_updated: `✏️ Order ${orderIdentifier} - ${eventData.fieldName} updated. View: ${shortLink}`
  };

  const message = templates[eventType] || `Order ${orderIdentifier} updated. View: ${shortLink}`;

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
