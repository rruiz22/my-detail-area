---
name: mydetailarea-notifications
description: Internal team notification system for MyDetailArea staff collaboration. Manages real-time alerts for order updates, task assignments, follower notifications, @mentions, status changes, and team coordination. NOT for external customer communication - exclusively for dealership staff and team collaboration. Use when implementing activity feeds, follower notifications, assignment alerts, or team coordination features.
license: MIT
---

# MyDetailArea Internal Notifications System

**Scope:** Internal staff notifications and team collaboration ONLY
**NOT for:** External customer communication (future feature)

## Purpose

Comprehensive internal notification system for dealership staff to stay coordinated on orders, tasks, and team activities. Enables real-time collaboration through followers, mentions, assignments, and status updates.

## When to Use

Use this skill when:
- Implementing follower notifications for order updates
- Creating @mention alerts in comments
- Building task assignment notifications
- Sending status change alerts to team
- Implementing activity feed updates
- Creating shift handoff notifications
- Building team coordination alerts
- Implementing due date reminders

**NOT for:**
- ❌ Customer emails (external communication)
- ❌ Marketing campaigns
- ❌ Client-facing notifications

## System Architecture

### Notification Channels

**1. In-App Notifications (Primary)**
- Real-time bell icon updates
- Activity feed in sidebar
- Toast notifications for urgent items
- Badge counts on navigation

**2. Email Notifications (Secondary)**
- Digest emails for activity summary
- Urgent alerts (overdue tasks, critical updates)
- Configurable per-user preferences

**3. Browser Push (Optional)**
- Desktop notifications
- Requires user permission
- Real-time even when tab inactive

### Database Schema

```sql
-- Notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES auth.users(id),

  -- Content
  type TEXT NOT NULL, -- 'order_update', 'mention', 'assignment', etc.
  title TEXT NOT NULL,
  message TEXT NOT NULL,

  -- Context
  entity_type TEXT, -- 'order', 'invoice', 'vehicle', etc.
  entity_id UUID,
  action_url TEXT, -- Deep link to entity

  -- Actor
  actor_id UUID REFERENCES auth.users(id),
  actor_name TEXT,

  -- Status
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  delivered BOOLEAN DEFAULT false,
  delivered_at TIMESTAMPTZ,

  -- Metadata
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  channel TEXT DEFAULT 'in_app', -- 'in_app', 'email', 'push'
  metadata JSONB DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(recipient_id, read) WHERE read = false;
CREATE INDEX idx_notifications_type ON notifications(type);

-- RLS policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their notifications"
ON notifications FOR SELECT
USING (recipient_id = auth.uid());

CREATE POLICY "Users can mark their notifications as read"
ON notifications FOR UPDATE
USING (recipient_id = auth.uid());
```

```sql
-- Notification preferences table
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,

  -- Channel preferences
  enable_in_app BOOLEAN DEFAULT true,
  enable_email BOOLEAN DEFAULT true,
  enable_push BOOLEAN DEFAULT false,

  -- Notification type preferences
  notify_order_updates BOOLEAN DEFAULT true,
  notify_mentions BOOLEAN DEFAULT true,
  notify_assignments BOOLEAN DEFAULT true,
  notify_status_changes BOOLEAN DEFAULT true,
  notify_comments BOOLEAN DEFAULT true,
  notify_followers BOOLEAN DEFAULT true,

  -- Digest settings
  email_digest_frequency TEXT DEFAULT 'daily', -- 'realtime', 'hourly', 'daily', 'never'
  quiet_hours_start TIME,
  quiet_hours_end TIME,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own preferences"
ON notification_preferences FOR ALL
USING (user_id = auth.uid());
```

## Notification Types

### 1. Follower Notifications

**Trigger:** When order/vehicle/task is updated and user is following it

```typescript
interface FollowerNotification {
  type: 'follower_update';
  title: string; // "Order #12345 updated"
  message: string; // "Status changed to In Progress"
  entity_type: 'order' | 'vehicle' | 'recon';
  entity_id: string;
  action_url: string; // "/orders/12345"
  actor_id: string;
  actor_name: string;
}

// Example
{
  type: 'follower_update',
  title: 'Service Order #SO-2025-001 Updated',
  message: 'John Doe changed status to "In Progress"',
  entity_type: 'order',
  entity_id: 'uuid-123',
  action_url: '/service/uuid-123',
  actor_id: 'uuid-456',
  actor_name: 'John Doe'
}
```

**Implementation:**
```typescript
// Hook: useCreateFollowerNotification
async function notifyFollowers(orderId: string, updateMessage: string) {
  // Get all followers of this order
  const { data: followers } = await supabase
    .from('order_followers')
    .select('user_id, users(name)')
    .eq('order_id', orderId)
    .neq('user_id', auth.uid()); // Exclude actor

  // Create notification for each follower
  const notifications = followers.map(follower => ({
    recipient_id: follower.user_id,
    type: 'follower_update',
    title: `Order #${orderNumber} Updated`,
    message: updateMessage,
    entity_type: 'order',
    entity_id: orderId,
    action_url: `/orders/${orderId}`,
    actor_id: auth.uid(),
    actor_name: currentUser.name,
    priority: 'normal'
  }));

  await supabase.from('notifications').insert(notifications);

  // Real-time broadcast
  await supabase.channel('notifications').send({
    type: 'broadcast',
    event: 'new_notification',
    payload: { recipients: followers.map(f => f.user_id) }
  });
}
```

### 2. @Mention Notifications

**Trigger:** User is mentioned in comment

```typescript
// Detect mentions in text
function extractMentions(text: string): string[] {
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const mentions = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[2]); // User ID
  }

  return mentions;
}

// Create mention notifications
async function notifyMentions(comment: Comment) {
  const mentionedUserIds = extractMentions(comment.content);

  const notifications = mentionedUserIds.map(userId => ({
    recipient_id: userId,
    type: 'mention',
    title: 'You were mentioned in a comment',
    message: `${comment.author_name} mentioned you: "${truncate(comment.content, 100)}"`,
    entity_type: 'comment',
    entity_id: comment.id,
    action_url: comment.entity_url,
    actor_id: comment.author_id,
    actor_name: comment.author_name,
    priority: 'high'
  }));

  await supabase.from('notifications').insert(notifications);
}
```

### 3. Assignment Notifications

**Trigger:** Task/order assigned to user

```typescript
async function notifyAssignment(assigneeId: string, orderId: string, assignerName: string) {
  await supabase.from('notifications').insert({
    recipient_id: assigneeId,
    type: 'assignment',
    title: 'New Assignment',
    message: `${assignerName} assigned you to Order #${orderNumber}`,
    entity_type: 'order',
    entity_id: orderId,
    action_url: `/orders/${orderId}`,
    actor_id: auth.uid(),
    actor_name: assignerName,
    priority: 'high'
  });
}
```

### 4. Status Change Notifications

**Trigger:** Order status changes

```typescript
async function notifyStatusChange(orderId: string, oldStatus: string, newStatus: string) {
  // Notify assigned user + followers
  const recipients = await getOrderStakeholders(orderId);

  const notifications = recipients.map(user => ({
    recipient_id: user.id,
    type: 'status_change',
    title: `Order Status Updated`,
    message: `Status changed from "${oldStatus}" to "${newStatus}"`,
    entity_type: 'order',
    entity_id: orderId,
    action_url: `/orders/${orderId}`,
    priority: getStatusPriority(newStatus) // 'completed' = high, others = normal
  }));

  await supabase.from('notifications').insert(notifications);
}
```

### 5. Due Date Reminders

**Trigger:** Scheduled check for approaching due dates

```typescript
// Edge Function: scheduled-notifications
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  // Run daily at 8 AM
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Find orders due tomorrow
  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, due_date, assigned_to, users(name)')
    .gte('due_date', tomorrow.toISOString().split('T')[0])
    .lt('due_date', new Date(tomorrow.getTime() + 86400000).toISOString().split('T')[0])
    .eq('status', 'in_progress');

  // Create reminders
  const notifications = orders.map(order => ({
    recipient_id: order.assigned_to,
    type: 'due_date_reminder',
    title: 'Order Due Tomorrow',
    message: `Order #${order.order_number} is due tomorrow`,
    entity_type: 'order',
    entity_id: order.id,
    action_url: `/orders/${order.id}`,
    priority: 'high'
  }));

  await supabase.from('notifications').insert(notifications);

  return new Response(JSON.stringify({ sent: notifications.length }));
});
```

## UI Components

### Notification Bell Component

```typescript
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/hooks/useNotifications';

export function NotificationBell() {
  const { data: notifications, unreadCount } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0">
        <div className="border-b p-4">
          <h3 className="font-semibold">Notifications</h3>
          <p className="text-sm text-muted-foreground">
            {unreadCount} unread
          </p>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {notifications?.map(notification => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onRead={() => markAsRead(notification.id)}
            />
          ))}
        </div>

        <div className="border-t p-2">
          <Button variant="ghost" size="sm" className="w-full">
            View All Notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

### Notification Item Component

```typescript
function NotificationItem({ notification, onRead }: NotificationItemProps) {
  const router = useRouter();

  const handleClick = () => {
    onRead();
    router.push(notification.action_url);
  };

  return (
    <div
      className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
        !notification.read ? 'bg-blue-50/50' : ''
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-full bg-gray-100">
          {getNotificationIcon(notification.type)}
        </div>

        <div className="flex-1">
          <p className="font-medium text-sm">{notification.title}</p>
          <p className="text-sm text-muted-foreground">{notification.message}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(notification.created_at))} ago
          </p>
        </div>

        {!notification.read && (
          <div className="w-2 h-2 rounded-full bg-blue-600" />
        )}
      </div>
    </div>
  );
}
```

### Activity Feed Component

```typescript
export function ActivityFeed({ entityType, entityId }: ActivityFeedProps) {
  const { data: activities } = useQuery({
    queryKey: ['activities', entityType, entityId],
    queryFn: async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*, actor:users(name, avatar_url)')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .limit(20);
      return data;
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Feed</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities?.map(activity => (
            <div key={activity.id} className="flex items-start gap-3">
              <Avatar>
                <AvatarImage src={activity.actor?.avatar_url} />
                <AvatarFallback>{activity.actor_name?.[0]}</AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <p className="text-sm">
                  <span className="font-medium">{activity.actor_name}</span>
                  {' '}
                  <span className="text-muted-foreground">{activity.message}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(activity.created_at), 'MMM dd, HH:mm')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

## Real-Time Subscription

```typescript
// Hook: useNotificationSubscription
export function useNotificationSubscription() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${auth.uid()}`
        },
        (payload) => {
          // Add to cache
          queryClient.setQueryData(['notifications'], (old: any) => {
            return [payload.new, ...(old || [])];
          });

          // Show toast
          toast({
            title: payload.new.title,
            description: payload.new.message
          });

          // Play sound (optional)
          playNotificationSound();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
```

## Notification Preferences UI

```typescript
export function NotificationPreferences() {
  const { data: preferences, update } = useNotificationPreferences();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="font-medium mb-4">Channels</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>In-App Notifications</Label>
              <Switch
                checked={preferences?.enable_in_app}
                onCheckedChange={(checked) => update({ enable_in_app: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Email Notifications</Label>
              <Switch
                checked={preferences?.enable_email}
                onCheckedChange={(checked) => update({ enable_email: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Push Notifications</Label>
              <Switch
                checked={preferences?.enable_push}
                onCheckedChange={(checked) => update({ enable_push: checked })}
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-medium mb-4">Notification Types</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Order Updates (Followers)</Label>
              <Switch
                checked={preferences?.notify_followers}
                onCheckedChange={(checked) => update({ notify_followers: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>@Mentions</Label>
              <Switch
                checked={preferences?.notify_mentions}
                onCheckedChange={(checked) => update({ notify_mentions: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Task Assignments</Label>
              <Switch
                checked={preferences?.notify_assignments}
                onCheckedChange={(checked) => update({ notify_assignments: checked })}
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-medium mb-4">Email Digest</h3>
          <Select
            value={preferences?.email_digest_frequency}
            onValueChange={(value) => update({ email_digest_frequency: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="realtime">Real-time</SelectItem>
              <SelectItem value="hourly">Hourly</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="never">Never</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
```

## Email Digest Template

```typescript
// Edge Function: send-email-digest
import { Resend } from 'npm:resend@2.0.0';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

async function sendDailyDigest(userId: string) {
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', userId)
    .gte('created_at', new Date(Date.now() - 86400000).toISOString())
    .order('created_at', { ascending: false });

  if (notifications.length === 0) return;

  const { data: user } = await supabase
    .from('users')
    .select('email, name')
    .eq('id', userId)
    .single();

  const html = `
    <h2>Daily Activity Digest</h2>
    <p>Hi ${user.name},</p>
    <p>Here's what happened today:</p>

    <ul>
      ${notifications.map(n => `
        <li>
          <strong>${n.title}</strong><br>
          ${n.message}<br>
          <small>${format(new Date(n.created_at), 'HH:mm')}</small>
        </li>
      `).join('')}
    </ul>

    <p><a href="${APP_URL}/notifications">View all notifications</a></p>
  `;

  await resend.emails.send({
    from: 'MyDetailArea <notifications@mydetailarea.com>',
    to: user.email,
    subject: `Daily Digest - ${notifications.length} new updates`,
    html
  });
}
```

## Best Practices

1. **Respect User Preferences** - Always check notification_preferences before sending
2. **Batch Notifications** - Group similar notifications to avoid spam
3. **Clear Actions** - Every notification should have clear next step
4. **Expiration** - Set expires_at for time-sensitive notifications
5. **Priority Levels** - Use priority to differentiate urgent vs normal
6. **Real-time Updates** - Use Supabase real-time for instant delivery
7. **Mark as Read** - Provide easy way to mark notifications as read
8. **Deep Links** - action_url should navigate directly to relevant entity
9. **Translations** - Support EN/ES/PT-BR for all notification text
10. **Performance** - Index recipient_id + created_at for fast queries

## Reference Files

- **[Notification Templates](./references/notification-templates.md)** - All notification types
- **[Email Templates](./references/email-templates.md)** - Digest email formats
- **[Real-time Patterns](./references/realtime-patterns.md)** - Supabase real-time setup

## Examples

- **[examples/follower-notifications.tsx](./examples/follower-notifications.tsx)** - Complete follower system
- **[examples/mention-detection.tsx](./examples/mention-detection.tsx)** - @mention parsing
- **[examples/activity-feed.tsx](./examples/activity-feed.tsx)** - Activity timeline
