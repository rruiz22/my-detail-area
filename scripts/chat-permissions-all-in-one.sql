-- ============================================================================
-- CHAT PERMISSIONS SYSTEM - ALL MIGRATIONS CONSOLIDATED
-- ============================================================================
-- Este archivo consolida las 6 migrations de permisos de chat
-- Puedes copiar y pegar todo este contenido en Supabase Dashboard > SQL Editor
-- ============================================================================
-- Proyecto: swfnnrpzpkdypbrzmgnr.supabase.co
-- Fecha: 2025-11-01
-- Estado: LISTO PARA APLICAR
-- ============================================================================

-- 🚀 Starting Chat Permissions Migrations...

-- ============================================================================
-- MIGRATION 1: Add 'none' and 'restricted_write' to chat_permission_level ENUM
-- ============================================================================
-- 📝 Migration 1/6: Adding new permission levels...

-- Add new values to existing ENUM
ALTER TYPE chat_permission_level ADD VALUE IF NOT EXISTS 'none';
ALTER TYPE chat_permission_level ADD VALUE IF NOT EXISTS 'restricted_write';

-- Update ENUM documentation
COMMENT ON TYPE chat_permission_level IS
'Permission levels for chat participants:
- none: No access (banned users, temporary restrictions)
- read: View messages only
- restricted_write: Send text messages only (no files, voice, or attachments)
- write: Full messaging capabilities (text, files, voice)
- moderate: Moderation + participant management
- admin: Full administrative control (settings, deletion, permissions)';

-- ✅ Permission levels added

-- ============================================================================
-- MIGRATION 2: Create dealer_role_chat_templates table
-- ============================================================================
-- 📝 Migration 2/6: Creating dealer_role_chat_templates table...

CREATE TABLE IF NOT EXISTS public.dealer_role_chat_templates (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  dealer_id BIGINT NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,

  -- Role identification (matches dealer_groups.name or slug)
  role_name TEXT NOT NULL,

  -- Default permission level for this role
  default_permission_level chat_permission_level DEFAULT 'write',

  -- Default capabilities JSON structure
  default_capabilities JSONB NOT NULL DEFAULT '{
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
  }'::JSONB,

  -- Which conversation types can this role create
  conversation_types TEXT[] DEFAULT ARRAY['direct', 'group'],

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Ensure unique role names per dealership
  UNIQUE(dealer_id, role_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dealer_role_chat_templates_dealer
  ON public.dealer_role_chat_templates(dealer_id);

CREATE INDEX IF NOT EXISTS idx_dealer_role_chat_templates_role
  ON public.dealer_role_chat_templates(role_name);

CREATE INDEX IF NOT EXISTS idx_dealer_role_chat_templates_lookup
  ON public.dealer_role_chat_templates(dealer_id, role_name);

CREATE INDEX IF NOT EXISTS idx_dealer_role_chat_templates_capabilities
  ON public.dealer_role_chat_templates USING GIN(default_capabilities);

-- RLS
ALTER TABLE public.dealer_role_chat_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view templates for their dealerships" ON public.dealer_role_chat_templates;
CREATE POLICY "Users can view templates for their dealerships"
  ON public.dealer_role_chat_templates FOR SELECT
  USING (
    dealer_id IN (
      SELECT dealer_id FROM public.dealer_memberships
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

DROP POLICY IF EXISTS "Admins can manage templates" ON public.dealer_role_chat_templates;
CREATE POLICY "Admins can manage templates"
  ON public.dealer_role_chat_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.dealer_memberships dm
      JOIN public.dealer_membership_groups dmg ON dmg.membership_id = dm.id
      JOIN public.dealer_groups dg ON dg.id = dmg.group_id
      WHERE dm.user_id = auth.uid()
        AND dm.dealer_id = dealer_role_chat_templates.dealer_id
        AND dm.is_active = true
        AND dg.is_active = true
        AND (
          dg.permissions::jsonb @> '["chat.admin"]'::jsonb OR
          dg.permissions::jsonb @> '["admin"]'::jsonb OR
          dg.name ILIKE '%admin%'
        )
    )
  );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_dealer_role_chat_templates_updated_at ON public.dealer_role_chat_templates;
CREATE TRIGGER update_dealer_role_chat_templates_updated_at
  BEFORE UPDATE ON public.dealer_role_chat_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chat_updated_at_column();

COMMENT ON TABLE public.dealer_role_chat_templates IS
'Maps dealer roles to default chat permissions and capabilities';

-- ✅ dealer_role_chat_templates table created

-- ============================================================================
-- MIGRATION 3: Add capabilities column to chat_participants
-- ============================================================================
-- 📝 Migration 3/6: Adding capabilities column...

-- Add capabilities column
ALTER TABLE public.chat_participants
ADD COLUMN IF NOT EXISTS capabilities JSONB DEFAULT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_participants_capabilities
  ON public.chat_participants USING GIN(capabilities);

CREATE INDEX IF NOT EXISTS idx_chat_participants_permission_lookup
  ON public.chat_participants(conversation_id, user_id, permission_level)
  WHERE is_active = true;

COMMENT ON COLUMN public.chat_participants.capabilities IS
'Optional capability overrides for this specific participant.
NULL = Use role template defaults
NON-NULL = Custom capabilities for this user in this conversation';

-- ✅ capabilities column added

-- ============================================================================
-- MIGRATION 4: Seed default chat role templates
-- ============================================================================
-- 📝 Migration 4/6: Seeding default role templates...

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

  -- Determine permission level based on role name
  CASE
    WHEN dg.name ILIKE '%admin%'
      THEN 'admin'::chat_permission_level
    WHEN dg.name ILIKE '%manager%' OR dg.name ILIKE '%supervisor%'
      THEN 'moderate'::chat_permission_level
    WHEN dg.name ILIKE '%viewer%' OR dg.name ILIKE '%readonly%' OR dg.name ILIKE '%read only%'
      THEN 'read'::chat_permission_level
    WHEN dg.name ILIKE '%technician%' OR dg.name ILIKE '%restricted%'
      THEN 'restricted_write'::chat_permission_level
    ELSE 'write'::chat_permission_level
  END,

  -- Assign capabilities based on role name
  CASE
    -- Admin capabilities
    WHEN dg.name ILIKE '%admin%'
      THEN '{
        "messages": {"send_text": true, "send_voice": true, "send_files": true, "edit_own": true, "delete_own": true, "delete_others": true},
        "participants": {"invite_users": true, "remove_users": true, "change_permissions": true},
        "conversation": {"update_settings": true, "archive": true, "delete": true}
      }'::JSONB

    -- Manager/Supervisor capabilities
    WHEN dg.name ILIKE '%manager%' OR dg.name ILIKE '%supervisor%'
      THEN '{
        "messages": {"send_text": true, "send_voice": true, "send_files": true, "edit_own": true, "delete_own": true, "delete_others": true},
        "participants": {"invite_users": true, "remove_users": true, "change_permissions": false},
        "conversation": {"update_settings": true, "archive": true, "delete": false}
      }'::JSONB

    -- Staff capabilities
    WHEN dg.name ILIKE '%staff%' OR dg.name ILIKE '%advisor%' OR dg.name ILIKE '%sales%' OR dg.name ILIKE '%service%'
      THEN '{
        "messages": {"send_text": true, "send_voice": true, "send_files": true, "edit_own": true, "delete_own": true, "delete_others": false},
        "participants": {"invite_users": true, "remove_users": false, "change_permissions": false},
        "conversation": {"update_settings": false, "archive": false, "delete": false}
      }'::JSONB

    -- Viewer/Read-only capabilities
    WHEN dg.name ILIKE '%viewer%' OR dg.name ILIKE '%readonly%' OR dg.name ILIKE '%read only%'
      THEN '{
        "messages": {"send_text": false, "send_voice": false, "send_files": false, "edit_own": false, "delete_own": false, "delete_others": false},
        "participants": {"invite_users": false, "remove_users": false, "change_permissions": false},
        "conversation": {"update_settings": false, "archive": false, "delete": false}
      }'::JSONB

    -- Technician capabilities
    WHEN dg.name ILIKE '%technician%' OR dg.name ILIKE '%restricted%'
      THEN '{
        "messages": {"send_text": true, "send_voice": false, "send_files": false, "edit_own": true, "delete_own": true, "delete_others": false},
        "participants": {"invite_users": false, "remove_users": false, "change_permissions": false},
        "conversation": {"update_settings": false, "archive": false, "delete": false}
      }'::JSONB

    -- Default capabilities
    ELSE '{
      "messages": {"send_text": true, "send_voice": true, "send_files": true, "edit_own": true, "delete_own": true, "delete_others": false},
      "participants": {"invite_users": true, "remove_users": false, "change_permissions": false},
      "conversation": {"update_settings": false, "archive": false, "delete": false}
    }'::JSONB
  END,

  -- Conversation types
  CASE
    WHEN dg.name ILIKE '%admin%' OR dg.name ILIKE '%manager%' OR dg.name ILIKE '%supervisor%'
      THEN ARRAY['direct', 'group', 'channel', 'announcement']
    WHEN dg.name ILIKE '%viewer%' OR dg.name ILIKE '%readonly%' OR dg.name ILIKE '%read only%'
      THEN ARRAY[]::TEXT[]
    ELSE ARRAY['direct', 'group']
  END

FROM public.dealer_groups dg
WHERE dg.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM public.dealer_role_chat_templates drct
    WHERE drct.dealer_id = dg.dealer_id AND drct.role_name = dg.name
  )
ON CONFLICT (dealer_id, role_name) DO NOTHING;

-- ✅ Role templates seeded

-- ============================================================================
-- MIGRATION 5: Create get_chat_effective_permissions function
-- ============================================================================
-- 📝 Migration 5/6: Creating get_chat_effective_permissions function...

CREATE OR REPLACE FUNCTION public.get_chat_effective_permissions(
  p_user_id UUID,
  p_conversation_id UUID,
  p_dealer_id BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_participant_level chat_permission_level;
  v_custom_capabilities JSONB;
  v_template_capabilities JSONB;
  v_template_level chat_permission_level;
  v_group_permissions JSONB;
  v_effective_permissions JSONB;
  v_user_group_name TEXT;
  v_participant_active BOOLEAN;
BEGIN
  -- Get participant's permission level and custom capabilities
  SELECT cp.permission_level, cp.capabilities, cp.is_active, dg.name
  INTO v_participant_level, v_custom_capabilities, v_participant_active, v_user_group_name
  FROM public.chat_participants cp
  LEFT JOIN public.dealer_memberships dm ON dm.user_id = cp.user_id AND dm.dealer_id = p_dealer_id AND dm.is_active = true
  LEFT JOIN public.dealer_membership_groups dmg ON dmg.membership_id = dm.id
  LEFT JOIN public.dealer_groups dg ON dg.id = dmg.group_id AND dg.is_active = true
  WHERE cp.user_id = p_user_id AND cp.conversation_id = p_conversation_id
  ORDER BY dg.name
  LIMIT 1;

  -- If no participant record or inactive, return no access
  IF v_participant_level IS NULL OR v_participant_active IS FALSE THEN
    RETURN jsonb_build_object(
      'has_access', false,
      'level', 'none',
      'source', 'no_participant_record',
      'capabilities', jsonb_build_object(
        'messages', jsonb_build_object('send_text', false, 'send_voice', false, 'send_files', false, 'edit_own', false, 'delete_own', false, 'delete_others', false),
        'participants', jsonb_build_object('invite_users', false, 'remove_users', false, 'change_permissions', false),
        'conversation', jsonb_build_object('update_settings', false, 'archive', false, 'delete', false)
      )
    );
  END IF;

  -- If permission level is 'none', return no access
  IF v_participant_level = 'none' THEN
    RETURN jsonb_build_object(
      'has_access', false,
      'level', 'none',
      'source', 'permission_level_none',
      'capabilities', jsonb_build_object(
        'messages', jsonb_build_object('send_text', false, 'send_voice', false, 'send_files', false, 'edit_own', false, 'delete_own', false, 'delete_others', false),
        'participants', jsonb_build_object('invite_users', false, 'remove_users', false, 'change_permissions', false),
        'conversation', jsonb_build_object('update_settings', false, 'archive', false, 'delete', false)
      )
    );
  END IF;

  -- Get template capabilities
  IF v_user_group_name IS NOT NULL THEN
    SELECT drct.default_capabilities, drct.default_permission_level
    INTO v_template_capabilities, v_template_level
    FROM public.dealer_role_chat_templates drct
    WHERE drct.dealer_id = p_dealer_id AND drct.role_name = v_user_group_name
    LIMIT 1;
  END IF;

  -- Build default capabilities based on permission level
  v_effective_permissions := CASE v_participant_level
    WHEN 'admin' THEN jsonb_build_object(
      'messages', jsonb_build_object('send_text', true, 'send_voice', true, 'send_files', true, 'edit_own', true, 'delete_own', true, 'delete_others', true),
      'participants', jsonb_build_object('invite_users', true, 'remove_users', true, 'change_permissions', true),
      'conversation', jsonb_build_object('update_settings', true, 'archive', true, 'delete', true)
    )
    WHEN 'moderate' THEN jsonb_build_object(
      'messages', jsonb_build_object('send_text', true, 'send_voice', true, 'send_files', true, 'edit_own', true, 'delete_own', true, 'delete_others', true),
      'participants', jsonb_build_object('invite_users', true, 'remove_users', true, 'change_permissions', false),
      'conversation', jsonb_build_object('update_settings', true, 'archive', true, 'delete', false)
    )
    WHEN 'write' THEN jsonb_build_object(
      'messages', jsonb_build_object('send_text', true, 'send_voice', true, 'send_files', true, 'edit_own', true, 'delete_own', true, 'delete_others', false),
      'participants', jsonb_build_object('invite_users', false, 'remove_users', false, 'change_permissions', false),
      'conversation', jsonb_build_object('update_settings', false, 'archive', false, 'delete', false)
    )
    WHEN 'restricted_write' THEN jsonb_build_object(
      'messages', jsonb_build_object('send_text', true, 'send_voice', false, 'send_files', false, 'edit_own', true, 'delete_own', true, 'delete_others', false),
      'participants', jsonb_build_object('invite_users', false, 'remove_users', false, 'change_permissions', false),
      'conversation', jsonb_build_object('update_settings', false, 'archive', false, 'delete', false)
    )
    WHEN 'read' THEN jsonb_build_object(
      'messages', jsonb_build_object('send_text', false, 'send_voice', false, 'send_files', false, 'edit_own', false, 'delete_own', false, 'delete_others', false),
      'participants', jsonb_build_object('invite_users', false, 'remove_users', false, 'change_permissions', false),
      'conversation', jsonb_build_object('update_settings', false, 'archive', false, 'delete', false)
    )
    ELSE jsonb_build_object(
      'messages', jsonb_build_object('send_text', false, 'send_voice', false, 'send_files', false, 'edit_own', false, 'delete_own', false, 'delete_others', false),
      'participants', jsonb_build_object('invite_users', false, 'remove_users', false, 'change_permissions', false),
      'conversation', jsonb_build_object('update_settings', false, 'archive', false, 'delete', false)
    )
  END;

  -- Return merged capabilities (custom > template > level defaults)
  RETURN jsonb_build_object(
    'has_access', true,
    'level', v_participant_level,
    'user_group', v_user_group_name,
    'source', CASE
      WHEN v_custom_capabilities IS NOT NULL THEN 'custom_override'
      WHEN v_template_capabilities IS NOT NULL THEN 'role_template'
      ELSE 'level_default'
    END,
    'capabilities', COALESCE(v_custom_capabilities, v_template_capabilities, v_effective_permissions)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_chat_effective_permissions(UUID, UUID, BIGINT) TO authenticated;

COMMENT ON FUNCTION public.get_chat_effective_permissions(UUID, UUID, BIGINT) IS
'Returns effective chat permissions for a user in a conversation';

-- ✅ get_chat_effective_permissions function created

-- ============================================================================
-- MIGRATION 6: Create auto_assign_chat_capabilities trigger
-- ============================================================================
-- 📝 Migration 6/6: Creating auto_assign trigger...

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
  -- Get dealer_id from conversation
  SELECT dealer_id INTO v_dealer_id
  FROM public.chat_conversations
  WHERE id = NEW.conversation_id;

  IF v_dealer_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get user's dealer group
  SELECT dg.name INTO v_group_name
  FROM public.dealer_memberships dm
  JOIN public.dealer_membership_groups dmg ON dmg.membership_id = dm.id
  JOIN public.dealer_groups dg ON dg.id = dmg.group_id
  WHERE dm.user_id = NEW.user_id
    AND dm.dealer_id = v_dealer_id
    AND dm.is_active = true
    AND dg.is_active = true
  ORDER BY dg.name
  LIMIT 1;

  IF v_group_name IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get role template
  SELECT drct.default_capabilities, drct.default_permission_level
  INTO v_template_capabilities, v_template_level
  FROM public.dealer_role_chat_templates drct
  WHERE drct.dealer_id = v_dealer_id AND drct.role_name = v_group_name
  LIMIT 1;

  IF v_template_capabilities IS NULL THEN
    RETURN NEW;
  END IF;

  -- Auto-assign capabilities if not set
  IF NEW.capabilities IS NULL THEN
    NEW.capabilities := v_template_capabilities;
  END IF;

  -- Auto-assign permission level if using default
  IF NEW.permission_level = 'write' AND v_template_level IS NOT NULL THEN
    NEW.permission_level := v_template_level;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_assign_chat_capabilities ON public.chat_participants;
CREATE TRIGGER trigger_auto_assign_chat_capabilities
  BEFORE INSERT ON public.chat_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_chat_capabilities();

COMMENT ON FUNCTION public.auto_assign_chat_capabilities() IS
'Automatically assigns capabilities and permission level based on user role template';

-- ✅ auto_assign_chat_capabilities trigger created

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- 🔍 Verifying migrations...

-- Check enum values
SELECT '✅ Permission level: ' || enumlabel as verification
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'chat_permission_level'
ORDER BY e.enumsortorder;

-- Check table
SELECT '✅ Templates created: ' || COUNT(*) || ' role templates' as verification
FROM dealer_role_chat_templates;

-- Check function
SELECT '✅ Function exists: get_chat_effective_permissions' as verification
FROM pg_proc
WHERE proname = 'get_chat_effective_permissions'
LIMIT 1;

-- Check trigger
SELECT '✅ Trigger exists: trigger_auto_assign_chat_capabilities' as verification
FROM pg_trigger
WHERE tgname = 'trigger_auto_assign_chat_capabilities'
LIMIT 1;

-- ============================================================
-- ✨ All 6 migrations applied successfully!
-- ============================================================
--
-- 📍 Next steps:
--    1. Test useChatPermissions hook in your app
--    2. Verify role templates in dealer_role_chat_templates table
--    3. Check capabilities are auto-assigned for new participants
