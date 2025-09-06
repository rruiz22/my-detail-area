-- CRITICAL SECURITY FIX: Secure detail_users table with proper RLS policies
-- Fix type casting issues and create secure policies

-- Drop ALL existing policies on detail_users table
DROP POLICY IF EXISTS "Allow authenticated users to manage detail users" ON public.detail_users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.detail_users;
DROP POLICY IF EXISTS "Users can update own basic profile" ON public.detail_users;
DROP POLICY IF EXISTS "Block user creation" ON public.detail_users;
DROP POLICY IF EXISTS "Block user deletion" ON public.detail_users;
DROP POLICY IF EXISTS "secure_users_view_own_profile" ON public.detail_users;
DROP POLICY IF EXISTS "secure_users_update_own_profile" ON public.detail_users;
DROP POLICY IF EXISTS "secure_block_user_creation" ON public.detail_users;
DROP POLICY IF EXISTS "secure_block_user_deletion" ON public.detail_users;

-- Create secure RLS policies using email-based authentication matching

-- 1. Users can ONLY view their own profile data (match by email with auth user)
CREATE POLICY "secure_view_own_profile_only"
ON public.detail_users 
FOR SELECT 
TO authenticated
USING (email = auth.email());

-- 2. Users can ONLY update their own profile data (match by email with auth user)
CREATE POLICY "secure_update_own_profile_only"
ON public.detail_users 
FOR UPDATE 
TO authenticated
USING (email = auth.email());

-- 3. BLOCK all user creation - only system/admin should create users
CREATE POLICY "secure_block_all_inserts"
ON public.detail_users 
FOR INSERT 
TO authenticated
WITH CHECK (false);

-- 4. BLOCK all user deletion - only system/admin should delete users  
CREATE POLICY "secure_block_all_deletes"
ON public.detail_users 
FOR DELETE 
TO authenticated
USING (false);

-- Create a security definer function for future admin operations
CREATE OR REPLACE FUNCTION public.get_user_role_secure(user_email text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.detail_users WHERE email = user_email AND deleted_at IS NULL LIMIT 1;
$$;

-- Document this critical security fix
COMMENT ON TABLE public.detail_users IS 'SECURITY CRITICAL: All sensitive user data including password hashes are now protected by restrictive RLS policies. Users can only access their own data based on authenticated email match.';