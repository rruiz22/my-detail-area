-- Index 4A: dealer_memberships RLS optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dealer_memberships_user_dealer_active_rls
ON public.dealer_memberships(user_id, dealer_id, is_active)
WHERE is_active = true;
