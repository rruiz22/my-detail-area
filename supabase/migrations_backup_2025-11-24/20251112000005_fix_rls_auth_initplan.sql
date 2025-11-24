-- =====================================================
-- MIGRATION: Fix RLS Auth Initialization Plan
-- Date: 2025-11-12
-- Author: Claude Code Performance Optimization
--
-- Purpose: Fix RLS policies that re-evaluate auth.uid() for each row
--          by wrapping auth calls in SELECT subquery
--
-- Background: Supabase Linter detected 40+ RLS policies with suboptimal
--             performance due to auth function re-evaluation per row
--
-- Solution: Replace auth.uid() with (SELECT auth.uid())
--           This evaluates the function ONCE per query instead of per row
--
-- Impact: Expected 20-40% improvement in RLS-protected queries
-- =====================================================

-- =====================================================
-- VEHICLE_NOTES TABLE
-- =====================================================

DROP POLICY IF EXISTS vehicle_notes_select_policy ON vehicle_notes;
CREATE POLICY vehicle_notes_select_policy ON vehicle_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dealer_memberships
      WHERE dealer_memberships.dealer_id = vehicle_notes.dealer_id
        AND dealer_memberships.user_id = (SELECT auth.uid())
        AND dealer_memberships.is_active = true
    )
  );

DROP POLICY IF EXISTS vehicle_notes_insert_policy ON vehicle_notes;
CREATE POLICY vehicle_notes_insert_policy ON vehicle_notes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dealer_memberships
      WHERE dealer_memberships.dealer_id = vehicle_notes.dealer_id
        AND dealer_memberships.user_id = (SELECT auth.uid())
        AND dealer_memberships.is_active = true
    )
  );

DROP POLICY IF EXISTS vehicle_notes_update_policy ON vehicle_notes;
CREATE POLICY vehicle_notes_update_policy ON vehicle_notes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM dealer_memberships
      WHERE dealer_memberships.dealer_id = vehicle_notes.dealer_id
        AND dealer_memberships.user_id = (SELECT auth.uid())
        AND dealer_memberships.is_active = true
    )
  );

-- =====================================================
-- ORDER_COMMENTS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can update their own comments" ON order_comments;
CREATE POLICY "Users can update their own comments" ON order_comments
  FOR UPDATE
  USING (created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own comments" ON order_comments;
CREATE POLICY "Users can delete their own comments" ON order_comments
  FOR DELETE
  USING (created_by = (SELECT auth.uid()));

-- =====================================================
-- DEALERSHIP_MODULES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view modules for their dealerships" ON dealership_modules;
CREATE POLICY "Users can view modules for their dealerships" ON dealership_modules
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dealer_memberships
      WHERE dealer_memberships.dealer_id = dealership_modules.dealer_id
        AND dealer_memberships.user_id = (SELECT auth.uid())
        AND dealer_memberships.is_active = true
    )
  );

-- =====================================================
-- GET_READY_WORK_ITEMS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view work items for their dealerships" ON get_ready_work_items;
CREATE POLICY "Users can view work items for their dealerships" ON get_ready_work_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dealer_memberships
      WHERE dealer_memberships.dealer_id = get_ready_work_items.dealer_id
        AND dealer_memberships.user_id = (SELECT auth.uid())
        AND dealer_memberships.is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can create work items for their dealerships" ON get_ready_work_items;
CREATE POLICY "Users can create work items for their dealerships" ON get_ready_work_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dealer_memberships
      WHERE dealer_memberships.dealer_id = get_ready_work_items.dealer_id
        AND dealer_memberships.user_id = (SELECT auth.uid())
        AND dealer_memberships.is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can update work items for their dealerships" ON get_ready_work_items;
CREATE POLICY "Users can update work items for their dealerships" ON get_ready_work_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM dealer_memberships
      WHERE dealer_memberships.dealer_id = get_ready_work_items.dealer_id
        AND dealer_memberships.user_id = (SELECT auth.uid())
        AND dealer_memberships.is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can delete work items for their dealerships" ON get_ready_work_items;
CREATE POLICY "Users can delete work items for their dealerships" ON get_ready_work_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM dealer_memberships
      WHERE dealer_memberships.dealer_id = get_ready_work_items.dealer_id
        AND dealer_memberships.user_id = (SELECT auth.uid())
        AND dealer_memberships.is_active = true
    )
  );

-- =====================================================
-- VEHICLE_MEDIA TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view media for their dealerships" ON vehicle_media;
CREATE POLICY "Users can view media for their dealerships" ON vehicle_media
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dealer_memberships
      WHERE dealer_memberships.dealer_id = vehicle_media.dealer_id
        AND dealer_memberships.user_id = (SELECT auth.uid())
        AND dealer_memberships.is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can upload media for their dealerships" ON vehicle_media;
CREATE POLICY "Users can upload media for their dealerships" ON vehicle_media
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dealer_memberships
      WHERE dealer_memberships.dealer_id = vehicle_media.dealer_id
        AND dealer_memberships.user_id = (SELECT auth.uid())
        AND dealer_memberships.is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can delete media for their dealerships" ON vehicle_media;
CREATE POLICY "Users can delete media for their dealerships" ON vehicle_media
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM dealer_memberships
      WHERE dealer_memberships.dealer_id = vehicle_media.dealer_id
        AND dealer_memberships.user_id = (SELECT auth.uid())
        AND dealer_memberships.is_active = true
    )
  );

-- =====================================================
-- INVITATION_TEMPLATES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Allow system_admin to manage templates" ON invitation_templates;
CREATE POLICY "Allow system_admin to manage templates" ON invitation_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'system_admin'
    )
  );

-- =====================================================
-- ROLE_MODULE_ACCESS TABLE
-- =====================================================

DROP POLICY IF EXISTS role_module_access_admin_all ON role_module_access;
CREATE POLICY role_module_access_admin_all ON role_module_access
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'system_admin'
    )
  );

-- =====================================================
-- APPOINTMENT_SLOTS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can access their dealership slots" ON appointment_slots;
CREATE POLICY "Users can access their dealership slots" ON appointment_slots
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM dealer_memberships
      WHERE dealer_memberships.dealer_id = appointment_slots.dealer_id
        AND dealer_memberships.user_id = (SELECT auth.uid())
        AND dealer_memberships.is_active = true
    )
  );

-- =====================================================
-- DEALER_DMS_CONFIGS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view DMS configs for their dealer" ON dealer_dms_configs;
CREATE POLICY "Users can view DMS configs for their dealer" ON dealer_dms_configs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dealer_memberships
      WHERE dealer_memberships.dealer_id = dealer_dms_configs.dealer_id
        AND dealer_memberships.user_id = (SELECT auth.uid())
        AND dealer_memberships.is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can manage DMS configs for their dealer" ON dealer_dms_configs;
CREATE POLICY "Users can manage DMS configs for their dealer" ON dealer_dms_configs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM dealer_memberships
      WHERE dealer_memberships.dealer_id = dealer_dms_configs.dealer_id
        AND dealer_memberships.user_id = (SELECT auth.uid())
        AND dealer_memberships.is_active = true
    )
  );

-- =====================================================
-- VEHICLE_NOTE_REPLIES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view note replies for their dealerships" ON vehicle_note_replies;
CREATE POLICY "Users can view note replies for their dealerships" ON vehicle_note_replies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM vehicle_notes vn
      INNER JOIN dealer_memberships dm
        ON dm.dealer_id = vn.dealer_id
      WHERE vn.id = vehicle_note_replies.note_id
        AND dm.user_id = (SELECT auth.uid())
        AND dm.is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can create note replies for their dealerships" ON vehicle_note_replies;
CREATE POLICY "Users can create note replies for their dealerships" ON vehicle_note_replies
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM vehicle_notes vn
      INNER JOIN dealer_memberships dm
        ON dm.dealer_id = vn.dealer_id
      WHERE vn.id = vehicle_note_replies.note_id
        AND dm.user_id = (SELECT auth.uid())
        AND dm.is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can delete their own note replies" ON vehicle_note_replies;
CREATE POLICY "Users can delete their own note replies" ON vehicle_note_replies
  FOR DELETE
  USING (created_by = (SELECT auth.uid()));

-- =====================================================
-- DEALER_VEHICLE_INVENTORY TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view inventory for their dealer" ON dealer_vehicle_inventory;
CREATE POLICY "Users can view inventory for their dealer" ON dealer_vehicle_inventory
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dealer_memberships
      WHERE dealer_memberships.dealer_id = dealer_vehicle_inventory.dealer_id
        AND dealer_memberships.user_id = (SELECT auth.uid())
        AND dealer_memberships.is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can manage inventory for their dealer" ON dealer_vehicle_inventory;
CREATE POLICY "Users can manage inventory for their dealer" ON dealer_vehicle_inventory
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM dealer_memberships
      WHERE dealer_memberships.dealer_id = dealer_vehicle_inventory.dealer_id
        AND dealer_memberships.user_id = (SELECT auth.uid())
        AND dealer_memberships.is_active = true
    )
  );

-- =====================================================
-- USER_ROLE_ASSIGNMENTS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view own role assignments" ON user_role_assignments;
CREATE POLICY "Users can view own role assignments" ON user_role_assignments
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all assignments" ON user_role_assignments;
CREATE POLICY "Admins can manage all assignments" ON user_role_assignments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'system_admin'
    )
  );

-- =====================================================
-- GET_READY_APPROVAL_HISTORY TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view approval history for their dealerships" ON get_ready_approval_history;
CREATE POLICY "Users can view approval history for their dealerships" ON get_ready_approval_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM get_ready_work_items wi
      INNER JOIN dealer_memberships dm
        ON dm.dealer_id = wi.dealer_id
      WHERE wi.id = get_ready_approval_history.work_item_id
        AND dm.user_id = (SELECT auth.uid())
        AND dm.is_active = true
    )
  );

DROP POLICY IF EXISTS "System can insert approval history" ON get_ready_approval_history;
CREATE POLICY "System can insert approval history" ON get_ready_approval_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM get_ready_work_items wi
      INNER JOIN dealer_memberships dm
        ON dm.dealer_id = wi.dealer_id
      WHERE wi.id = get_ready_approval_history.work_item_id
        AND dm.user_id = (SELECT auth.uid())
        AND dm.is_active = true
    )
  );

-- =====================================================
-- SYSTEM_PERMISSIONS TABLE
-- =====================================================

DROP POLICY IF EXISTS system_permissions_admin_all ON system_permissions;
CREATE POLICY system_permissions_admin_all ON system_permissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'system_admin'
    )
  );

-- =====================================================
-- DEALER_GROUPS TABLE
-- =====================================================

DROP POLICY IF EXISTS secure_view_dealer_groups ON dealer_groups;
CREATE POLICY secure_view_dealer_groups ON dealer_groups
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dealer_memberships
      WHERE dealer_memberships.dealer_id = dealer_groups.dealer_id
        AND dealer_memberships.user_id = (SELECT auth.uid())
        AND dealer_memberships.is_active = true
    )
  );

DROP POLICY IF EXISTS dealer_members_can_manage_groups ON dealer_groups;
CREATE POLICY dealer_members_can_manage_groups ON dealer_groups
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM dealer_memberships
      WHERE dealer_memberships.dealer_id = dealer_groups.dealer_id
        AND dealer_memberships.user_id = (SELECT auth.uid())
        AND dealer_memberships.is_active = true
    )
  );

-- =====================================================
-- DEALER_MEMBERSHIP_GROUPS TABLE
-- =====================================================

DROP POLICY IF EXISTS secure_view_membership_groups ON dealer_membership_groups;
CREATE POLICY secure_view_membership_groups ON dealer_membership_groups
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dealer_memberships dm
      INNER JOIN dealer_groups dg
        ON dg.id = dealer_membership_groups.group_id
      WHERE dg.dealer_id = dm.dealer_id
        AND dm.user_id = (SELECT auth.uid())
        AND dm.is_active = true
    )
  );

DROP POLICY IF EXISTS dealer_members_can_manage_membership_groups ON dealer_membership_groups;
CREATE POLICY dealer_members_can_manage_membership_groups ON dealer_membership_groups
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM dealer_memberships dm
      INNER JOIN dealer_groups dg
        ON dg.id = dealer_membership_groups.group_id
      WHERE dg.dealer_id = dm.dealer_id
        AND dm.user_id = (SELECT auth.uid())
        AND dm.is_active = true
    )
  );

-- =====================================================
-- ROLES TABLE
-- =====================================================

DROP POLICY IF EXISTS secure_view_roles ON roles;
CREATE POLICY secure_view_roles ON roles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
    )
  );

-- =====================================================
-- ROLE_PERMISSIONS TABLE
-- =====================================================

DROP POLICY IF EXISTS secure_view_role_permissions ON role_permissions;
CREATE POLICY secure_view_role_permissions ON role_permissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
    )
  );

-- =====================================================
-- VEHICLE_TIMELINE_EVENTS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view timeline events for their dealerships" ON vehicle_timeline_events;
CREATE POLICY "Users can view timeline events for their dealerships" ON vehicle_timeline_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dealer_memberships
      WHERE dealer_memberships.dealer_id = vehicle_timeline_events.dealer_id
        AND dealer_memberships.user_id = (SELECT auth.uid())
        AND dealer_memberships.is_active = true
    )
  );

-- =====================================================
-- DEALER_INVENTORY_SYNC_LOG TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view sync logs for their dealer" ON dealer_inventory_sync_log;
CREATE POLICY "Users can view sync logs for their dealer" ON dealer_inventory_sync_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dealer_memberships
      WHERE dealer_memberships.dealer_id = dealer_inventory_sync_log.dealer_id
        AND dealer_memberships.user_id = (SELECT auth.uid())
        AND dealer_memberships.is_active = true
    )
  );

DROP POLICY IF EXISTS "Users can create sync logs for their dealer" ON dealer_inventory_sync_log;
CREATE POLICY "Users can create sync logs for their dealer" ON dealer_inventory_sync_log
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM dealer_memberships
      WHERE dealer_memberships.dealer_id = dealer_inventory_sync_log.dealer_id
        AND dealer_memberships.user_id = (SELECT auth.uid())
        AND dealer_memberships.is_active = true
    )
  );

-- =====================================================
-- USER_PREFERENCES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own preferences" ON user_preferences;
CREATE POLICY "Users can view their own preferences" ON user_preferences
  FOR SELECT
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own preferences" ON user_preferences;
CREATE POLICY "Users can update their own preferences" ON user_preferences
  FOR UPDATE
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own preferences" ON user_preferences;
CREATE POLICY "Users can insert their own preferences" ON user_preferences
  FOR INSERT
  WITH CHECK (user_id = (SELECT auth.uid()));

-- =====================================================
-- CHAT_NOTIFICATION_SETTINGS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can manage their own notification settings" ON chat_notification_settings;
CREATE POLICY "Users can manage their own notification settings" ON chat_notification_settings
  FOR ALL
  USING (user_id = (SELECT auth.uid()));

-- =====================================================
-- SYSTEM_SETTINGS TABLE
-- =====================================================

DROP POLICY IF EXISTS system_admin_full_access ON system_settings;
CREATE POLICY system_admin_full_access ON system_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'system_admin'
    )
  );

-- =====================================================
-- ORDER_COMMUNICATIONS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can update their own communications" ON order_communications;
CREATE POLICY "Users can update their own communications" ON order_communications
  FOR UPDATE
  USING (created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own communications" ON order_communications;
CREATE POLICY "Users can delete their own communications" ON order_communications
  FOR DELETE
  USING (created_by = (SELECT auth.uid()));

-- =====================================================
-- VERIFICATION
-- =====================================================

-- After running this migration, verify fixes with:
-- SELECT * FROM pg_policies
-- WHERE schemaname = 'public'
-- AND policyname LIKE '%auth%'
-- AND definition ~ 'auth\.uid\(\)';
--
-- Should return 0 rows if all fixed correctly

COMMENT ON SCHEMA public IS 'RLS policies optimized 2025-11-12: All auth.uid() calls wrapped in SELECT subquery for better performance';
