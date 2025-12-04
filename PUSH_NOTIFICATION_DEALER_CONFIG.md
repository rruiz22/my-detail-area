# Push Notification Dealer Configuration Guide

**MyDetailArea - Dealer-Configurable Push Notifications**

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Access Requirements](#access-requirements)
3. [Configuration UI](#configuration-ui)
4. [Event Types by Module](#event-types-by-module)
5. [Default Behavior](#default-behavior)
6. [User Preferences](#user-preferences)
7. [Quiet Hours](#quiet-hours)
8. [Validation Logic](#validation-logic)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

---

## Overview

MyDetailArea's push notification system allows **dealer administrators** to control which events trigger push notifications for their dealership. This provides flexibility to reduce notification fatigue and customize the notification experience per dealership.

### Key Features

- **Dealer-Level Control**: Configure notifications per module and event type
- **User Preferences**: Users can customize sound, vibration, background, and quiet hours
- **5-Layer Validation**: Multi-tier filtering ensures only relevant notifications are sent
- **Default Allow**: If no configuration exists, notifications are enabled by default
- **Fail-Safe**: System allows notifications if validation checks fail (graceful degradation)

---

## Access Requirements

### Who Can Configure

Only users with **dealer_admin** or **system_admin** roles can access Push Notification Settings.

**Role Requirements**:
```sql
-- Check if you have access
SELECT dm.role
FROM dealer_memberships dm
WHERE dm.user_id = auth.uid()
  AND (dm.role = 'dealer_admin' OR dm.role = 'system_admin');
```

### How to Access

1. Navigate to **Settings → Push Notifications**
2. UI Location: `src/components/settings/PushNotificationSettings.tsx`
3. Route: `/settings` (Push Notifications tab)

---

## Configuration UI

### Dealer Configuration

The configuration UI displays **5 modules** with **9-13 events each**:

```
Sales Orders (13 events)
├── order_created
├── order_status_changed
├── order_completed
├── order_deleted
├── order_assigned
├── comment_added
├── file_uploaded
├── follower_added
├── user_mentioned
├── customer_arrived
├── customer_departed
├── customer_waiting
└── payment_received

Service Orders (9 events)
├── order_created
├── order_status_changed
├── order_completed
├── order_deleted
├── order_assigned
├── comment_added
├── file_uploaded
├── follower_added
└── user_mentioned

Recon Orders (9 events)
├── order_created
├── order_status_changed
├── order_completed
├── order_deleted
├── order_assigned
├── comment_added
├── file_uploaded
├── follower_added
└── user_mentioned

Car Wash (9 events)
├── order_created
├── order_status_changed
├── order_completed
├── order_deleted
├── order_assigned
├── comment_added
├── file_uploaded
├── follower_added
└── user_mentioned

Get Ready (13 events)
├── order_created
├── order_status_changed
├── order_completed
├── order_deleted
├── order_assigned
├── comment_added
├── file_uploaded
├── follower_added
├── user_mentioned
├── vehicle_added
├── vehicle_blocked
├── vehicle_completed
└── vehicle_removed
```

### Toggle States

Each event can be:
- **Enabled** (🔔 Green toggle) - Users will receive push notifications
- **Disabled** (🔕 Gray toggle) - Push notifications are blocked at dealer level

---

## Event Types by Module

### Common Events (All Modules)

| Event Type | Description | Typical Use Case |
|------------|-------------|------------------|
| `order_created` | New order created | Alert team of new work |
| `order_status_changed` | Status updated (e.g., In Progress → Completed) | Track order progress |
| `order_completed` | Order marked complete | Final notification |
| `order_deleted` | Order soft-deleted | Alert of cancelled work |
| `order_assigned` | Order assigned to user | Personal task notification |
| `comment_added` | New comment on order | Team communication |
| `file_uploaded` | File attached to order | Document sharing |
| `follower_added` | User added as follower | Stay updated on order |
| `user_mentioned` | @mention in comment | Direct attention needed |

### Sales-Specific Events

| Event Type | Description | Typical Use Case |
|------------|-------------|------------------|
| `customer_arrived` | Customer arrival logged | Service desk notification |
| `customer_departed` | Customer departure logged | Completion tracking |
| `customer_waiting` | Customer waiting status | Urgent service needed |
| `payment_received` | Payment processed | Finance notification |

### Get Ready-Specific Events

| Event Type | Description | Typical Use Case |
|------------|-------------|------------------|
| `vehicle_added` | Vehicle added to Get Ready list | New inventory |
| `vehicle_blocked` | Vehicle blocked (missing parts/info) | Action required |
| `vehicle_completed` | Vehicle ready for sale | Inventory status |
| `vehicle_removed` | Vehicle removed from list | Inventory update |

---

## Default Behavior

### No Configuration = Enabled

If a dealer has **NOT** configured push notifications:
- ✅ **All events are ENABLED by default**
- ✅ Users receive notifications for all actions
- ✅ Users can still control notifications via Profile settings

### Example Query

```sql
-- Check if event is configured for dealer
SELECT
  dealer_id,
  module,
  event_type,
  enabled
FROM dealer_push_notification_preferences
WHERE dealer_id = 1
  AND module = 'sales_orders'
  AND event_type = 'comment_added';

-- If no rows returned → Event is ENABLED (default allow)
-- If row exists with enabled = false → Event is DISABLED
-- If row exists with enabled = true → Event is EXPLICITLY ENABLED
```

---

## User Preferences

Users can customize their notification experience via **Profile → Notifications**.

### User Settings

1. **Push Notifications Enabled** (Global toggle)
   - Disables ALL push notifications for user
   - Overrides dealer configuration
   - Default: `true`

2. **Allow Background Notifications**
   - Persistent notifications (require user interaction to dismiss)
   - Default: `true`
   - FCM Parameter: `requireInteraction: true`

3. **Allow Sound**
   - Play notification sound
   - Default: `true`
   - FCM Parameter: `silent: false`

4. **Allow Vibration**
   - Vibrate device on notification
   - Default: `true`
   - FCM Parameter: `vibrate: [200, 100, 200]`

5. **Quiet Hours**
   - Block notifications during specified time range
   - Supports midnight-spanning ranges (22:00-08:00)
   - Default: Disabled

### Example User Preferences

```sql
-- View user's preferences
SELECT
  user_id,
  push_enabled,
  allow_background,
  allow_sound,
  allow_vibration,
  quiet_hours_enabled,
  quiet_hours_start,
  quiet_hours_end
FROM user_push_notification_preferences
WHERE user_id = '122c8d5b-e5f5-4782-a179-544acbaaceb9';

-- Sample output:
-- push_enabled: true
-- allow_background: true
-- allow_sound: false (notifications will be silent)
-- allow_vibration: true
-- quiet_hours_enabled: true
-- quiet_hours_start: 22:00:00
-- quiet_hours_end: 08:00:00
```

---

## Quiet Hours

### Configuration

Users can set quiet hours to block notifications during sleep or focused work periods.

**Supports**:
- **Normal ranges**: 08:00 - 22:00 (blocks during daytime)
- **Midnight-spanning**: 22:00 - 08:00 (blocks during night)

### Logic

```typescript
// Normal range (start <= end)
// Example: 08:00 - 22:00
// Blocks: 08:00:00 to 22:00:00
// Allows: 22:00:01 to 07:59:59

// Midnight-spanning range (start > end)
// Example: 22:00 - 08:00
// Blocks: 22:00:00 to 23:59:59 AND 00:00:00 to 08:00:00
// Allows: 08:00:01 to 21:59:59
```

### Validation Level

Quiet hours are validated at **Layer 5 (Edge Function)**:
- Client-side validation is informational only
- Server-side validation in `send-notification` Edge Function
- Notifications blocked return `success: false, message: "Notification blocked by user quiet hours"`

---

## Validation Logic

Push notifications go through **5 layers of validation** before being sent:

### Layer 1: Dealer Configuration (Database)

```sql
-- RPC function: is_push_enabled_for_event()
SELECT enabled
FROM dealer_push_notification_preferences
WHERE dealer_id = $dealer_id
  AND module = $module
  AND event_type = $event_type;

-- If no config → TRUE (default allow)
-- If config exists → Use enabled value
```

### Layer 2: User Global Toggle (Database)

```sql
-- Check if user has push enabled
SELECT push_enabled
FROM user_push_notification_preferences
WHERE user_id = $user_id;

-- If no preferences → TRUE (default allow)
-- If preferences exist → Use push_enabled value
```

### Layer 3: Active FCM Token (Database)

```sql
-- Check if user has at least one active token
SELECT COUNT(*) > 0
FROM fcm_tokens
WHERE user_id = $user_id
  AND dealer_id = $dealer_id
  AND is_active = true;

-- If no tokens → FALSE (cannot send)
-- If tokens exist → TRUE
```

### Layer 4: Quiet Hours (Client-Side - Informational)

```typescript
// Checked in pushNotificationHelper.ts
// Early exit to avoid unnecessary API calls
if (isInQuietHours(userPreferences)) {
  console.log('User in quiet hours - skipping notification');
  return;
}
```

### Layer 5: Quiet Hours + Preferences (Edge Function - Authoritative)

```typescript
// send-notification Edge Function
const userPreferences = await getUserPreferences(userId);

// Block if in quiet hours
if (isInQuietHours(userPreferences)) {
  return { success: false, message: 'Notification blocked by user quiet hours' };
}

// Apply user preferences to FCM payload
const payload = {
  webpush: {
    notification: {
      silent: !userPreferences.allow_sound,
      requireInteraction: userPreferences.allow_background,
      vibrate: userPreferences.allow_vibration ? [200, 100, 200] : [0]
    }
  }
};
```

### Validation Flow Diagram

```
Notification Trigger
       ↓
Layer 1: Dealer enabled for module + event?  ────→ NO → ❌ BLOCK
       ↓ YES
Layer 2: User push enabled globally?          ────→ NO → ❌ BLOCK
       ↓ YES
Layer 3: User has active FCM token?           ────→ NO → ❌ BLOCK
       ↓ YES
Layer 4: Not in quiet hours (client)?         ────→ YES → ⚠️ SKIP (early exit)
       ↓ NO (allow to proceed)
Layer 5: Edge Function validation
         ├─ Quiet hours check                 ────→ YES → ❌ BLOCK
         └─ Apply user preferences (sound/vibration/background)
       ↓
✅ SEND to FCM with preferences applied
```

---

## Testing

### Manual Test Suite

Use `PUSH_NOTIFICATION_TESTS.sql` to validate the system:

```bash
# Location
./PUSH_NOTIFICATION_TESTS.sql

# Sections
1. Dealer Configuration Tests
2. User Toggle Tests
3. Validation Cascade Tests
4. Quiet Hours Tests
5. Multiple Devices Tests
6. Edge Function Logs
```

### Quick Health Check

```sql
-- System overview
SELECT
  (SELECT COUNT(*) FROM dealer_push_notification_preferences) as dealer_configs,
  (SELECT COUNT(*) FROM user_push_notification_preferences) as user_preferences,
  (SELECT COUNT(*) FROM fcm_tokens WHERE is_active = true) as active_tokens;
```

### Test RPC Function

```sql
-- Test with your user_id and dealer_id
SELECT is_push_enabled_for_event(
  'YOUR-USER-ID'::UUID,
  YOUR_DEALER_ID,
  'sales_orders',
  'comment_added'
) AS should_notification_send;

-- Expected: true or false based on configuration
```

---

## Troubleshooting

### Issue: User not receiving notifications

**Checklist**:

1. ✅ **Layer 1**: Check dealer configuration
   ```sql
   SELECT * FROM dealer_push_notification_preferences
   WHERE dealer_id = $dealer_id
     AND module = $module
     AND event_type = $event_type;
   ```
   - If `enabled = false` → Dealer blocked this event
   - If no rows → Event is allowed (default)

2. ✅ **Layer 2**: Check user preferences
   ```sql
   SELECT push_enabled FROM user_push_notification_preferences
   WHERE user_id = $user_id;
   ```
   - If `push_enabled = false` → User disabled push notifications
   - If no rows → Push is enabled (default)

3. ✅ **Layer 3**: Check FCM tokens
   ```sql
   SELECT * FROM fcm_tokens
   WHERE user_id = $user_id
     AND dealer_id = $dealer_id
     AND is_active = true;
   ```
   - If no rows → User has not registered for push notifications
   - Ask user to enable notifications in browser/Profile

4. ✅ **Layer 5**: Check quiet hours
   ```sql
   SELECT
     quiet_hours_enabled,
     quiet_hours_start,
     quiet_hours_end
   FROM user_push_notification_preferences
   WHERE user_id = $user_id;
   ```
   - If current time is within quiet hours → Notifications blocked

5. ✅ **Edge Function Logs**:
   ```sql
   SELECT * FROM edge_function_logs
   WHERE function_name = 'send-notification'
     AND data->>'userId' = '$user_id'
   ORDER BY created_at DESC
   LIMIT 10;
   ```
   - Check for "No active tokens found"
   - Check for "Notification blocked by quiet hours"
   - Check for FCM errors (UNREGISTERED, INVALID_ARGUMENT)

### Issue: All users not receiving notifications

**Potential Causes**:

1. **Dealer disabled the event**:
   - Go to Settings → Push Notifications
   - Enable the specific event for the module

2. **Edge Function error**:
   - Check Firebase credentials in Supabase Edge Function secrets
   - Verify `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`

3. **FCM API error**:
   - Check Edge Function logs for FCM errors
   - Common errors: expired tokens, invalid project ID, auth failures

### Issue: Notifications are silent

**Check user preferences**:
```sql
SELECT allow_sound FROM user_push_notification_preferences
WHERE user_id = $user_id;
```
- If `allow_sound = false` → User disabled sound
- User can enable in Profile → Notifications → Allow Sound

### Issue: Quiet hours not working

**Validation**:
1. Quiet hours are validated at **Edge Function level** (Layer 5)
2. Check Edge Function logs for "Notification blocked by quiet hours"
3. Verify quiet hours are enabled:
   ```sql
   SELECT
     quiet_hours_enabled,
     quiet_hours_start,
     quiet_hours_end
   FROM user_push_notification_preferences
   WHERE user_id = $user_id;
   ```

---

## Database Schema Reference

### `dealer_push_notification_preferences`

```sql
CREATE TABLE dealer_push_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id INTEGER NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  module VARCHAR(50) NOT NULL,     -- 'sales_orders', 'service_orders', etc.
  event_type VARCHAR(50) NOT NULL, -- 'order_created', 'comment_added', etc.
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  CONSTRAINT dealer_push_notification_preferences_unique
    UNIQUE (dealer_id, module, event_type)
);
```

### `user_push_notification_preferences`

```sql
CREATE TABLE user_push_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  allow_background BOOLEAN NOT NULL DEFAULT true,
  allow_sound BOOLEAN NOT NULL DEFAULT true,
  allow_vibration BOOLEAN NOT NULL DEFAULT true,
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT user_push_notification_preferences_unique UNIQUE (user_id)
);
```

### `fcm_tokens`

```sql
CREATE TABLE fcm_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dealer_id INTEGER NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  fcm_token TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  device_name VARCHAR(255),
  browser VARCHAR(100),
  browser_version VARCHAR(50),
  os VARCHAR(100),
  os_version VARCHAR(50),
  user_agent TEXT,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## RPC Functions

### `is_push_enabled_for_event(user_id, dealer_id, module, event_type)`

**Returns**: `BOOLEAN`

**Logic**:
1. Check dealer configuration for module + event
2. Check user preferences (push_enabled)
3. Return `TRUE` if both allow, `FALSE` if either blocks

**Usage**:
```sql
SELECT is_push_enabled_for_event(
  '122c8d5b-e5f5-4782-a179-544acbaaceb9'::UUID,
  5,
  'sales_orders',
  'comment_added'
);
```

### `get_user_push_devices(user_id, dealer_id)`

**Returns**: `TABLE(fcm_token TEXT, device_info JSONB)`

**Purpose**: Get all active FCM tokens for user

**Usage**:
```sql
SELECT * FROM get_user_push_devices(
  '122c8d5b-e5f5-4782-a179-544acbaaceb9'::UUID,
  5
);
```

### `deactivate_fcm_token(token TEXT)`

**Returns**: `VOID`

**Purpose**: Mark FCM token as inactive (e.g., on logout, unregister)

**Usage**:
```sql
SELECT deactivate_fcm_token('dc_GMMROOiZxfKM-cfBrW9:APA91bE67J...');
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Action                              │
│              (Comment added, Status changed, etc.)              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│             pushNotificationHelper.notifyXYZ()                  │
│                  (Client-side service)                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│        Layer 1-3: RPC is_push_enabled_for_event()              │
│  ✓ Dealer enabled?  ✓ User enabled?  ✓ Has FCM token?        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│          Layer 4: Client-side quiet hours check                │
│              (Early exit optimization)                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│            send-notification Edge Function                      │
│         (Layer 5: Quiet hours + Preferences)                    │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│              Firebase Cloud Messaging (FCM)                     │
│          Send to all active tokens in parallel                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                    User's Device(s)                             │
│    Notification displayed with applied preferences              │
│   (silent/sound, vibration, background/dismissible)             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Related Files

- **UI Components**:
  - `src/components/settings/PushNotificationSettings.tsx` - Dealer configuration UI
  - `src/components/profile/ProfileNotificationPreferences.tsx` - User preferences UI

- **Service Layer**:
  - `src/services/pushNotificationHelper.ts` - Client-side notification service
  - `src/hooks/useStatusPermissions.tsx` - Permission validation hook

- **Edge Functions**:
  - `supabase/functions/send-notification/index.ts` - FCM notification sender

- **Migrations**:
  - `supabase/migrations/20251204214603_add_dealer_push_notification_preferences.sql`
  - `supabase/migrations/20251204214604_add_user_push_notification_preferences.sql`
  - `supabase/migrations/20251204214606_enhance_fcm_tokens_table.sql`
  - `supabase/migrations/20251204214607_add_push_notification_rpc_functions.sql`

---

## Support

For issues or questions:
1. Check Edge Function logs: `edge_function_logs` table
2. Run test suite: `PUSH_NOTIFICATION_TESTS.sql`
3. Review architecture docs: `PUSH_NOTIFICATIONS_ARCHITECTURE.md`

---

**Last Updated**: 2025-12-04
**Version**: 1.0.0
**Author**: MyDetailArea Development Team
