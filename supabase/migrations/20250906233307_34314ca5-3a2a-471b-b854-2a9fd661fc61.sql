-- Ensure user rruiz@limawebstudios.com has admin access
DO $$
DECLARE
    user_uuid UUID;
    super_admin_role UUID;
BEGIN
    -- Get the user ID for rruiz@limawebstudios.com
    SELECT id INTO user_uuid FROM auth.users WHERE email = 'rruiz@limawebstudios.com';
    
    IF user_uuid IS NOT NULL THEN
        -- Update the user's profile to be admin
        UPDATE public.profiles 
        SET role = 'admin', user_type = 'dealer'
        WHERE id = user_uuid;
        
        -- Get dealer_admin role ID
        SELECT id INTO super_admin_role FROM public.roles WHERE name = 'dealer_admin' LIMIT 1;
        
        -- Ensure user has dealer_admin role assignment
        IF super_admin_role IS NOT NULL THEN
            INSERT INTO public.user_role_assignments (user_id, role_id, assigned_by, is_active)
            VALUES (user_uuid, super_admin_role, user_uuid, true)
            ON CONFLICT (user_id, role_id) 
            DO UPDATE SET is_active = true, updated_at = now();
        END IF;
        
        RAISE NOTICE 'User rruiz@limawebstudios.com has been granted admin access';
    ELSE
        RAISE NOTICE 'User rruiz@limawebstudios.com not found in auth.users';
    END IF;
END $$;