-- Drop the user_profiles_safe view completely to resolve SECURITY DEFINER issue
DROP VIEW IF EXISTS public.user_profiles_safe;