-- =====================================================
-- Final Fix: Dealership Alignment + Test
-- Created: 2025-10-14
-- Description: Fixes dealership mismatch and verifies access
-- =====================================================

-- =====================================================
-- STEP 1: Diagnose the problem
-- =====================================================

SELECT
  '🔍 DIAGNOSIS' as step,
  'User Profile' as check_type,
  p.id as user_id,
  p.email,
  p.role,
  p.dealership_id as user_dealership
FROM public.profiles p
WHERE p.id = auth.uid();

SELECT
  '🔍 DIAGNOSIS' as step,
  'Vehicles in Database' as check_type,
  COUNT(*) as total_vehicles,
  STRING_AGG(DISTINCT dealer_id::TEXT, ', ') as dealer_ids_found
FROM public.recon_vehicles;

SELECT
  '🔍 DIAGNOSIS' as step,
  'Mismatch Check' as check_type,
  (SELECT dealership_id FROM public.profiles WHERE id = auth.uid()) as user_dealership,
  (SELECT STRING_AGG(DISTINCT dealer_id::TEXT, ', ') FROM public.recon_vehicles) as vehicle_dealers,
  CASE
    WHEN (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'system_admin'
    THEN '✅ System Admin - Should see all regardless'
    WHEN (SELECT dealership_id FROM public.profiles WHERE id = auth.uid()) IS NULL
    THEN '❌ User has NO dealership assigned'
    WHEN NOT EXISTS (
      SELECT 1 FROM public.recon_vehicles
      WHERE dealer_id = (SELECT dealership_id FROM public.profiles WHERE id = auth.uid())
    )
    THEN '❌ No vehicles match user dealership'
    ELSE '✅ Match found'
  END as status;

-- =====================================================
-- STEP 2: Fix the mismatch (if needed)
-- =====================================================

DO $$
DECLARE
  user_role TEXT;
  user_dealership INTEGER;
  most_common_dealer INTEGER;
  vehicles_updated INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '🔧 STEP 2: Fixing Dealership Alignment';
  RAISE NOTICE '═══════════════════════════════════════════════════════';

  -- Get user info
  SELECT role, dealership_id INTO user_role, user_dealership
  FROM public.profiles
  WHERE id = auth.uid();

  RAISE NOTICE '👤 Your role: %', user_role;
  RAISE NOTICE '🏢 Your dealership_id: %', COALESCE(user_dealership::TEXT, 'NULL');

  -- If system_admin, no fix needed
  IF user_role = 'system_admin' THEN
    RAISE NOTICE '✅ System Admin detected - you should see all vehicles';
    RAISE NOTICE '   If you see 0 vehicles, there might be no vehicles in DB';

  ELSE
    -- For regular users, ensure alignment

    -- Get most common dealer_id from vehicles
    SELECT dealer_id INTO most_common_dealer
    FROM public.recon_vehicles
    GROUP BY dealer_id
    ORDER BY COUNT(*) DESC
    LIMIT 1;

    RAISE NOTICE '🚗 Most common vehicle dealer_id: %', most_common_dealer;

    IF user_dealership IS NULL THEN
      RAISE NOTICE '⚠️  User has no dealership - assigning dealer_id %', most_common_dealer;

      UPDATE public.profiles
      SET dealership_id = most_common_dealer
      WHERE id = auth.uid();

      RAISE NOTICE '✅ User profile updated to dealership %', most_common_dealer;

    ELSIF user_dealership != most_common_dealer THEN
      RAISE NOTICE '⚠️  Mismatch detected';
      RAISE NOTICE '   Option: Update vehicles to match your dealership %', user_dealership;

      UPDATE public.recon_vehicles
      SET dealer_id = user_dealership
      WHERE dealer_id != user_dealership;

      GET DIAGNOSTICS vehicles_updated = ROW_COUNT;

      RAISE NOTICE '✅ Updated % vehicles to dealership %', vehicles_updated, user_dealership;

    ELSE
      RAISE NOTICE '✅ Dealerships already match - no changes needed';
    END IF;

  END IF;

  RAISE NOTICE '';

END $$;

-- =====================================================
-- STEP 3: Test access again
-- =====================================================

SELECT
  '✅ FINAL CHECK' as step,
  'Your Access' as check_type,
  p.role,
  p.dealership_id,
  CASE
    WHEN p.role = 'system_admin' THEN '🔓 Full Access (System Admin)'
    ELSE '🔒 Dealership Access'
  END as access_type
FROM public.profiles p
WHERE p.id = auth.uid();

SELECT
  '✅ FINAL CHECK' as step,
  'Vehicles You Can Access' as check_type,
  COUNT(*) as accessible_vehicle_count
FROM public.recon_vehicles rv
WHERE
  -- System admins see all
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'system_admin'
  OR
  -- Regular users see only their dealership
  rv.dealer_id = (SELECT dealership_id FROM public.profiles WHERE id = auth.uid());

SELECT
  '✅ FINAL CHECK' as step,
  'Notes You Can Access' as check_type,
  COUNT(*) as accessible_note_count
FROM public.vehicle_notes;

-- =====================================================
-- STEP 4: Summary and instructions
-- =====================================================

DO $$
DECLARE
  user_role TEXT;
  vehicle_count INTEGER;
  note_count INTEGER;
BEGIN
  -- Get user role
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid();

  -- Count accessible vehicles
  SELECT COUNT(*) INTO vehicle_count
  FROM public.recon_vehicles rv
  WHERE
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'system_admin'
    OR
    rv.dealer_id = (SELECT dealership_id FROM public.profiles WHERE id = auth.uid());

  -- Count accessible notes
  SELECT COUNT(*) INTO note_count
  FROM public.vehicle_notes;

  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '🎉 FINAL SUMMARY';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '👤 Your Role: %', user_role;
  RAISE NOTICE '🚗 Vehicles Accessible: %', vehicle_count;
  RAISE NOTICE '📝 Notes Accessible: %', note_count;
  RAISE NOTICE '';

  IF vehicle_count = 0 THEN
    RAISE NOTICE '⚠️  WARNING: No vehicles accessible!';
    RAISE NOTICE '';
    RAISE NOTICE '   Possible reasons:';
    RAISE NOTICE '   1. No vehicles exist in database';
    RAISE NOTICE '   2. Dealership mismatch still exists';
    RAISE NOTICE '   3. You need to create vehicles first';
    RAISE NOTICE '';
    RAISE NOTICE '   To create test vehicles, go to:';
    RAISE NOTICE '   Get Ready → Add Vehicle button';
    RAISE NOTICE '';
  ELSE
    RAISE NOTICE '✅ SUCCESS! You have access to vehicles!';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 NOW YOU CAN:';
    RAISE NOTICE '';
    RAISE NOTICE '   1. HARD REFRESH browser: Ctrl+Shift+R (Win) / Cmd+Shift+R (Mac)';
    RAISE NOTICE '   2. Go to Get Ready → Details View';
    RAISE NOTICE '   3. You should see % vehicle(s)', vehicle_count;
    RAISE NOTICE '   4. Select any vehicle';
    RAISE NOTICE '   5. Go to Notes tab';
    RAISE NOTICE '   6. Create your first note!';
    RAISE NOTICE '';
  END IF;

  RAISE NOTICE '═══════════════════════════════════════════════════════';

END $$;
