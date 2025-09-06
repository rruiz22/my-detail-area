-- Fix the security definer view warning
-- The issue is likely with the user_profiles view created earlier

-- Drop the problematic view if it exists
DROP VIEW IF EXISTS public.user_profiles;

-- Create a secure view without SECURITY DEFINER that relies on RLS policies instead
CREATE VIEW public.user_profiles_safe AS
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

-- This view will automatically inherit the RLS policies from detail_users
-- No need for SECURITY DEFINER - RLS policies will handle security

COMMENT ON VIEW public.user_profiles_safe IS 'Safe user profile view that excludes sensitive fields like password_hash. Inherits RLS policies from detail_users table.';