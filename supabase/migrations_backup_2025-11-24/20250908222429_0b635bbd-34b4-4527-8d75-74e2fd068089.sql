-- Fix remaining infinite recursion in chat_participants RLS by removing all recursive policies
BEGIN;

-- Ensure RLS is enabled
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;

-- Drop existing chat_participants policies that may reference the same table (recursive)
DROP POLICY IF EXISTS "Moderators can add participants" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can delete their own participation" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can join conversations" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can leave, moderators can remove others" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can update own status, moderators can update others" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can view their own participation" ON public.chat_participants;

-- Recreate minimal, non-recursive, explicit policies (own rows or admin)
CREATE POLICY "Chat participants: select own or admin"
ON public.chat_participants
FOR SELECT
USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Chat participants: insert own or admin"
ON public.chat_participants
FOR INSERT
WITH CHECK (user_id = auth.uid() OR is_admin());

CREATE POLICY "Chat participants: update own or admin"
ON public.chat_participants
FOR UPDATE
USING (user_id = auth.uid() OR is_admin())
WITH CHECK (user_id = auth.uid() OR is_admin());

CREATE POLICY "Chat participants: delete own or admin"
ON public.chat_participants
FOR DELETE
USING (user_id = auth.uid() OR is_admin());

COMMIT;