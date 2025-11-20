-- =====================================================
-- DETAIL HUB: KIOSK DEVICE BINDING SYSTEM
-- =====================================================
-- Purpose: Secure device binding for kiosk hardware authentication
-- Features: Device fingerprinting, validation, monitoring, audit trail
-- Security: Admin-only registration, dealership-scoped access
-- Author: Claude Code (database-expert agent)
-- Date: 2025-11-20
-- =====================================================

-- =====================================================
-- TABLE: detail_hub_kiosk_devices
-- =====================================================
-- Purpose: Track and authenticate physical devices bound to kiosks
-- Security Model:
--   - Only dealer_admin/system_admin can register/modify devices
--   - All authenticated users can view devices for their dealership's kiosks
--   - Device fingerprints are unique across the platform
-- =====================================================

CREATE TABLE IF NOT EXISTS detail_hub_kiosk_devices (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Kiosk relationship
  kiosk_id UUID NOT NULL REFERENCES detail_hub_kiosks(id) ON DELETE CASCADE,

  -- Device identification (unique fingerprint)
  device_fingerprint TEXT NOT NULL UNIQUE,

  -- System information (for audit and troubleshooting)
  os_username TEXT, -- Detected OS username (Windows user, Linux user, etc.)
  browser_info TEXT, -- Full user agent string
  device_info JSONB DEFAULT '{}'::jsonb, -- Extended device metadata
  -- device_info structure:
  -- {
  --   "screen": {"width": 1920, "height": 1080, "colorDepth": 24},
  --   "platform": "Win32",
  --   "cores": 8,
  --   "memory": 16,
  --   "vendor": "Google Inc.",
  --   "renderer": "ANGLE (Intel, Intel(R) UHD Graphics Direct3D11)",
  --   "languages": ["en-US", "en"],
  --   "timezone": "America/New_York",
  --   "touchSupport": false
  -- }

  -- Registration audit
  registered_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Activity tracking
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_validated_at TIMESTAMPTZ, -- Last successful validation timestamp

  -- Status management
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_device_fingerprint CHECK (LENGTH(device_fingerprint) >= 32),
  CONSTRAINT valid_device_info_json CHECK (jsonb_typeof(device_info) = 'object')
);

-- =====================================================
-- INDEXES for performance optimization
-- =====================================================

-- Fast device fingerprint lookup (most frequent operation)
CREATE UNIQUE INDEX idx_kiosk_devices_fingerprint
  ON detail_hub_kiosk_devices(device_fingerprint);

-- Kiosk → devices query (for admin UI showing all devices per kiosk)
CREATE INDEX idx_kiosk_devices_kiosk_id
  ON detail_hub_kiosk_devices(kiosk_id);

-- Active device monitoring (for health dashboards)
CREATE INDEX idx_kiosk_devices_active
  ON detail_hub_kiosk_devices(is_active, last_seen_at DESC)
  WHERE is_active = true;

-- Registration audit trail
CREATE INDEX idx_kiosk_devices_registered_by
  ON detail_hub_kiosk_devices(registered_by)
  WHERE registered_by IS NOT NULL;

-- GIN index for JSONB device_info queries
CREATE INDEX idx_kiosk_devices_device_info_gin
  ON detail_hub_kiosk_devices USING GIN(device_info);

-- =====================================================
-- TRIGGER: Auto-update updated_at timestamp
-- =====================================================

CREATE TRIGGER trigger_update_detail_hub_kiosk_devices_updated_at
  BEFORE UPDATE ON detail_hub_kiosk_devices
  FOR EACH ROW
  EXECUTE FUNCTION update_detail_hub_employees_updated_at(); -- Reuse existing function

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE detail_hub_kiosk_devices ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view devices for their dealership's kiosks
CREATE POLICY "Users can view devices from their dealership kiosks"
  ON detail_hub_kiosk_devices
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM detail_hub_kiosks k
      INNER JOIN dealer_memberships dm ON k.dealership_id = dm.dealership_id
      WHERE k.id = detail_hub_kiosk_devices.kiosk_id
        AND dm.user_id = auth.uid()
    )
  );

-- Policy: Only dealer_admin and system_admin can insert devices
CREATE POLICY "Admins can register kiosk devices"
  ON detail_hub_kiosk_devices
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM detail_hub_kiosks k
      INNER JOIN dealer_memberships dm ON k.dealership_id = dm.dealership_id
      WHERE k.id = detail_hub_kiosk_devices.kiosk_id
        AND dm.user_id = auth.uid()
        AND dm.role IN ('dealer_admin', 'system_admin')
    )
  );

-- Policy: Only dealer_admin and system_admin can update devices
CREATE POLICY "Admins can update kiosk devices"
  ON detail_hub_kiosk_devices
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM detail_hub_kiosks k
      INNER JOIN dealer_memberships dm ON k.dealership_id = dm.dealership_id
      WHERE k.id = detail_hub_kiosk_devices.kiosk_id
        AND dm.user_id = auth.uid()
        AND dm.role IN ('dealer_admin', 'system_admin')
    )
  );

-- Policy: Only dealer_admin and system_admin can delete devices
CREATE POLICY "Admins can delete kiosk devices"
  ON detail_hub_kiosk_devices
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM detail_hub_kiosks k
      INNER JOIN dealer_memberships dm ON k.dealership_id = dm.dealership_id
      WHERE k.id = detail_hub_kiosk_devices.kiosk_id
        AND dm.user_id = auth.uid()
        AND dm.role IN ('dealer_admin', 'system_admin')
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- =====================================================
-- Function: validate_kiosk_device
-- =====================================================
-- Purpose: Validate if a device fingerprint is authorized for a specific kiosk
-- Returns: TRUE if device is active and bound to kiosk, FALSE otherwise
-- Security: SECURITY DEFINER to bypass RLS for validation logic
-- Usage: Called by kiosk frontend before allowing punch operations
-- =====================================================

CREATE OR REPLACE FUNCTION validate_kiosk_device(
  p_fingerprint TEXT,
  p_kiosk_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Bypass RLS for validation
STABLE -- Function doesn't modify database
AS $$
DECLARE
  v_is_valid BOOLEAN;
BEGIN
  -- Check if device exists, is active, and bound to the specified kiosk
  SELECT EXISTS (
    SELECT 1
    FROM detail_hub_kiosk_devices
    WHERE device_fingerprint = p_fingerprint
      AND kiosk_id = p_kiosk_id
      AND is_active = true
  ) INTO v_is_valid;

  -- Update last_validated_at if device is valid
  IF v_is_valid THEN
    UPDATE detail_hub_kiosk_devices
    SET last_validated_at = NOW()
    WHERE device_fingerprint = p_fingerprint
      AND kiosk_id = p_kiosk_id;
  END IF;

  RETURN v_is_valid;
END;
$$;

-- =====================================================
-- Function: update_device_last_seen
-- =====================================================
-- Purpose: Update device activity timestamp (heartbeat)
-- Returns: VOID (no return value)
-- Security: SECURITY DEFINER to bypass RLS for heartbeat updates
-- Usage: Called periodically by kiosk frontend (e.g., every 30 seconds)
-- Performance: Updates single row by unique fingerprint (very fast)
-- =====================================================

CREATE OR REPLACE FUNCTION update_device_last_seen(
  p_fingerprint TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Bypass RLS for heartbeat
VOLATILE -- Function modifies database
AS $$
BEGIN
  UPDATE detail_hub_kiosk_devices
  SET last_seen_at = NOW()
  WHERE device_fingerprint = p_fingerprint
    AND is_active = true;

  -- No error if device not found (silent fail for performance)
END;
$$;

-- =====================================================
-- Function: get_kiosk_device_status
-- =====================================================
-- Purpose: Get comprehensive device status for a kiosk
-- Returns: Table of device information with activity metrics
-- Security: SECURITY DEFINER with dealership check
-- Usage: Admin UI to monitor kiosk devices
-- =====================================================

CREATE OR REPLACE FUNCTION get_kiosk_device_status(
  p_kiosk_id UUID
)
RETURNS TABLE (
  device_id UUID,
  device_fingerprint TEXT,
  os_username TEXT,
  browser_info TEXT,
  device_info JSONB,
  is_active BOOLEAN,
  registered_at TIMESTAMPTZ,
  registered_by_email TEXT,
  last_seen_at TIMESTAMPTZ,
  last_validated_at TIMESTAMPTZ,
  is_online BOOLEAN, -- Device seen within last 5 minutes
  minutes_since_last_seen INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  -- Verify caller has access to this kiosk's dealership
  IF NOT EXISTS (
    SELECT 1
    FROM detail_hub_kiosks k
    INNER JOIN dealer_memberships dm ON k.dealership_id = dm.dealership_id
    WHERE k.id = p_kiosk_id
      AND dm.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied to kiosk devices';
  END IF;

  RETURN QUERY
  SELECT
    d.id AS device_id,
    d.device_fingerprint,
    d.os_username,
    d.browser_info,
    d.device_info,
    d.is_active,
    d.registered_at,
    p.email AS registered_by_email,
    d.last_seen_at,
    d.last_validated_at,
    (NOW() - d.last_seen_at) < INTERVAL '5 minutes' AS is_online,
    EXTRACT(EPOCH FROM (NOW() - d.last_seen_at))::INTEGER / 60 AS minutes_since_last_seen
  FROM detail_hub_kiosk_devices d
  LEFT JOIN profiles p ON d.registered_by = p.id
  WHERE d.kiosk_id = p_kiosk_id
  ORDER BY d.is_active DESC, d.last_seen_at DESC;
END;
$$;

-- =====================================================
-- Function: deactivate_stale_devices
-- =====================================================
-- Purpose: Auto-deactivate devices not seen in X days (maintenance)
-- Returns: Number of devices deactivated
-- Security: SECURITY DEFINER (called by scheduled job)
-- Usage: Run via pg_cron or manually for maintenance
-- =====================================================

CREATE OR REPLACE FUNCTION deactivate_stale_devices(
  p_days_threshold INTEGER DEFAULT 30
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Deactivate devices not seen in X days
  WITH deactivated AS (
    UPDATE detail_hub_kiosk_devices
    SET
      is_active = false,
      updated_at = NOW()
    WHERE is_active = true
      AND last_seen_at < (NOW() - (p_days_threshold || ' days')::INTERVAL)
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM deactivated;

  RETURN v_count;
END;
$$;

-- =====================================================
-- COMMENTS for documentation
-- =====================================================

COMMENT ON TABLE detail_hub_kiosk_devices IS 'Device binding and authentication for DetailHub kiosk hardware';
COMMENT ON COLUMN detail_hub_kiosk_devices.device_fingerprint IS 'Unique browser/hardware fingerprint (SHA-256 hash of device characteristics)';
COMMENT ON COLUMN detail_hub_kiosk_devices.os_username IS 'Detected operating system username for audit trail';
COMMENT ON COLUMN detail_hub_kiosk_devices.browser_info IS 'Full user agent string for troubleshooting compatibility issues';
COMMENT ON COLUMN detail_hub_kiosk_devices.device_info IS 'Extended device metadata (screen, platform, cores, memory, etc.)';
COMMENT ON COLUMN detail_hub_kiosk_devices.registered_by IS 'Admin user who authorized this device binding';
COMMENT ON COLUMN detail_hub_kiosk_devices.last_seen_at IS 'Last heartbeat timestamp from device (updated every 30s)';
COMMENT ON COLUMN detail_hub_kiosk_devices.last_validated_at IS 'Last successful validation during punch operation';
COMMENT ON COLUMN detail_hub_kiosk_devices.is_active IS 'Device is authorized for use (false = device revoked/deactivated)';

COMMENT ON FUNCTION validate_kiosk_device(TEXT, UUID) IS 'Validate if device fingerprint is authorized for kiosk (returns boolean)';
COMMENT ON FUNCTION update_device_last_seen(TEXT) IS 'Update device heartbeat timestamp (called every 30s by kiosk frontend)';
COMMENT ON FUNCTION get_kiosk_device_status(UUID) IS 'Get comprehensive device status for kiosk (admin UI)';
COMMENT ON FUNCTION deactivate_stale_devices(INTEGER) IS 'Auto-deactivate devices not seen in X days (maintenance function)';

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions on functions to authenticated users
GRANT EXECUTE ON FUNCTION validate_kiosk_device(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_device_last_seen(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_kiosk_device_status(UUID) TO authenticated;

-- Only service_role can run maintenance function
GRANT EXECUTE ON FUNCTION deactivate_stale_devices(INTEGER) TO service_role;

-- =====================================================
-- MIGRATION VERIFICATION
-- =====================================================

-- Verify table creation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'detail_hub_kiosk_devices'
  ) THEN
    RAISE EXCEPTION 'Migration failed: detail_hub_kiosk_devices table not created';
  END IF;

  RAISE NOTICE 'Migration successful: detail_hub_kiosk_devices table created with % indexes and % functions',
    (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'detail_hub_kiosk_devices'),
    4; -- validate_kiosk_device, update_device_last_seen, get_kiosk_device_status, deactivate_stale_devices
END $$;
