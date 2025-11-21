-- Index 3B: notification_log unread badge
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_log_user_unread_priority
ON public.notification_log(user_id, priority, created_at DESC)
WHERE is_read = false AND is_dismissed = false;
