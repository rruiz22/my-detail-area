-- =====================================================
-- FIX KIOSK RECOVERY HTTP ERRORS (406, 403, 400)
-- =====================================================
-- Purpose: Enable unauthenticated kiosk recovery by fixing permissions
-- Issue: Kiosks cannot recover after localStorage clear
-- Date: 2025-11-29
-- =====================================================

-- ========================================
-- FIX #1: 406 NOT ACCEPTABLE
-- ========================================
-- Add missing SELECT policy for unauthenticated kiosk queries

DROP POLICY IF EXISTS "Allow unauthenticated kiosk recovery queries" ON detail_hub_kiosk_devices;

CREATE POLICY "Allow unauthenticated kiosk recovery queries"
  ON detail_hub_kiosk_devices
  FOR SELECT
  TO anon, authenticated  -- Allow both unauthenticated and authenticated
  USING (true);  -- No restrictions - device bindings have no sensitive data

-- Also allow SELECT on detail_hub_kiosks for inner join
DROP POLICY IF EXISTS "Allow unauthenticated kiosk metadata read" ON detail_hub_kiosks;

CREATE POLICY "Allow unauthenticated kiosk metadata read"
  ON detail_hub_kiosks
  FOR SELECT
  TO anon, authenticated
  USING (archived = false);  -- Only show active (non-archived) kiosks

-- ========================================
-- FIX #2: 403 FORBIDDEN
-- ========================================
-- Add SECURITY DEFINER to log_kiosk_recovery function

CREATE OR REPLACE FUNCTION log_kiosk_recovery(
  p_device_fingerprint TEXT,
  p_registration_code TEXT,
  p_recovery_method TEXT,
  p_recovery_status TEXT,
  p_kiosk_id UUID DEFAULT NULL,
  p_device_binding_id UUID DEFAULT NULL,
  p_error_details JSONB DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER  -- ✅ NEW: Run with function owner's permissions
SET search_path = public  -- ✅ NEW: Security best practice
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO kiosk_recovery_log (
    device_fingerprint,
    registration_code,
    recovery_method,
    recovery_status,
    kiosk_id,
    device_binding_id,
    error_details,
    user_agent,
    ip_address
  ) VALUES (
    p_device_fingerprint,
    p_registration_code,
    p_recovery_method,
    p_recovery_status,
    p_kiosk_id,
    p_device_binding_id,
    p_error_details,
    p_user_agent,
    p_ip_address
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Grant execute permission to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION log_kiosk_recovery(
  TEXT, TEXT, TEXT, TEXT, UUID, UUID, JSONB, TEXT, TEXT
) TO anon, authenticated;

-- ========================================
-- FIX #3: 400 BAD REQUEST
-- ========================================
-- Convert device_fingerprint_history from JSONB to TEXT[]

-- Step 1: Drop dependent view
DROP VIEW IF EXISTS kiosk_devices_with_recovery;

-- Step 2: Add new column with correct type
ALTER TABLE detail_hub_kiosk_devices
ADD COLUMN IF NOT EXISTS device_fingerprint_history_new TEXT[] DEFAULT '{}'::TEXT[];

-- Step 3: Migrate data from JSONB to TEXT[]
UPDATE detail_hub_kiosk_devices
SET device_fingerprint_history_new = (
  CASE
    WHEN device_fingerprint_history IS NULL OR device_fingerprint_history = '[]'::jsonb
    THEN '{}'::TEXT[]
    ELSE ARRAY(SELECT jsonb_array_elements_text(device_fingerprint_history))
  END
)
WHERE device_fingerprint_history_new IS NULL;

-- Step 4: Drop old JSONB column
ALTER TABLE detail_hub_kiosk_devices
DROP COLUMN IF EXISTS device_fingerprint_history;

-- Step 5: Rename new column to original name
ALTER TABLE detail_hub_kiosk_devices
RENAME COLUMN device_fingerprint_history_new TO device_fingerprint_history;

-- Step 6: Add NOT NULL constraint (safe - we migrated all nulls to empty arrays)
ALTER TABLE detail_hub_kiosk_devices
ALTER COLUMN device_fingerprint_history SET NOT NULL;

-- Step 7: Add comment for documentation
COMMENT ON COLUMN detail_hub_kiosk_devices.device_fingerprint_history
IS 'Array of historical device fingerprints (TEXT[]) for recovery when fingerprint changes. Migrated from JSONB 2025-11-29.';

-- Step 8: Recreate the dependent view with new column type
CREATE OR REPLACE VIEW kiosk_devices_with_recovery AS
SELECT
  d.id,
  d.kiosk_id,
  d.device_fingerprint,
  d.is_active,
  d.configured_at,
  d.last_seen_at,
  d.last_seen_username,
  d.created_at,
  d.updated_at,
  d.registration_code,
  d.device_fingerprint_history,  -- Now TEXT[] instead of JSONB
  k.kiosk_code,
  k.name AS kiosk_name,
  k.archived AS kiosk_archived,
  COUNT(r.id) AS recovery_attempts,
  MAX(r.created_at) AS last_recovery_attempt
FROM detail_hub_kiosk_devices d
LEFT JOIN detail_hub_kiosks k ON k.id = d.kiosk_id
LEFT JOIN kiosk_recovery_log r ON r.device_binding_id = d.id
GROUP BY d.id, k.kiosk_code, k.name, k.archived;

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Verify policies exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'detail_hub_kiosk_devices'
    AND policyname = 'Allow unauthenticated kiosk recovery queries'
  ) THEN
    RAISE EXCEPTION 'Policy "Allow unauthenticated kiosk recovery queries" not found!';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'detail_hub_kiosks'
    AND policyname = 'Allow unauthenticated kiosk metadata read'
  ) THEN
    RAISE EXCEPTION 'Policy "Allow unauthenticated kiosk metadata read" not found!';
  END IF;

  RAISE NOTICE '✅ All RLS policies created successfully';
END $$;

-- Verify function has SECURITY DEFINER
DO $$
DECLARE
  v_security_type TEXT;
BEGIN
  SELECT prosecdef::TEXT INTO v_security_type
  FROM pg_proc
  WHERE proname = 'log_kiosk_recovery';

  IF v_security_type != 'true' THEN
    RAISE EXCEPTION 'Function log_kiosk_recovery does not have SECURITY DEFINER!';
  END IF;

  RAISE NOTICE '✅ Function log_kiosk_recovery has SECURITY DEFINER';
END $$;

-- Verify column type change
DO $$
DECLARE
  v_data_type TEXT;
BEGIN
  SELECT data_type INTO v_data_type
  FROM information_schema.columns
  WHERE table_name = 'detail_hub_kiosk_devices'
  AND column_name = 'device_fingerprint_history';

  IF v_data_type != 'ARRAY' THEN
    RAISE EXCEPTION 'Column device_fingerprint_history is not ARRAY type! Found: %', v_data_type;
  END IF;

  RAISE NOTICE '✅ Column device_fingerprint_history is now TEXT[]';
END $$;

-- Verify view was recreated
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_views
    WHERE viewname = 'kiosk_devices_with_recovery'
    AND schemaname = 'public'
  ) THEN
    RAISE EXCEPTION 'View kiosk_devices_with_recovery was not recreated!';
  END IF;

  RAISE NOTICE '✅ View kiosk_devices_with_recovery recreated successfully';
END $$;
