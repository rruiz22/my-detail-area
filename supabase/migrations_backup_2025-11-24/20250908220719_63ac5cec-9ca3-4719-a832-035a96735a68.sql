-- Part 2: Initialize chat module for existing dealerships and set up storage

-- Initialize chat module for all existing dealerships
INSERT INTO dealership_modules (dealer_id, module, is_enabled, enabled_by)
SELECT 
    d.id as dealer_id,
    'chat'::app_module as module,
    true as is_enabled,
    '00000000-0000-0000-0000-000000000000'::uuid as enabled_by
FROM dealerships d
WHERE d.deleted_at IS NULL
  AND d.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM dealership_modules dm 
    WHERE dm.dealer_id = d.id 
    AND dm.module = 'chat'
  );

-- Create storage bucket for chat attachments if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-attachments', 'chat-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for chat attachments
CREATE POLICY "Users can upload chat attachments" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'chat-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view chat attachments" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'chat-attachments' 
  AND (
    auth.uid()::text = (storage.foldername(name))[1] OR
    EXISTS (
      SELECT 1 FROM chat_participants cp
      WHERE cp.conversation_id::text = (storage.foldername(name))[1]
      AND cp.user_id = auth.uid()
      AND cp.is_active = true
    )
  )
);

CREATE POLICY "Users can delete their own chat attachments" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'chat-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Enable realtime for chat tables
ALTER TABLE chat_conversations REPLICA IDENTITY FULL;
ALTER TABLE chat_messages REPLICA IDENTITY FULL;
ALTER TABLE chat_participants REPLICA IDENTITY FULL;
ALTER TABLE user_presence REPLICA IDENTITY FULL;

-- Add chat tables to realtime publication
DO $$
BEGIN
    -- Check and add each table to realtime publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'chat_conversations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE chat_conversations;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'chat_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'chat_participants'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE chat_participants;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'user_presence'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;
    END IF;
END $$;