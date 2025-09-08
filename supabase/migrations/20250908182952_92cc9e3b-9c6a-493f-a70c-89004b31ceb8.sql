-- Fix remaining function search path security warnings
-- Check and update any remaining functions that need proper search_path

-- Fix the ensure_single_primary_contact function if it has search path issues
CREATE OR REPLACE FUNCTION public.ensure_single_primary_contact()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF NEW.is_primary = TRUE THEN
        -- Set all other contacts for this dealership to non-primary
        UPDATE public.dealership_contacts 
        SET is_primary = FALSE 
        WHERE dealership_id = NEW.dealership_id 
        AND id != NEW.id 
        AND deleted_at IS NULL;
    END IF;
    RETURN NEW;
END;
$$;

-- Fix the validate_user_limit function if it has search path issues
CREATE OR REPLACE FUNCTION public.validate_user_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    current_users INTEGER;
    max_allowed INTEGER;
BEGIN
    -- Get max users allowed for the dealership
    SELECT max_users INTO max_allowed 
    FROM public.dealerships 
    WHERE id = NEW.dealership_id;
    
    -- Count current active users for this dealership
    SELECT COUNT(*) INTO current_users
    FROM public.detail_users 
    WHERE dealership_id = NEW.dealership_id 
    AND is_active = TRUE 
    AND deleted_at IS NULL;
    
    -- Check if we're exceeding the limit (only for INSERT)
    IF TG_OP = 'INSERT' AND current_users >= max_allowed THEN
        RAISE EXCEPTION 'User limit exceeded. Maximum % users allowed for this subscription plan.', max_allowed;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Fix the assign_dealership_to_creator function if it has search path issues
CREATE OR REPLACE FUNCTION public.assign_dealership_to_creator()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the user's profile to assign them to the newly created dealership
  UPDATE public.profiles 
  SET dealership_id = NEW.id,
      role = CASE 
        WHEN role = 'viewer' THEN 'manager'
        ELSE role
      END,
      updated_at = NOW()
  WHERE id = auth.uid() 
  AND dealership_id IS NULL;
  
  RETURN NEW;
END;
$$;