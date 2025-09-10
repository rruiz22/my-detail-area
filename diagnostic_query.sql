-- Diagnostic queries to understand the null returns

-- Check current user authentication
SELECT 'Current authentication status:' as info;
SELECT 
  auth.uid() as current_user_id,
  auth.email() as current_user_email,
  auth.role() as current_role;

-- Check profiles table directly (without RLS)
SELECT 'Profiles table data:' as info;
SELECT id, email, user_type, dealership_id, created_at FROM profiles ORDER BY created_at;

-- Check dealer_memberships table directly 
SELECT 'Dealer memberships data:' as info;
SELECT user_id, dealer_id, is_active, created_at FROM dealer_memberships ORDER BY created_at;

-- Check dealerships table
SELECT 'Dealerships data:' as info;
SELECT id, name, status FROM dealerships ORDER BY id;

-- Check if RLS is enabled
SELECT 'RLS status:' as info;
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('profiles', 'dealer_memberships', 'dealerships');

-- Check current RLS policies
SELECT 'Current RLS policies:' as info;
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('profiles', 'dealer_memberships')
ORDER BY tablename, policyname;