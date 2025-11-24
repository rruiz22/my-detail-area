-- =====================================================================================
-- Migration: Add get_unread_message_counts RPC function
-- Description: Efficiently counts unread messages per conversation for a specific user
-- Author: database-expert
-- Date: 2025-10-24
-- =====================================================================================

-- Purpose:
-- This function calculates unread message counts by comparing chat_messages.created_at
-- against chat_participants.last_read_at for each conversation. It's optimized for
-- batch queries to minimize round-trips when loading conversation lists.

-- Usage:
-- SELECT * FROM get_unread_message_counts(
--   ARRAY['uuid1', 'uuid2', 'uuid3']::UUID[],
--   auth.uid()
-- );

-- Returns:
-- TABLE (conversation_id UUID, unread_count BIGINT)

-- Performance Notes:
-- For optimal performance, ensure these indexes exist:
-- - chat_messages(conversation_id, created_at DESC, is_deleted)
-- - chat_participants(conversation_id, user_id, last_read_at)
-- - chat_messages(user_id) for filtering out own messages

-- =====================================================================================

CREATE OR REPLACE FUNCTION get_unread_message_counts(
  conversation_ids UUID[],
  user_id UUID
)
RETURNS TABLE (
  conversation_id UUID,
  unread_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  -- Verify user has access to these conversations through chat_participants
  -- This acts as a security check before counting messages
  IF NOT EXISTS (
    SELECT 1
    FROM chat_participants cp
    WHERE cp.user_id = get_unread_message_counts.user_id
      AND cp.conversation_id = ANY(get_unread_message_counts.conversation_ids)
  ) THEN
    RAISE EXCEPTION 'User does not have access to these conversations';
  END IF;

  RETURN QUERY
  SELECT
    cm.conversation_id,
    COUNT(*)::BIGINT as unread_count
  FROM chat_messages cm
  INNER JOIN chat_participants cp
    ON cp.conversation_id = cm.conversation_id
  WHERE
    -- Filter to requested conversations
    cm.conversation_id = ANY(get_unread_message_counts.conversation_ids)
    -- Ensure participant record exists for this user
    AND cp.user_id = get_unread_message_counts.user_id
    -- Only count messages created after user's last read timestamp
    -- Default to epoch time if never read (catches all messages)
    AND cm.created_at > COALESCE(cp.last_read_at, '1970-01-01'::TIMESTAMP WITH TIME ZONE)
    -- Don't count user's own messages as unread
    AND cm.user_id != get_unread_message_counts.user_id
    -- Exclude soft-deleted messages
    AND cm.is_deleted = false
  GROUP BY cm.conversation_id;
END;
$$;

-- Add helpful comment to the function
COMMENT ON FUNCTION get_unread_message_counts(UUID[], UUID) IS
'Calculates unread message counts for multiple conversations. Counts messages created after last_read_at, excluding user own messages and deleted messages.';

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION get_unread_message_counts(UUID[], UUID) TO authenticated;

-- Recommended indexes for optimal performance:
-- CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_created_deleted
--   ON chat_messages(conversation_id, created_at DESC)
--   WHERE is_deleted = false;
--
-- CREATE INDEX IF NOT EXISTS idx_chat_participants_lookup
--   ON chat_participants(conversation_id, user_id, last_read_at);
--
-- CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id
--   ON chat_messages(user_id)
--   WHERE is_deleted = false;
