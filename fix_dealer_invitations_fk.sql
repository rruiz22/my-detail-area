-- Fix foreign key relationship for dealer_invitations table

-- First check the current structure of dealer_invitations table
SELECT 'Current dealer_invitations table structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'dealer_invitations' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if foreign key constraints exist
SELECT 'Current foreign key constraints:' as info;
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'dealer_invitations';

-- Add foreign key constraint for inviter_id if it doesn't exist
DO $$ 
BEGIN
    -- Check if the constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'dealer_invitations_inviter_id_fkey' 
        AND table_name = 'dealer_invitations'
    ) THEN
        -- Add the foreign key constraint
        ALTER TABLE dealer_invitations 
        ADD CONSTRAINT dealer_invitations_inviter_id_fkey 
        FOREIGN KEY (inviter_id) REFERENCES profiles(id);
        
        RAISE NOTICE 'Added foreign key constraint dealer_invitations_inviter_id_fkey';
    ELSE
        RAISE NOTICE 'Foreign key constraint dealer_invitations_inviter_id_fkey already exists';
    END IF;
END $$;

-- Check the final result
SELECT 'Final foreign key constraints:' as info;
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'dealer_invitations';