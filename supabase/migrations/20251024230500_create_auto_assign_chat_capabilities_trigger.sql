-- ============================================================================
-- Migration: Create auto-assign chat capabilities trigger
-- ============================================================================
-- Purpose: Automatically assign capabilities and permission level based on
-- user's role template when adding participant to conversation
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_assign_chat_capabilities()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dealer_id BIGINT;
  v_group_name TEXT;
  v_template_capabilities JSONB;
  v_template_level chat_permission_level;
BEGIN
  -- =========================================================================
  -- STEP 1: Get dealer_id from conversation
  -- =========================================================================
  SELECT dealer_id
  INTO v_dealer_id
  FROM public.chat_conversations
  WHERE id = NEW.conversation_id;

  -- If conversation not found, skip auto-assignment
  IF v_dealer_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- =========================================================================
  -- STEP 2: Get user's dealer group (role)
  -- =========================================================================
  SELECT dg.name
  INTO v_group_name
  FROM public.dealer_memberships dm
  JOIN public.dealer_membership_groups dmg ON dmg.membership_id = dm.id
  JOIN public.dealer_groups dg ON dg.id = dmg.group_id
  WHERE dm.user_id = NEW.user_id
    AND dm.dealer_id = v_dealer_id
    AND dm.is_active = true
    AND dg.is_active = true
  ORDER BY dg.name -- If user in multiple groups, take first alphabetically
  LIMIT 1;

  -- If no group found, use defaults and exit
  IF v_group_name IS NULL THEN
    RETURN NEW;
  END IF;

  -- =========================================================================
  -- STEP 3: Get role template (if exists)
  -- =========================================================================
  SELECT
    drct.default_capabilities,
    drct.default_permission_level
  INTO
    v_template_capabilities,
    v_template_level
  FROM public.dealer_role_chat_templates drct
  WHERE drct.dealer_id = v_dealer_id
    AND drct.role_name = v_group_name
  LIMIT 1;

  -- If no template found, use defaults
  IF v_template_capabilities IS NULL THEN
    RETURN NEW;
  END IF;

  -- =========================================================================
  -- STEP 4: Auto-assign capabilities if not explicitly set
  -- =========================================================================

  -- Only assign capabilities if user didn't provide custom ones
  IF NEW.capabilities IS NULL THEN
    NEW.capabilities := v_template_capabilities;
  END IF;

  -- =========================================================================
  -- STEP 5: Auto-assign permission level if using default 'write'
  -- =========================================================================

  -- If user is being added with default permission level and template has
  -- a different level, use the template's level
  IF NEW.permission_level = 'write' AND v_template_level IS NOT NULL THEN
    NEW.permission_level := v_template_level;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- CREATE TRIGGER
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_assign_chat_capabilities
  ON public.chat_participants;

-- Create new trigger
CREATE TRIGGER trigger_auto_assign_chat_capabilities
  BEFORE INSERT ON public.chat_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_chat_capabilities();

-- ============================================================================
-- TRIGGER DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION public.auto_assign_chat_capabilities() IS
'Automatically assigns capabilities and permission level based on user role template.

Trigger fires BEFORE INSERT on chat_participants.

Logic:
1. Get dealer_id from conversation
2. Get user''s dealer group (role) from dealer_memberships
3. Look up role template from dealer_role_chat_templates
4. If template exists:
   - Auto-assign capabilities if not explicitly provided
   - Auto-assign permission level if using default ''write''

This ensures new participants automatically get appropriate permissions
based on their role, while still allowing explicit overrides.

Examples:

-- Adding a participant without specifying capabilities
-- Trigger will auto-assign based on their role
INSERT INTO chat_participants (conversation_id, user_id)
VALUES (''conv-id'', ''user-id'');

-- Adding a participant with explicit capabilities
-- Trigger will NOT override the explicit capabilities
INSERT INTO chat_participants (conversation_id, user_id, capabilities)
VALUES (''conv-id'', ''user-id'', ''{"messages": {"send_text": false}}''::jsonb);

-- Adding a participant with explicit permission level
-- Trigger will NOT override the explicit permission level
INSERT INTO chat_participants (conversation_id, user_id, permission_level)
VALUES (''conv-id'', ''user-id'', ''admin'');';

-- ============================================================================
-- TESTING SCENARIOS
-- ============================================================================
--
-- Test 1: Add participant without capabilities
-- Expected: Capabilities auto-assigned from role template
--
-- INSERT INTO chat_participants (conversation_id, user_id)
-- VALUES ('conv-id', 'user-id');
-- SELECT capabilities FROM chat_participants WHERE ...;
-- Should show template capabilities
--
-- Test 2: Add participant with custom capabilities
-- Expected: Custom capabilities preserved, not overridden
--
-- INSERT INTO chat_participants (conversation_id, user_id, capabilities)
-- VALUES ('conv-id', 'user-id', '{"messages": {"send_text": false}}'::jsonb);
-- SELECT capabilities FROM chat_participants WHERE ...;
-- Should show custom capabilities
--
-- Test 3: Add participant with default permission level
-- Expected: Permission level auto-upgraded based on role template
--
-- User is Admin role with template level = 'admin'
-- INSERT INTO chat_participants (conversation_id, user_id)
-- VALUES ('conv-id', 'admin-user-id');
-- SELECT permission_level FROM chat_participants WHERE ...;
-- Should show 'admin' instead of default 'write'
--
-- Test 4: Add participant with explicit permission level
-- Expected: Explicit level preserved
--
-- INSERT INTO chat_participants (conversation_id, user_id, permission_level)
-- VALUES ('conv-id', 'user-id', 'read');
-- SELECT permission_level FROM chat_participants WHERE ...;
-- Should show 'read'
-- ============================================================================
