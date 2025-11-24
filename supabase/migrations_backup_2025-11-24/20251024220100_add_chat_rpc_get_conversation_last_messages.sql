-- =====================================================================================
-- Migration: Add get_conversation_last_messages RPC function
-- Description: Retrieves the last message preview for each conversation
-- Author: database-expert
-- Date: 2025-10-24
-- =====================================================================================

-- Purpose:
-- This function fetches the most recent message for each conversation to display
-- preview text in conversation lists. It formats message content based on type:
-- - Text: First 100 characters
-- - Image: '📷 Image' icon
-- - File: '📎 ' + filename
-- - Voice: '🎤 Voice message'

-- Usage:
-- SELECT * FROM get_conversation_last_messages(
--   ARRAY['uuid1', 'uuid2', 'uuid3']::UUID[]
-- );

-- Returns:
-- TABLE (
--   conversation_id UUID,
--   last_message_content TEXT,
--   last_message_at TIMESTAMP WITH TIME ZONE,
--   last_message_type TEXT,
--   last_message_user_id UUID
-- )

-- Performance Notes:
-- Uses DISTINCT ON for efficient "last message per group" query pattern.
-- For optimal performance, ensure this index exists:
-- - chat_messages(conversation_id, created_at DESC) WHERE is_deleted = false

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
    cm.message_type as last_message_type,
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

-- Add helpful comment to the function
COMMENT ON FUNCTION get_conversation_last_messages(UUID[]) IS
'Fetches the most recent message preview for each conversation. Formats content based on message type (text, image, file, voice).';

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION get_conversation_last_messages(UUID[]) TO authenticated;

-- Recommended indexes for optimal performance:
-- CREATE INDEX IF NOT EXISTS idx_chat_messages_preview_lookup
--   ON chat_messages(conversation_id, created_at DESC, message_type, is_deleted);
--
-- CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_recent
--   ON chat_messages(conversation_id, created_at DESC)
--   WHERE is_deleted = false;
