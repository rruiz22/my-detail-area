-- =====================================================
-- DETAIL HUB: TIME ENTRIES TABLE
-- =====================================================
-- Purpose: Time tracking and punch clock management for DetailHub
-- Features: Clock in/out, breaks, overtime calculation, photo verification
-- Author: Claude Code
-- Date: 2025-11-17
-- =====================================================

-- Create custom types for time entries
CREATE TYPE detail_hub_punch_method AS ENUM (
  'face',
  'pin',
  'manual',
  'photo_fallback'
);

CREATE TYPE detail_hub_time_entry_status AS ENUM (
  'active',
  'complete',
  'disputed',
  'approved'
);

-- =====================================================
-- TABLE: detail_hub_time_entries
-- =====================================================
CREATE TABLE IF NOT EXISTS detail_hub_time_entries (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES detail_hub_employees(id) ON DELETE CASCADE,
  dealership_id INTEGER NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,

  -- Time tracking
  clock_in TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clock_out TIMESTAMPTZ,
  break_start TIMESTAMPTZ,
  break_end TIMESTAMPTZ,
  break_duration_minutes INTEGER NOT NULL DEFAULT 0,

  -- Hours calculation (auto-computed by trigger)
  total_hours DECIMAL(10,2),
  regular_hours DECIMAL(10,2),
  overtime_hours DECIMAL(10,2),

  -- Punch methods and authentication
  punch_in_method detail_hub_punch_method,
  punch_out_method detail_hub_punch_method,
  face_confidence_in DECIMAL(5,2), -- Face recognition confidence 0-100
  face_confidence_out DECIMAL(5,2),

  -- Photo fallback for failed face recognition
  photo_in_url TEXT, -- Supabase Storage URL for clock in photo
  photo_out_url TEXT, -- Supabase Storage URL for clock out photo

  -- Manual verification workflow
  requires_manual_verification BOOLEAN NOT NULL DEFAULT false,
  verified_by UUID REFERENCES auth.users(id), -- Supervisor who verified
  verified_at TIMESTAMPTZ,

  -- Kiosk and tracking metadata
  kiosk_id TEXT, -- Kiosk identifier (e.g., KIOSK-001)
  ip_address INET, -- Network IP for audit trail
  user_agent TEXT, -- Browser/device info for audit trail

  -- Status and notes
  status detail_hub_time_entry_status NOT NULL DEFAULT 'active',
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_clock_out CHECK (clock_out IS NULL OR clock_out > clock_in),
  CONSTRAINT valid_break_times CHECK (
    (break_start IS NULL AND break_end IS NULL) OR
    (break_start IS NOT NULL AND break_end IS NULL) OR
    (break_start IS NOT NULL AND break_end IS NOT NULL AND break_end > break_start)
  ),
  CONSTRAINT valid_break_duration CHECK (break_duration_minutes >= 0),
  CONSTRAINT valid_face_confidence_in CHECK (face_confidence_in IS NULL OR (face_confidence_in >= 0 AND face_confidence_in <= 100)),
  CONSTRAINT valid_face_confidence_out CHECK (face_confidence_out IS NULL OR (face_confidence_out >= 0 AND face_confidence_out <= 100)),
  CONSTRAINT valid_hours CHECK (
    (total_hours IS NULL OR total_hours >= 0) AND
    (regular_hours IS NULL OR regular_hours >= 0) AND
    (overtime_hours IS NULL OR overtime_hours >= 0)
  )
);

-- =====================================================
-- INDEXES for performance optimization
-- =====================================================
CREATE INDEX idx_detail_hub_time_entries_employee ON detail_hub_time_entries(employee_id);
CREATE INDEX idx_detail_hub_time_entries_dealership ON detail_hub_time_entries(dealership_id);
CREATE INDEX idx_detail_hub_time_entries_clock_in ON detail_hub_time_entries(clock_in DESC);
CREATE INDEX idx_detail_hub_time_entries_status ON detail_hub_time_entries(status) WHERE status = 'active';
CREATE INDEX idx_detail_hub_time_entries_verification ON detail_hub_time_entries(requires_manual_verification) WHERE requires_manual_verification = true;
CREATE INDEX idx_detail_hub_time_entries_kiosk ON detail_hub_time_entries(kiosk_id) WHERE kiosk_id IS NOT NULL;

-- Composite index for common queries (employee + date range)
CREATE INDEX idx_detail_hub_time_entries_employee_date ON detail_hub_time_entries(employee_id, clock_in DESC);

-- =====================================================
-- TRIGGER: Auto-update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_detail_hub_time_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_detail_hub_time_entries_updated_at
  BEFORE UPDATE ON detail_hub_time_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_detail_hub_time_entries_updated_at();

-- =====================================================
-- TRIGGER: Auto-calculate hours on clock out
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_time_entry_hours()
RETURNS TRIGGER AS $$
DECLARE
  v_total_minutes DECIMAL;
  v_break_minutes INTEGER;
  v_work_minutes DECIMAL;
  v_work_hours DECIMAL;
BEGIN
  -- Only calculate if clock_out is set
  IF NEW.clock_out IS NOT NULL THEN
    -- Calculate total minutes between clock in and clock out
    v_total_minutes := EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) / 60;

    -- Get break duration (already calculated or default to 0)
    v_break_minutes := COALESCE(NEW.break_duration_minutes, 0);

    -- Calculate actual work minutes (total - break)
    v_work_minutes := v_total_minutes - v_break_minutes;

    -- Convert to hours
    v_work_hours := v_work_minutes / 60;

    -- Calculate regular hours (max 8 per day) and overtime
    IF v_work_hours <= 8 THEN
      NEW.regular_hours := ROUND(v_work_hours, 2);
      NEW.overtime_hours := 0;
    ELSE
      NEW.regular_hours := 8;
      NEW.overtime_hours := ROUND(v_work_hours - 8, 2);
    END IF;

    -- Set total hours
    NEW.total_hours := ROUND(v_work_hours, 2);

    -- Auto-update status to complete if not already set
    IF NEW.status = 'active' THEN
      NEW.status := 'complete';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_time_entry_hours
  BEFORE INSERT OR UPDATE OF clock_out, break_duration_minutes ON detail_hub_time_entries
  FOR EACH ROW
  EXECUTE FUNCTION calculate_time_entry_hours();

-- =====================================================
-- TRIGGER: Auto-calculate break duration
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_break_duration()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate if both break_start and break_end are set
  IF NEW.break_start IS NOT NULL AND NEW.break_end IS NOT NULL THEN
    -- Calculate break duration in minutes
    NEW.break_duration_minutes := EXTRACT(EPOCH FROM (NEW.break_end - NEW.break_start)) / 60;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_break_duration
  BEFORE INSERT OR UPDATE OF break_start, break_end ON detail_hub_time_entries
  FOR EACH ROW
  EXECUTE FUNCTION calculate_break_duration();

-- =====================================================
-- TRIGGER: Auto-flag photo fallback for manual verification
-- =====================================================
CREATE OR REPLACE FUNCTION flag_photo_fallback_verification()
RETURNS TRIGGER AS $$
BEGIN
  -- If punch method is photo_fallback, require manual verification
  IF NEW.punch_in_method = 'photo_fallback' OR NEW.punch_out_method = 'photo_fallback' THEN
    NEW.requires_manual_verification := true;
  END IF;

  -- If face confidence is low (<80%), require manual verification
  IF (NEW.face_confidence_in IS NOT NULL AND NEW.face_confidence_in < 80) OR
     (NEW.face_confidence_out IS NOT NULL AND NEW.face_confidence_out < 80) THEN
    NEW.requires_manual_verification := true;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_flag_photo_fallback_verification
  BEFORE INSERT OR UPDATE OF punch_in_method, punch_out_method, face_confidence_in, face_confidence_out ON detail_hub_time_entries
  FOR EACH ROW
  EXECUTE FUNCTION flag_photo_fallback_verification();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE detail_hub_time_entries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view time entries from their dealerships
CREATE POLICY "Users can view time entries from their dealerships"
  ON detail_hub_time_entries
  FOR SELECT
  USING (
    dealership_id IN (
      SELECT dm.dealership_id
      FROM dealer_memberships dm
      WHERE dm.user_id = auth.uid()
    )
  );

-- Policy: All authenticated users can insert time entries (for kiosk punch)
-- Note: Kiosk mode might need special handling or service role
CREATE POLICY "Users can insert time entries"
  ON detail_hub_time_entries
  FOR INSERT
  WITH CHECK (
    dealership_id IN (
      SELECT dm.dealership_id
      FROM dealer_memberships dm
      WHERE dm.user_id = auth.uid()
    )
  );

-- Policy: Managers and admins can update time entries
CREATE POLICY "Managers can update time entries"
  ON detail_hub_time_entries
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM dealer_memberships dm
      WHERE dm.user_id = auth.uid()
        AND dm.dealership_id = detail_hub_time_entries.dealership_id
        AND dm.role IN ('dealer_admin', 'dealer_manager', 'system_admin')
    )
  );

-- Policy: Only admins can delete time entries
CREATE POLICY "Admins can delete time entries"
  ON detail_hub_time_entries
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM dealer_memberships dm
      WHERE dm.user_id = auth.uid()
        AND dm.dealership_id = detail_hub_time_entries.dealership_id
        AND dm.role IN ('dealer_admin', 'system_admin')
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function: Get active time entry for employee
CREATE OR REPLACE FUNCTION get_active_time_entry(p_employee_id UUID)
RETURNS detail_hub_time_entries AS $$
  SELECT *
  FROM detail_hub_time_entries
  WHERE employee_id = p_employee_id
    AND status = 'active'
    AND clock_out IS NULL
  ORDER BY clock_in DESC
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- Function: Get pending reviews count for dealership
CREATE OR REPLACE FUNCTION get_pending_reviews_count(p_dealership_id INTEGER)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM detail_hub_time_entries
  WHERE dealership_id = p_dealership_id
    AND requires_manual_verification = true
    AND verified_at IS NULL;
$$ LANGUAGE sql STABLE;

-- Function: Calculate total hours for employee in date range
CREATE OR REPLACE FUNCTION calculate_employee_hours(
  p_employee_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  total_hours DECIMAL,
  regular_hours DECIMAL,
  overtime_hours DECIMAL
) AS $$
  SELECT
    COALESCE(SUM(dte.total_hours), 0) AS total_hours,
    COALESCE(SUM(dte.regular_hours), 0) AS regular_hours,
    COALESCE(SUM(dte.overtime_hours), 0) AS overtime_hours
  FROM detail_hub_time_entries dte
  WHERE dte.employee_id = p_employee_id
    AND dte.clock_in >= p_start_date
    AND dte.clock_in < p_end_date
    AND dte.status IN ('complete', 'approved');
$$ LANGUAGE sql STABLE;

-- =====================================================
-- COMMENTS for documentation
-- =====================================================
COMMENT ON TABLE detail_hub_time_entries IS 'Time tracking entries with automatic hours calculation and photo verification fallback';
COMMENT ON COLUMN detail_hub_time_entries.punch_in_method IS 'Authentication method used for clock in (face, pin, manual, photo_fallback)';
COMMENT ON COLUMN detail_hub_time_entries.requires_manual_verification IS 'True if photo fallback was used or face confidence is low (<80%)';
COMMENT ON COLUMN detail_hub_time_entries.break_duration_minutes IS 'Total break time in minutes (auto-calculated from break_start and break_end)';
COMMENT ON COLUMN detail_hub_time_entries.total_hours IS 'Total work hours excluding breaks (auto-calculated on clock out)';
COMMENT ON COLUMN detail_hub_time_entries.regular_hours IS 'Regular hours (max 8 per day, auto-calculated)';
COMMENT ON COLUMN detail_hub_time_entries.overtime_hours IS 'Overtime hours (hours beyond 8, auto-calculated)';
COMMENT ON COLUMN detail_hub_time_entries.kiosk_id IS 'Identifier of the kiosk device used for punch (e.g., KIOSK-001)';