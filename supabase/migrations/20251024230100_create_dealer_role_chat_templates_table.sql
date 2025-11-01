-- ============================================================================
-- Migration: Create dealer_role_chat_templates table
-- ============================================================================
-- Purpose: Map dealer roles (from dealer_groups) to default chat permissions
-- This enables role-based chat access control with customizable capabilities
-- ============================================================================

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
  -- This JSONB column defines what actions this role can perform
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

-- ============================================================================
-- INDEXES for performance
-- ============================================================================

CREATE INDEX idx_dealer_role_chat_templates_dealer
  ON public.dealer_role_chat_templates(dealer_id);

CREATE INDEX idx_dealer_role_chat_templates_role
  ON public.dealer_role_chat_templates(role_name);

CREATE INDEX idx_dealer_role_chat_templates_lookup
  ON public.dealer_role_chat_templates(dealer_id, role_name);

-- GIN index for JSONB capabilities queries
CREATE INDEX idx_dealer_role_chat_templates_capabilities
  ON public.dealer_role_chat_templates USING GIN(default_capabilities);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.dealer_role_chat_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view templates for their dealerships
CREATE POLICY "Users can view templates for their dealerships"
  ON public.dealer_role_chat_templates FOR SELECT
  USING (
    dealer_id IN (
      SELECT dealer_id FROM public.dealer_memberships
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Policy: Only admins can manage templates
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
          -- Allow if user's group has admin permissions
          dg.permissions::jsonb @> '["chat.admin"]'::jsonb OR
          dg.permissions::jsonb @> '["admin"]'::jsonb OR
          dg.name ILIKE '%admin%'
        )
    )
  );

-- ============================================================================
-- TRIGGERS for automatic timestamps
-- ============================================================================

CREATE TRIGGER update_dealer_role_chat_templates_updated_at
  BEFORE UPDATE ON public.dealer_role_chat_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chat_updated_at_column();

-- ============================================================================
-- TABLE DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.dealer_role_chat_templates IS
'Maps dealer roles (from dealer_groups) to default chat permissions and capabilities.
This enables enterprise-grade role-based access control for the chat system.

Example usage:
- Admin role: Full access (admin level, all capabilities)
- Manager role: Moderate level, can manage participants
- Staff role: Write level, can send all message types
- Viewer role: Read level, no sending capabilities
- Technician role: Restricted write, text only

Capabilities are stored as JSONB for flexibility and can be overridden
per-user in chat_participants.capabilities column.';

COMMENT ON COLUMN public.dealer_role_chat_templates.role_name IS
'Name of the role (should match dealer_groups.name or slug).
Examples: Admin, Manager, Sales Staff, Service Advisor, Viewer, Technician';

COMMENT ON COLUMN public.dealer_role_chat_templates.default_capabilities IS
'Default capabilities for this role as JSONB. Structure:
{
  "messages": {
    "send_text": boolean,
    "send_voice": boolean,
    "send_files": boolean,
    "edit_own": boolean,
    "delete_own": boolean,
    "delete_others": boolean
  },
  "participants": {
    "invite_users": boolean,
    "remove_users": boolean,
    "change_permissions": boolean
  },
  "conversation": {
    "update_settings": boolean,
    "archive": boolean,
    "delete": boolean
  }
}';

COMMENT ON COLUMN public.dealer_role_chat_templates.conversation_types IS
'Array of conversation types this role can create.
Options: ["direct", "group", "channel", "announcement"]
Empty array means cannot create any conversations.';
