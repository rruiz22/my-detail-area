# Get Ready Dual-Write - Developer Examples & Integration Guide

## 🎯 For Frontend Developers

### Reading Notifications (Current vs New)

#### **Before:** Reading from get_ready_notifications
```typescript
// Old approach - Get Ready specific table
const { data: notifications, error } = await supabase
  .from('get_ready_notifications')
  .select('*')
  .eq('dealer_id', dealerId)
  .eq('is_read', false)
  .order('created_at', { ascending: false });
```

#### **After:** Reading from notification_log
```typescript
// New approach - Unified notification system
const { data: notifications, error } = await supabase
  .from('notification_log')
  .select('*')
  .eq('module', 'get_ready')  // Filter by module
  .eq('dealer_id', dealerId)
  .eq('is_read', false)
  .order('created_at', { ascending: false });
```

#### **Transition Period:** Read from both (fallback)
```typescript
// Safe dual-read during migration
async function getGetReadyNotifications(dealerId: number) {
  // Try new table first
  const { data: newNotifications, error: newError } = await supabase
    .from('notification_log')
    .select('*')
    .eq('module', 'get_ready')
    .eq('dealer_id', dealerId)
    .eq('is_read', false);

  if (newError) {
    console.warn('notification_log read failed, falling back:', newError);

    // Fallback to old table
    const { data: oldNotifications, error: oldError } = await supabase
      .from('get_ready_notifications')
      .select('*')
      .eq('dealer_id', dealerId)
      .eq('is_read', false);

    if (oldError) throw oldError;
    return oldNotifications;
  }

  return newNotifications;
}
```

---

## 📊 Field Mapping Guide for Frontend

### Notification Object Structure Changes

#### Old Structure (get_ready_notifications)
```typescript
interface GetReadyNotification {
  id: string;
  dealer_id: number;
  user_id: string | null;
  notification_type: 'sla_warning' | 'sla_critical' | 'approval_pending' | 'vehicle_status_change';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  action_label: string;
  action_url: string;
  related_vehicle_id: string | null;
  related_step_id: string | null;
  is_read: boolean;
  read_at: string | null;
  dismissed_at: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}
```

#### New Structure (notification_log)
```typescript
interface NotificationLogEntry {
  id: string;
  dealer_id: number;
  user_id: string | null;
  module: 'get_ready' | 'sales_orders' | 'service_orders' | 'recon_orders' | 'car_wash' | 'contacts' | 'chat' | 'system';
  event: string;  // Maps to old notification_type
  entity_type: string | null;  // 'get_ready_vehicle'
  entity_id: string | null;  // Maps to old related_vehicle_id
  thread_id: string | null;  // Groups notifications by vehicle
  title: string;
  message: string;
  action_label: string | null;
  action_url: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent' | 'critical';  // Note: 'medium' → 'normal'
  is_read: boolean;
  read_at: string | null;
  is_dismissed: boolean;
  dismissed_at: string | null;
  target_channels: string[];  // JSON array: ["in_app", "email", "sms", "push"]
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}
```

### Adapter Function (Backwards Compatibility)
```typescript
/**
 * Converts notification_log entry to get_ready_notifications format
 * Use during transition period for backwards compatibility
 */
function adaptNotificationLogToGetReady(
  notificationLog: NotificationLogEntry
): GetReadyNotification {
  return {
    id: notificationLog.id,
    dealer_id: notificationLog.dealer_id,
    user_id: notificationLog.user_id,
    notification_type: notificationLog.event as any,
    priority: notificationLog.priority === 'normal' ? 'medium' : notificationLog.priority,
    title: notificationLog.title,
    message: notificationLog.message,
    action_label: notificationLog.action_label || '',
    action_url: notificationLog.action_url || '',
    related_vehicle_id: notificationLog.entity_id,
    related_step_id: notificationLog.metadata?.related_step_id || null,
    is_read: notificationLog.is_read,
    read_at: notificationLog.read_at,
    dismissed_at: notificationLog.dismissed_at,
    metadata: notificationLog.metadata?.original_metadata || notificationLog.metadata,
    created_at: notificationLog.created_at,
    updated_at: notificationLog.updated_at,
  };
}

// Usage:
const rawNotifications = await getNotificationsFromLog();
const compatibleNotifications = rawNotifications.map(adaptNotificationLogToGetReady);
```

---

## 🔔 Real-time Subscriptions

### Old Subscription (get_ready_notifications)
```typescript
const subscription = supabase
  .channel('get_ready_notifications')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'get_ready_notifications',
      filter: `dealer_id=eq.${dealerId}`,
    },
    (payload) => {
      console.log('New Get Ready notification:', payload.new);
      // Update UI
    }
  )
  .subscribe();
```

### New Subscription (notification_log)
```typescript
const subscription = supabase
  .channel('notification_log_get_ready')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'notification_log',
      filter: `module=eq.get_ready`,  // Filter by module
    },
    (payload) => {
      const notification = payload.new;

      // Only handle notifications for current dealer
      if (notification.dealer_id !== dealerId) return;

      console.log('New Get Ready notification:', notification);
      // Update UI
    }
  )
  .subscribe();
```

### Unified Notifications Subscription (All Modules)
```typescript
// Subscribe to ALL notifications for user
const subscription = supabase
  .channel('all_notifications')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'notification_log',
      filter: `dealer_id=eq.${dealerId}`,
    },
    (payload) => {
      const notification = payload.new;

      // Route by module
      switch (notification.module) {
        case 'get_ready':
          handleGetReadyNotification(notification);
          break;
        case 'sales_orders':
          handleSalesNotification(notification);
          break;
        case 'service_orders':
          handleServiceNotification(notification);
          break;
        // etc.
      }
    }
  )
  .subscribe();
```

---

## ✅ Marking Notifications as Read

### Old Approach (get_ready_notifications)
```typescript
async function markNotificationRead(notificationId: string) {
  const { error } = await supabase
    .from('get_ready_notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq('id', notificationId);

  if (error) throw error;
}
```

### New Approach (notification_log)
```typescript
async function markNotificationRead(notificationId: string) {
  const { error } = await supabase
    .from('notification_log')
    .update({
      is_read: true,
      // read_at is set automatically by trigger
    })
    .eq('id', notificationId);

  if (error) throw error;
}

// OR use helper function
async function markNotificationReadHelper(notificationId: string) {
  const { data, error } = await supabase
    .rpc('mark_notification_as_read', {
      p_notification_id: notificationId
    });

  if (error) throw error;
  return data;  // Returns true if successful
}
```

### Bulk Mark as Read
```typescript
// Old: Manual loop
async function markAllAsRead(dealerId: number, userId: string) {
  const { data: notifications } = await supabase
    .from('get_ready_notifications')
    .select('id')
    .eq('dealer_id', dealerId)
    .eq('user_id', userId)
    .eq('is_read', false);

  for (const notif of notifications || []) {
    await markNotificationRead(notif.id);
  }
}

// New: Bulk operation with helper function
async function markAllAsRead(notificationIds: string[]) {
  const { data, error } = await supabase
    .rpc('mark_notifications_as_read', {
      p_notification_ids: notificationIds
    });

  if (error) throw error;
  return data;  // Returns count of notifications marked
}
```

---

## 🔍 Querying Patterns

### Filter by Priority
```typescript
// Get only critical/urgent Get Ready notifications
const { data } = await supabase
  .from('notification_log')
  .select('*')
  .eq('module', 'get_ready')
  .eq('dealer_id', dealerId)
  .in('priority', ['urgent', 'critical'])
  .order('created_at', { ascending: false });
```

### Group by Vehicle (Thread)
```typescript
// Get all notifications for a specific vehicle
const { data } = await supabase
  .from('notification_log')
  .select('*')
  .eq('module', 'get_ready')
  .eq('entity_type', 'get_ready_vehicle')
  .eq('entity_id', vehicleId)
  .order('created_at', { ascending: false });

// OR use thread_id
const { data: threadNotifications } = await supabase
  .from('notification_log')
  .select('*')
  .eq('thread_id', `vehicle_${vehicleId}`)
  .order('created_at', { ascending: false });
```

### Count Unread Notifications
```typescript
// Old approach
const { count } = await supabase
  .from('get_ready_notifications')
  .select('*', { count: 'exact', head: true })
  .eq('dealer_id', dealerId)
  .eq('user_id', userId)
  .eq('is_read', false);

// New approach with helper function
const { data: unreadCount, error } = await supabase
  .rpc('get_unread_notification_count', {
    p_user_id: userId,
    p_dealer_id: dealerId,
  });

// Filter by module in frontend if needed
const { data: allNotifications } = await supabase
  .from('notification_log')
  .select('*')
  .eq('dealer_id', dealerId)
  .eq('user_id', userId)
  .eq('is_read', false);

const getReadyUnread = allNotifications?.filter(n => n.module === 'get_ready').length || 0;
```

---

## 🎨 UI Component Examples

### Notification Bell Component
```typescript
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Notification {
  id: string;
  module: string;
  event: string;
  title: string;
  message: string;
  priority: string;
  is_read: boolean;
  created_at: string;
  action_url?: string;
}

export function NotificationBell({ dealerId, userId }: { dealerId: number; userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Load initial notifications
    loadNotifications();

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_log',
          filter: `dealer_id=eq.${dealerId}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications(prev => [newNotif, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [dealerId, userId]);

  async function loadNotifications() {
    const { data, error } = await supabase
      .from('notification_log')
      .select('*')
      .eq('dealer_id', dealerId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Failed to load notifications:', error);
      return;
    }

    setNotifications(data || []);
    setUnreadCount(data?.filter(n => !n.is_read).length || 0);
  }

  async function markAsRead(notificationId: string) {
    const { error } = await supabase
      .rpc('mark_notification_as_read', {
        p_notification_id: notificationId
      });

    if (!error) {
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  }

  return (
    <div className="relative">
      {/* Bell icon with badge */}
      <button className="relative p-2">
        <BellIcon className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification dropdown */}
      <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.map(notif => (
            <div
              key={notif.id}
              className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${
                !notif.is_read ? 'bg-blue-50' : ''
              }`}
              onClick={() => {
                if (!notif.is_read) markAsRead(notif.id);
                if (notif.action_url) window.location.href = notif.action_url;
              }}
            >
              <div className="flex items-start gap-2">
                <ModuleIcon module={notif.module} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{notif.title}</span>
                    <PriorityBadge priority={notif.priority} />
                  </div>
                  <p className="text-sm text-gray-600">{notif.message}</p>
                  <span className="text-xs text-gray-400">
                    {formatRelativeTime(notif.created_at)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### Get Ready Specific Notification List
```typescript
export function GetReadyNotifications({ dealerId }: { dealerId: number }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    loadGetReadyNotifications();
  }, [dealerId]);

  async function loadGetReadyNotifications() {
    const { data, error } = await supabase
      .from('notification_log')
      .select(`
        *,
        get_ready_vehicles!inner(
          id,
          stock_number,
          year,
          make,
          model,
          vin
        )
      `)
      .eq('module', 'get_ready')
      .eq('dealer_id', dealerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load Get Ready notifications:', error);
      return;
    }

    setNotifications(data || []);
  }

  return (
    <div className="space-y-4">
      {notifications.map(notif => (
        <div key={notif.id} className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold">{notif.title}</h4>
              <p className="text-sm text-gray-600">{notif.message}</p>
              {notif.get_ready_vehicles && (
                <p className="text-xs text-gray-500 mt-1">
                  Vehicle: {notif.get_ready_vehicles.year}{' '}
                  {notif.get_ready_vehicles.make}{' '}
                  {notif.get_ready_vehicles.model}
                  (Stock: {notif.get_ready_vehicles.stock_number})
                </p>
              )}
            </div>
            <EventBadge event={notif.event} />
          </div>
          {notif.action_url && (
            <button
              className="mt-2 text-blue-600 text-sm hover:underline"
              onClick={() => window.location.href = notif.action_url!}
            >
              {notif.action_label || 'View'}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

## 🧪 Testing Examples

### Unit Test (Vitest)
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { supabase } from '@/lib/supabase';

describe('Get Ready Notification Integration', () => {
  beforeEach(async () => {
    // Setup: Clear test data
    await supabase.from('notification_log').delete().eq('module', 'get_ready');
  });

  it('should replicate Get Ready notification to notification_log', async () => {
    // Create notification in get_ready_notifications
    const { data: grNotif, error: grError } = await supabase
      .from('get_ready_notifications')
      .insert({
        dealer_id: 1,
        user_id: null,
        notification_type: 'sla_warning',
        priority: 'medium',
        title: 'Test Notification',
        message: 'Test message',
      })
      .select()
      .single();

    expect(grError).toBeNull();
    expect(grNotif).toBeDefined();

    // Wait for trigger to execute (minimal delay)
    await new Promise(resolve => setTimeout(resolve, 100));

    // Verify replication to notification_log
    const { data: nlNotif, error: nlError } = await supabase
      .from('notification_log')
      .select('*')
      .eq('id', grNotif.id)
      .single();

    expect(nlError).toBeNull();
    expect(nlNotif).toBeDefined();
    expect(nlNotif.module).toBe('get_ready');
    expect(nlNotif.event).toBe('sla_warning');
    expect(nlNotif.priority).toBe('normal');  // medium → normal mapping
    expect(nlNotif.title).toBe('Test Notification');
  });

  it('should preserve same UUID across tables', async () => {
    const { data: grNotif } = await supabase
      .from('get_ready_notifications')
      .insert({
        dealer_id: 1,
        notification_type: 'test',
        priority: 'low',
        title: 'UUID Test',
        message: 'Testing UUID preservation',
      })
      .select()
      .single();

    await new Promise(resolve => setTimeout(resolve, 100));

    const { data: nlNotif } = await supabase
      .from('notification_log')
      .select('id')
      .eq('id', grNotif.id)
      .single();

    // Same UUID
    expect(nlNotif.id).toBe(grNotif.id);
  });

  it('should map priority correctly', async () => {
    const priorityMappings = [
      { gr: 'low', nl: 'low' },
      { gr: 'medium', nl: 'normal' },
      { gr: 'high', nl: 'high' },
      { gr: 'critical', nl: 'critical' },
    ];

    for (const mapping of priorityMappings) {
      const { data: grNotif } = await supabase
        .from('get_ready_notifications')
        .insert({
          dealer_id: 1,
          notification_type: 'test',
          priority: mapping.gr,
          title: `Priority ${mapping.gr}`,
          message: 'Test',
        })
        .select()
        .single();

      await new Promise(resolve => setTimeout(resolve, 100));

      const { data: nlNotif } = await supabase
        .from('notification_log')
        .select('priority')
        .eq('id', grNotif.id)
        .single();

      expect(nlNotif.priority).toBe(mapping.nl);
    }
  });
});
```

---

## 📦 React Hook Example

### Unified Notification Hook
```typescript
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface UseNotificationsOptions {
  dealerId: number;
  userId?: string | null;
  module?: string;
  includeRead?: boolean;
  limit?: number;
}

export function useNotifications({
  dealerId,
  userId = null,
  module,
  includeRead = false,
  limit = 50,
}: UseNotificationsOptions) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadNotifications();
    const subscription = subscribeToNotifications();

    return () => {
      subscription?.unsubscribe();
    };
  }, [dealerId, userId, module, includeRead]);

  async function loadNotifications() {
    try {
      setLoading(true);
      let query = supabase
        .from('notification_log')
        .select('*')
        .eq('dealer_id', dealerId);

      if (userId) query = query.eq('user_id', userId);
      if (module) query = query.eq('module', module);
      if (!includeRead) query = query.eq('is_read', false);

      query = query.order('created_at', { ascending: false }).limit(limit);

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;
      setNotifications(data || []);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }

  function subscribeToNotifications() {
    return supabase
      .channel(`notifications_${dealerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_log',
          filter: `dealer_id=eq.${dealerId}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;

          // Apply filters
          if (module && newNotif.module !== module) return;
          if (userId && newNotif.user_id !== userId) return;

          setNotifications(prev => [newNotif, ...prev].slice(0, limit));
        }
      )
      .subscribe();
  }

  async function markAsRead(notificationId: string) {
    try {
      await supabase.rpc('mark_notification_as_read', {
        p_notification_id: notificationId,
      });

      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }

  async function dismiss(notificationId: string) {
    try {
      await supabase.rpc('dismiss_notification', {
        p_notification_id: notificationId,
      });

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error('Failed to dismiss notification:', err);
    }
  }

  return {
    notifications,
    loading,
    error,
    refresh: loadNotifications,
    markAsRead,
    dismiss,
    unreadCount: notifications.filter(n => !n.is_read).length,
  };
}

// Usage:
function GetReadyNotificationList({ dealerId }: { dealerId: number }) {
  const {
    notifications,
    loading,
    markAsRead,
    unreadCount
  } = useNotifications({
    dealerId,
    module: 'get_ready'
  });

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h3>Get Ready Notifications ({unreadCount} unread)</h3>
      {notifications.map(notif => (
        <NotificationCard
          key={notif.id}
          notification={notif}
          onRead={() => markAsRead(notif.id)}
        />
      ))}
    </div>
  );
}
```

---

## 🎯 Migration Checklist for Developers

### Phase 1: Preparation
- [ ] Review field mapping documentation
- [ ] Identify all components reading from get_ready_notifications
- [ ] Create list of affected queries and subscriptions
- [ ] Set up test environment with dual tables

### Phase 2: Update Data Layer
- [ ] Create adapter functions for backwards compatibility
- [ ] Update database hooks to read from notification_log
- [ ] Add module filter ('get_ready') to queries
- [ ] Update type definitions for new structure
- [ ] Handle priority mapping (medium → normal)

### Phase 3: Update Components
- [ ] Replace direct table references
- [ ] Update real-time subscriptions
- [ ] Test notification creation flow
- [ ] Verify mark-as-read functionality
- [ ] Test dismissal behavior

### Phase 4: Testing
- [ ] Unit tests for data adapters
- [ ] Integration tests for notification flow
- [ ] E2E tests for user interactions
- [ ] Performance testing (compare old vs new)
- [ ] Verify real-time updates work

### Phase 5: Deployment
- [ ] Deploy database migration
- [ ] Monitor replication for 24-48 hours
- [ ] Deploy frontend changes (with fallback)
- [ ] Gradual rollout to users
- [ ] Monitor error rates and performance

---

## 📚 Additional Resources

- **Migration SQL**: `20251101235500_get_ready_dual_write_trigger.sql`
- **Verification Guide**: `GET_READY_DUAL_WRITE_VERIFICATION.md`
- **Executive Summary**: `GET_READY_DUAL_WRITE_SUMMARY.md`
- **Database Schema**: See `notification_log` table definition

---

**Questions?** Review the verification guide or check PostgreSQL logs for replication status.
