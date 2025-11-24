-- Fix security warnings by setting search_path for functions
-- Update function to update updated_at timestamp with secure search path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- Update function to ensure only one primary contact per dealership with secure search path
CREATE OR REPLACE FUNCTION public.ensure_single_primary_contact()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql
SET search_path = public;

-- Update function to validate user limits with secure search path
CREATE OR REPLACE FUNCTION public.validate_user_limit()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql
SET search_path = public;