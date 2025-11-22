-- =====================================================
-- UPDATE KIOSK HEARTBEAT FUNCTION TO INCLUDE IP ADDRESS
-- =====================================================
-- INSTRUCTIONS:
-- 1. Open: https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/sql/new
-- 2. Copy and execute this SQL
-- 3. Verify function was updated
-- =====================================================

-- Update the heartbeat function to accept optional IP address
CREATE OR REPLACE FUNCTION update_kiosk_heartbeat(
  p_kiosk_code TEXT,
  p_ip_address TEXT DEFAULT NULL
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

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
-- Run this to verify the function was updated correctly:

SELECT
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'update_kiosk_heartbeat';

-- You should see the updated function with the p_ip_address parameter
-- =====================================================
