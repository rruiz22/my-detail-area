-- Fix function search path security warnings
-- Update functions to have proper search_path set for security

-- Fix the set_detail_user_id function to have proper search_path
CREATE OR REPLACE FUNCTION public.set_detail_user_id()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set user_id to the authenticated user's ID if not already set
  IF NEW.user_id IS NULL THEN
    NEW.user_id = auth.uid();
  END IF;
  
  -- Ensure the user_id matches the authenticated user (security check)
  IF NEW.user_id != auth.uid() AND NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Cannot set user_id to a different user unless you are an admin';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Also check and fix any other functions that might have search path issues
-- Update the update_updated_at_column function if it exists and has search path issues
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;