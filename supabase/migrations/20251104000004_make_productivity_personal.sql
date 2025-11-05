-- =====================================================
-- MAKE PRODUCTIVITY MODULE PERSONAL (PRIVATE)
-- Date: November 4, 2025
-- Purpose: Update RLS policies to make Todos and Events private
-- Only the creator can see their own todos and events
-- Calendars remain shared at dealership level
-- =====================================================

-- =====================================================
-- DROP EXISTING POLICIES FOR TODOS AND EVENTS
-- =====================================================

-- Todos policies
DROP POLICY IF EXISTS "Users can view todos in their dealership" ON productivity_todos;
DROP POLICY IF EXISTS "Users can insert todos in their dealership" ON productivity_todos;
DROP POLICY IF EXISTS "Users can update their own todos or assigned todos" ON productivity_todos;
DROP POLICY IF EXISTS "Users can delete their own todos" ON productivity_todos;

-- Events policies
DROP POLICY IF EXISTS "Users can view events in their dealership" ON productivity_events;
DROP POLICY IF EXISTS "Users can insert events in their dealership" ON productivity_events;
DROP POLICY IF EXISTS "Users can update events in their dealership" ON productivity_events;
DROP POLICY IF EXISTS "Users can delete events in their dealership" ON productivity_events;

-- =====================================================
-- NEW PERSONAL PRODUCTIVITY_TODOS POLICIES
-- =====================================================

-- SELECT: Users can ONLY view their OWN todos
CREATE POLICY "Users can view their own todos"
ON productivity_todos FOR SELECT
USING (
  created_by = auth.uid()
  AND (deleted_at IS NULL OR is_system_admin(auth.uid()))
);

-- INSERT: Users can create their own todos
CREATE POLICY "Users can insert their own todos"
ON productivity_todos FOR INSERT
WITH CHECK (
  can_access_dealership(auth.uid(), dealer_id)
  AND created_by = auth.uid()
);

-- UPDATE: Users can ONLY update their OWN todos
CREATE POLICY "Users can update their own todos"
ON productivity_todos FOR UPDATE
USING (
  created_by = auth.uid()
)
WITH CHECK (
  created_by = auth.uid()
  AND can_access_dealership(auth.uid(), dealer_id)
);

-- DELETE: Users can ONLY delete their OWN todos
CREATE POLICY "Users can delete their own todos"
ON productivity_todos FOR DELETE
USING (
  created_by = auth.uid()
);

-- =====================================================
-- NEW PERSONAL PRODUCTIVITY_EVENTS POLICIES
-- =====================================================

-- SELECT: Users can ONLY view their OWN events
CREATE POLICY "Users can view their own events"
ON productivity_events FOR SELECT
USING (
  created_by = auth.uid()
);

-- INSERT: Users can create their own events
CREATE POLICY "Users can insert their own events"
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

-- UPDATE: Users can ONLY update their OWN events
CREATE POLICY "Users can update their own events"
ON productivity_events FOR UPDATE
USING (
  created_by = auth.uid()
)
WITH CHECK (
  created_by = auth.uid()
  AND can_access_dealership(auth.uid(), dealer_id)
);

-- DELETE: Users can ONLY delete their OWN events
CREATE POLICY "Users can delete their own events"
ON productivity_events FOR DELETE
USING (
  created_by = auth.uid()
);

-- =====================================================
-- REMOVE assigned_to FIELD USAGE (OPTIONAL FUTURE CLEANUP)
-- =====================================================

-- NOTE: The assigned_to field in productivity_todos is no longer used
-- since the module is now fully personal. However, we're keeping the
-- column for backward compatibility and potential future team features.
--
-- If you want to enable team assignments in the future, create a new
-- migration that adds back team-based RLS policies with proper permissions.

-- =====================================================
-- VERIFICATION COMMENTS
-- =====================================================

-- ✅ PRIVACY MODEL (UPDATED):
--
-- PERSONAL (PRIVATE):
--   - productivity_todos: Only creator can view/edit/delete
--   - productivity_events: Only creator can view/edit/delete
--
-- SHARED (DEALERSHIP-LEVEL):
--   - productivity_calendars: All dealership users can view/use
--
-- SYSTEM ADMIN OVERRIDE:
--   - System admins retain full access to all data (for support)
--
-- SECURITY GUARANTEES:
--   1. ✅ Users cannot see other users' todos
--   2. ✅ Users cannot see other users' events
--   3. ✅ Users can share calendars (infrastructure only)
--   4. ✅ Order-linked tasks remain private to creator
--   5. ✅ assigned_to field no longer grants access (personal mode)
--
-- FUTURE TEAM FEATURES:
--   If team collaboration is needed later:
--   - Add "share_with_users" JSONB array field
--   - Add "team_id" field for team-based filtering
--   - Create new RLS policies with explicit sharing rules
--   - Keep current personal mode as default

COMMENT ON POLICY "Users can view their own todos" ON productivity_todos IS
  'PERSONAL MODE: Users can only see their own todos. assigned_to field is ignored.';

COMMENT ON POLICY "Users can view their own events" ON productivity_events IS
  'PERSONAL MODE: Users can only see their own events. Calendars are shared infrastructure.';
