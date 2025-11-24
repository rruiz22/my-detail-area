-- =====================================================
-- DETAIL HUB: KIOSKS TABLE
-- =====================================================
-- Purpose: Kiosk device management for time clock stations
-- Features: Kiosk configuration, status monitoring, settings
-- Author: Claude Code
-- Date: 2025-11-17
-- =====================================================

-- Create custom types for kiosks
CREATE TYPE detail_hub_kiosk_status AS ENUM (
  'online',
  'offline',
  'warning',
  'maintenance'
);

CREATE TYPE detail_hub_camera_status AS ENUM (
  'active',
  'inactive',
  'error'
);

-- =====================================================
-- TABLE: detail_hub_kiosks
-- =====================================================
CREATE TABLE IF NOT EXISTS detail_hub_kiosks (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id INTEGER NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  kiosk_code TEXT NOT NULL, -- e.g., KIOSK-001, KIOSK-002

  -- Kiosk information
  name TEXT NOT NULL, -- e.g., "Main Entrance", "Break Room"
  location TEXT, -- Physical location description
  description TEXT,

  -- Network configuration
  ip_address INET,
  mac_address MACADDR,

  -- Status monitoring
  status detail_hub_kiosk_status NOT NULL DEFAULT 'offline',
  camera_status detail_hub_camera_status NOT NULL DEFAULT 'inactive',
  last_ping TIMESTAMPTZ,
  last_heartbeat TIMESTAMPTZ,

  -- Face recognition settings
  face_recognition_enabled BOOLEAN NOT NULL DEFAULT true,
  face_confidence_threshold INTEGER NOT NULL DEFAULT 80, -- 0-100

  -- Kiosk behavior settings
  kiosk_mode BOOLEAN NOT NULL DEFAULT true, -- Locked to time clock only
  auto_sleep BOOLEAN NOT NULL DEFAULT true,
  sleep_timeout_minutes INTEGER NOT NULL DEFAULT 30,
  allow_manual_entry BOOLEAN NOT NULL DEFAULT true,
  require_photo_fallback BOOLEAN NOT NULL DEFAULT false,

  -- Display settings
  screen_brightness INTEGER NOT NULL DEFAULT 80, -- 0-100
  volume INTEGER NOT NULL DEFAULT 75, -- 0-100
  theme TEXT DEFAULT 'default',

  -- Statistics
  total_punches INTEGER NOT NULL DEFAULT 0,
  punches_today INTEGER NOT NULL DEFAULT 0,
  last_punch_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_kiosk_code_per_dealership UNIQUE (dealership_id, kiosk_code),
  CONSTRAINT valid_brightness CHECK (screen_brightness >= 0 AND screen_brightness <= 100),
  CONSTRAINT valid_volume CHECK (volume >= 0 AND volume <= 100),
  CONSTRAINT valid_confidence_threshold CHECK (face_confidence_threshold >= 0 AND face_confidence_threshold <= 100),
  CONSTRAINT valid_sleep_timeout CHECK (sleep_timeout_minutes >= 0)
);

-- =====================================================
-- INDEXES for performance optimization
-- =====================================================
CREATE INDEX idx_detail_hub_kiosks_dealership ON detail_hub_kiosks(dealership_id);
CREATE INDEX idx_detail_hub_kiosks_status ON detail_hub_kiosks(status);
CREATE INDEX idx_detail_hub_kiosks_kiosk_code ON detail_hub_kiosks(kiosk_code);

-- =====================================================
-- TRIGGER: Auto-update updated_at timestamp
-- =====================================================
CREATE TRIGGER trigger_update_detail_hub_kiosks_updated_at
  BEFORE UPDATE ON detail_hub_kiosks
  FOR EACH ROW
  EXECUTE FUNCTION update_detail_hub_employees_updated_at(); -- Reuse existing function

-- =====================================================
-- TRIGGER: Auto-reset daily punch counter
-- =====================================================
CREATE OR REPLACE FUNCTION reset_kiosk_daily_counter()
RETURNS TRIGGER AS $$
BEGIN
  -- Reset punches_today if last_punch_at is from a previous day
  IF NEW.last_punch_at IS NOT NULL AND
     OLD.last_punch_at IS NOT NULL AND
     DATE(NEW.last_punch_at) > DATE(OLD.last_punch_at) THEN
    NEW.punches_today := 1;
  ELSIF NEW.last_punch_at IS NOT NULL AND OLD.last_punch_at IS NULL THEN
    NEW.punches_today := 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reset_kiosk_daily_counter
  BEFORE UPDATE OF last_punch_at ON detail_hub_kiosks
  FOR EACH ROW
  EXECUTE FUNCTION reset_kiosk_daily_counter();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE detail_hub_kiosks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view kiosks from their dealerships
CREATE POLICY "Users can view kiosks from their dealerships"
  ON detail_hub_kiosks
  FOR SELECT
  USING (
    dealership_id IN (
      SELECT dm.dealership_id
      FROM dealer_memberships dm
      WHERE dm.user_id = auth.uid()
    )
  );

-- Policy: Managers and admins can insert kiosks
CREATE POLICY "Managers can insert kiosks"
  ON detail_hub_kiosks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM dealer_memberships dm
      WHERE dm.user_id = auth.uid()
        AND dm.dealership_id = detail_hub_kiosks.dealership_id
        AND dm.role IN ('dealer_admin', 'dealer_manager', 'system_admin')
    )
  );

-- Policy: Managers and admins can update kiosks
CREATE POLICY "Managers can update kiosks"
  ON detail_hub_kiosks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM dealer_memberships dm
      WHERE dm.user_id = auth.uid()
        AND dm.dealership_id = detail_hub_kiosks.dealership_id
        AND dm.role IN ('dealer_admin', 'dealer_manager', 'system_admin')
    )
  );

-- Policy: Only admins can delete kiosks
CREATE POLICY "Admins can delete kiosks"
  ON detail_hub_kiosks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM dealer_memberships dm
      WHERE dm.user_id = auth.uid()
        AND dm.dealership_id = detail_hub_kiosks.dealership_id
        AND dm.role IN ('dealer_admin', 'system_admin')
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function: Update kiosk heartbeat (called by kiosk device)
CREATE OR REPLACE FUNCTION update_kiosk_heartbeat(p_kiosk_code TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE detail_hub_kiosks
  SET
    last_heartbeat = NOW(),
    last_ping = NOW(),
    status = 'online'
  WHERE kiosk_code = p_kiosk_code;
END;
$$ LANGUAGE plpgsql;

-- Function: Increment kiosk punch counter
CREATE OR REPLACE FUNCTION increment_kiosk_punch_counter(p_kiosk_code TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE detail_hub_kiosks
  SET
    total_punches = total_punches + 1,
    punches_today = punches_today + 1,
    last_punch_at = NOW()
  WHERE kiosk_code = p_kiosk_code;
END;
$$ LANGUAGE plpgsql;

-- Function: Get kiosk statistics for dealership
CREATE OR REPLACE FUNCTION get_kiosk_statistics(p_dealership_id INTEGER)
RETURNS TABLE (
  total_kiosks BIGINT,
  online_kiosks BIGINT,
  offline_kiosks BIGINT,
  total_punches_today BIGINT,
  average_uptime DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) AS total_kiosks,
    COUNT(*) FILTER (WHERE status = 'online') AS online_kiosks,
    COUNT(*) FILTER (WHERE status = 'offline') AS offline_kiosks,
    COALESCE(SUM(punches_today), 0) AS total_punches_today,
    ROUND(
      (COUNT(*) FILTER (WHERE status = 'online')::DECIMAL / NULLIF(COUNT(*), 0)) * 100,
      2
    ) AS average_uptime
  FROM detail_hub_kiosks
  WHERE dealership_id = p_dealership_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- COMMENTS for documentation
-- =====================================================
COMMENT ON TABLE detail_hub_kiosks IS 'Kiosk device management for DetailHub time clock stations';
COMMENT ON COLUMN detail_hub_kiosks.kiosk_code IS 'Unique kiosk identifier (e.g., KIOSK-001)';
COMMENT ON COLUMN detail_hub_kiosks.last_heartbeat IS 'Last communication timestamp from kiosk device';
COMMENT ON COLUMN detail_hub_kiosks.face_confidence_threshold IS 'Minimum confidence score (0-100) required for face recognition acceptance';
COMMENT ON COLUMN detail_hub_kiosks.kiosk_mode IS 'When true, device is locked to time clock only (no other apps/browser)';
COMMENT ON COLUMN detail_hub_kiosks.require_photo_fallback IS 'When true, always capture photo even if face recognition succeeds';
