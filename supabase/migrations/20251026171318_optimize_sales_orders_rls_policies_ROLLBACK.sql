-- ============================================================================
-- ROLLBACK SCRIPT FOR ENTERPRISE RLS OPTIMIZATION
-- ============================================================================
-- Rollback Migration: 20251026171318_optimize_sales_orders_rls_policies_ROLLBACK.sql
-- Date: 2025-10-26
-- Author: database-expert (Claude Code Agent)
--
-- PURPOSE: Restore previous RLS policies if the optimized policies cause issues
--
-- ⚠️ IMPORTANT: Only run this if you need to revert the migration!
-- This will restore the previous complex policies using user_has_dealer_membership
-- and user_has_group_permission functions.
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: DROP OPTIMIZED POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "enterprise_view_orders" ON public.orders;
DROP POLICY IF EXISTS "enterprise_insert_orders" ON public.orders;
DROP POLICY IF EXISTS "enterprise_update_orders" ON public.orders;
DROP POLICY IF EXISTS "enterprise_delete_orders" ON public.orders;

RAISE NOTICE '✅ Dropped optimized enterprise RLS policies';

-- ============================================================================
-- STEP 2: RESTORE PREVIOUS POLICIES (from 20250922120000_fix_critical_rls_policies.sql)
-- ============================================================================

-- Ensure RLS is still enabled
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Restore Policy 1: SELECT - View orders in dealership
CREATE POLICY "secure_view_orders"
ON public.orders
FOR SELECT
USING (user_has_dealer_membership(auth.uid(), dealer_id));

COMMENT ON POLICY "secure_view_orders" ON public.orders IS
'Users can view all orders in dealerships where they have membership';

-- Restore Policy 2: INSERT - Create orders based on order type permissions
CREATE POLICY "secure_insert_orders"
ON public.orders
FOR INSERT
WITH CHECK (
  user_has_dealer_membership(auth.uid(), dealer_id)
  AND (
    -- Sales orders - need sales_orders.write permission
    (order_type = 'sales' AND user_has_group_permission(auth.uid(), dealer_id, 'sales_orders.write'))
    OR
    -- Service orders - need service_orders.write permission
    (order_type = 'service' AND user_has_group_permission(auth.uid(), dealer_id, 'service_orders.write'))
    OR
    -- Recon orders - need recon_orders.write permission
    (order_type = 'recon' AND user_has_group_permission(auth.uid(), dealer_id, 'recon_orders.write'))
    OR
    -- Car wash orders - need car_wash.write permission
    (order_type = 'carwash' AND user_has_group_permission(auth.uid(), dealer_id, 'car_wash.write'))
    OR
    -- Admins and managers can create any type
    user_has_group_permission(auth.uid(), dealer_id, 'management.admin')
  )
);

COMMENT ON POLICY "secure_insert_orders" ON public.orders IS
'Users can insert orders based on order type permissions (sales_orders.write, service_orders.write, etc.)';

-- Restore Policy 3: UPDATE - Update orders based on permissions
CREATE POLICY "secure_update_orders"
ON public.orders
FOR UPDATE
USING (
  user_has_dealer_membership(auth.uid(), dealer_id)
  AND (
    -- Sales orders - need sales_orders.write permission
    (order_type = 'sales' AND user_has_group_permission(auth.uid(), dealer_id, 'sales_orders.write'))
    OR
    -- Service orders - need service_orders.write permission
    (order_type = 'service' AND user_has_group_permission(auth.uid(), dealer_id, 'service_orders.write'))
    OR
    -- Recon orders - need recon_orders.write permission
    (order_type = 'recon' AND user_has_group_permission(auth.uid(), dealer_id, 'recon_orders.write'))
    OR
    -- Car wash orders - need car_wash.write permission
    (order_type = 'carwash' AND user_has_group_permission(auth.uid(), dealer_id, 'car_wash.write'))
    OR
    -- Admins and managers can update any type
    user_has_group_permission(auth.uid(), dealer_id, 'management.admin')
  )
)
WITH CHECK (
  user_has_dealer_membership(auth.uid(), dealer_id)
  AND (
    -- Same permission checks for WITH CHECK
    (order_type = 'sales' AND user_has_group_permission(auth.uid(), dealer_id, 'sales_orders.write'))
    OR
    (order_type = 'service' AND user_has_group_permission(auth.uid(), dealer_id, 'service_orders.write'))
    OR
    (order_type = 'recon' AND user_has_group_permission(auth.uid(), dealer_id, 'recon_orders.write'))
    OR
    (order_type = 'carwash' AND user_has_group_permission(auth.uid(), dealer_id, 'car_wash.write'))
    OR
    user_has_group_permission(auth.uid(), dealer_id, 'management.admin')
  )
);

-- Restore Policy 4: DELETE - Delete orders based on permissions
CREATE POLICY "secure_delete_orders"
ON public.orders
FOR DELETE
USING (
  user_has_dealer_membership(auth.uid(), dealer_id)
  AND (
    -- Sales orders - need sales_orders.delete permission
    (order_type = 'sales' AND user_has_group_permission(auth.uid(), dealer_id, 'sales_orders.delete'))
    OR
    -- Service orders - need service_orders.delete permission
    (order_type = 'service' AND user_has_group_permission(auth.uid(), dealer_id, 'service_orders.delete'))
    OR
    -- Recon orders - need recon_orders.delete permission
    (order_type = 'recon' AND user_has_group_permission(auth.uid(), dealer_id, 'recon_orders.delete'))
    OR
    -- Car wash orders - need car_wash.delete permission
    (order_type = 'carwash' AND user_has_group_permission(auth.uid(), dealer_id, 'car_wash.delete'))
    OR
    -- Admins can delete any type
    user_has_group_permission(auth.uid(), dealer_id, 'management.admin')
  )
);

RAISE NOTICE '✅ Restored previous RLS policies using user_has_dealer_membership and user_has_group_permission functions';

-- ============================================================================
-- STEP 3: RESTORE PERMISSIONS
-- ============================================================================

-- Ensure the helper functions have proper permissions
GRANT EXECUTE ON FUNCTION public.user_has_dealer_membership TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_group_permission TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_dealer_membership TO service_role;
GRANT EXECUTE ON FUNCTION public.user_has_group_permission TO service_role;

RAISE NOTICE '✅ Restored function execution permissions';

-- ============================================================================
-- STEP 4: KEEP PERFORMANCE INDEXES (Safe to keep, improves query performance)
-- ============================================================================

-- Note: We do NOT drop the performance indexes created in the forward migration
-- because they improve query performance regardless of which RLS policies are active.
-- The indexes are:
--   - idx_orders_dealer_type_status
--   - idx_orders_dealer_created
--   - idx_orders_deleted_at
--   - idx_profiles_role_dealership
--   - idx_dealer_memberships_user_dealer_active

RAISE NOTICE '✅ Performance indexes retained (safe for all policies)';

-- ============================================================================
-- ROLLBACK COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ ROLLBACK COMPLETE: Restored Previous RLS Policies';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Summary:';
  RAISE NOTICE '  ✓ Dropped 4 optimized enterprise policies';
  RAISE NOTICE '  ✓ Restored 4 previous RLS policies';
  RAISE NOTICE '  ✓ Restored function execution permissions';
  RAISE NOTICE '  ✓ Retained performance indexes';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Previous Policy Model Restored:';
  RAISE NOTICE '  • Uses user_has_dealer_membership() function';
  RAISE NOTICE '  • Uses user_has_group_permission() function';
  RAISE NOTICE '  • Complex order_type-based permission checks';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next Steps:';
  RAISE NOTICE '  1. Verify RLS policies restored correctly';
  RAISE NOTICE '  2. Test application functionality';
  RAISE NOTICE '  3. Investigate why optimized policies failed';
  RAISE NOTICE '  4. Check for missing helper functions or schema changes';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════';
END $$;

COMMIT;
