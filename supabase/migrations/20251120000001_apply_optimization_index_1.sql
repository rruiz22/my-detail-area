-- Index 1A: user_presence UPDATE optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_presence_user_dealer_update
ON public.user_presence(user_id, dealer_id, last_activity_at DESC);
