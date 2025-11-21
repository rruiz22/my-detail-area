-- Index 3A: notification_log active notifications
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_log_user_dealer_created
ON public.notification_log(user_id, dealer_id, created_at DESC)
WHERE is_dismissed = false;
