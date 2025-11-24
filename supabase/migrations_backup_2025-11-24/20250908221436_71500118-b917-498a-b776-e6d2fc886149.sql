-- Fix infinite recursion in chat_participants RLS policies
-- Drop existing policies that might cause recursion
DROP POLICY IF EXISTS "Users can see participants in their conversations" ON chat_participants;
DROP POLICY IF EXISTS "Users can join conversations they have access to" ON chat_participants;
DROP POLICY IF EXISTS "Users can leave conversations" ON chat_participants;
DROP POLICY IF EXISTS "Users can update their participation status" ON chat_participants;

-- Create security definer function to check conversation access
CREATE OR REPLACE FUNCTION public.user_has_conversation_access(conversation_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is already a participant in the conversation
  RETURN EXISTS (
    SELECT 1 FROM chat_participants cp
    WHERE cp.conversation_id = conversation_uuid
    AND cp.user_id = user_uuid
    AND cp.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;

-- Create new non-recursive policies for chat_participants
CREATE POLICY "Users can view their own participation"
ON chat_participants FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can join conversations"
ON chat_participants FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own participation"
ON chat_participants FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own participation"
ON chat_participants FOR DELETE
USING (user_id = auth.uid());

-- Update chat_conversations policies to use the security definer function
DROP POLICY IF EXISTS "Users can view their conversations" ON chat_conversations;
CREATE POLICY "Users can view their conversations"
ON chat_conversations FOR SELECT
USING (
  public.user_has_conversation_access(id, auth.uid())
);

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.user_has_conversation_access(UUID, UUID) TO authenticated;