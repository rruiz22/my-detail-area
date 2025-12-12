-- =====================================================
-- Migration: Fix Camera Status Updates
-- Date: 2025-12-11
-- Description: Update update_kiosk_heartbeat function to accept
--              and update camera_status parameter
-- =====================================================

-- Drop old function
DROP FUNCTION IF EXISTS update_kiosk_heartbeat(TEXT, TEXT);

-- Create new function with camera_status parameter
CREATE OR REPLACE FUNCTION update_kiosk_heartbeat(
  p_kiosk_code TEXT,
  p_ip_address TEXT DEFAULT NULL,
  p_camera_status detail_hub_camera_status DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE detail_hub_kiosks
  SET
    last_heartbeat = NOW(),
    last_ping = NOW(),
    status = 'online',
    ip_address = COALESCE(p_ip_address, ip_address),
    camera_status = COALESCE(p_camera_status, camera_status), -- ✅ NEW: Update camera status if provided
    updated_at = NOW()
  WHERE kiosk_code = p_kiosk_code;

  -- Raise notice if no kiosk found
  IF NOT FOUND THEN
    RAISE WARNING 'No kiosk found with code: %', p_kiosk_code;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION update_kiosk_heartbeat IS
'Updates kiosk heartbeat, status, and optionally camera_status. Called when kiosk modal opens or on periodic heartbeat.';
