-- Index 2B: orders covering index (Index-Only Scans)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_dealer_type_covering
ON public.orders(dealer_id, order_type, created_at DESC)
INCLUDE (id, order_number, customer_name, vehicle_vin, status, priority, total_amount)
WHERE deleted_at IS NULL;
