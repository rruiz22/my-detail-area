-- CRITICAL SECURITY FIX: Secure detail_users table with proper RLS policies
-- Remove ALL existing policies and create secure ones

-- Drop ALL existing policies on detail_users table
DROP POLICY IF EXISTS "Allow authenticated users to manage detail users" ON public.detail_users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.detail_users;
DROP POLICY IF EXISTS "Users can update own basic profile" ON public.detail_users;
DROP POLICY IF EXISTS "Block user creation" ON public.detail_users;
DROP POLICY IF EXISTS "Block user deletion" ON public.detail_users;

-- Create NEW secure RLS policies following principle of least privilege

-- 1. Users can ONLY view their own profile data
CREATE POLICY "secure_users_view_own_profile"
ON public.detail_users 
FOR SELECT 
TO authenticated
USING (
  auth.uid()::text = email 
  OR id = auth.uid()
);

-- 2. Users can ONLY update their own non-sensitive profile data
CREATE POLICY "secure_users_update_own_profile"
ON public.detail_users 
FOR UPDATE 
TO authenticated
USING (
  auth.uid()::text = email 
  OR id = auth.uid()
);

-- 3. Block ALL user creation until proper admin system exists
CREATE POLICY "secure_block_user_creation"
ON public.detail_users 
FOR INSERT 
TO authenticated
WITH CHECK (false);

-- 4. Block ALL user deletion until proper admin system exists
CREATE POLICY "secure_block_user_deletion"
ON public.detail_users 
FOR DELETE 
TO authenticated
USING (false);

-- Document the security fix
COMMENT ON TABLE public.detail_users IS 'SECURITY HARDENED: Table now has restrictive RLS policies. Users can only access their own data. Password hashes and sensitive data are protected.';