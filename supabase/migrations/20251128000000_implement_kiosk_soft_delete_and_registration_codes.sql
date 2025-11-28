-- =====================================================
-- KIOSK SOFT-DELETE PATTERN & REGISTRATION CODE SYSTEM
-- =====================================================
-- Purpose: Fix kiosk deletion bug by implementing:
--   1. Soft-delete pattern (prevents data loss on kiosk deletion)
--   2. Registration codes (resilient device identification)
--   3. Fingerprint history (tracks device changes)
--   4. Recovery audit log (complete audit trail)
--
-- Migration Date: 2025-11-28
-- Issue: Kiosks being deleted CASCADE deletes device bindings
-- Solution: SET NULL + soft-delete + registration codes
-- =====================================================

-- ========================================
-- PART 1: SOFT-DELETE COLUMNS FOR KIOSKS
-- ========================================

-- Add archived flag to kiosks table
ALTER TABLE detail_hub_kiosks
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;

-- Add archived timestamp
ALTER TABLE detail_hub_kiosks
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Add archived_by to track who archived the kiosk
ALTER TABLE detail_hub_kiosks
ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id);

-- Create index for filtering active kiosks
CREATE INDEX IF NOT EXISTS idx_kiosks_archived
ON detail_hub_kiosks(archived)
WHERE archived = false;

-- ========================================
-- PART 2: FIX CASCADE DELETE → SET NULL
-- ========================================

-- Drop existing CASCADE constraint
ALTER TABLE detail_hub_kiosk_devices
DROP CONSTRAINT IF EXISTS detail_hub_kiosk_devices_kiosk_id_fkey;

-- Recreate with SET NULL (preserves device binding if kiosk deleted/archived)
ALTER TABLE detail_hub_kiosk_devices
ADD CONSTRAINT detail_hub_kiosk_devices_kiosk_id_fkey
FOREIGN KEY (kiosk_id)
REFERENCES detail_hub_kiosks(id)
ON DELETE SET NULL;  -- ✅ Preserves device configuration

-- ========================================
-- PART 3: REGISTRATION CODE SYSTEM
-- ========================================

-- Add registration_code column (permanent device identifier)
ALTER TABLE detail_hub_kiosk_devices
ADD COLUMN IF NOT EXISTS registration_code TEXT UNIQUE;

-- Add fingerprint history (tracks device changes over time)
ALTER TABLE detail_hub_kiosk_devices
ADD COLUMN IF NOT EXISTS device_fingerprint_history JSONB DEFAULT '[]'::jsonb;

-- Create index for fast registration code lookup
CREATE INDEX IF NOT EXISTS idx_kiosk_devices_registration_code
ON detail_hub_kiosk_devices(registration_code)
WHERE registration_code IS NOT NULL;

-- ========================================
-- PART 4: RECOVERY AUDIT LOG TABLE
-- ========================================

-- Create table to track all recovery attempts
CREATE TABLE IF NOT EXISTS kiosk_recovery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Device identification
  device_fingerprint TEXT NOT NULL,
  registration_code TEXT,

  -- Recovery details
  recovery_method TEXT NOT NULL,  -- 'registration_code' | 'fingerprint' | 'fingerprint_history' | 'manual'
  recovery_status TEXT NOT NULL,  -- 'success' | 'failed_no_binding' | 'failed_kiosk_deleted' | 'failed_kiosk_archived' | 'fingerprint_mismatch'

  -- Result
  kiosk_id UUID REFERENCES detail_hub_kiosks(id),
  device_binding_id UUID REFERENCES detail_hub_kiosk_devices(id),

  -- Error details (if failed)
  error_details JSONB,

  -- Metadata
  user_agent TEXT,
  ip_address TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying recent recovery attempts
CREATE INDEX IF NOT EXISTS idx_recovery_log_created_at
ON kiosk_recovery_log(created_at DESC);

-- Index for querying by device
CREATE INDEX IF NOT EXISTS idx_recovery_log_device
ON kiosk_recovery_log(device_fingerprint);

-- Index for querying by registration code
CREATE INDEX IF NOT EXISTS idx_recovery_log_registration_code
ON kiosk_recovery_log(registration_code)
WHERE registration_code IS NOT NULL;

-- ========================================
-- PART 5: HELPER FUNCTIONS
-- ========================================

-- Function to generate secure registration codes
CREATE OR REPLACE FUNCTION generate_registration_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- Exclude ambiguous chars (0, O, I, 1)
  result TEXT := 'KIOSK-';
  i INTEGER;
BEGIN
  -- Generate format: KIOSK-XXXX-XXXX (16 chars total)
  FOR i IN 1..4 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;

  result := result || '-';

  FOR i IN 1..4 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;

  RETURN result;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Function to archive a kiosk (soft-delete)
CREATE OR REPLACE FUNCTION archive_kiosk(
  p_kiosk_id UUID,
  p_archived_by UUID
)
RETURNS JSONB AS $$
DECLARE
  v_device_count INTEGER;
  v_kiosk RECORD;
BEGIN
  -- Get kiosk info
  SELECT * INTO v_kiosk
  FROM detail_hub_kiosks
  WHERE id = p_kiosk_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Kiosk not found'
    );
  END IF;

  -- Count bound devices
  SELECT COUNT(*) INTO v_device_count
  FROM detail_hub_kiosk_devices
  WHERE kiosk_id = p_kiosk_id
    AND is_active = true;

  -- Archive the kiosk
  UPDATE detail_hub_kiosks
  SET
    archived = true,
    archived_at = NOW(),
    archived_by = p_archived_by,
    status = 'maintenance'
  WHERE id = p_kiosk_id;

  -- Return success with device count
  RETURN jsonb_build_object(
    'success', true,
    'device_count', v_device_count,
    'kiosk_code', v_kiosk.kiosk_code,
    'message', format('Kiosk %s archived. %s device(s) will need reconfiguration.', v_kiosk.kiosk_code, v_device_count)
  );
END;
$$ LANGUAGE plpgsql;

-- Function to unarchive a kiosk
CREATE OR REPLACE FUNCTION unarchive_kiosk(
  p_kiosk_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_kiosk RECORD;
BEGIN
  -- Get kiosk info
  SELECT * INTO v_kiosk
  FROM detail_hub_kiosks
  WHERE id = p_kiosk_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Kiosk not found'
    );
  END IF;

  -- Unarchive the kiosk
  UPDATE detail_hub_kiosks
  SET
    archived = false,
    archived_at = NULL,
    archived_by = NULL,
    status = 'offline'  -- Will update to 'online' on next heartbeat
  WHERE id = p_kiosk_id;

  RETURN jsonb_build_object(
    'success', true,
    'kiosk_code', v_kiosk.kiosk_code,
    'message', format('Kiosk %s unarchived successfully.', v_kiosk.kiosk_code)
  );
END;
$$ LANGUAGE plpgsql;

-- Function to log recovery attempt
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
RETURNS UUID AS $$
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
$$ LANGUAGE plpgsql;

-- ========================================
-- PART 6: UPDATE EXISTING DEVICE BINDINGS
-- ========================================

-- Generate registration codes for existing device bindings
DO $$
DECLARE
  v_device RECORD;
  v_code TEXT;
BEGIN
  FOR v_device IN
    SELECT id
    FROM detail_hub_kiosk_devices
    WHERE registration_code IS NULL
  LOOP
    -- Generate unique code
    LOOP
      v_code := generate_registration_code();

      -- Check if code already exists
      IF NOT EXISTS (
        SELECT 1 FROM detail_hub_kiosk_devices
        WHERE registration_code = v_code
      ) THEN
        EXIT;  -- Code is unique, break loop
      END IF;
    END LOOP;

    -- Update device with registration code
    UPDATE detail_hub_kiosk_devices
    SET registration_code = v_code
    WHERE id = v_device.id;

    RAISE NOTICE 'Generated code % for device %', v_code, v_device.id;
  END LOOP;
END $$;

-- ========================================
-- PART 7: VIEWS FOR MONITORING
-- ========================================

-- View for active kiosks (excludes archived)
CREATE OR REPLACE VIEW active_kiosks AS
SELECT *
FROM detail_hub_kiosks
WHERE archived = false
ORDER BY created_at DESC;

-- View for archived kiosks
CREATE OR REPLACE VIEW archived_kiosks AS
SELECT *
FROM detail_hub_kiosks
WHERE archived = true
ORDER BY archived_at DESC;

-- View for device bindings with recovery info
CREATE OR REPLACE VIEW kiosk_devices_with_recovery AS
SELECT
  d.*,
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
-- PART 8: ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS on recovery log
ALTER TABLE kiosk_recovery_log ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read recovery logs for their dealership
CREATE POLICY "Users can view recovery logs for their dealership"
ON kiosk_recovery_log
FOR SELECT
TO authenticated
USING (
  kiosk_id IN (
    SELECT k.id
    FROM detail_hub_kiosks k
    INNER JOIN dealer_memberships dm ON dm.dealer_id = k.dealership_id
    WHERE dm.user_id = auth.uid()
  )
);

-- Allow system to insert recovery logs
CREATE POLICY "Service role can insert recovery logs"
ON kiosk_recovery_log
FOR INSERT
TO service_role
WITH CHECK (true);

-- ========================================
-- MIGRATION COMPLETE
-- ========================================

COMMENT ON TABLE kiosk_recovery_log IS 'Audit log for all kiosk recovery attempts. Tracks successful and failed recovery attempts for debugging.';
COMMENT ON COLUMN detail_hub_kiosks.archived IS 'Soft-delete flag. When true, kiosk is hidden from active list but device bindings are preserved.';
COMMENT ON COLUMN detail_hub_kiosk_devices.registration_code IS 'Permanent device identifier. Format: KIOSK-XXXX-XXXX. Survives fingerprint changes.';
COMMENT ON COLUMN detail_hub_kiosk_devices.device_fingerprint_history IS 'JSONB array tracking all historical fingerprints for this device. Used for recovery when fingerprint changes.';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Kiosk soft-delete migration completed successfully!';
  RAISE NOTICE '✅ Registration codes generated for % existing devices', (SELECT COUNT(*) FROM detail_hub_kiosk_devices WHERE registration_code IS NOT NULL);
  RAISE NOTICE '✅ Recovery audit system enabled';
END $$;
