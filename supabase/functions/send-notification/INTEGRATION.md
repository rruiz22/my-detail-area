# Integration Guide: send-notification Edge Function

This guide shows how to integrate the `send-notification` Edge Function into your My Detail Area application.

## Table of Contents

1. [Frontend Integration](#frontend-integration)
2. [Custom Hook](#custom-hook)
3. [Use Cases](#use-cases)
4. [Best Practices](#best-practices)
5. [Error Handling](#error-handling)

## Frontend Integration

### Basic Usage

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// Send a notification
async function sendNotification() {
  const { data, error } = await supabase.functions.invoke('send-notification', {
    body: {
      userId: 'user-uuid-here',
      dealerId: 42,
      title: 'Order Status Update',
      body: 'Your service order #1234 is now in progress',
      url: '/orders/service/1234'
    }
  })

  if (error) {
    console.error('Failed to send notification:', error)
    return
  }

  console.log(`Notification sent to ${data.sent} device(s)`)
}
```

## Custom Hook

Create a reusable hook for sending notifications throughout your app:

```typescript
// src/hooks/useNotificationSender.ts
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

interface SendNotificationParams {
  userId: string
  dealerId: number
  title: string
  body: string
  url?: string
  data?: Record<string, any>
}

interface SendNotificationResult {
  success: boolean
  sent: number
  failed: number
  tokens: string[]
  errors?: string[]
}

export function useNotificationSender() {
  const { t } = useTranslation()
  const [isSending, setIsSending] = useState(false)
  const [lastResult, setLastResult] = useState<SendNotificationResult | null>(null)

  const sendNotification = async (params: SendNotificationParams) => {
    setIsSending(true)
    setLastResult(null)

    try {
      const { data, error } = await supabase.functions.invoke<SendNotificationResult>(
        'send-notification',
        {
          body: params
        }
      )

      if (error) {
        console.error('[useNotificationSender] Error:', error)
        toast.error(t('notifications.send_failed'))
        return { success: false, error }
      }

      setLastResult(data)

      if (data.sent > 0) {
        toast.success(
          t('notifications.sent_successfully', { count: data.sent })
        )
      } else if (data.failed > 0) {
        toast.warning(t('notifications.all_failed'))
      }

      return { success: true, data }
    } catch (err: any) {
      console.error('[useNotificationSender] Unexpected error:', err)
      toast.error(t('notifications.send_failed'))
      return { success: false, error: err }
    } finally {
      setIsSending(false)
    }
  }

  return {
    sendNotification,
    isSending,
    lastResult
  }
}
```

### Translation Keys

Add these keys to your translation files:

```json
// public/translations/en.json
{
  "notifications": {
    "send_failed": "Failed to send notification",
    "sent_successfully": "Notification sent to {{count}} device(s)",
    "all_failed": "Failed to send notification to all devices"
  }
}

// public/translations/es.json
{
  "notifications": {
    "send_failed": "Error al enviar notificación",
    "sent_successfully": "Notificación enviada a {{count}} dispositivo(s)",
    "all_failed": "Error al enviar notificación a todos los dispositivos"
  }
}

// public/translations/pt-BR.json
{
  "notifications": {
    "send_failed": "Falha ao enviar notificação",
    "sent_successfully": "Notificação enviada para {{count}} dispositivo(s)",
    "all_failed": "Falha ao enviar notificação para todos os dispositivos"
  }
}
```

## Use Cases

### 1. Order Status Change Notification

```typescript
// hooks/useOrderManagement.ts
import { useNotificationSender } from './useNotificationSender'
import { useAuth } from '@/contexts/AuthContext'

export function useOrderManagement() {
  const { sendNotification } = useNotificationSender()
  const { currentDealerId } = useAuth()

  const updateOrderStatus = async (
    orderId: string,
    newStatus: string,
    assignedToUserId: string
  ) => {
    // Update order in database
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)

    if (updateError) {
      throw updateError
    }

    // Send notification to assigned user
    await sendNotification({
      userId: assignedToUserId,
      dealerId: currentDealerId,
      title: 'Order Status Update',
      body: `Order status changed to ${newStatus}`,
      url: `/orders/service/${orderId}`,
      data: {
        type: 'order_status_change',
        orderId,
        newStatus,
        timestamp: new Date().toISOString()
      }
    })
  }

  return { updateOrderStatus }
}
```

### 2. Order Assignment Notification

```typescript
// components/orders/AssignUserDialog.tsx
import { useNotificationSender } from '@/hooks/useNotificationSender'

export function AssignUserDialog({ order }: { order: Order }) {
  const { sendNotification } = useNotificationSender()

  const handleAssign = async (userId: string) => {
    // Update order assignment
    await supabase
      .from('orders')
      .update({ assigned_to: userId })
      .eq('id', order.id)

    // Notify assigned user
    await sendNotification({
      userId,
      dealerId: order.dealer_id,
      title: 'New Order Assignment',
      body: `You have been assigned to ${order.type} order #${order.order_number}`,
      url: `/orders/${order.type}/${order.id}`,
      data: {
        type: 'order_assigned',
        orderId: order.id,
        orderType: order.type,
        orderNumber: order.order_number
      }
    })
  }

  return (
    // Your dialog UI...
  )
}
```

### 3. New Comment/Message Notification

```typescript
// components/orders/CommentsSection.tsx
import { useNotificationSender } from '@/hooks/useNotificationSender'

export function CommentsSection({ order }: { order: Order }) {
  const { sendNotification } = useNotificationSender()
  const { user } = useAuth()

  const handleAddComment = async (comment: string) => {
    // Add comment to database
    await supabase
      .from('order_comments')
      .insert({
        order_id: order.id,
        user_id: user.id,
        comment
      })

    // Notify order followers
    const { data: followers } = await supabase
      .from('order_followers')
      .select('user_id')
      .eq('order_id', order.id)
      .neq('user_id', user.id) // Don't notify yourself

    // Send notifications to all followers
    const promises = followers?.map(follower =>
      sendNotification({
        userId: follower.user_id,
        dealerId: order.dealer_id,
        title: 'New Comment',
        body: `${user.name} commented on order #${order.order_number}`,
        url: `/orders/${order.type}/${order.id}`,
        data: {
          type: 'new_comment',
          orderId: order.id,
          commenterId: user.id,
          commenterName: user.name
        }
      })
    ) || []

    await Promise.allSettled(promises)
  }

  return (
    // Your comments UI...
  )
}
```

### 4. Report Generation Complete

```typescript
// hooks/useReportGenerator.ts
import { useNotificationSender } from './useNotificationSender'

export function useReportGenerator() {
  const { sendNotification } = useNotificationSender()
  const { user, currentDealerId } = useAuth()

  const generateReport = async (reportType: string, filters: any) => {
    // Start report generation
    const { data: report } = await supabase.functions.invoke('generate-excel-report', {
      body: { reportType, filters }
    })

    if (!report) {
      throw new Error('Failed to generate report')
    }

    // Notify user that report is ready
    await sendNotification({
      userId: user.id,
      dealerId: currentDealerId,
      title: 'Report Ready',
      body: `Your ${reportType} report is ready for download`,
      url: '/reports',
      data: {
        type: 'report_ready',
        reportType,
        reportUrl: report.url,
        timestamp: new Date().toISOString()
      }
    })

    return report
  }

  return { generateReport }
}
```

### 5. Scheduled Reminder Notification

```typescript
// Edge Function: scheduled-reminders/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req: Request) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Get orders due for follow-up
  const { data: orders } = await supabase
    .from('orders')
    .select('*, profiles!assigned_to(*)')
    .eq('status', 'pending')
    .lt('follow_up_date', new Date().toISOString())

  // Send reminders
  const promises = orders?.map(order =>
    supabase.functions.invoke('send-notification', {
      body: {
        userId: order.assigned_to,
        dealerId: order.dealer_id,
        title: 'Follow-up Reminder',
        body: `Order #${order.order_number} requires follow-up`,
        url: `/orders/${order.type}/${order.id}`,
        data: {
          type: 'follow_up_reminder',
          orderId: order.id,
          orderNumber: order.order_number
        }
      }
    })
  ) || []

  await Promise.allSettled(promises)

  return new Response(JSON.stringify({ sent: promises.length }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

## Best Practices

### 1. Permission Checks

Always verify the user has permission to send notifications:

```typescript
import { PermissionGuard } from '@/components/permissions/PermissionGuard'

export function NotificationButton({ userId, dealerId }: Props) {
  return (
    <PermissionGuard module="notifications" permission="write">
      <Button onClick={() => sendNotification({ userId, dealerId, ... })}>
        Send Notification
      </Button>
    </PermissionGuard>
  )
}
```

### 2. User Preferences

Check if user wants to receive notifications:

```typescript
async function shouldSendNotification(userId: string): Promise<boolean> {
  const { data: preferences } = await supabase
    .from('user_preferences')
    .select('push_notifications_enabled')
    .eq('user_id', userId)
    .single()

  return preferences?.push_notifications_enabled ?? true
}

// Use in your notification logic
if (await shouldSendNotification(userId)) {
  await sendNotification({ ... })
}
```

### 3. Batching for Multiple Users

When notifying multiple users, use Promise.allSettled to avoid blocking:

```typescript
const userIds = ['user-1', 'user-2', 'user-3']

const promises = userIds.map(userId =>
  sendNotification({
    userId,
    dealerId,
    title: 'Team Announcement',
    body: 'Important update for all team members',
    url: '/announcements'
  })
)

const results = await Promise.allSettled(promises)

// Count successes
const successful = results.filter(
  r => r.status === 'fulfilled' && r.value.success
).length

console.log(`Sent to ${successful}/${userIds.length} users`)
```

### 4. Localized Notifications

Send notifications in the user's preferred language:

```typescript
async function sendLocalizedNotification(
  userId: string,
  titleKey: string,
  bodyKey: string,
  params?: Record<string, any>
) {
  // Get user's language preference
  const { data: profile } = await supabase
    .from('profiles')
    .select('preferred_language')
    .eq('id', userId)
    .single()

  const language = profile?.preferred_language || 'en'

  // Load translations
  const translations = await import(`/public/translations/${language}.json`)

  // Get translated strings
  const title = translations[titleKey].replace(/{{(\w+)}}/g,
    (_, key) => params?.[key] || ''
  )
  const body = translations[bodyKey].replace(/{{(\w+)}}/g,
    (_, key) => params?.[key] || ''
  )

  return sendNotification({
    userId,
    dealerId: params.dealerId,
    title,
    body,
    url: params.url,
    data: params.data
  })
}
```

## Error Handling

### Graceful Degradation

Notifications should never block critical operations:

```typescript
async function updateOrderStatus(orderId: string, newStatus: string) {
  // Critical: Update the order
  const { error } = await supabase
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId)

  if (error) {
    throw error // This should fail
  }

  // Non-critical: Send notification
  try {
    await sendNotification({ ... })
  } catch (notificationError) {
    // Log but don't throw
    console.error('Failed to send notification:', notificationError)
    // Optional: Store for retry later
    await supabase.from('failed_notifications').insert({
      user_id: userId,
      error: notificationError.message
    })
  }
}
```

### Retry Logic

Implement retry logic for transient failures:

```typescript
async function sendNotificationWithRetry(
  params: SendNotificationParams,
  maxRetries = 3
) {
  let lastError: any

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await sendNotification(params)

      if (result.success) {
        return result
      }

      lastError = result.error
    } catch (error) {
      lastError = error
    }

    if (attempt < maxRetries) {
      // Exponential backoff: 1s, 2s, 4s
      await new Promise(resolve =>
        setTimeout(resolve, Math.pow(2, attempt - 1) * 1000)
      )
    }
  }

  // All retries failed
  console.error(`Failed after ${maxRetries} attempts:`, lastError)
  throw new Error(`Failed to send notification after ${maxRetries} attempts`)
}
```

### User Feedback

Provide clear feedback to users:

```typescript
import { toast } from 'sonner'

async function handleSendNotification() {
  const toastId = toast.loading('Sending notification...')

  try {
    const result = await sendNotification({ ... })

    if (result.data.sent > 0) {
      toast.success(
        `Notification sent to ${result.data.sent} device(s)`,
        { id: toastId }
      )
    } else if (result.data.failed > 0) {
      toast.warning(
        'Failed to send notification to all devices',
        { id: toastId }
      )
    }
  } catch (error) {
    toast.error(
      'Failed to send notification. Please try again.',
      { id: toastId }
    )
  }
}
```

## Testing Integration

### Unit Tests

```typescript
// hooks/__tests__/useNotificationSender.test.ts
import { renderHook, act } from '@testing-library/react'
import { useNotificationSender } from '../useNotificationSender'
import { supabase } from '@/lib/supabase'

jest.mock('@/lib/supabase')

describe('useNotificationSender', () => {
  it('sends notification successfully', async () => {
    const mockInvoke = jest.fn().mockResolvedValue({
      data: { success: true, sent: 1, failed: 0, tokens: ['token1'] },
      error: null
    })

    supabase.functions.invoke = mockInvoke

    const { result } = renderHook(() => useNotificationSender())

    await act(async () => {
      await result.current.sendNotification({
        userId: 'user-1',
        dealerId: 42,
        title: 'Test',
        body: 'Test notification'
      })
    })

    expect(mockInvoke).toHaveBeenCalledWith('send-notification', {
      body: {
        userId: 'user-1',
        dealerId: 42,
        title: 'Test',
        body: 'Test notification'
      }
    })

    expect(result.current.lastResult).toEqual({
      success: true,
      sent: 1,
      failed: 0,
      tokens: ['token1']
    })
  })
})
```

## Performance Considerations

1. **Batch Notifications**: Use Promise.allSettled for multiple users
2. **Async Operations**: Don't await notification sends in critical paths
3. **Caching**: Cache user preferences and language settings
4. **Rate Limiting**: Implement rate limiting on the frontend to prevent spam
5. **Background Processing**: Use Edge Functions for scheduled/bulk notifications

## Related Documentation

- [Edge Function README](./README.md)
- [FCM Token Management](../../docs/fcm-tokens.md)
- [Notification Best Practices](../../docs/notifications.md)
