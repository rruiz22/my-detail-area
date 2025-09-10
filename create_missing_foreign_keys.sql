-- Create missing foreign key constraints for dealer_invitations table

-- First, let's check if the dealer_invitations table exists and its structure
SELECT 'Checking dealer_invitations table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'dealer_invitations' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check current foreign keys
SELECT 'Current foreign key constraints on dealer_invitations:' as info;
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

-- Drop any existing constraints with similar names (in case they're corrupted)
DO $$ 
BEGIN
    -- Try to drop existing constraints if they exist
    BEGIN
        ALTER TABLE dealer_invitations DROP CONSTRAINT IF EXISTS dealer_invitations_inviter_id_fkey;
        RAISE NOTICE 'Dropped existing dealer_invitations_inviter_id_fkey constraint';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'No existing dealer_invitations_inviter_id_fkey constraint found';
    END;
    
    BEGIN
        ALTER TABLE dealer_invitations DROP CONSTRAINT IF EXISTS dealer_invitations_dealer_id_fkey;
        RAISE NOTICE 'Dropped existing dealer_invitations_dealer_id_fkey constraint';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'No existing dealer_invitations_dealer_id_fkey constraint found';
    END;
END $$;

-- Now create the foreign key constraints
DO $$ 
BEGIN
    -- Add foreign key for inviter_id -> profiles(id)
    BEGIN
        ALTER TABLE dealer_invitations 
        ADD CONSTRAINT dealer_invitations_inviter_id_fkey 
        FOREIGN KEY (inviter_id) REFERENCES profiles(id) ON DELETE SET NULL;
        
        RAISE NOTICE 'Successfully created dealer_invitations_inviter_id_fkey constraint';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Error creating dealer_invitations_inviter_id_fkey: %', SQLERRM;
    END;
    
    -- Add foreign key for dealer_id -> dealerships(id) if dealer_id column exists
    BEGIN
        ALTER TABLE dealer_invitations 
        ADD CONSTRAINT dealer_invitations_dealer_id_fkey 
        FOREIGN KEY (dealer_id) REFERENCES dealerships(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Successfully created dealer_invitations_dealer_id_fkey constraint';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Error creating dealer_invitations_dealer_id_fkey: %', SQLERRM;
    END;
END $$;

-- Verify the foreign keys were created
SELECT 'Final foreign key constraints on dealer_invitations:' as info;
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
AND tc.table_name = 'dealer_invitations'
ORDER BY tc.constraint_name;

-- Test a sample query to make sure it works
SELECT 'Testing the relationship query:' as info;
SELECT 
    di.id,
    di.email,
    di.created_at,
    d.name as dealership_name,
    p.email as inviter_email,
    p.first_name as inviter_first_name,
    p.last_name as inviter_last_name
FROM dealer_invitations di
LEFT JOIN dealerships d ON di.dealer_id = d.id
LEFT JOIN profiles p ON di.inviter_id = p.id
ORDER BY di.created_at DESC
LIMIT 5;