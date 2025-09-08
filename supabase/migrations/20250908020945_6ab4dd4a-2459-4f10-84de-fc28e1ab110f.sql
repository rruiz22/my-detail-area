-- Ensure admin user has a dealership and membership for full functionality
DO $$
DECLARE
    admin_user_id UUID := '122c8d5b-e5f5-4782-a179-544acbaaceb9';
    admin_dealership_id BIGINT;
    admin_group_id UUID;
    admin_membership_id UUID;
BEGIN
    -- Create or get dealership for admin
    INSERT INTO dealerships (
        name, 
        email, 
        phone, 
        address, 
        city, 
        state, 
        country,
        status,
        subscription_plan,
        max_users
    ) VALUES (
        'Admin Dealership',
        'rruiz@lima.llc',
        '+1-555-0100',
        '123 Admin Street',
        'Admin City',
        'CA',
        'US',
        'active',
        'premium',
        100
    ) 
    ON CONFLICT (email) DO UPDATE SET 
        name = EXCLUDED.name,
        updated_at = now()
    RETURNING id INTO admin_dealership_id;
    
    -- Update admin user's profile with dealership
    UPDATE profiles 
    SET dealership_id = admin_dealership_id
    WHERE id = admin_user_id;
    
    -- Create admin group with full permissions
    INSERT INTO dealer_groups (
        dealer_id,
        name,
        slug,
        description,
        permissions
    ) VALUES (
        admin_dealership_id,
        'Admin Group',
        'admin-group',
        'Full administrative access group',
        '["orders.*", "module.sales_orders", "module.service_orders", "module.recon_orders", "module.car_wash", "users.manage", "dealerships.manage"]'::jsonb
    )
    ON CONFLICT (dealer_id, slug) DO UPDATE SET
        permissions = EXCLUDED.permissions
    RETURNING id INTO admin_group_id;
    
    -- Create admin membership
    INSERT INTO dealer_memberships (
        user_id,
        dealer_id,
        is_active
    ) VALUES (
        admin_user_id,
        admin_dealership_id,
        true
    )
    ON CONFLICT (user_id, dealer_id) DO UPDATE SET
        is_active = true
    RETURNING id INTO admin_membership_id;
    
    -- Assign admin to the admin group
    INSERT INTO dealer_membership_groups (
        membership_id,
        group_id
    ) VALUES (
        admin_membership_id,
        admin_group_id
    )
    ON CONFLICT (membership_id, group_id) DO NOTHING;
    
    RAISE NOTICE 'Admin setup completed: dealership_id=%, group_id=%, membership_id=%', admin_dealership_id, admin_group_id, admin_membership_id;
END $$;