-- ============================================================================
-- Migration: Optimize profiles RLS policy for faster profile loading
-- Issue: profiles_select_same_dealership policy causes 15+ second timeouts
-- Root cause: Self-JOIN on dealer_memberships creates O(n²) complexity
-- Solution: Replace with optimized function using IN subquery
-- ============================================================================

-- Step 1: Create optimized function to check if current user shares a dealership with target user
-- This replaces the slow self-JOIN with an efficient IN subquery
CREATE OR REPLACE FUNCTION public.shares_dealership_with(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM dealer_memberships my_dm
    WHERE my_dm.user_id = auth.uid()
      AND my_dm.is_active = true
      AND my_dm.dealer_id IN (
        SELECT target_dm.dealer_id
        FROM dealer_memberships target_dm
        WHERE target_dm.user_id = target_user_id
          AND target_dm.is_active = true
      )
  );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.shares_dealership_with(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.shares_dealership_with(uuid) TO anon;

-- Step 2: Create supporting index for fast lookups
-- Partial index on active memberships for optimal query performance
CREATE INDEX IF NOT EXISTS idx_dealer_memberships_user_active
ON dealer_memberships(user_id, dealer_id)
WHERE is_active = true;

-- Step 3: Replace the slow policy with optimized version
-- Original policy (for rollback reference):
-- EXISTS ( SELECT 1
--    FROM (dealer_memberships dm1
--      JOIN dealer_memberships dm2 ON ((dm1.dealer_id = dm2.dealer_id)))
--   WHERE ((dm1.user_id = auth.uid()) AND (dm1.is_active = true)
--          AND (dm2.user_id = profiles.id) AND (dm2.is_active = true)))

DROP POLICY IF EXISTS "profiles_select_same_dealership" ON profiles;

CREATE POLICY "profiles_select_same_dealership" ON profiles
FOR SELECT TO public
USING (public.shares_dealership_with(id));

-- ============================================================================
-- Expected improvement:
-- Before: 15+ seconds (O(n²) self-JOIN, ~1.7M row reads)
-- After:  < 500ms (O(n) subquery, ~1-5 row reads)
-- ============================================================================
