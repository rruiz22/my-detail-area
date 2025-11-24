-- Fix the Security Definer View error
-- This is likely caused by the user_profiles_safe view

-- Drop the problematic view that has SECURITY DEFINER
DROP VIEW IF EXISTS public.user_profiles_safe;

-- Create a simple view without SECURITY DEFINER if needed
CREATE OR REPLACE VIEW public.user_profiles_safe AS
SELECT 
  id,
  email,
  first_name,
  last_name,
  role,
  dealership_id,
  created_at,
  updated_at
FROM public.profiles;