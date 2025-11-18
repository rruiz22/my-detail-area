-- =====================================================
-- GRANT SYSTEM_ADMIN TO BMW OF SUDBURY
-- =====================================================
-- Problem: rruiz@lima.llc has role NULL in "Bmw of Sudbury"
-- Solution: Update role to system_admin
-- =====================================================

-- Update role for Bmw of Sudbury
UPDATE dealer_memberships
SET
  role = 'system_admin',
  updated_at = NOW()
WHERE user_id = (SELECT id FROM profiles WHERE email = 'rruiz@lima.llc')
  AND dealer_id = (SELECT id FROM dealerships WHERE name = 'Bmw of Sudbury');

-- Also update Admin Dealership (just in case)
UPDATE dealer_memberships
SET
  role = 'system_admin',
  updated_at = NOW()
WHERE user_id = (SELECT id FROM profiles WHERE email = 'rruiz@lima.llc')
  AND dealer_id = (SELECT id FROM dealerships WHERE name = 'Admin Dealership');

-- =====================================================
-- VERIFY: Check updated permissions
-- =====================================================
SELECT
  p.email,
  dm.role,
  d.name as dealership,
  CASE
    WHEN dm.role IN ('dealer_admin', 'dealer_manager', 'system_admin') THEN '✅ Has permission'
    ELSE '❌ No permission'
  END as permission_status
FROM profiles p
JOIN dealer_memberships dm ON dm.user_id = p.id
JOIN dealerships d ON d.id = dm.dealer_id
WHERE p.email = 'rruiz@lima.llc'
ORDER BY d.name;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$ BEGIN
  RAISE NOTICE '✅ Updated permissions for rruiz@lima.llc';
  RAISE NOTICE '✅ Role: system_admin in Bmw of Sudbury';
  RAISE NOTICE '✅ Role: system_admin in Admin Dealership';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Please refresh the page and try updating the employee again';
END $$;
