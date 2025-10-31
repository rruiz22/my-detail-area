# Notification System - Implementation Guide
## Enterprise-Grade Delivery Tracking & Analytics

**Author**: Database Expert Agent
**Date**: 2025-10-31
**Version**: 2.0.0
**Status**: PRODUCTION-READY

---

## 📋 Executive Summary

El sistema de notificaciones de My Detail Area cuenta ahora con una arquitectura enterprise completa:

### ✅ FASE 1 - COMPLETADA (2025-10-29)
- [x] `user_notification_preferences_universal` - Preferencias multi-módulo
- [x] `dealer_notification_rules` - Reglas de negocio por dealership
- [x] Helper functions (get_user_notification_config, etc.)
- [x] Backward compatibility views

### ✅ FASE 2 - COMPLETADA (2025-10-31)
- [x] `notification_delivery_log` - Tracking de entregas multi-canal
- [x] 6 RPC functions de analytics (get_delivery_metrics, etc.)
- [x] Provider correlation (webhooks de SendGrid, Twilio, FCM)
- [x] Engagement tracking (opens, clicks, CTR)
- [x] Performance metrics (latency tracking con P95)

### 🆕 FASE 3 - NUEVA (2025-10-31)
- [x] `notification_log` - Tabla principal de notificaciones
- [x] Retention policy automático (90 días delivery logs, 180 días notifications)
- [x] Archive schema para cold storage
- [x] Cron jobs para archiving automático
- [x] Monitoring views

---

## 🗂️ Database Architecture

### Schema Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                   NOTIFICATION SYSTEM ARCHITECTURE               │
└─────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│  USER PREFERENCES LAYER                                            │
├────────────────────────────────────────────────────────────────────┤
│  user_notification_preferences_universal                           │
│    - Per-user, per-dealer, per-module preferences                 │
│    - Channel toggles (in_app, email, sms, push)                   │
│    - Event-specific preferences (JSONB)                            │
│    - Quiet hours, rate limits                                      │
└────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│  BUSINESS RULES LAYER                                              │
├────────────────────────────────────────────────────────────────────┤
│  dealer_notification_rules                                         │
│    - Dealer-level notification rules                               │
│    - Conditional recipients (roles, users, assigned_user)          │
│    - Priority-based routing                                        │
│    - Conditions (JSONB)                                            │
└────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│  NOTIFICATION CORE LAYER                                           │
├────────────────────────────────────────────────────────────────────┤
│  notification_log (1:N)                                            │
│    - Main notification record                                      │
│    - Read/unread tracking                                          │
│    - Threading support                                             │
│    - Priority, action URLs                                         │
│    - Multi-module support                                          │
└────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│  DELIVERY TRACKING LAYER                                           │
├────────────────────────────────────────────────────────────────────┤
│  notification_delivery_log (N per notification)                    │
│    - Per-channel delivery attempts                                 │
│    - Provider correlation (SendGrid, Twilio, FCM)                  │
│    - Status lifecycle (pending → sent → delivered → opened)        │
│    - Engagement tracking (opens, clicks, CTR)                      │
│    - Performance metrics (latency, retries)                        │
│    - Error tracking                                                │
└────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌────────────────────────────────────────────────────────────────────┐
│  COLD STORAGE LAYER (Archive)                                      │
├────────────────────────────────────────────────────────────────────┤
│  archive.notification_delivery_log                                 │
│    - Logs older than 90 days                                       │
│  archive.notification_log                                          │
│    - Notifications older than 180 days                             │
└────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Table Relationships

```sql
-- CORE RELATIONSHIP
notification_log (1) ──────── (N) notification_delivery_log
     │                                 │
     │                                 │
     ├─ user_id ──────────────────────┤
     ├─ dealer_id ─────────────────────┤
     └─ notification_id ───────────────┘

-- PREFERENCES RELATIONSHIP
user_notification_preferences_universal
     │
     ├─ user_id → auth.users(id)
     ├─ dealer_id → dealerships(id)
     └─ Consulted before sending notification

-- BUSINESS RULES RELATIONSHIP
dealer_notification_rules
     │
     ├─ dealer_id → dealerships(id)
     └─ Evaluated to determine recipients

-- ARCHIVE RELATIONSHIP
notification_log ─────(after 180 days)────> archive.notification_log
notification_delivery_log ─(after 90 days)> archive.notification_delivery_log
```

---

## 🚀 Migration Files Reference

### Core Migrations (FASE 1 - Already Applied)
1. **20251029000000_create_unified_notification_system.sql**
   - Creates `user_notification_preferences_universal`
   - Creates `dealer_notification_rules`
   - 18 indexes for performance
   - 8 RLS policies

2. **20251029000001_migrate_existing_notification_data.sql**
   - Migrates data from old tables
   - Preserves all existing preferences

3. **20251029000002_deprecate_old_notification_tables.sql**
   - Marks old tables as deprecated
   - Creates backward compatibility views

4. **20251029000003_create_notification_helper_functions_MINIMAL.sql**
   - `get_user_notification_config()`
   - `create_default_notification_preferences()`

### Delivery Tracking Migrations (FASE 2 - Already Applied)
5. **20251031000001_create_notification_delivery_log.sql**
   - Creates `notification_delivery_log` table
   - 35 columns for comprehensive tracking
   - 10 performance indexes
   - 5 RLS policies
   - 2 automatic triggers (latency calculation)

6. **20251031000002_create_delivery_analytics_functions.sql**
   - `get_delivery_metrics()` - Delivery rates by channel
   - `get_engagement_metrics()` - Open/click rates
   - `get_provider_performance()` - Provider comparison
   - `get_failed_deliveries()` - Debug report
   - `get_delivery_timeline()` - Time-series data
   - `get_user_delivery_summary()` - Per-user analytics

7. **20251031000003_update_rate_limit_function.sql**
   - Updates rate limiting logic (if exists)

### New Migrations (FASE 3 - READY TO APPLY)
8. **20251031000004_create_notification_log_table.sql** ⭐ NEW
   - Creates `notification_log` (main notifications table)
   - 27 columns for notification management
   - 10 indexes
   - 6 RLS policies
   - 4 helper functions (mark_as_read, get_unread_count, etc.)
   - Adds FK constraint to `notification_delivery_log`

9. **20251031000005_create_notification_retention_policy.sql** ⭐ NEW
   - Creates `archive` schema for cold storage
   - Archive tables (same structure as originals)
   - 4 retention functions
   - 3 scheduled cron jobs (daily archiving)
   - Monitoring view (`notification_retention_health`)

---

## 🔧 Installation Instructions

### Prerequisites
```bash
# Ensure Supabase CLI is installed
supabase --version

# Ensure you're connected to the correct project
supabase link --project-ref YOUR_PROJECT_REF
```

### Step 1: Apply FASE 3 Migrations

```bash
# Navigate to project directory
cd C:\Users\rudyr\apps\mydetailarea

# Apply notification_log table
supabase db push --file supabase/migrations/20251031000004_create_notification_log_table.sql

# Apply retention policy
supabase db push --file supabase/migrations/20251031000005_create_notification_retention_policy.sql
```

### Step 2: Verify Installation

```sql
-- 1. Check if notification_log table exists
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'notification_log'
ORDER BY ordinal_position;

-- 2. Check if FK constraint was added
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'notification_delivery_log'
AND tc.constraint_type = 'FOREIGN KEY'
AND kcu.column_name = 'notification_id';

-- 3. Check archive schema
SELECT * FROM archive.get_archive_stats();

-- 4. Check cron jobs
SELECT jobid, jobname, schedule, command
FROM cron.job
WHERE jobname LIKE '%notif%' OR jobname LIKE '%archive%';

-- 5. Check retention health
SELECT * FROM public.notification_retention_health;
```

### Step 3: Test Helper Functions

```sql
-- Test mark_notification_as_read
SELECT public.mark_notification_as_read('test-uuid');

-- Test get_unread_count
SELECT public.get_unread_notification_count(auth.uid(), 1);

-- Test archive functions (manual trigger)
SELECT * FROM archive.archive_delivery_logs(90, 100); -- Small batch for testing

-- Test combined query (hot + cold storage)
SELECT * FROM archive.get_delivery_logs_combined(
    auth.uid(),
    1,
    '2024-01-01'::timestamptz,
    NOW(),
    50
);
```

---

## 📖 API Reference

### Main Notification Functions

#### 1. Create Notification (Edge Function)
```typescript
// Edge Function: create-notification
const { data, error } = await supabase.rpc('create_notification', {
  p_user_id: 'user-uuid',
  p_dealer_id: 1,
  p_module: 'sales_orders',
  p_event: 'order_created',
  p_title: 'New Order Created',
  p_message: 'Order #12345 has been created',
  p_action_url: '/orders/12345',
  p_priority: 'normal',
  p_target_channels: ['in_app', 'email']
});
```

#### 2. Mark as Read
```typescript
const { data } = await supabase
  .rpc('mark_notification_as_read', {
    p_notification_id: 'notification-uuid'
  });
```

#### 3. Mark Multiple as Read
```typescript
const { data } = await supabase
  .rpc('mark_notifications_as_read', {
    p_notification_ids: ['uuid1', 'uuid2', 'uuid3']
  });
```

#### 4. Get Unread Count
```typescript
const { data: count } = await supabase
  .rpc('get_unread_notification_count', {
    p_user_id: user.id,
    p_dealer_id: currentDealer.id
  });
```

#### 5. Dismiss Notification
```typescript
const { data } = await supabase
  .rpc('dismiss_notification', {
    p_notification_id: 'notification-uuid'
  });
```

### Analytics Functions

#### 1. Get Delivery Metrics
```typescript
const { data: metrics } = await supabase
  .rpc('get_delivery_metrics', {
    p_dealer_id: currentDealer.id,
    p_start_date: '2025-10-01',
    p_end_date: '2025-10-31'
  });

// Returns per channel:
// - total_sent, total_delivered, total_failed
// - delivery_rate, failure_rate
// - avg_send_latency_ms, p95_send_latency_ms
```

#### 2. Get Engagement Metrics
```typescript
const { data: engagement } = await supabase
  .rpc('get_engagement_metrics', {
    p_dealer_id: currentDealer.id,
    p_start_date: '2025-10-01',
    p_end_date: '2025-10-31'
  });

// Returns per channel:
// - open_rate, click_through_rate, click_to_open_rate
// - avg_time_to_open_minutes, avg_time_to_click_minutes
```

#### 3. Get Provider Performance
```typescript
const { data: providers } = await supabase
  .rpc('get_provider_performance', {
    p_dealer_id: currentDealer.id,
    p_start_date: '2025-10-01',
    p_end_date: '2025-10-31'
  });

// Returns per provider + channel:
// - success_rate, avg_delivery_time_seconds
// - total_retries, avg_retries_per_failure
```

#### 4. Get Delivery Timeline
```typescript
const { data: timeline } = await supabase
  .rpc('get_delivery_timeline', {
    p_dealer_id: currentDealer.id,
    p_start_date: '2025-10-01',
    p_end_date: '2025-10-31',
    p_bucket_size: 'day' // 'hour', 'day', 'week'
  });

// Returns time-series data for charts
```

---

## 🎯 Usage Examples

### Example 1: Send Notification with Multi-Channel Delivery

```typescript
// 1. Create notification in notification_log
const { data: notification } = await supabase
  .from('notification_log')
  .insert({
    user_id: targetUser.id,
    dealer_id: dealership.id,
    module: 'sales_orders',
    event: 'order_assigned',
    entity_type: 'order',
    entity_id: order.id,
    title: 'Order Assigned',
    message: `Order #${order.order_number} has been assigned to you`,
    action_url: `/orders/${order.id}`,
    priority: 'normal',
    target_channels: ['in_app', 'sms', 'push']
  })
  .select()
  .single();

// 2. Edge Function creates delivery log entries per channel
// (This happens automatically in Edge Function)

// 3. Query delivery status later
const { data: deliveries } = await supabase
  .from('notification_delivery_log')
  .select('*')
  .eq('notification_id', notification.id);
```

### Example 2: Build Notification Center UI

```typescript
import { useQuery } from '@tanstack/react-query';

function NotificationCenter() {
  // Get notifications
  const { data: notifications } = useQuery({
    queryKey: ['notifications', user.id, dealer.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('notification_log')
        .select('*')
        .eq('user_id', user.id)
        .eq('dealer_id', dealer.id)
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false })
        .limit(50);
      return data;
    }
  });

  // Get unread count
  const { data: unreadCount } = useQuery({
    queryKey: ['unread-count', user.id, dealer.id],
    queryFn: async () => {
      const { data } = await supabase
        .rpc('get_unread_notification_count', {
          p_user_id: user.id,
          p_dealer_id: dealer.id
        });
      return data;
    }
  });

  const handleMarkAsRead = async (notificationId: string) => {
    await supabase.rpc('mark_notification_as_read', {
      p_notification_id: notificationId
    });
    // Invalidate queries to refresh UI
    queryClient.invalidateQueries(['notifications']);
    queryClient.invalidateQueries(['unread-count']);
  };

  return (
    <div>
      <h2>Notifications ({unreadCount})</h2>
      {notifications?.map(notif => (
        <NotificationCard
          key={notif.id}
          notification={notif}
          onMarkAsRead={handleMarkAsRead}
        />
      ))}
    </div>
  );
}
```

### Example 3: Analytics Dashboard

```typescript
function NotificationAnalyticsDashboard() {
  const { data: metrics } = useQuery({
    queryKey: ['delivery-metrics', dealer.id, dateRange],
    queryFn: async () => {
      const { data } = await supabase
        .rpc('get_delivery_metrics', {
          p_dealer_id: dealer.id,
          p_start_date: dateRange.start,
          p_end_date: dateRange.end
        });
      return data;
    }
  });

  const { data: engagement } = useQuery({
    queryKey: ['engagement-metrics', dealer.id, dateRange],
    queryFn: async () => {
      const { data } = await supabase
        .rpc('get_engagement_metrics', {
          p_dealer_id: dealer.id,
          p_start_date: dateRange.start,
          p_end_date: dateRange.end
        });
      return data;
    }
  });

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Delivery Rates Card */}
      <Card>
        <CardHeader>Delivery Rates</CardHeader>
        <CardContent>
          {metrics?.map(m => (
            <div key={m.channel}>
              <span>{m.channel}</span>
              <span>{m.delivery_rate}%</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Engagement Card */}
      <Card>
        <CardHeader>Engagement</CardHeader>
        <CardContent>
          {engagement?.map(e => (
            <div key={e.channel}>
              <span>{e.channel}</span>
              <span>Open: {e.open_rate}%</span>
              <span>CTR: {e.click_through_rate}%</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 🔍 Monitoring & Maintenance

### Daily Checks

```sql
-- 1. Check retention health (should not have many records to archive)
SELECT * FROM public.notification_retention_health;

-- 2. Check failed deliveries (investigate if > 5%)
SELECT
    channel,
    COUNT(*) as failed_count,
    COUNT(*) * 100.0 / (
        SELECT COUNT(*)
        FROM notification_delivery_log
        WHERE created_at >= NOW() - INTERVAL '24 hours'
    ) as failure_rate
FROM notification_delivery_log
WHERE status IN ('failed', 'bounced', 'rejected')
AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY channel;

-- 3. Check cron job execution logs
SELECT *
FROM cron.job_run_details
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname LIKE '%archive%')
ORDER BY start_time DESC
LIMIT 10;
```

### Weekly Checks

```sql
-- 1. Review archive stats
SELECT * FROM archive.get_archive_stats();

-- 2. Check table sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
FROM pg_tables
WHERE tablename LIKE '%notification%'
ORDER BY size_bytes DESC;

-- 3. Check index usage
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename LIKE '%notification%'
ORDER BY idx_scan DESC;
```

### Monthly Maintenance

```sql
-- 1. VACUUM ANALYZE (reclaim space after archiving)
VACUUM ANALYZE notification_delivery_log;
VACUUM ANALYZE notification_log;

-- 2. REINDEX (rebuild indexes for performance)
REINDEX TABLE notification_delivery_log;
REINDEX TABLE notification_log;

-- 3. Update table statistics
ANALYZE notification_delivery_log;
ANALYZE notification_log;
```

---

## 🚨 Troubleshooting

### Issue 1: Cron Jobs Not Running

```sql
-- Check if pg_cron extension is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Check cron job status
SELECT * FROM cron.job WHERE jobname LIKE '%archive%';

-- Check recent cron job runs
SELECT * FROM cron.job_run_details
WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname LIKE '%archive%')
ORDER BY start_time DESC
LIMIT 10;

-- Manual trigger for testing
SELECT * FROM archive.archive_delivery_logs(90, 1000);
```

### Issue 2: High Failure Rate

```sql
-- Get detailed error breakdown
SELECT
    channel,
    error_code,
    COUNT(*) as count,
    array_agg(DISTINCT error_message) as sample_errors
FROM notification_delivery_log
WHERE status IN ('failed', 'bounced', 'rejected')
AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY channel, error_code
ORDER BY count DESC;

-- Check specific failed deliveries
SELECT * FROM get_failed_deliveries(1, NOW() - INTERVAL '24 hours', NOW(), 100);
```

### Issue 3: Slow Queries

```sql
-- Check missing indexes
SELECT
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE tablename IN ('notification_log', 'notification_delivery_log')
AND schemaname = 'public'
ORDER BY n_distinct DESC;

-- Check slow queries
SELECT
    query,
    calls,
    total_time,
    mean_time,
    max_time
FROM pg_stat_statements
WHERE query LIKE '%notification%'
ORDER BY mean_time DESC
LIMIT 10;
```

---

## 📚 Additional Resources

### Documentation Files
- `NOTIFICATION_SYSTEM_README.md` - FASE 1 overview
- `USAGE_EXAMPLES_NOTIFICATION_SYSTEM.md` - Detailed usage examples
- `EXECUTIVE_SUMMARY_NOTIFICATION_SYSTEM.md` - Executive summary
- `NOTIFICATION_DELIVERY_LOG_EVALUATION.md` - Comprehensive evaluation
- `NOTIFICATION_SYSTEM_IMPLEMENTATION_GUIDE.md` - This file

### Related Tables
- `user_notification_preferences_universal` - User preferences
- `dealer_notification_rules` - Business rules
- `notification_log` - Main notifications
- `notification_delivery_log` - Delivery tracking
- `archive.notification_log` - Archived notifications
- `archive.notification_delivery_log` - Archived deliveries

### Helper Functions
```sql
-- User Preferences
get_user_notification_config(user_id, dealer_id, module)
create_default_notification_preferences(user_id, dealer_id, module)

-- Notifications
mark_notification_as_read(notification_id)
mark_notifications_as_read(notification_ids[])
get_unread_notification_count(user_id, dealer_id)
dismiss_notification(notification_id)

-- Analytics
get_delivery_metrics(dealer_id, start_date, end_date)
get_engagement_metrics(dealer_id, start_date, end_date)
get_provider_performance(dealer_id, start_date, end_date)
get_failed_deliveries(dealer_id, start_date, end_date, limit)
get_delivery_timeline(dealer_id, start_date, end_date, bucket_size)
get_user_delivery_summary(user_id, dealer_id, start_date, end_date)

-- Archiving
archive.archive_delivery_logs(days_threshold, batch_size)
archive.archive_notifications(days_threshold, batch_size)
archive.get_archive_stats()
archive.get_delivery_logs_combined(user_id, dealer_id, start_date, end_date, limit)
```

---

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] Backup production database
- [ ] Test migrations on staging environment
- [ ] Verify cron jobs are configured correctly
- [ ] Review retention policy settings (90 days, 180 days)
- [ ] Confirm archive schema permissions

### Deployment
- [ ] Apply migration 20251031000004 (notification_log)
- [ ] Apply migration 20251031000005 (retention policy)
- [ ] Verify FK constraint was added
- [ ] Verify cron jobs are scheduled
- [ ] Test helper functions

### Post-Deployment
- [ ] Monitor cron job execution logs
- [ ] Check notification_retention_health view
- [ ] Verify no errors in application logs
- [ ] Test notification center UI
- [ ] Test analytics dashboard
- [ ] Monitor query performance

### Week 1 Post-Deployment
- [ ] Review archive stats daily
- [ ] Monitor failed delivery rate
- [ ] Check table sizes
- [ ] Verify cron jobs executed successfully
- [ ] Gather user feedback

---

## 🎓 Training & Support

### For Developers
- Review all documentation files in `supabase/migrations/`
- Test helper functions in Supabase SQL Editor
- Review RLS policies for security understanding
- Practice writing queries against notification tables

### For System Admins
- Monitor `notification_retention_health` view weekly
- Review cron job logs for archiving
- Set up alerts for high failure rates
- Perform monthly VACUUM ANALYZE

### For Business Users
- Notification center UI for viewing notifications
- Analytics dashboard for delivery metrics
- Failed deliveries report for debugging

---

**Last Updated**: 2025-10-31
**Version**: 2.0.0
**Status**: PRODUCTION-READY
**Next Review**: 2026-01-31 (3 months)
