-- CRITICAL SECURITY FIX: Secure detail_users table with proper RLS policies
-- Current policy allows ANY authenticated user to access ALL user data including password hashes

-- Drop the dangerous existing policy
DROP POLICY IF EXISTS "Allow authenticated users to manage detail users" ON public.detail_users;

-- Create secure RLS policies following principle of least privilege

-- 1. Users can only view their own profile data
CREATE POLICY "Users can view own profile"
ON public.detail_users 
FOR SELECT 
TO authenticated
USING (auth.uid()::text = email OR id::text = auth.uid()::text);

-- 2. Users can only update their own non-sensitive profile data
CREATE POLICY "Users can update own profile"
ON public.detail_users 
FOR UPDATE 
TO authenticated
USING (auth.uid()::text = email OR id::text = auth.uid()::text)
WITH CHECK (
  auth.uid()::text = email OR id::text = auth.uid()::text
  -- Prevent users from changing sensitive fields
  AND OLD.email = NEW.email 
  AND OLD.employee_id = NEW.employee_id
  AND OLD.dealership_id = NEW.dealership_id
  AND OLD.role = NEW.role
  AND OLD.department = NEW.department
  AND OLD.can_access_all_dealerships = NEW.can_access_all_dealerships
  AND OLD.assigned_dealerships = NEW.assigned_dealerships
  AND OLD.permissions = NEW.permissions
);

-- 3. Only allow INSERT for system/admin operations (will need proper admin role later)
-- For now, restrict INSERT to prevent unauthorized user creation
CREATE POLICY "Restrict user creation"
ON public.detail_users 
FOR INSERT 
TO authenticated
WITH CHECK (false); -- No one can create users until proper admin system is implemented

-- 4. Only allow DELETE for system/admin operations  
CREATE POLICY "Restrict user deletion"
ON public.detail_users 
FOR DELETE 
TO authenticated
USING (false); -- No one can delete users until proper admin system is implemented

-- 5. Create a security definer function to check admin status (for future use)
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- For now return false, will be updated when admin roles are implemented
  -- This prevents the RLS infinite recursion issue
  SELECT false;
$$;

-- Add comment to track this security fix
COMMENT ON TABLE public.detail_users IS 'SECURITY: RLS policies updated to prevent unauthorized access to user data including password hashes. Admin functionality needs to be implemented separately.';

-- Log this security fix
INSERT INTO supabase_migrations.schema_migrations (version, name, statements, created_by) 
VALUES (
  to_char(current_timestamp, 'YYYYMMDDHHMISS'),
  'SECURITY_FIX_detail_users_rls',
  ARRAY['Fixed critical RLS vulnerability in detail_users table'],
  'security_fix'
) ON CONFLICT DO NOTHING;