-- =====================================================
-- Clean and Fix Vehicle Notes Policies - Error 409 Fix
-- Created: 2025-10-14
-- Description: Completely clean all policies and recreate
--              with proper system_admin support
-- =====================================================

-- =====================================================
-- STEP 1: Show current state
-- =====================================================

SELECT
  '🔍 CURRENT POLICIES' as info_type,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'vehicle_notes'
ORDER BY policyname;

-- =====================================================
-- STEP 2: Drop ALL existing policies (complete cleanup)
-- =====================================================

DO $$
DECLARE
  policy_record RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🧹 Cleaning up all existing policies...';

  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'vehicle_notes'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.vehicle_notes', policy_record.policyname);
    RAISE NOTICE '  ❌ Dropped: %', policy_record.policyname;
  END LOOP;

  RAISE NOTICE '✅ All old policies removed';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- STEP 3: Create NEW policies with unique names
-- =====================================================

-- Policy 1: SELECT with role-based access
CREATE POLICY "vehicle_notes_select_policy"
  ON public.vehicle_notes
  FOR SELECT
  USING (
    -- System admins can see all notes
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'system_admin'
    )
    OR
    -- Regular users see only notes from their dealership's vehicles
    EXISTS (
      SELECT 1
      FROM public.recon_vehicles rv
      INNER JOIN public.profiles p ON p.dealership_id = rv.dealer_id
      WHERE rv.id = vehicle_notes.vehicle_id
        AND p.id = auth.uid()
    )
  );

-- Policy 2: INSERT with role-based access
CREATE POLICY "vehicle_notes_insert_policy"
  ON public.vehicle_notes
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
    AND (
      -- System admins can create notes for any vehicle
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'system_admin'
      )
      OR
      -- Regular users can create notes only for vehicles in their dealership
      EXISTS (
        SELECT 1
        FROM public.recon_vehicles rv
        INNER JOIN public.profiles p ON p.dealership_id = rv.dealer_id
        WHERE rv.id = vehicle_notes.vehicle_id
          AND p.id = auth.uid()
      )
    )
  );

-- Policy 3: UPDATE with role-based access
CREATE POLICY "vehicle_notes_update_policy"
  ON public.vehicle_notes
  FOR UPDATE
  USING (
    -- System admins can update any note
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'system_admin'
    )
    OR
    -- Regular users can only update their own notes
    created_by = auth.uid()
  )
  WITH CHECK (
    -- Prevent changing the creator
    created_by = (SELECT created_by FROM public.vehicle_notes WHERE id = vehicle_notes.id)
  );

-- Policy 4: DELETE with role-based access
CREATE POLICY "vehicle_notes_delete_policy"
  ON public.vehicle_notes
  FOR DELETE
  USING (
    -- System admins can delete any note
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'system_admin'
    )
    OR
    -- Regular users can only delete their own notes
    created_by = auth.uid()
  );

-- =====================================================
-- STEP 4: Verify new policies
-- =====================================================

SELECT
  '✅ NEW POLICIES' as info_type,
  policyname,
  cmd as operation,
  permissive
FROM pg_policies
WHERE tablename = 'vehicle_notes'
ORDER BY cmd, policyname;

-- =====================================================
-- STEP 5: Test user access
-- =====================================================

SELECT
  '👤 YOUR ACCESS LEVEL' as info_type,
  p.email,
  p.role,
  p.dealership_id,
  CASE
    WHEN p.role = 'system_admin' THEN '🔓 FULL ACCESS - All dealerships'
    WHEN p.dealership_id IS NOT NULL THEN '🔒 LIMITED ACCESS - Dealership ' || p.dealership_id
    ELSE '⚠️ NO ACCESS - No dealership assigned'
  END as access_level
FROM public.profiles p
WHERE p.id = auth.uid();

-- =====================================================
-- STEP 6: Test note visibility
-- =====================================================

DO $$
DECLARE
  user_role TEXT;
  note_count INTEGER;
  vehicle_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '🎉 Vehicle Notes Policies Cleaned and Recreated!';
  RAISE NOTICE '═══════════════════════════════════════════════════════';

  -- Get user role
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid();

  -- Try to count notes (this will test SELECT policy)
  SELECT COUNT(*) INTO note_count
  FROM public.vehicle_notes;

  -- Count accessible vehicles
  SELECT COUNT(*) INTO vehicle_count
  FROM public.recon_vehicles rv
  WHERE
    -- System admins see all
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'system_admin'
    OR
    -- Regular users see only their dealership
    rv.dealer_id = (SELECT dealership_id FROM public.profiles WHERE id = auth.uid());

  RAISE NOTICE '';
  RAISE NOTICE '👤 Your Role: %', COALESCE(user_role, 'unknown');
  RAISE NOTICE '📊 Notes you can see: %', note_count;
  RAISE NOTICE '🚗 Vehicles you can access: %', vehicle_count;
  RAISE NOTICE '';

  IF user_role = 'system_admin' THEN
    RAISE NOTICE '🔓 SYSTEM ADMIN PRIVILEGES:';
    RAISE NOTICE '   ✅ View all notes from all dealerships';
    RAISE NOTICE '   ✅ Create notes for any vehicle';
    RAISE NOTICE '   ✅ Update any note';
    RAISE NOTICE '   ✅ Delete any note';
  ELSE
    RAISE NOTICE '🔒 REGULAR USER PRIVILEGES:';
    RAISE NOTICE '   ✅ View notes from your dealership only';
    RAISE NOTICE '   ✅ Create notes for vehicles in your dealership';
    RAISE NOTICE '   ✅ Update your own notes';
    RAISE NOTICE '   ✅ Delete your own notes';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '🚀 READY TO USE!';
  RAISE NOTICE '';
  RAISE NOTICE '   1. Refresh your browser (Ctrl/Cmd + Shift + R)';
  RAISE NOTICE '   2. Go to Get Ready → Details View';
  RAISE NOTICE '   3. Select a vehicle';
  RAISE NOTICE '   4. Go to Notes tab';
  RAISE NOTICE '   5. Try creating a note!';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════';

END $$;
