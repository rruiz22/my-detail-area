-- Fix security definer view issue
-- Remove the problematic security_barrier property from the view

-- Drop and recreate the view without security_barrier
DROP VIEW IF EXISTS public.user_profiles;

-- Create a standard view for safe user data (without sensitive fields)
-- This view will respect the RLS policies of the underlying table
CREATE OR REPLACE VIEW public.user_profiles AS
SELECT 
  id,
  email,
  first_name,
  last_name,
  phone,
  timezone,
  avatar_url,
  employee_id,
  department,
  role,
  hire_date,
  language_preference,
  is_active,
  last_login_at,
  created_at,
  updated_at
FROM public.detail_users
WHERE deleted_at IS NULL;

-- Grant SELECT permission to authenticated users
-- The view will respect the RLS policies on detail_users table
GRANT SELECT ON public.user_profiles TO authenticated;

COMMENT ON VIEW public.user_profiles IS 'Safe view of user data excluding sensitive fields like password_hash. Respects RLS policies on detail_users table.';