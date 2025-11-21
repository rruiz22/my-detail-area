-- Index 1B: user_presence SELECT optimization (partial index)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_presence_dealer_status_activity
ON public.user_presence(dealer_id, status, last_activity_at DESC)
WHERE status != 'offline';
