-- ============================================================================
-- Migration: Seed default chat role templates for existing dealer groups
-- ============================================================================
-- Purpose: Automatically create chat permission templates for existing roles
-- Maps dealer_groups to appropriate chat permission levels and capabilities
-- ============================================================================

-- Insert default templates for all dealer groups
-- This intelligently maps existing roles to appropriate chat permissions
INSERT INTO public.dealer_role_chat_templates (
  dealer_id,
  role_name,
  default_permission_level,
  default_capabilities,
  conversation_types
)
SELECT
  dg.dealer_id,
  dg.name AS role_name,

  -- Determine permission level based on role name/permissions
  CASE
    -- Admin roles get full admin access
    WHEN dg.name ILIKE '%admin%'
      OR dg.permissions::jsonb @> '["admin"]'::jsonb
      OR dg.permissions::jsonb @> '["chat.admin"]'::jsonb
      THEN 'admin'::chat_permission_level

    -- Manager roles get moderate access
    WHEN dg.name ILIKE '%manager%'
      OR dg.permissions::jsonb @> '["chat.moderate"]'::jsonb
      THEN 'moderate'::chat_permission_level

    -- Viewer/Read-only roles
    WHEN dg.name ILIKE '%viewer%'
      OR dg.name ILIKE '%readonly%'
      OR dg.permissions::jsonb @> '["chat.read"]'::jsonb
      THEN 'read'::chat_permission_level

    -- Restricted roles (e.g., technicians who shouldn't send files)
    WHEN dg.name ILIKE '%technician%'
      OR dg.name ILIKE '%restricted%'
      THEN 'restricted_write'::chat_permission_level

    -- Default: standard write access for everyone else
    ELSE 'write'::chat_permission_level
  END,

  -- Assign capabilities based on detected role type
  CASE
    -- ========================================================================
    -- ADMIN CAPABILITIES: Full control
    -- ========================================================================
    WHEN dg.name ILIKE '%admin%'
      OR dg.permissions::jsonb @> '["admin"]'::jsonb
      OR dg.permissions::jsonb @> '["chat.admin"]'::jsonb
      THEN '{
        "messages": {
          "send_text": true,
          "send_voice": true,
          "send_files": true,
          "edit_own": true,
          "delete_own": true,
          "delete_others": true
        },
        "participants": {
          "invite_users": true,
          "remove_users": true,
          "change_permissions": true
        },
        "conversation": {
          "update_settings": true,
          "archive": true,
          "delete": true
        }
      }'::JSONB

    -- ========================================================================
    -- MANAGER/MODERATOR CAPABILITIES: Moderate + participant management
    -- ========================================================================
    WHEN dg.name ILIKE '%manager%'
      OR dg.permissions::jsonb @> '["chat.moderate"]'::jsonb
      THEN '{
        "messages": {
          "send_text": true,
          "send_voice": true,
          "send_files": true,
          "edit_own": true,
          "delete_own": true,
          "delete_others": true
        },
        "participants": {
          "invite_users": true,
          "remove_users": true,
          "change_permissions": false
        },
        "conversation": {
          "update_settings": true,
          "archive": true,
          "delete": false
        }
      }'::JSONB

    -- ========================================================================
    -- STAFF/ADVISOR CAPABILITIES: Full messaging, limited management
    -- ========================================================================
    WHEN dg.name ILIKE '%staff%'
      OR dg.name ILIKE '%advisor%'
      OR dg.name ILIKE '%sales%'
      OR dg.name ILIKE '%service%'
      THEN '{
        "messages": {
          "send_text": true,
          "send_voice": true,
          "send_files": true,
          "edit_own": true,
          "delete_own": true,
          "delete_others": false
        },
        "participants": {
          "invite_users": true,
          "remove_users": false,
          "change_permissions": false
        },
        "conversation": {
          "update_settings": false,
          "archive": false,
          "delete": false
        }
      }'::JSONB

    -- ========================================================================
    -- VIEWER CAPABILITIES: Read-only access
    -- ========================================================================
    WHEN dg.name ILIKE '%viewer%'
      OR dg.name ILIKE '%readonly%'
      OR dg.permissions::jsonb @> '["chat.read"]'::jsonb
      THEN '{
        "messages": {
          "send_text": false,
          "send_voice": false,
          "send_files": false,
          "edit_own": false,
          "delete_own": false,
          "delete_others": false
        },
        "participants": {
          "invite_users": false,
          "remove_users": false,
          "change_permissions": false
        },
        "conversation": {
          "update_settings": false,
          "archive": false,
          "delete": false
        }
      }'::JSONB

    -- ========================================================================
    -- TECHNICIAN/RESTRICTED CAPABILITIES: Text only, no files/voice
    -- ========================================================================
    WHEN dg.name ILIKE '%technician%'
      OR dg.name ILIKE '%restricted%'
      THEN '{
        "messages": {
          "send_text": true,
          "send_voice": false,
          "send_files": false,
          "edit_own": true,
          "delete_own": true,
          "delete_others": false
        },
        "participants": {
          "invite_users": false,
          "remove_users": false,
          "change_permissions": false
        },
        "conversation": {
          "update_settings": false,
          "archive": false,
          "delete": false
        }
      }'::JSONB

    -- ========================================================================
    -- DEFAULT CAPABILITIES: Standard write access
    -- ========================================================================
    ELSE '{
      "messages": {
        "send_text": true,
        "send_voice": true,
        "send_files": true,
        "edit_own": true,
        "delete_own": true,
        "delete_others": false
      },
      "participants": {
        "invite_users": true,
        "remove_users": false,
        "change_permissions": false
      },
      "conversation": {
        "update_settings": false,
        "archive": false,
        "delete": false
      }
    }'::JSONB
  END,

  -- Assign conversation creation types based on role
  CASE
    -- Admins and managers can create all types
    WHEN dg.name ILIKE '%admin%'
      OR dg.name ILIKE '%manager%'
      OR dg.permissions::jsonb @> '["admin"]'::jsonb
      THEN ARRAY['direct', 'group', 'channel', 'announcement']

    -- Viewers cannot create conversations
    WHEN dg.name ILIKE '%viewer%'
      OR dg.name ILIKE '%readonly%'
      THEN ARRAY[]::TEXT[]

    -- Everyone else can create direct and group chats
    ELSE ARRAY['direct', 'group']
  END

FROM public.dealer_groups dg
WHERE dg.is_active = true
  AND NOT EXISTS (
    -- Don't create duplicates
    SELECT 1 FROM public.dealer_role_chat_templates drct
    WHERE drct.dealer_id = dg.dealer_id
      AND drct.role_name = dg.name
  )
ON CONFLICT (dealer_id, role_name) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERY (for testing)
-- ============================================================================
-- Run this to verify templates were created correctly:
--
-- SELECT
--   dg.name AS group_name,
--   drct.role_name,
--   drct.default_permission_level,
--   drct.default_capabilities->'messages'->>'send_files' AS can_send_files,
--   drct.conversation_types
-- FROM dealer_groups dg
-- LEFT JOIN dealer_role_chat_templates drct
--   ON drct.dealer_id = dg.dealer_id AND drct.role_name = dg.name
-- WHERE dg.dealer_id = YOUR_DEALER_ID
-- ORDER BY dg.name;
-- ============================================================================

COMMENT ON TABLE public.dealer_role_chat_templates IS
'Chat permission templates automatically seeded from dealer_groups.
Templates are created for:
- Admin roles → admin level (full control)
- Manager roles → moderate level (manage participants, delete messages)
- Staff/Advisor roles → write level (full messaging, invite users)
- Viewer roles → read level (view only)
- Technician roles → restricted_write level (text only, no files/voice)
- Other roles → write level (default)

New dealer groups will need templates created manually or via trigger.';
