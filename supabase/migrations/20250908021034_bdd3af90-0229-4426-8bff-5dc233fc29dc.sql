-- Create admin dealership without ON CONFLICT since there's no unique constraint on email
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
    'admin@mydetailarea.com',
    '+1-555-0100',
    '123 Admin Street',
    'Admin City',
    'CA',
    'US',
    'active',
    'premium',
    100
);

-- Update the admin user's profile to assign to this dealership  
UPDATE profiles 
SET dealership_id = (SELECT id FROM dealerships WHERE name = 'Admin Dealership' LIMIT 1)
WHERE email = 'rruiz@lima.llc';

-- Create admin group with full permissions for the admin dealership
INSERT INTO dealer_groups (
    dealer_id,
    name,
    slug,
    description,
    permissions
) VALUES (
    (SELECT id FROM dealerships WHERE name = 'Admin Dealership' LIMIT 1),
    'Admin Group',
    'admin-group',
    'Full administrative access group',
    '["orders.*", "module.sales_orders", "orders.create", "orders.update", "orders.delete", "module.service_orders", "module.recon_orders", "module.car_wash", "users.manage", "dealerships.manage"]'::jsonb
);

-- Create admin membership
INSERT INTO dealer_memberships (
    user_id,
    dealer_id,
    is_active
) VALUES (
    '122c8d5b-e5f5-4782-a179-544acbaaceb9',
    (SELECT id FROM dealerships WHERE name = 'Admin Dealership' LIMIT 1),
    true
);

-- Assign admin to the admin group
INSERT INTO dealer_membership_groups (
    membership_id,
    group_id
) VALUES (
    (SELECT id FROM dealer_memberships WHERE user_id = '122c8d5b-e5f5-4782-a179-544acbaaceb9' LIMIT 1),
    (SELECT id FROM dealer_groups WHERE slug = 'admin-group' LIMIT 1)
);