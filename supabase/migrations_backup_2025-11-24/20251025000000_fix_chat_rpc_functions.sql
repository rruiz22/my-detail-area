-- =====================================================================================
-- Migration: Fix Chat RPC Functions - Type Casting and Column Name Corrections
-- Description: Corrects type mismatches and column references in chat RPC functions
-- Author: database-expert
-- Date: 2025-10-25
-- =====================================================================================

-- Issue #1: get_conversation_last_messages returns ENUM type but declares TEXT
-- Issue #2: get_conversation_participants references wrong column name (presence_status vs status)
--
-- Root Causes:
-- 1. PostgreSQL ENUM types don't auto-cast to TEXT in SECURITY DEFINER functions
-- 2. user_presence table column is 'status', not 'presence_status'
--
-- Impact: 400 Bad Request errors in browser console for chat functionality
-- Risk Level: LOW - Only affects RPC functions, no schema changes
-- Rollback: Previous function versions remain in git history
--
-- =====================================================================================

-- =====================================================================================
-- FIX #1: get_conversation_last_messages - Add explicit type casting
-- =====================================================================================

CREATE OR REPLACE FUNCTION get_conversation_last_messages(
  conversation_ids UUID[]
)
RETURNS TABLE (
  conversation_id UUID,
  last_message_content TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  last_message_type TEXT,
  last_message_user_id UUID
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (cm.conversation_id)
    cm.conversation_id,
    -- Format message preview based on message type
    CASE
      -- Text messages: show first 100 characters
      WHEN cm.message_type = 'text' THEN
        LEFT(COALESCE(cm.content, ''), 100)
      -- Image messages: show camera emoji
      WHEN cm.message_type = 'image' THEN
        '📷 Image'
      -- File messages: show paperclip + filename
      WHEN cm.message_type = 'file' THEN
        '📎 ' || COALESCE(cm.file_name, 'File')
      -- Voice messages: show microphone emoji
      WHEN cm.message_type = 'voice' THEN
        '🎤 Voice message'
      -- System messages or other types: show raw content
      ELSE
        COALESCE(cm.content, '')
    END as last_message_content,
    cm.created_at as last_message_at,
    -- FIX: Explicit cast from ENUM to TEXT
    cm.message_type::TEXT as last_message_type,
    cm.user_id as last_message_user_id
  FROM chat_messages cm
  WHERE
    -- Filter to requested conversations
    cm.conversation_id = ANY(get_conversation_last_messages.conversation_ids)
    -- Exclude soft-deleted messages from preview
    AND cm.is_deleted = false
  -- DISTINCT ON requires ORDER BY to start with same column
  -- This ensures we get the most recent message per conversation
  ORDER BY
    cm.conversation_id,
    cm.created_at DESC;
END;
$$;

COMMENT ON FUNCTION get_conversation_last_messages(UUID[]) IS
'[FIXED v2] Fetches the most recent message preview for each conversation. Formats content based on message type (text, image, file, voice). Fixed ENUM→TEXT casting issue.';

-- =====================================================================================
-- FIX #2: get_conversation_participants - Correct column name reference
-- =====================================================================================

CREATE OR REPLACE FUNCTION get_conversation_participants(
  conversation_uuid UUID,
  requesting_user_id UUID
)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  user_avatar_url TEXT,
  permission_level TEXT,
  is_active BOOLEAN,
  last_read_at TIMESTAMP WITH TIME ZONE,
  presence_status TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  -- Security check: Verify requesting user is a participant
  IF NOT EXISTS (
    SELECT 1
    FROM chat_participants cp
    WHERE cp.conversation_id = get_conversation_participants.conversation_uuid
      AND cp.user_id = get_conversation_participants.requesting_user_id
      AND cp.is_active = true
  ) THEN
    RAISE EXCEPTION 'User does not have access to this conversation';
  END IF;

  RETURN QUERY
  SELECT
    cp.user_id,
    -- Concatenate first and last name, handling NULL values gracefully
    TRIM(CONCAT(
      COALESCE(p.first_name, ''),
      ' ',
      COALESCE(p.last_name, '')
    )) as user_name,
    p.email as user_email,
    -- Avatar URL placeholder - update if profiles table has avatar_url column
    NULL::TEXT as user_avatar_url,
    cp.permission_level::TEXT as permission_level,
    cp.is_active,
    cp.last_read_at,
    -- FIX: Correct column name is 'status', not 'presence_status'
    -- Also add explicit TEXT cast for consistency
    COALESCE(up.status::TEXT, 'offline') as presence_status
  FROM chat_participants cp
  -- INNER JOIN: Profile must exist (referential integrity should guarantee this)
  INNER JOIN profiles p
    ON p.id = cp.user_id
  -- LEFT JOIN: Presence is optional (user may not have logged presence)
  LEFT JOIN user_presence up
    ON up.user_id = cp.user_id
  WHERE
    cp.conversation_id = get_conversation_participants.conversation_uuid
    -- Only return active participants (not removed from conversation)
    AND cp.is_active = true
  ORDER BY
    -- Requesting user appears first in the list
    CASE
      WHEN cp.user_id = get_conversation_participants.requesting_user_id
      THEN 0
      ELSE 1
    END,
    -- Then alphabetically by first name
    p.first_name ASC,
    p.last_name ASC;
END;
$$;

COMMENT ON FUNCTION get_conversation_participants(UUID, UUID) IS
'[FIXED v2] Fetches active participants in a conversation with profile data and presence status. Fixed column reference from presence_status to status. Requesting user appears first, followed by alphabetical order.';

-- =====================================================================================
-- VERIFICATION QUERIES (for manual testing in Supabase SQL Editor)
-- =====================================================================================

-- Test #1: Verify get_conversation_last_messages returns TEXT type
-- SELECT
--   conversation_id,
--   last_message_type,
--   pg_typeof(last_message_type) as type_check -- Should return 'text'
-- FROM get_conversation_last_messages(
--   ARRAY(SELECT id FROM chat_conversations LIMIT 3)
-- );

-- Test #2: Verify get_conversation_participants returns presence correctly
-- SELECT
--   user_name,
--   presence_status,
--   pg_typeof(presence_status) as type_check -- Should return 'text'
-- FROM get_conversation_participants(
--   (SELECT id FROM chat_conversations LIMIT 1),
--   auth.uid()
-- );

-- =====================================================================================
-- END OF MIGRATION
-- =====================================================================================
