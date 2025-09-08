-- Create test dealer membership and groups for the current user
DO $$
DECLARE
    current_user_id UUID;
    test_dealer_id BIGINT := 5;
    test_group_id UUID;
    test_membership_id UUID;
BEGIN
    -- Get current user ID
    SELECT auth.uid() INTO current_user_id;
    
    IF current_user_id IS NOT NULL THEN
        -- Create a test dealer group with sales permissions
        INSERT INTO dealer_groups (dealer_id, name, slug, description, permissions)
        VALUES (
            test_dealer_id,
            'Sales Team',
            'sales-team',
            'Sales team with full order management permissions',
            '["orders.create", "orders.update", "orders.delete", "module.sales_orders"]'::jsonb
        )
        ON CONFLICT (dealer_id, slug) DO UPDATE SET 
            permissions = EXCLUDED.permissions
        RETURNING id INTO test_group_id;
        
        -- Create dealer membership for current user
        INSERT INTO dealer_memberships (user_id, dealer_id, is_active)
        VALUES (current_user_id, test_dealer_id, true)
        ON CONFLICT (user_id, dealer_id) DO UPDATE SET 
            is_active = true
        RETURNING id INTO test_membership_id;
        
        -- Assign user to the sales group
        INSERT INTO dealer_membership_groups (membership_id, group_id)
        VALUES (test_membership_id, test_group_id)
        ON CONFLICT (membership_id, group_id) DO NOTHING;
        
        RAISE NOTICE 'Created test dealer membership and group for user %', current_user_id;
    ELSE
        RAISE NOTICE 'No authenticated user found';
    END IF;
END $$;