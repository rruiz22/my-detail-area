-- Index 2A: orders WHERE + ORDER BY optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_type_dealer_created_optimized
ON public.orders(order_type, dealer_id, created_at DESC)
WHERE deleted_at IS NULL;
