-- =====================================================
-- FIX: Remove duplicate update_kiosk_heartbeat functions
-- =====================================================
-- Issue: Function overloading conflict between:
--   - update_kiosk_heartbeat(p_kiosk_code TEXT)
--   - update_kiosk_heartbeat(p_kiosk_code TEXT, p_ip_address TEXT)
-- Solution: Drop all versions and create single version with optional IP parameter
-- Date: 2025-11-22
-- =====================================================

-- Drop all existing versions of the function
DROP FUNCTION IF EXISTS update_kiosk_heartbeat(TEXT);
DROP FUNCTION IF EXISTS update_kiosk_heartbeat(TEXT, INET);
DROP FUNCTION IF EXISTS update_kiosk_heartbeat(TEXT, TEXT);

-- Create single version that accepts IP address (optional via default)
CREATE OR REPLACE FUNCTION update_kiosk_heartbeat(
  p_kiosk_code TEXT,
  p_ip_address INET DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE detail_hub_kiosks
  SET
    last_heartbeat = NOW(),
    last_ping = NOW(),
    status = 'online',
    ip_address = COALESCE(p_ip_address, ip_address) -- Update IP if provided, keep existing if NULL
  WHERE kiosk_code = p_kiosk_code;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_kiosk_heartbeat IS 'Updates kiosk heartbeat timestamp, sets status to online, and optionally updates IP address';
