-- Step 2: Initialize chat module for existing dealerships and setup storage

-- Initialize chat module for all existing dealerships
INSERT INTO dealership_modules (dealer_id, module, is_enabled, enabled_by)
SELECT 
    d.id as dealer_id,
    'chat'::app_module as module,
    true as is_enabled,
    COALESCE((SELECT id FROM profiles WHERE role = 'admin' LIMIT 1), gen_random_uuid()) as enabled_by
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

-- Enable realtime for chat tables
ALTER TABLE chat_conversations REPLICA IDENTITY FULL;
ALTER TABLE chat_messages REPLICA IDENTITY FULL;
ALTER TABLE chat_participants REPLICA IDENTITY FULL;
ALTER TABLE user_presence REPLICA IDENTITY FULL;

-- Add chat permission to default dealer groups if they don't exist
DO $$
DECLARE
    group_record RECORD;
    new_permissions JSONB;
BEGIN
    -- Add chat permissions to existing dealer groups
    FOR group_record IN 
        SELECT id, permissions FROM dealer_groups WHERE is_active = true
    LOOP
        new_permissions := group_record.permissions;
        
        -- Add chat permissions if not already present
        IF NOT (new_permissions ? 'chat.create') THEN
            new_permissions := new_permissions || '{"chat.create": true}'::jsonb;
        END IF;
        
        IF NOT (new_permissions ? 'chat.participate') THEN
            new_permissions := new_permissions || '{"chat.participate": true}'::jsonb;
        END IF;
        
        -- Update the group with new permissions
        UPDATE dealer_groups 
        SET permissions = new_permissions, updated_at = now()
        WHERE id = group_record.id;
    END LOOP;
END $$;