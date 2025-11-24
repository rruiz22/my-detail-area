-- Fix dealership ID inconsistency for admin user
-- Update the profile to use the correct dealership where the admin has membership (dealership 5)
UPDATE profiles 
SET dealership_id = 5
WHERE id = '122c8d5b-e5f5-4782-a179-544acbaaceb9';

-- Or alternatively, update the membership to use the dealership from profile (dealership 9)
-- Let's check which dealership has the admin group and use that one
UPDATE dealer_memberships 
SET dealer_id = 9
WHERE user_id = '122c8d5b-e5f5-4782-a179-544acbaaceb9';

-- Update the dealer group to be associated with dealership 9
UPDATE dealer_groups 
SET dealer_id = 9
WHERE id = (
  SELECT dg.id 
  FROM dealer_groups dg
  JOIN dealer_membership_groups dmg ON dmg.group_id = dg.id
  JOIN dealer_memberships dm ON dm.id = dmg.membership_id
  WHERE dm.user_id = '122c8d5b-e5f5-4782-a179-544acbaaceb9'
  LIMIT 1
);