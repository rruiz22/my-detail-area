-- ============================================================================
-- Migration: Add capabilities column to chat_participants
-- ============================================================================
-- Purpose: Allow per-user capability overrides for granular permission control
-- Capabilities are optional - NULL means use role template defaults
-- ============================================================================

-- Add capabilities column (optional overrides)
ALTER TABLE public.chat_participants
ADD COLUMN IF NOT EXISTS capabilities JSONB DEFAULT NULL;

-- ============================================================================
-- INDEXES for JSONB queries
-- ============================================================================

-- GIN index for capabilities queries
CREATE INDEX IF NOT EXISTS idx_chat_participants_capabilities
  ON public.chat_participants USING GIN(capabilities);

-- Composite index for permission lookups
CREATE INDEX IF NOT EXISTS idx_chat_participants_permission_lookup
  ON public.chat_participants(conversation_id, user_id, permission_level)
  WHERE is_active = true;

-- ============================================================================
-- COLUMN DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN public.chat_participants.capabilities IS
'Optional capability overrides for this specific participant.
NULL = Use role template defaults from dealer_role_chat_templates
NON-NULL = Custom capabilities for this user in this conversation

Structure (same as dealer_role_chat_templates.default_capabilities):
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
}

Example use cases:
- Temporarily restrict a user to text-only in a specific conversation
- Give a user moderator capabilities in one conversation only
- Override role defaults for special cases (e.g., VIP customer conversations)';

-- ============================================================================
-- IMPORTANT: This migration is BACKWARD COMPATIBLE
-- Existing participants will have NULL capabilities (use role defaults)
-- No data migration needed
-- ============================================================================
