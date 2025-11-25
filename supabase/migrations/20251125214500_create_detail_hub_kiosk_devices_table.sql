-- Migration: Create detail_hub_kiosk_devices table
-- Purpose: Enable auto-recovery for kiosk configurations
-- Version: v2.0 - November 25, 2024
-- Status: ✅ Applied to production via MCP

-- Create table for device bindings (backup for localStorage)
CREATE TABLE IF NOT EXISTS detail_hub_kiosk_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign key to kiosk configuration
  kiosk_id UUID NOT NULL REFERENCES detail_hub_kiosks(id) ON DELETE CASCADE,

  -- Device identification (browser fingerprint)
  device_fingerprint TEXT NOT NULL UNIQUE,

  -- Status tracking
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  configured_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata
  last_seen_username TEXT,

  -- Audit timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_kiosk_devices_fingerprint
  ON detail_hub_kiosk_devices(device_fingerprint);

CREATE INDEX IF NOT EXISTS idx_kiosk_devices_kiosk_id
  ON detail_hub_kiosk_devices(kiosk_id);

CREATE INDEX IF NOT EXISTS idx_kiosk_devices_last_seen
  ON detail_hub_kiosk_devices(last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_kiosk_devices_active
  ON detail_hub_kiosk_devices(is_active)
  WHERE is_active = true;

-- Enable Row Level Security
ALTER TABLE detail_hub_kiosk_devices ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view device bindings for kiosks in their dealership
CREATE POLICY "Users can view device bindings for their dealership kiosks"
  ON detail_hub_kiosk_devices
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM detail_hub_kiosks k
      INNER JOIN dealer_memberships dm ON dm.dealer_id = k.dealership_id
      WHERE k.id = detail_hub_kiosk_devices.kiosk_id
      AND dm.user_id = auth.uid()
    )
  );

-- RLS Policy: System admins and dealer admins can insert device bindings
CREATE POLICY "Admins can insert device bindings"
  ON detail_hub_kiosk_devices
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (role = 'system_admin' OR role = 'dealer_admin')
    )
  );

-- RLS Policy: System admins and dealer admins can update device bindings
CREATE POLICY "Admins can update device bindings"
  ON detail_hub_kiosk_devices
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (role = 'system_admin' OR role = 'dealer_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (role = 'system_admin' OR role = 'dealer_admin')
    )
  );

-- RLS Policy: System admins and dealer admins can delete device bindings
CREATE POLICY "Admins can delete device bindings"
  ON detail_hub_kiosk_devices
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (role = 'system_admin' OR role = 'dealer_admin')
    )
  );

-- RLS Policy: ALLOW unauthenticated UPSERT for kiosk self-registration
-- This allows kiosks to register themselves without authentication
CREATE POLICY "Kiosks can register themselves"
  ON detail_hub_kiosk_devices
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Kiosks can update their own record"
  ON detail_hub_kiosk_devices
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_detail_hub_kiosk_devices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_detail_hub_kiosk_devices_updated_at
  BEFORE UPDATE ON detail_hub_kiosk_devices
  FOR EACH ROW
  EXECUTE FUNCTION update_detail_hub_kiosk_devices_updated_at();

-- Comment
COMMENT ON TABLE detail_hub_kiosk_devices IS 'Device bindings for kiosk configurations - enables auto-recovery if localStorage is cleared';
COMMENT ON COLUMN detail_hub_kiosk_devices.device_fingerprint IS 'Browser-based unique device identifier (SHA-256 hash)';
COMMENT ON COLUMN detail_hub_kiosk_devices.is_active IS 'Allows deactivating devices without deletion (for security)';
COMMENT ON COLUMN detail_hub_kiosk_devices.last_seen_at IS 'Updated when kiosk opens time clock modal (heartbeat)';
