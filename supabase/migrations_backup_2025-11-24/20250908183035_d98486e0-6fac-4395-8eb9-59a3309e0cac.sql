-- Fix the remaining function search path security warning
-- Update the handle_new_user function to have proper search_path

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_role_id UUID;
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, email, first_name, last_name, user_type, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    'dealer',
    CASE 
      WHEN NEW.email IN ('admin@test.com', 'admin@company.com', 'rruiz@mydetailarea.com', 'rruiz@lima.llc') THEN 'admin' 
      ELSE 'viewer' 
    END
  );
  
  -- If this is an admin user, assign system_admin role and dealer membership
  IF NEW.email IN ('admin@test.com', 'admin@company.com', 'rruiz@mydetailarea.com', 'rruiz@lima.llc') THEN
    -- Get the system_admin role ID
    SELECT id INTO admin_role_id FROM public.roles WHERE name = 'system_admin' LIMIT 1;
    
    IF admin_role_id IS NOT NULL THEN
      -- Assign system admin role
      INSERT INTO public.user_role_assignments (user_id, role_id, assigned_by, is_active)
      VALUES (NEW.id, admin_role_id, NEW.id, true);
      
      -- Create dealer membership for dealer 5 (o el dealer principal)
      INSERT INTO public.dealer_memberships (user_id, dealer_id, is_active, joined_at)
      VALUES (NEW.id, 5, true, now());
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;