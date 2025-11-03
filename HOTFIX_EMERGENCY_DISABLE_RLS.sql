-- =====================================================
-- 🚨 EMERGENCY HOTFIX: Disable RLS on Failing Tables
-- =====================================================
-- Issue: Infinite recursion in RLS policies blocking ALL user access
-- User affected: rudyruizlima@gmail.com (and all 'user' role users)
-- Root cause: RLS policies calling functions that query dealer_memberships recursively
-- =====================================================

-- CRITICAL: This temporarily disables RLS to restore access
-- We will re-enable with fixed policies immediately after

-- =====================================================
-- STEP 1: Disable RLS on all failing tables
-- =====================================================

ALTER TABLE dealer_memberships DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_custom_role_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_activity_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence DISABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE get_ready_notifications DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 2: Drop ALL existing policies (to start fresh)
-- =====================================================

-- dealer_memberships
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'dealer_memberships')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON dealer_memberships';
    END LOOP;
END $$;

-- user_custom_role_assignments
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_custom_role_assignments')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON user_custom_role_assignments';
    END LOOP;
END $$;

-- orders
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'orders')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON orders';
    END LOOP;
END $$;

-- order_activity_log
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'order_activity_log')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON order_activity_log';
    END LOOP;
END $$;

-- user_presence
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user_presence')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON user_presence';
    END LOOP;
END $$;

-- notification_log
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'notification_log')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON notification_log';
    END LOOP;
END $$;

-- get_ready_notifications
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'get_ready_notifications')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON get_ready_notifications';
    END LOOP;
END $$;

-- =====================================================
-- STEP 3: Create SIMPLE, NON-RECURSIVE policies
-- =====================================================

-- === dealer_memberships ===
CREATE POLICY "Users see own memberships"
ON dealer_memberships FOR SELECT
USING (
  user_id = auth.uid()
  OR (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) IN ('system_admin', 'supermanager')
);

CREATE POLICY "System users manage memberships"
ON dealer_memberships FOR ALL
USING (
  (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) IN ('system_admin', 'supermanager')
);

-- === user_custom_role_assignments ===
CREATE POLICY "Users see own roles"
ON user_custom_role_assignments FOR SELECT
USING (
  user_id = auth.uid()
  OR (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) IN ('system_admin', 'supermanager')
);

CREATE POLICY "System users manage roles"
ON user_custom_role_assignments FOR ALL
USING (
  (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) IN ('system_admin', 'supermanager')
);

-- === orders ===
-- CRITICAL: Allow users to see orders from their dealer
CREATE POLICY "Users see dealer orders"
ON orders FOR SELECT
USING (
  -- System admins see all
  (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) IN ('system_admin', 'supermanager')
  OR
  -- Users see orders from their dealership (direct check, no recursion)
  dealer_id IN (
    SELECT dealership_id FROM profiles WHERE id = auth.uid() AND dealership_id IS NOT NULL
  )
);

CREATE POLICY "Users manage dealer orders"
ON orders FOR ALL
USING (
  -- System admins manage all
  (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) IN ('system_admin', 'supermanager')
  OR
  -- Users manage orders from their dealership
  dealer_id IN (
    SELECT dealership_id FROM profiles WHERE id = auth.uid() AND dealership_id IS NOT NULL
  )
);

-- === order_activity_log ===
CREATE POLICY "Users see activity from dealer orders"
ON order_activity_log FOR SELECT
USING (
  -- System admins see all
  (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) IN ('system_admin', 'supermanager')
  OR
  -- Users see activity from orders in their dealership
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_activity_log.order_id
    AND orders.dealer_id IN (
      SELECT dealership_id FROM profiles WHERE id = auth.uid() AND dealership_id IS NOT NULL
    )
  )
);

CREATE POLICY "Users create activity in dealer orders"
ON order_activity_log FOR INSERT
WITH CHECK (
  -- System admins create all
  (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) IN ('system_admin', 'supermanager')
  OR
  -- Users create activity for orders in their dealership
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_activity_log.order_id
    AND orders.dealer_id IN (
      SELECT dealership_id FROM profiles WHERE id = auth.uid() AND dealership_id IS NOT NULL
    )
  )
);

-- === user_presence ===
CREATE POLICY "Users see presence in their dealer"
ON user_presence FOR SELECT
USING (
  -- System admins see all
  (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) IN ('system_admin', 'supermanager')
  OR
  -- Users see presence in their dealership
  dealer_id IN (
    SELECT dealership_id FROM profiles WHERE id = auth.uid() AND dealership_id IS NOT NULL
  )
);

CREATE POLICY "Users manage own presence"
ON user_presence FOR ALL
USING (
  user_id = auth.uid()
  OR (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) IN ('system_admin', 'supermanager')
);

-- === notification_log ===
CREATE POLICY "Users see own notifications"
ON notification_log FOR SELECT
USING (
  user_id = auth.uid()
  OR (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) IN ('system_admin', 'supermanager')
);

CREATE POLICY "System creates notifications"
ON notification_log FOR INSERT
WITH CHECK (true); -- Any authenticated user can insert (system-triggered)

-- === get_ready_notifications ===
CREATE POLICY "Users see dealer notifications"
ON get_ready_notifications FOR SELECT
USING (
  -- System admins see all
  (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) IN ('system_admin', 'supermanager')
  OR
  -- Users see notifications for their dealer OR notifications without user_id (global)
  (
    dealer_id IN (
      SELECT dealership_id FROM profiles WHERE id = auth.uid() AND dealership_id IS NOT NULL
    )
    AND (user_id = auth.uid() OR user_id IS NULL)
  )
);

CREATE POLICY "Users manage dealer notifications"
ON get_ready_notifications FOR ALL
USING (
  -- System admins manage all
  (SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1) IN ('system_admin', 'supermanager')
  OR
  -- Users manage notifications in their dealer
  dealer_id IN (
    SELECT dealership_id FROM profiles WHERE id = auth.uid() AND dealership_id IS NOT NULL
  )
);

-- =====================================================
-- STEP 4: Re-enable RLS with new safe policies
-- =====================================================

ALTER TABLE dealer_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_custom_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE get_ready_notifications ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 5: Verify policies were created
-- =====================================================

SELECT
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN (
  'dealer_memberships',
  'user_custom_role_assignments',
  'orders',
  'order_activity_log',
  'user_presence',
  'notification_log',
  'get_ready_notifications'
)
GROUP BY tablename
ORDER BY tablename;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

SELECT
  'RLS HOTFIX APPLIED' as status,
  'All recursive policies removed' as action,
  'Safe policies created using profiles.dealership_id' as method,
  NOW() as timestamp;
