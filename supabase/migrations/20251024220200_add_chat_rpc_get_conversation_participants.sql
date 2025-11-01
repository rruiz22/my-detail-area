-- =====================================================================================
-- Migration: Add get_conversation_participants RPC function
-- Description: Retrieves participant details with profile and presence information
-- Author: database-expert
-- Date: 2025-10-24
-- =====================================================================================

-- Purpose:
-- This function fetches all active participants in a conversation along with their
-- profile information (name, email, avatar), permission level, read status, and
-- real-time presence. Results are ordered with the requesting user first.

-- Usage:
-- SELECT * FROM get_conversation_participants(
--   'conversation-uuid-here'::UUID,
--   auth.uid()
-- );

-- Returns:
-- TABLE (
--   user_id UUID,
--   user_name TEXT,
--   user_email TEXT,
--   user_avatar_url TEXT,
--   permission_level TEXT,
--   is_active BOOLEAN,
--   last_read_at TIMESTAMP WITH TIME ZONE,
--   presence_status TEXT
-- )

-- Performance Notes:
-- Uses INNER JOIN for profiles (required) and LEFT JOIN for presence (optional).
-- Ordering puts requesting user first for UI convenience.
-- For optimal performance, ensure these indexes exist:
-- - chat_participants(conversation_id, is_active, user_id)
-- - user_presence(user_id, presence_status)
-- - profiles(id, first_name, last_name)

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
    cp.permission_level,
    cp.is_active,
    cp.last_read_at,
    -- Default to 'offline' if no presence record exists
    COALESCE(up.presence_status, 'offline') as presence_status
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

-- Add helpful comment to the function
COMMENT ON FUNCTION get_conversation_participants(UUID, UUID) IS
'Fetches active participants in a conversation with profile data and presence status. Requesting user appears first, followed by alphabetical order.';

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION get_conversation_participants(UUID, UUID) TO authenticated;

-- Recommended indexes for optimal performance:
-- CREATE INDEX IF NOT EXISTS idx_chat_participants_conversation_active
--   ON chat_participants(conversation_id, is_active, user_id);
--
-- CREATE INDEX IF NOT EXISTS idx_user_presence_lookup
--   ON user_presence(user_id, presence_status);
--
-- CREATE INDEX IF NOT EXISTS idx_profiles_name_lookup
--   ON profiles(id, first_name, last_name, email);
