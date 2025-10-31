# Delivery Tracking - Quick Start Guide

**For Developers** | **Enterprise-grade notification delivery tracking**

---

## 🚀 Quick Integration

### 1. Display Notification Bell (Already Integrated)

The `NotificationBell` component already includes delivery tracking:

```typescript
import { NotificationBell } from '@/components/notifications';

function TopBar() {
  const { dealerId } = useCurrentDealer();

  return (
    <NotificationBell dealerId={dealerId} />
  );
}
```

**What you get**:
- Badge with unread count
- Popover with `SmartNotificationCenter`
- Real-time delivery status for each notification
- Expandable delivery details
- Retry buttons for failed deliveries

---

### 2. Show Delivery Status Badge

```typescript
import { useDeliveryTracking, DeliveryStatusBadge } from '@/components/notifications';

function MyNotificationCard({ notificationId }) {
  const { status, metadata, loading } = useDeliveryTracking(notificationId);

  if (loading) return <Skeleton />;

  return (
    <div>
      <h3>Notification Title</h3>
      <DeliveryStatusBadge
        status={status}
        channel={metadata.channel}
        latencyMs={metadata.latency_ms}
        showLatency={true}
        size="sm"
      />
    </div>
  );
}
```

**Badge States**:
- 🔄 **Pending** (gray, spinning) - Notification being sent
- ✉️ **Sent** (indigo) - Sent to provider
- ✅ **Delivered** (emerald) - Confirmed delivery
- ❌ **Failed** (red) - Delivery failed
- 🖱️ **Clicked** (purple) - User clicked notification
- 👁️ **Read** (gray) - User read notification

---

### 3. Display Delivery Details

```typescript
import { useDeliveryTracking, DeliveryDetails } from '@/components/notifications';

function ExpandedNotificationView({ notificationId }) {
  const { status, metadata } = useDeliveryTracking(notificationId);

  return (
    <div>
      {/* Notification content */}

      {status && metadata && (
        <DeliveryDetails
          notificationId={notificationId}
          status={status}
          metadata={metadata}
        />
      )}
    </div>
  );
}
```

**What you see**:
- 📊 **Timeline**: Visual timeline of delivery stages
- ⏱️ **Metrics**: Latency, retry count, cost
- 🔧 **Provider**: Delivery provider information
- ❌ **Errors**: Error code and message (if failed)
- 🔄 **Retry**: Button to retry failed deliveries

---

### 4. Retry Failed Delivery

```typescript
import { useNotificationRetry } from '@/hooks';

function RetryButton({ notificationId }) {
  const { retryNotification, retrying } = useNotificationRetry();

  const handleRetry = async () => {
    const success = await retryNotification(notificationId);
    if (success) {
      console.log('Notification queued for retry');
    }
  };

  return (
    <Button onClick={handleRetry} disabled={retrying}>
      {retrying ? 'Retrying...' : 'Retry Delivery'}
    </Button>
  );
}
```

**Retry Limits**:
- Max 3 attempts per notification
- Exponential backoff (automatic)
- Toast notifications for feedback

---

### 5. Batch Retry Multiple Notifications

```typescript
import { useNotificationRetry } from '@/hooks';

function FailedNotificationsList({ failedNotifications }) {
  const { retryBatch, retrying } = useNotificationRetry();

  const handleRetryAll = async () => {
    const failedIds = failedNotifications.map(n => n.id);
    const { success, failed } = await retryBatch(failedIds);

    console.log(`Retried: ${success} succeeded, ${failed} failed`);
  };

  return (
    <div>
      <h3>Failed Deliveries</h3>
      <Button onClick={handleRetryAll} disabled={retrying}>
        Retry All ({failedNotifications.length})
      </Button>
    </div>
  );
}
```

---

## 🎨 Customization

### Custom Status Badge Colors

```typescript
import { DeliveryStatusBadge } from '@/components/notifications';

// Small badge (default)
<DeliveryStatusBadge status="delivered" channel="push" size="sm" />

// Medium badge
<DeliveryStatusBadge status="failed" channel="email" size="md" />

// Large badge with latency
<DeliveryStatusBadge
  status="delivered"
  channel="sms"
  size="lg"
  latencyMs={250}
  showLatency={true}
/>
```

### Channel Badge

```typescript
import { ChannelBadge } from '@/components/notifications';

<ChannelBadge channel="push" />
<ChannelBadge channel="email" />
<ChannelBadge channel="sms" />
<ChannelBadge channel="in_app" />
```

---

## 🌍 Internationalization

All components are fully translated in **3 languages**:

**English** (`en`):
```json
"notifications.delivery.status.delivered": "Delivered"
"notifications.delivery.retry_delivery": "Retry Delivery"
```

**Spanish** (`es`):
```json
"notifications.delivery.status.delivered": "Entregado"
"notifications.delivery.retry_delivery": "Reintentar Entrega"
```

**Portuguese** (`pt-BR`):
```json
"notifications.delivery.status.delivered": "Entregue"
"notifications.delivery.retry_delivery": "Tentar Novamente"
```

**Usage in Components**:
```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();

  return (
    <p>{t('notifications.delivery.status.delivered')}</p>
  );
}
```

---

## 🔧 Backend Requirements

### Supabase Table: `notification_delivery_log`

**Required Columns**:
- `notification_id` (UUID) - FK to `notification_log`
- `status` (delivery_status enum)
- `channel` (notification_channel enum)
- `sent_at`, `delivered_at`, `clicked_at`, `read_at`, `failed_at` (TIMESTAMPTZ)
- `latency_ms` (INT)
- `error_code`, `error_message` (TEXT)
- `retry_count` (INT)
- `provider` (TEXT)
- `cost` (NUMERIC)
- `metadata` (JSONB)

### Required RPC Function

```sql
CREATE OR REPLACE FUNCTION retry_notification_delivery(
  p_notification_id UUID,
  p_max_retries INT DEFAULT 3
)
RETURNS BOOLEAN AS $$
DECLARE
  v_retry_count INT;
BEGIN
  -- Get current retry count
  SELECT retry_count INTO v_retry_count
  FROM notification_delivery_log
  WHERE notification_id = p_notification_id;

  -- Check if max retries exceeded
  IF v_retry_count >= p_max_retries THEN
    RETURN FALSE;
  END IF;

  -- Queue for retry (update status to 'pending')
  UPDATE notification_delivery_log
  SET
    status = 'pending',
    retry_count = retry_count + 1,
    updated_at = NOW()
  WHERE notification_id = p_notification_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Real-time Subscription

Real-time updates are automatically handled by `useDeliveryTracking` hook:

**Channel**: `delivery_tracking_{notificationId}`
**Table**: `notification_delivery_log`
**Events**: `INSERT`, `UPDATE`
**Filter**: `notification_id=eq.{notificationId}`

---

## 📱 Mobile Responsive

All components are mobile-first and responsive:

**Breakpoints**:
- `sm`: 640px (small phones)
- `md`: 768px (tablets)
- `lg`: 1024px (desktops)

**Mobile Optimizations**:
- Stacked layout on small screens
- Touch-friendly buttons (min 44px height)
- Scrollable delivery details
- Compact badge sizes

---

## ♿ Accessibility

**WCAG AA Compliant**:
- Semantic HTML (`<button>`, `<dl>`, etc.)
- ARIA labels for icons
- Keyboard navigation (Tab, Enter, Escape)
- Screen reader friendly
- High contrast ratios (4.5:1 minimum)

**Example**:
```typescript
<Button aria-label="Retry notification delivery" onClick={handleRetry}>
  <RefreshCw aria-hidden="true" />
  Retry
</Button>
```

---

## 🧪 Testing

### Unit Test Example

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useDeliveryTracking } from '@/hooks';

describe('useDeliveryTracking', () => {
  it('should fetch delivery status', async () => {
    const { result } = renderHook(() =>
      useDeliveryTracking('notification-123')
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.status).toBe('delivered');
    expect(result.current.metadata.latency_ms).toBeGreaterThan(0);
  });
});
```

### Integration Test Example

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { DeliveryDetails } from '@/components/notifications';

describe('DeliveryDetails', () => {
  it('should retry failed delivery', async () => {
    const mockRetry = jest.fn();

    render(
      <DeliveryDetails
        notificationId="notification-123"
        status="failed"
        metadata={{ retry_count: 1, error_message: 'Timeout' }}
      />
    );

    const retryButton = screen.getByText('Retry Delivery');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(mockRetry).toHaveBeenCalledWith('notification-123');
    });
  });
});
```

---

## 🚨 Common Issues

### Issue: "Status is null"
**Cause**: Delivery log doesn't exist yet (notification pending)
**Solution**: Show loading state or fallback to "Pending"

```typescript
const { status } = useDeliveryTracking(notificationId);

if (!status) {
  return <Badge>Pending</Badge>;
}
```

### Issue: "Real-time updates not working"
**Cause**: Supabase real-time not enabled or network issues
**Solution**: Check subscription status

```typescript
const { status, error } = useDeliveryTracking(notificationId);

if (error) {
  console.error('Delivery tracking error:', error);
}
```

### Issue: "Retry button disabled"
**Cause**: Max retries reached (3 attempts)
**Solution**: Show message to user

```typescript
const canRetry = status === 'failed' && metadata.retry_count < 3;

{!canRetry && (
  <p className="text-sm text-red-600">
    {t('notifications.delivery.retry_limit_message')}
  </p>
)}
```

---

## 📊 Performance Tips

### 1. Memoize Expensive Computations

```typescript
const deliveryStats = useMemo(() => {
  return calculateDeliveryStats(notifications);
}, [notifications]);
```

### 2. Virtual Scrolling for Large Lists

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const virtualizer = useVirtualizer({
  count: notifications.length,
  getScrollElement: () => scrollRef.current,
  estimateSize: () => 80,
});
```

### 3. Debounce Real-time Updates

```typescript
import { debounce } from '@/lib/notification-analytics';

const debouncedRefetch = useMemo(
  () => debounce(refetch, 500),
  [refetch]
);
```

---

## 🎯 Next Steps

1. **Test in Development**: Open NotificationBell and verify delivery badges appear
2. **Create Test Notifications**: Use Supabase to insert test delivery logs
3. **Verify Real-time**: Update delivery status in database and watch UI update
4. **Test Retry**: Click retry on a failed notification
5. **Check Translations**: Switch language in Settings and verify translations

---

## 📚 Additional Resources

- **Full Implementation Guide**: `NOTIFICATION_DELIVERY_TRACKING_IMPLEMENTATION.md`
- **Type Definitions**: `src/types/notification-delivery.ts`
- **Hook Documentation**: `src/hooks/useDeliveryTracking.tsx`
- **Component Examples**: `src/components/notifications/`

---

**Happy Coding! 🚀**

Questions? Check the implementation guide or reach out to the team.
