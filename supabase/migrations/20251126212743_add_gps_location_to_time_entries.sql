-- Add GPS location tracking for remote kiosk punches
-- Stores GPS coordinates and reverse-geocoded addresses

-- =====================================================
-- ADD GPS COLUMNS TO detail_hub_time_entries
-- =====================================================

-- Punch In Location
ALTER TABLE detail_hub_time_entries
ADD COLUMN punch_in_latitude NUMERIC(10, 8),
ADD COLUMN punch_in_longitude NUMERIC(11, 8),
ADD COLUMN punch_in_address TEXT,
ADD COLUMN punch_in_accuracy NUMERIC(10, 2);

-- Punch Out Location
ALTER TABLE detail_hub_time_entries
ADD COLUMN punch_out_latitude NUMERIC(10, 8),
ADD COLUMN punch_out_longitude NUMERIC(11, 8),
ADD COLUMN punch_out_address TEXT,
ADD COLUMN punch_out_accuracy NUMERIC(10, 2);

-- Add indexes for query performance
CREATE INDEX IF NOT EXISTS idx_time_entries_punch_in_coords
  ON detail_hub_time_entries(punch_in_latitude, punch_in_longitude);
CREATE INDEX IF NOT EXISTS idx_time_entries_punch_out_coords
  ON detail_hub_time_entries(punch_out_latitude, punch_out_longitude);

COMMENT ON COLUMN detail_hub_time_entries.punch_in_latitude IS 'GPS latitude where employee clocked in (required for remote punches)';
COMMENT ON COLUMN detail_hub_time_entries.punch_in_longitude IS 'GPS longitude where employee clocked in (required for remote punches)';
COMMENT ON COLUMN detail_hub_time_entries.punch_in_address IS 'Reverse-geocoded street address for punch in location';
COMMENT ON COLUMN detail_hub_time_entries.punch_in_accuracy IS 'GPS accuracy in meters at punch in time';

-- =====================================================
-- ADD GPS COLUMNS TO detail_hub_breaks
-- =====================================================

-- Break Start Location
ALTER TABLE detail_hub_breaks
ADD COLUMN break_start_latitude NUMERIC(10, 8),
ADD COLUMN break_start_longitude NUMERIC(11, 8),
ADD COLUMN break_start_address TEXT;

-- Break End Location
ALTER TABLE detail_hub_breaks
ADD COLUMN break_end_latitude NUMERIC(10, 8),
ADD COLUMN break_end_longitude NUMERIC(11, 8),
ADD COLUMN break_end_address TEXT;

COMMENT ON COLUMN detail_hub_breaks.break_start_latitude IS 'GPS latitude where employee started break';
COMMENT ON COLUMN detail_hub_breaks.break_start_address IS 'Reverse-geocoded address for break start location';

-- =====================================================
-- ADD GPS COLUMNS TO remote_kiosk_tokens
-- =====================================================

-- Last Used Location (for token management UI)
ALTER TABLE remote_kiosk_tokens
ADD COLUMN last_used_latitude NUMERIC(10, 8),
ADD COLUMN last_used_longitude NUMERIC(11, 8),
ADD COLUMN last_used_address TEXT;

COMMENT ON COLUMN remote_kiosk_tokens.last_used_latitude IS 'GPS latitude of last token usage';
COMMENT ON COLUMN remote_kiosk_tokens.last_used_address IS 'Reverse-geocoded address of last token usage';
