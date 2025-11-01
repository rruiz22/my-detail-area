-- =====================================================
-- Productivity Module - Row Level Security Policies
-- Created: 2025-10-16
-- Purpose: Secure access control for productivity tables
-- =====================================================

-- Enable RLS on all productivity tables
ALTER TABLE productivity_todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE productivity_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE productivity_events ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- DROP EXISTING POLICIES (Clean slate)
-- =====================================================

-- Todos policies
DROP POLICY IF EXISTS "Users can view todos in their dealership" ON productivity_todos;
DROP POLICY IF EXISTS "Users can insert todos in their dealership" ON productivity_todos;
DROP POLICY IF EXISTS "Users can update their own todos or assigned todos" ON productivity_todos;
DROP POLICY IF EXISTS "Users can delete their own todos" ON productivity_todos;
DROP POLICY IF EXISTS "System admins have full access to todos" ON productivity_todos;

-- Calendars policies
DROP POLICY IF EXISTS "Users can view calendars in their dealership" ON productivity_calendars;
DROP POLICY IF EXISTS "Users can insert calendars in their dealership" ON productivity_calendars;
DROP POLICY IF EXISTS "Users can update calendars in their dealership" ON productivity_calendars;
DROP POLICY IF EXISTS "Users can delete calendars in their dealership" ON productivity_calendars;
DROP POLICY IF EXISTS "System admins have full access to calendars" ON productivity_calendars;

-- Events policies
DROP POLICY IF EXISTS "Users can view events in their dealership" ON productivity_events;
DROP POLICY IF EXISTS "Users can insert events in their dealership" ON productivity_events;
DROP POLICY IF EXISTS "Users can update events in their dealership" ON productivity_events;
DROP POLICY IF EXISTS "Users can delete events in their dealership" ON productivity_events;
DROP POLICY IF EXISTS "System admins have full access to events" ON productivity_events;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to check if user is system admin
CREATE OR REPLACE FUNCTION is_system_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id
    AND (
      role = 'system_admin'
      OR user_type = 'system_admin'
      OR is_system_admin = TRUE
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's dealership
CREATE OR REPLACE FUNCTION get_user_dealership(user_id UUID)
RETURNS BIGINT AS $$
BEGIN
  RETURN (
    SELECT dealership_id
    FROM profiles
    WHERE id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can access dealership
CREATE OR REPLACE FUNCTION can_access_dealership(user_id UUID, dealer_id BIGINT)
RETURNS BOOLEAN AS $$
BEGIN
  -- System admins can access all dealerships
  IF is_system_admin(user_id) THEN
    RETURN TRUE;
  END IF;

  -- Regular users can only access their assigned dealership
  RETURN get_user_dealership(user_id) = dealer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PRODUCTIVITY_TODOS POLICIES
-- =====================================================

-- SELECT: Users can view todos in their dealership
CREATE POLICY "Users can view todos in their dealership"
ON productivity_todos FOR SELECT
USING (
  can_access_dealership(auth.uid(), dealer_id)
  AND (deleted_at IS NULL OR is_system_admin(auth.uid()))
);

-- INSERT: Users can create todos in their dealership
CREATE POLICY "Users can insert todos in their dealership"
ON productivity_todos FOR INSERT
WITH CHECK (
  can_access_dealership(auth.uid(), dealer_id)
  AND created_by = auth.uid()
);

-- UPDATE: Users can update their own todos, assigned todos, or if system admin
CREATE POLICY "Users can update their own todos or assigned todos"
ON productivity_todos FOR UPDATE
USING (
  can_access_dealership(auth.uid(), dealer_id)
  AND (
    created_by = auth.uid()
    OR assigned_to = auth.uid()
    OR is_system_admin(auth.uid())
  )
)
WITH CHECK (
  can_access_dealership(auth.uid(), dealer_id)
);

-- DELETE: Users can soft delete their own todos
CREATE POLICY "Users can delete their own todos"
ON productivity_todos FOR DELETE
USING (
  can_access_dealership(auth.uid(), dealer_id)
  AND (
    created_by = auth.uid()
    OR is_system_admin(auth.uid())
  )
);

-- =====================================================
-- PRODUCTIVITY_CALENDARS POLICIES
-- =====================================================

-- SELECT: Users can view calendars in their dealership
CREATE POLICY "Users can view calendars in their dealership"
ON productivity_calendars FOR SELECT
USING (
  can_access_dealership(auth.uid(), dealer_id)
  AND (is_active = TRUE OR is_system_admin(auth.uid()))
);

-- INSERT: Users can create calendars in their dealership
CREATE POLICY "Users can insert calendars in their dealership"
ON productivity_calendars FOR INSERT
WITH CHECK (
  can_access_dealership(auth.uid(), dealer_id)
  AND created_by = auth.uid()
);

-- UPDATE: Users can update calendars in their dealership
CREATE POLICY "Users can update calendars in their dealership"
ON productivity_calendars FOR UPDATE
USING (
  can_access_dealership(auth.uid(), dealer_id)
)
WITH CHECK (
  can_access_dealership(auth.uid(), dealer_id)
);

-- DELETE: Only system admins can delete calendars
CREATE POLICY "Users can delete calendars in their dealership"
ON productivity_calendars FOR DELETE
USING (
  can_access_dealership(auth.uid(), dealer_id)
  AND (
    created_by = auth.uid()
    OR is_system_admin(auth.uid())
  )
);

-- =====================================================
-- PRODUCTIVITY_EVENTS POLICIES
-- =====================================================

-- SELECT: Users can view events in their dealership calendars
CREATE POLICY "Users can view events in their dealership"
ON productivity_events FOR SELECT
USING (
  can_access_dealership(auth.uid(), dealer_id)
);

-- INSERT: Users can create events in their dealership calendars
CREATE POLICY "Users can insert events in their dealership"
ON productivity_events FOR INSERT
WITH CHECK (
  can_access_dealership(auth.uid(), dealer_id)
  AND created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM productivity_calendars
    WHERE id = calendar_id
    AND can_access_dealership(auth.uid(), productivity_calendars.dealer_id)
  )
);

-- UPDATE: Users can update events in their dealership
CREATE POLICY "Users can update events in their dealership"
ON productivity_events FOR UPDATE
USING (
  can_access_dealership(auth.uid(), dealer_id)
  AND (
    created_by = auth.uid()
    OR is_system_admin(auth.uid())
  )
)
WITH CHECK (
  can_access_dealership(auth.uid(), dealer_id)
);

-- DELETE: Users can delete their own events
CREATE POLICY "Users can delete events in their dealership"
ON productivity_events FOR DELETE
USING (
  can_access_dealership(auth.uid(), dealer_id)
  AND (
    created_by = auth.uid()
    OR is_system_admin(auth.uid())
  )
);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant authenticated users access to tables
GRANT SELECT, INSERT, UPDATE, DELETE ON productivity_todos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON productivity_calendars TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON productivity_events TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- SECURITY NOTES
-- =====================================================

-- Security model:
-- 1. Users can only access data from their dealership
-- 2. System admins have full access to all dealerships
-- 3. Users can only create todos/events with themselves as creator
-- 4. Users can update their own todos or todos assigned to them
-- 5. Calendar events must belong to an accessible calendar
-- 6. Soft-deleted todos are hidden from regular users
-- 7. All policies check dealership access before any operation

-- Performance note:
-- Helper functions use SECURITY DEFINER for optimal performance
-- This allows PostgreSQL to cache function results efficiently
