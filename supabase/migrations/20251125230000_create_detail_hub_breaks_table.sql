-- Migration: Create detail_hub_breaks table for multiple breaks support
-- Purpose: Support unlimited breaks per day with smart validation
-- Version: v1.0 - November 25, 2024
-- CRITICAL: Payroll system - extreme caution required
-- STATUS: ✅ Applied to production via MCP

-- Create breaks table
CREATE TABLE IF NOT EXISTS detail_hub_breaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  time_entry_id UUID NOT NULL REFERENCES detail_hub_time_entries(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES detail_hub_employees(id) ON DELETE CASCADE,
  dealership_id INTEGER NOT NULL,

  -- Break tracking
  break_number INTEGER NOT NULL, -- 1 = first break (lunch), 2+ = subsequent breaks
  break_start TIMESTAMPTZ NOT NULL,
  break_end TIMESTAMPTZ,
  duration_minutes INTEGER,

  -- Classification
  break_type TEXT DEFAULT 'regular', -- 'lunch', 'regular' (all are unpaid)
  is_paid BOOLEAN DEFAULT false, -- ✅ FIX: All breaks are UNPAID in this business

  -- Verification (same as time_entries)
  photo_start_url TEXT,
  photo_end_url TEXT,
  kiosk_id TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_break_duration CHECK (break_end IS NULL OR break_end > break_start),
  CONSTRAINT valid_break_number CHECK (break_number > 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_breaks_time_entry ON detail_hub_breaks(time_entry_id);
CREATE INDEX IF NOT EXISTS idx_breaks_employee ON detail_hub_breaks(employee_id, break_start DESC);
CREATE INDEX IF NOT EXISTS idx_breaks_open ON detail_hub_breaks(time_entry_id) WHERE break_end IS NULL;

-- Enable RLS
ALTER TABLE detail_hub_breaks ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view breaks for their dealership
CREATE POLICY "Users can view breaks for their dealership"
  ON detail_hub_breaks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dealer_memberships dm
      WHERE dm.dealer_id = detail_hub_breaks.dealership_id
      AND dm.user_id = auth.uid()
    )
  );

-- RLS: Allow unauthenticated kiosk to manage breaks
CREATE POLICY "Kiosks can manage breaks"
  ON detail_hub_breaks
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Trigger: Auto-calculate duration when break ends
CREATE OR REPLACE FUNCTION calculate_break_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.break_end IS NOT NULL AND NEW.break_start IS NOT NULL THEN
    NEW.duration_minutes := EXTRACT(EPOCH FROM (NEW.break_end - NEW.break_start)) / 60;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_break_duration
  BEFORE INSERT OR UPDATE ON detail_hub_breaks
  FOR EACH ROW
  EXECUTE FUNCTION calculate_break_duration();

-- Trigger: Update time_entry total_break_minutes when breaks change
CREATE OR REPLACE FUNCTION update_time_entry_break_total()
RETURNS TRIGGER AS $$
DECLARE
  v_time_entry_id UUID;
  v_total_break_minutes INTEGER;
BEGIN
  -- Get time_entry_id (works for INSERT, UPDATE, DELETE)
  v_time_entry_id := COALESCE(NEW.time_entry_id, OLD.time_entry_id);

  -- Calculate sum of all completed breaks for this time entry
  SELECT COALESCE(SUM(duration_minutes), 0)
  INTO v_total_break_minutes
  FROM detail_hub_breaks
  WHERE time_entry_id = v_time_entry_id
    AND break_end IS NOT NULL;

  -- Update time entry
  UPDATE detail_hub_time_entries
  SET break_duration_minutes = v_total_break_minutes
  WHERE id = v_time_entry_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_time_entry_break_total
  AFTER INSERT OR UPDATE OR DELETE ON detail_hub_breaks
  FOR EACH ROW
  EXECUTE FUNCTION update_time_entry_break_total();

-- Trigger: Auto-assign break_number
CREATE OR REPLACE FUNCTION assign_break_number()
RETURNS TRIGGER AS $$
DECLARE
  v_max_break_number INTEGER;
BEGIN
  IF NEW.break_number IS NULL THEN
    -- Get max break_number for this time entry
    SELECT COALESCE(MAX(break_number), 0)
    INTO v_max_break_number
    FROM detail_hub_breaks
    WHERE time_entry_id = NEW.time_entry_id;

    NEW.break_number := v_max_break_number + 1;
  END IF;

  -- Auto-assign break_type based on number
  IF NEW.break_type = 'regular' AND NEW.break_number = 1 THEN
    NEW.break_type := 'lunch';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_assign_break_number
  BEFORE INSERT ON detail_hub_breaks
  FOR EACH ROW
  EXECUTE FUNCTION assign_break_number();

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_detail_hub_breaks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_detail_hub_breaks_updated_at
  BEFORE UPDATE ON detail_hub_breaks
  FOR EACH ROW
  EXECUTE FUNCTION update_detail_hub_breaks_updated_at();

-- Comments
COMMENT ON TABLE detail_hub_breaks IS 'Individual break records - supports multiple breaks per time entry';
COMMENT ON COLUMN detail_hub_breaks.break_number IS 'Sequential number (1 = first/lunch break with 30min minimum, 2+ = free duration)';
COMMENT ON COLUMN detail_hub_breaks.break_type IS 'lunch (1st break, 30min min) | regular (subsequent, no min) | unpaid | paid';

-- Migration: Copy existing breaks from time_entries to detail_hub_breaks
-- This preserves historical break data
INSERT INTO detail_hub_breaks (
  time_entry_id,
  employee_id,
  dealership_id,
  break_number,
  break_start,
  break_end,
  duration_minutes,
  break_type,
  created_at
)
SELECT
  id as time_entry_id,
  employee_id,
  dealership_id,
  1 as break_number, -- All existing breaks = first break (lunch)
  break_start,
  break_end,
  break_duration_minutes,
  'lunch' as break_type,
  created_at
FROM detail_hub_time_entries
WHERE break_start IS NOT NULL
  AND break_end IS NOT NULL
  AND NOT EXISTS (
    -- Prevent duplicate migration if script runs twice
    SELECT 1 FROM detail_hub_breaks
    WHERE time_entry_id = detail_hub_time_entries.id
  );

-- Log migration success
DO $$
DECLARE
  v_migrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_migrated_count FROM detail_hub_breaks;
  RAISE NOTICE 'Migration complete: % breaks migrated to detail_hub_breaks table', v_migrated_count;
END $$;
