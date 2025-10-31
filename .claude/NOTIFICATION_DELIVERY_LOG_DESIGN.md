# Notification Delivery Log - Enterprise Design Documentation

**Project**: MyDetailArea - Enterprise Notification System
**Created**: 2025-10-31
**Status**: ✅ Ready for Implementation

---

## 📋 Executive Summary

Comprehensive enterprise-grade `notification_delivery_log` table designed to track delivery attempts, engagement metrics, and provider performance across all notification channels (in_app, email, sms, push).

### Key Deliverables

1. ✅ **notification_delivery_log** table with 35 columns
2. ✅ **10 performance indexes** for fast queries
3. ✅ **5 RLS policies** for multi-tenant security
4. ✅ **2 automatic triggers** for latency calculation
5. ✅ **6 analytics RPC functions** for reporting
6. ✅ **Updated rate limiting** using real delivery data

---

## 🗄️ Table Analysis

### Existing Tables (Context)

| Table | Purpose | Status |
|-------|---------|--------|
| `user_notification_preferences_universal` | User preferences per module/channel | ✅ Exists |
| `dealer_notification_rules` | Business rules for routing | ✅ Exists |
| `notification_templates` | Multi-language templates | ✅ Exists |
| `push_subscriptions` | Browser push subscriptions | ✅ Exists |
| `notification_log` | Main notification records | ❌ **Missing** |
| `notification_delivery_log` | Delivery tracking | ❌ **Created** |

### Data Flow

```
Notification Created → notification_log (to be created)
                           ↓
            ┌──────────────┼──────────────┐
            ↓              ↓              ↓              ↓
    in_app_delivery  email_delivery  sms_delivery  push_delivery
            ↓              ↓              ↓              ↓
        notification_delivery_log (one row per channel)
            ↓              ↓              ↓              ↓
        Internal       SendGrid        Twilio         FCM
            ↓              ↓              ↓              ↓
        Engagement   Webhooks/Opens  Delivery Status  Push Receipt
            ↓              ↓              ↓              ↓
        Analytics Dashboard (Real-time Metrics)
```

---

## 📊 Schema Design: notification_delivery_log

### Table Structure (35 Columns)

#### **1. Primary Identification**
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```

#### **2. Relationships**
```sql
notification_id UUID           -- FK to notification_log (nullable until created)
queue_id UUID                  -- Optional batch/scheduled queue tracking
```

#### **3. Multi-Tenant Scoping**
```sql
user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
dealer_id BIGINT NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE
```

#### **4. Channel & Provider**
```sql
channel VARCHAR(20) NOT NULL   -- 'in_app', 'email', 'sms', 'push'
provider VARCHAR(50)           -- 'sendgrid', 'twilio', 'fcm', 'internal'
provider_message_id VARCHAR(255) -- External provider message ID
provider_metadata JSONB        -- Raw provider response
```

#### **5. Delivery Lifecycle**
```sql
status VARCHAR(20) NOT NULL DEFAULT 'pending'
-- States: pending → sent → delivered → failed/bounced/rejected

error_code VARCHAR(50)
error_message TEXT
retry_count INTEGER DEFAULT 0
max_retries INTEGER DEFAULT 3
```

#### **6. Engagement Tracking**
```sql
opened_at TIMESTAMPTZ
opened_by_ip VARCHAR(45)
opened_user_agent TEXT

clicked_at TIMESTAMPTZ
clicked_by_ip VARCHAR(45)
clicked_user_agent TEXT
action_url_clicked TEXT

open_count INTEGER DEFAULT 0
click_count INTEGER DEFAULT 0
```

#### **7. Performance Metrics**
```sql
sent_at TIMESTAMPTZ
delivered_at TIMESTAMPTZ

send_latency_ms INTEGER        -- Auto-calculated
delivery_latency_ms INTEGER    -- Auto-calculated
```

#### **8. Recipient Information**
```sql
recipient_email VARCHAR(255)   -- For email channel
recipient_phone VARCHAR(20)    -- For SMS (E.164 format)
recipient_device_token TEXT    -- For push (FCM/APNS)
```

#### **9. Content Snapshot**
```sql
title TEXT
message TEXT
notification_data JSONB        -- Full payload at delivery time
```

#### **10. Metadata & Audit**
```sql
metadata JSONB                 -- campaign_id, template_id, priority, module
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

---

## 🚀 Performance Optimization

### Index Strategy (10 Indexes)

#### **High-Priority Indexes**

1. **Dealer + Created Date** (Most Common Query)
   ```sql
   CREATE INDEX idx_notif_delivery_dealer_created
       ON notification_delivery_log(dealer_id, created_at DESC);
   ```
   **Usage**: Dashboard analytics, recent deliveries
   **Cardinality**: High (dealer_id × timestamp)

2. **Notification ID Lookup**
   ```sql
   CREATE INDEX idx_notif_delivery_notification_id
       ON notification_delivery_log(notification_id)
       WHERE notification_id IS NOT NULL;
   ```
   **Usage**: "Where did this notification go?" debugging
   **Partial**: Only non-null notification_id

3. **User Delivery History**
   ```sql
   CREATE INDEX idx_notif_delivery_user_created
       ON notification_delivery_log(user_id, created_at DESC);
   ```
   **Usage**: User profile analytics, per-user engagement

4. **Channel + Status Analytics**
   ```sql
   CREATE INDEX idx_notif_delivery_channel_status
       ON notification_delivery_log(dealer_id, channel, status, created_at DESC);
   ```
   **Usage**: Delivery rates by channel, failed deliveries

#### **Provider Integration Indexes**

5. **Provider Message ID** (Webhook Correlation)
   ```sql
   CREATE INDEX idx_notif_delivery_provider_msg_id
       ON notification_delivery_log(provider, provider_message_id)
       WHERE provider_message_id IS NOT NULL;
   ```
   **Usage**: Match webhook callbacks from SendGrid/Twilio/FCM

#### **Operational Indexes**

6. **Failed Deliveries** (Retry Queue)
   ```sql
   CREATE INDEX idx_notif_delivery_failed
       ON notification_delivery_log(dealer_id, status, created_at DESC)
       WHERE status IN ('failed', 'bounced', 'rejected');
   ```
   **Usage**: Retry job queue, error analytics

7. **Opened Notifications** (Engagement)
   ```sql
   CREATE INDEX idx_notif_delivery_opened
       ON notification_delivery_log(dealer_id, channel, opened_at DESC)
       WHERE opened_at IS NOT NULL;
   ```
   **Usage**: Open rate analytics, engagement reports

8. **Clicked Notifications** (CTR)
   ```sql
   CREATE INDEX idx_notif_delivery_clicked
       ON notification_delivery_log(dealer_id, channel, clicked_at DESC)
       WHERE clicked_at IS NOT NULL;
   ```
   **Usage**: Click-through rate analytics

#### **JSONB Indexes**

9. **Metadata GIN Index**
   ```sql
   CREATE INDEX idx_notif_delivery_metadata_gin
       ON notification_delivery_log USING GIN(metadata);
   ```
   **Usage**: Filter by campaign_id, template_id, module, entity_type

10. **Provider Metadata GIN Index**
    ```sql
    CREATE INDEX idx_notif_delivery_provider_metadata_gin
        ON notification_delivery_log USING GIN(provider_metadata);
    ```
    **Usage**: Debug provider-specific issues

### Index Size Estimation

Assuming 1M deliveries/month/dealer:

| Index | Type | Estimated Size | Justification |
|-------|------|----------------|---------------|
| dealer_created | B-tree | ~50 MB | Composite, high cardinality |
| notification_id | B-tree | ~20 MB | UUID index |
| user_created | B-tree | ~30 MB | Composite |
| channel_status | B-tree | ~40 MB | 4-column composite |
| provider_msg_id | B-tree | ~15 MB | Partial index |
| failed | B-tree | ~5 MB | Small (5-10% of data) |
| opened | B-tree | ~10 MB | Partial (20-30% of data) |
| clicked | B-tree | ~5 MB | Partial (5-10% of data) |
| metadata_gin | GIN | ~60 MB | JSONB full index |
| provider_gin | GIN | ~50 MB | JSONB full index |

**Total Index Size**: ~285 MB for 1M rows (acceptable)

---

## 🔒 Security: Row Level Security (RLS)

### Policy Design

#### **Policy 1: Users View Own Deliveries**
```sql
CREATE POLICY "delivery_log_users_view_own"
    ON notification_delivery_log
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
```
**Scope**: Users see only their own delivery logs
**Performance**: Uses `idx_notif_delivery_user_created`

#### **Policy 2: Dealer Admins View All**
```sql
CREATE POLICY "delivery_log_dealer_admins_view_all"
    ON notification_delivery_log
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM dealer_memberships dm
            WHERE dm.user_id = auth.uid()
            AND dm.dealer_id = notification_delivery_log.dealer_id
            AND dm.role IN ('admin', 'manager')
            AND dm.is_active = true
        )
    );
```
**Scope**: Admins see all dealership deliveries
**Performance**: Join with dealer_memberships (indexed)

#### **Policy 3: System Admins View All**
```sql
CREATE POLICY "delivery_log_system_admins_view_all"
    ON notification_delivery_log
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.user_type = 'system_admin'
        )
    );
```
**Scope**: Global visibility for support/debugging

#### **Policy 4: System Insert Only**
```sql
CREATE POLICY "delivery_log_system_insert_only"
    ON notification_delivery_log
    FOR INSERT
    TO service_role
    WITH CHECK (true);
```
**Security**: Frontend cannot insert directly (prevents tampering)
**Usage**: Only Edge Functions with service_role can insert

#### **Policy 5: System Update Only**
```sql
CREATE POLICY "delivery_log_system_update"
    ON notification_delivery_log
    FOR UPDATE
    TO service_role
    USING (true) WITH CHECK (true);
```
**Usage**: Webhook callbacks update status/engagement

### Security Recommendations

1. ✅ **No Direct Frontend Writes**: All inserts via Edge Functions
2. ✅ **Read-Only for Users**: SELECT only, no UPDATE/DELETE
3. ✅ **Webhook Authentication**: Validate webhook signatures before updates
4. ✅ **PII Protection**: Email/phone visible only to authorized users
5. ✅ **Audit Trail**: created_at/updated_at immutable

---

## ⚡ Automatic Triggers

### Trigger 1: Updated At Timestamp
```sql
CREATE TRIGGER update_notif_delivery_log_updated_at
    BEFORE UPDATE ON notification_delivery_log
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```
**Purpose**: Auto-maintain audit trail

### Trigger 2: Latency Auto-Calculation
```sql
CREATE TRIGGER trigger_calculate_delivery_latency
    BEFORE INSERT OR UPDATE ON notification_delivery_log
    FOR EACH ROW
    EXECUTE FUNCTION calculate_delivery_latency();
```
**Logic**:
- `send_latency_ms` = (sent_at - created_at) × 1000
- `delivery_latency_ms` = (delivered_at - sent_at) × 1000

**Benefits**:
- No manual calculation needed
- Consistent performance metrics
- Automatic on status updates from webhooks

---

## 📈 Analytics Functions (6 RPCs)

### Function 1: get_delivery_metrics
```sql
SELECT * FROM get_delivery_metrics(dealer_id, start_date, end_date);
```

**Returns**:
- `total_sent`, `total_delivered`, `total_failed` per channel
- `delivery_rate`, `failure_rate` percentages
- `avg_send_latency_ms`, `p95_send_latency_ms`
- `avg_delivery_latency_ms`, `p95_delivery_latency_ms`

**Use Case**: Executive dashboard, channel performance comparison

### Function 2: get_engagement_metrics
```sql
SELECT * FROM get_engagement_metrics(dealer_id, start_date, end_date);
```

**Returns**:
- `total_opened`, `total_clicked` counts
- `open_rate`, `click_through_rate`, `click_to_open_rate`
- `avg_time_to_open_minutes`, `avg_time_to_click_minutes`

**Use Case**: Marketing analytics, email campaign effectiveness

### Function 3: get_provider_performance
```sql
SELECT * FROM get_provider_performance(dealer_id, start_date, end_date);
```

**Returns**:
- `success_rate` per provider
- `avg_delivery_time_seconds`, `p95_delivery_time_seconds`
- `total_retries`, `avg_retries_per_failure`

**Use Case**: Provider comparison, SLA monitoring

### Function 4: get_failed_deliveries
```sql
SELECT * FROM get_failed_deliveries(dealer_id, start_date, end_date, 50);
```

**Returns**: Last N failed deliveries with error details

**Use Case**: Debugging, customer support, error analysis

### Function 5: get_delivery_timeline
```sql
SELECT * FROM get_delivery_timeline(dealer_id, start, end, 'day');
```

**Returns**: Time-series data (hourly/daily/weekly buckets)

**Use Case**: Charts, trend analysis, anomaly detection

### Function 6: get_user_delivery_summary
```sql
SELECT * FROM get_user_delivery_summary(user_id, dealer_id, start, end);
```

**Returns**: Per-user engagement summary, preferred channel

**Use Case**: User profile, personalization insights

---

## 🔄 Integration Points

### 1. Enhanced Notification Engine (Edge Function)

**File**: `supabase/functions/enhanced-notification-engine/index.ts`

**Integration Code**:
```typescript
async function logDelivery(params: {
  notificationId?: string;
  queueId?: string;
  userId: string;
  dealerId: number;
  channel: 'in_app' | 'email' | 'sms' | 'push';
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'rejected';
  provider?: string;
  providerMessageId?: string;
  errorMessage?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  title: string;
  message: string;
}) {
  const { error } = await supabaseAdmin
    .from('notification_delivery_log')
    .insert({
      notification_id: params.notificationId,
      queue_id: params.queueId,
      user_id: params.userId,
      dealer_id: params.dealerId,
      channel: params.channel,
      status: params.status,
      provider: params.provider,
      provider_message_id: params.providerMessageId,
      error_message: params.errorMessage,
      recipient_email: params.recipientEmail,
      recipient_phone: params.recipientPhone,
      title: params.title,
      message: params.message,
      sent_at: params.status !== 'pending' ? new Date().toISOString() : null,
      delivered_at: params.status === 'delivered' ? new Date().toISOString() : null
    });

  if (error) {
    console.error('Failed to log delivery:', error);
    // Don't throw - logging failure shouldn't block delivery
  }
}

// Usage in channel handlers
try {
  const result = await sendEmailViaSendGrid(emailData);
  await logDelivery({
    userId: notification.user_id,
    dealerId: notification.dealer_id,
    channel: 'email',
    status: 'sent',
    provider: 'sendgrid',
    providerMessageId: result.messageId,
    recipientEmail: emailData.to,
    title: notification.title,
    message: notification.message
  });
} catch (error) {
  await logDelivery({
    userId: notification.user_id,
    dealerId: notification.dealer_id,
    channel: 'email',
    status: 'failed',
    provider: 'sendgrid',
    errorMessage: error.message,
    recipientEmail: emailData.to,
    title: notification.title,
    message: notification.message
  });
  throw error;
}
```

### 2. Webhook Handlers (Provider Callbacks)

**SendGrid Webhook** (Email Opens/Clicks):
```typescript
// POST /api/webhooks/sendgrid
export async function handleSendGridWebhook(request: Request) {
  const events = await request.json();

  for (const event of events) {
    if (event.event === 'delivered') {
      await supabaseAdmin
        .from('notification_delivery_log')
        .update({
          status: 'delivered',
          delivered_at: new Date(event.timestamp * 1000).toISOString()
        })
        .eq('provider_message_id', event.sg_message_id);
    }

    if (event.event === 'open') {
      await supabaseAdmin
        .from('notification_delivery_log')
        .update({
          opened_at: new Date(event.timestamp * 1000).toISOString(),
          opened_by_ip: event.ip,
          opened_user_agent: event.useragent,
          open_count: supabase.raw('open_count + 1')
        })
        .eq('provider_message_id', event.sg_message_id);
    }

    if (event.event === 'click') {
      await supabaseAdmin
        .from('notification_delivery_log')
        .update({
          clicked_at: new Date(event.timestamp * 1000).toISOString(),
          clicked_by_ip: event.ip,
          clicked_user_agent: event.useragent,
          action_url_clicked: event.url,
          click_count: supabase.raw('click_count + 1')
        })
        .eq('provider_message_id', event.sg_message_id);
    }
  }

  return new Response('OK', { status: 200 });
}
```

**Twilio Webhook** (SMS Status):
```typescript
// POST /api/webhooks/twilio
export async function handleTwilioWebhook(request: Request) {
  const form = await request.formData();
  const messageSid = form.get('MessageSid');
  const messageStatus = form.get('MessageStatus');

  const statusMap = {
    'sent': 'sent',
    'delivered': 'delivered',
    'failed': 'failed',
    'undelivered': 'bounced'
  };

  await supabaseAdmin
    .from('notification_delivery_log')
    .update({
      status: statusMap[messageStatus] || messageStatus,
      delivered_at: messageStatus === 'delivered' ? new Date().toISOString() : null,
      provider_metadata: supabase.raw(`provider_metadata || '${JSON.stringify({ twilio_status: messageStatus })}'::jsonb`)
    })
    .eq('provider_message_id', messageSid);

  return new Response('OK', { status: 200 });
}
```

### 3. Frontend Analytics Hook

**File**: `src/hooks/useNotificationDeliveryMetrics.ts`
```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface DateRange {
  start: string;
  end: string;
}

export function useNotificationDeliveryMetrics(
  dealerId: number,
  dateRange: DateRange
) {
  return useQuery({
    queryKey: ['notification-delivery-metrics', dealerId, dateRange],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_delivery_metrics', {
        p_dealer_id: dealerId,
        p_start_date: dateRange.start,
        p_end_date: dateRange.end
      });

      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 30 * 1000 // Auto-refresh every 30s
  });
}

export function useEngagementMetrics(dealerId: number, dateRange: DateRange) {
  return useQuery({
    queryKey: ['engagement-metrics', dealerId, dateRange],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_engagement_metrics', {
        p_dealer_id: dealerId,
        p_start_date: dateRange.start,
        p_end_date: dateRange.end
      });

      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000
  });
}
```

---

## 🎯 Business Value & KPIs

### Metrics Enabled

1. **Delivery Performance**
   - Delivery rate by channel (target: >95% for email, >98% for SMS)
   - Average delivery time (target: <30s email, <5s SMS)
   - Failed delivery rate (target: <3%)

2. **Engagement Analytics**
   - Email open rate (industry avg: 20-25%)
   - Click-through rate (industry avg: 2-5%)
   - Time to engagement (optimize send timing)

3. **Provider Performance**
   - SendGrid vs Twilio reliability comparison
   - Cost per delivery (integrate with billing data)
   - SLA compliance tracking

4. **User Insights**
   - Preferred notification channel per user
   - Engagement patterns (time of day, frequency)
   - Channel effectiveness per user segment

---

## ✅ Validation & Testing

### Test Scenarios

#### 1. Delivery Tracking
```sql
-- Insert test delivery
INSERT INTO notification_delivery_log (
  user_id, dealer_id, channel, status, provider,
  title, message, recipient_email
) VALUES (
  'user-uuid', 1, 'email', 'sent', 'sendgrid',
  'Test Notification', 'Test message', 'test@example.com'
);

-- Verify auto-calculated latency (should be NULL initially)
SELECT send_latency_ms, delivery_latency_ms
FROM notification_delivery_log
WHERE id = 'inserted-id';

-- Update to delivered (triggers latency calculation)
UPDATE notification_delivery_log
SET sent_at = NOW(), delivered_at = NOW() + INTERVAL '2 seconds'
WHERE id = 'inserted-id';

-- Verify latencies calculated
SELECT send_latency_ms, delivery_latency_ms
FROM notification_delivery_log
WHERE id = 'inserted-id';
```

#### 2. Rate Limiting
```sql
-- Test rate limit function
SELECT check_user_rate_limit(
  'user-uuid'::UUID,
  1::BIGINT,
  'sales_orders',
  'sms'
);
-- Should return TRUE (under limit)

-- Insert 3 SMS deliveries (hourly limit = 3)
INSERT INTO notification_delivery_log (user_id, dealer_id, channel, status)
VALUES
  ('user-uuid', 1, 'sms', 'sent'),
  ('user-uuid', 1, 'sms', 'sent'),
  ('user-uuid', 1, 'sms', 'sent');

-- Test rate limit again
SELECT check_user_rate_limit('user-uuid'::UUID, 1::BIGINT, 'sales_orders', 'sms');
-- Should return FALSE (limit exceeded)
```

#### 3. Analytics Functions
```sql
-- Test delivery metrics
SELECT * FROM get_delivery_metrics(
  1::BIGINT,
  NOW() - INTERVAL '7 days',
  NOW()
);

-- Test engagement metrics
SELECT * FROM get_engagement_metrics(
  1::BIGINT,
  NOW() - INTERVAL '30 days',
  NOW()
);

-- Test provider performance
SELECT * FROM get_provider_performance(
  1::BIGINT,
  NOW() - INTERVAL '7 days',
  NOW()
);
```

#### 4. RLS Policies
```sql
-- As regular user
SET ROLE authenticated;
SET request.jwt.claims.sub = 'user-uuid';

SELECT COUNT(*) FROM notification_delivery_log;
-- Should only see own deliveries

-- As dealer admin
SET request.jwt.claims.sub = 'admin-uuid';

SELECT COUNT(*) FROM notification_delivery_log;
-- Should see all dealership deliveries
```

---

## 📝 Migration Checklist

### Pre-Migration
- [ ] Review schema design with team
- [ ] Estimate table size for 1-year retention
- [ ] Plan index maintenance strategy
- [ ] Set up monitoring alerts

### Migration Execution
- [ ] Run `20251031000001_create_notification_delivery_log.sql`
- [ ] Run `20251031000002_create_delivery_analytics_functions.sql`
- [ ] Run `20251031000003_update_rate_limit_function.sql`
- [ ] Verify all indexes created successfully
- [ ] Test RLS policies with different user roles

### Post-Migration
- [ ] Integrate with enhanced-notification-engine Edge Function
- [ ] Set up webhook endpoints (SendGrid, Twilio, FCM)
- [ ] Create analytics dashboard UI
- [ ] Document provider message ID formats
- [ ] Train support team on failed delivery debugging

### Future Enhancements (Phase 2)
- [ ] Create `notification_log` table (main notification records)
- [ ] Add FK constraint: `notification_id → notification_log(id)`
- [ ] Implement retention policy (archive after 90 days)
- [ ] Create materialized views for heavy analytics
- [ ] Add A/B testing metadata columns

---

## 🔮 Future Considerations

### Scalability
- **Partitioning**: Partition by `created_at` when table exceeds 10M rows
- **Archival**: Move data >90 days to cold storage table
- **Materialized Views**: Pre-aggregate daily metrics for faster dashboards

### Advanced Features
- **Delivery Predictions**: ML model to predict delivery success
- **Smart Retry**: Exponential backoff based on error type
- **Channel Optimization**: Auto-select best channel per user
- **Anomaly Detection**: Alert on unusual failure spikes

---

## 📚 References

- [PHASE_1_CRITICAL_FIXES.md](./PHASE_1_CRITICAL_FIXES.md) - Task 2 requirements
- [SendGrid Event Webhook](https://docs.sendgrid.com/for-developers/tracking-events/event)
- [Twilio SMS Status Callbacks](https://www.twilio.com/docs/sms/api/message-resource#message-status-values)
- [FCM HTTP Protocol](https://firebase.google.com/docs/cloud-messaging/http-server-ref)

---

**Documentation Status**: ✅ Complete
**Review Status**: ✅ Ready for Implementation
**Last Updated**: 2025-10-31
