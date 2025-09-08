-- Add missing function for unread message counts
CREATE OR REPLACE FUNCTION public.get_unread_message_counts(
  conversation_ids UUID[],
  user_id UUID
)
RETURNS TABLE(conversation_id UUID, unread_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.conversation_id,
    COALESCE(
      (SELECT COUNT(*)::INTEGER 
       FROM chat_messages cm 
       WHERE cm.conversation_id = cp.conversation_id 
       AND cm.created_at > cp.last_read_at
       AND cm.user_id != user_id
       AND cm.is_deleted = false
      ), 0
    ) as unread_count
  FROM chat_participants cp
  WHERE cp.conversation_id = ANY(conversation_ids)
  AND cp.user_id = user_id
  AND cp.is_active = true;
END;
$$;

-- Create typing indicators table
CREATE TABLE public.chat_typing_indicators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_typing BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(conversation_id, user_id)
);

ALTER TABLE public.chat_typing_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage typing indicators for their conversations"
ON public.chat_typing_indicators
FOR ALL
TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.chat_participants cp
    WHERE cp.conversation_id = conversation_id
    AND cp.user_id = auth.uid()
    AND cp.is_active = true
  )
)
WITH CHECK (
  user_id = auth.uid()
);