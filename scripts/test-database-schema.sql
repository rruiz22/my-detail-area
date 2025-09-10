-- Test database schema and permissions for create-dealer-user function

-- Check if profiles table exists and its schema
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- Check if dealer_memberships table exists and its schema  
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'dealer_memberships' 
ORDER BY ordinal_position;

-- Check if dealerships table exists (for foreign key reference)
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'dealerships' 
ORDER BY ordinal_position;

-- Check foreign key constraints
SELECT 
    tc.table_name,
    tc.constraint_name, 
    tc.constraint_type,
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
    AND (tc.table_name = 'profiles' OR tc.table_name = 'dealer_memberships');

-- Check RLS policies on tables
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('profiles', 'dealer_memberships')
ORDER BY tablename, policyname;

-- Test a simple insert to see what happens (will rollback)
BEGIN;
    -- Try to insert a test profile
    INSERT INTO profiles (
        id, 
        email, 
        first_name, 
        last_name, 
        user_type, 
        role, 
        dealership_id
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        'test@example.com',
        'Test',
        'User', 
        'dealer',
        'admin',
        1
    );
    
    -- Try to insert a test membership
    INSERT INTO dealer_memberships (
        user_id,
        dealer_id,
        is_active,
        roles
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        1,
        true,
        ARRAY['admin']
    );
    
ROLLBACK;