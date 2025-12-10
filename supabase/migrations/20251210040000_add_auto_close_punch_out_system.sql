/**
 * Auto-Close Punch Out System Migration
 *
 * Implements automatic punch-out closing with SMS reminders and supervisor review.
 *
 * Features:
 * - Per-dealership configuration for timings and channels
 * - Reminder tracking and logging
 * - Automatic punch closure after configurable window
 * - Supervisor review workflow for auto-closed punches
 *
 * Configuration:
 * - First reminder: 30 minutes after shift end
 * - Second reminder: 60 minutes after shift end
 * - Auto-close: 120 minutes after shift end
 */

-- =====================================================
-- TABLE: detail_hub_auto_close_config
-- =====================================================
-- Stores auto-close configuration per dealership

CREATE TABLE IF NOT EXISTS detail_hub_auto_close_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id INTEGER REFERENCES dealerships(id) ON DELETE CASCADE,

  -- Timing configuration (in minutes after shift end)
  first_reminder_minutes INTEGER NOT NULL DEFAULT 30,
  second_reminder_minutes INTEGER NOT NULL DEFAULT 60,
  auto_close_window_minutes INTEGER NOT NULL DEFAULT 120,

  -- Notification channels
  sms_enabled BOOLEAN NOT NULL DEFAULT true,
  push_enabled BOOLEAN NOT NULL DEFAULT true,

  -- Review requirements
  require_supervisor_review BOOLEAN NOT NULL DEFAULT true,

  -- System control
  enabled BOOLEAN NOT NULL DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),

  -- Ensure one config per dealership
  UNIQUE(dealership_id)
);

-- RLS Policies for auto_close_config
ALTER TABLE detail_hub_auto_close_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dealership members can view auto-close config"
  ON detail_hub_auto_close_config
  FOR SELECT
  USING (
    dealership_id IN (
      SELECT dealership_id
      FROM dealer_memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Dealership managers can modify auto-close config"
  ON detail_hub_auto_close_config
  FOR ALL
  USING (
    dealership_id IN (
      SELECT dm.dealership_id
      FROM dealer_memberships dm
      JOIN dealer_groups dg ON dg.id = dm.group_id
      WHERE dm.user_id = auth.uid()
        AND dg.name IN ('dealer_admin', 'dealer_manager')
    )
  );

-- Create index for faster lookups
CREATE INDEX idx_auto_close_config_dealership
  ON detail_hub_auto_close_config(dealership_id)
  WHERE enabled = true;

-- =====================================================
-- TABLE: detail_hub_punch_out_reminders
-- =====================================================
-- Tracks all reminders sent for forgotten punches

CREATE TABLE IF NOT EXISTS detail_hub_punch_out_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id UUID REFERENCES detail_hub_time_entries(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES detail_hub_employees(id) ON DELETE CASCADE,
  dealership_id INTEGER REFERENCES dealerships(id) ON DELETE CASCADE,

  -- Reminder details
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('first', 'second', 'auto_close')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Channels used
  sms_sent BOOLEAN NOT NULL DEFAULT false,
  sms_sid TEXT, -- Twilio message SID for tracking
  sms_status TEXT, -- delivered, failed, etc.

  push_sent BOOLEAN NOT NULL DEFAULT false,
  push_status TEXT,

  -- Employee response tracking
  employee_responded BOOLEAN NOT NULL DEFAULT false,
  responded_at TIMESTAMPTZ,
  response_method TEXT, -- 'sms_reply', 'manual_clock_out', etc.

  -- Context at time of reminder
  shift_end_time TIME NOT NULL,
  minutes_overdue INTEGER NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies for punch_out_reminders
ALTER TABLE detail_hub_punch_out_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dealership members can view reminders"
  ON detail_hub_punch_out_reminders
  FOR SELECT
  USING (
    dealership_id IN (
      SELECT dealership_id
      FROM dealer_memberships
      WHERE user_id = auth.uid()
    )
  );

-- Create indexes for faster queries
CREATE INDEX idx_punch_out_reminders_time_entry
  ON detail_hub_punch_out_reminders(time_entry_id);

CREATE INDEX idx_punch_out_reminders_employee
  ON detail_hub_punch_out_reminders(employee_id, sent_at DESC);

CREATE INDEX idx_punch_out_reminders_dealership
  ON detail_hub_punch_out_reminders(dealership_id, sent_at DESC);

-- =====================================================
-- MODIFY TABLE: detail_hub_time_entries
-- =====================================================
-- Add fields to track auto-close behavior

ALTER TABLE detail_hub_time_entries
ADD COLUMN IF NOT EXISTS auto_close_reason TEXT,
ADD COLUMN IF NOT EXISTS auto_closed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS requires_supervisor_review BOOLEAN NOT NULL DEFAULT false;

-- Update existing punch_out_method enum if needed (already includes 'auto_close')
COMMENT ON COLUMN detail_hub_time_entries.punch_out_method IS 'Method used for clock-out: face, pin, manual, photo_fallback, auto_close';

-- Create index for supervisor review queue
CREATE INDEX IF NOT EXISTS idx_time_entries_supervisor_review
  ON detail_hub_time_entries(dealership_id, requires_supervisor_review, auto_closed_at DESC)
  WHERE requires_supervisor_review = true;

-- =====================================================
-- RPC FUNCTION: find_overdue_punches
-- =====================================================
-- Identifies punches that need reminders or auto-close

CREATE OR REPLACE FUNCTION find_overdue_punches(
  p_dealership_id INTEGER,
  p_first_reminder_threshold INTEGER,
  p_second_reminder_threshold INTEGER,
  p_auto_close_threshold INTEGER
)
RETURNS TABLE (
  time_entry_id UUID,
  employee_id UUID,
  employee_name TEXT,
  employee_phone TEXT,
  dealership_id INTEGER,
  clock_in TIMESTAMPTZ,
  shift_end_time TIME,
  shift_end_datetime TIMESTAMPTZ,
  minutes_overdue INTEGER,
  action TEXT,
  reminder_count INTEGER,
  last_reminder_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH entry_details AS (
    SELECT
      te.id AS time_entry_id,
      te.employee_id,
      (emp.first_name || ' ' || emp.last_name) AS employee_name,
      emp.phone AS employee_phone,
      te.dealership_id,
      te.clock_in,
      (a.schedule_template->>'shift_end_time')::TIME AS shift_end_time,
      -- Calculate exact shift end datetime for this specific punch
      (DATE(te.clock_in) + (a.schedule_template->>'shift_end_time')::TIME) AS shift_end_datetime,
      -- Minutes since shift ended
      EXTRACT(EPOCH FROM (
        NOW() - (DATE(te.clock_in) + (a.schedule_template->>'shift_end_time')::TIME)
      ))::INTEGER / 60 AS minutes_overdue
    FROM detail_hub_time_entries te
    INNER JOIN detail_hub_employees emp
      ON emp.id = te.employee_id
    INNER JOIN detail_hub_employee_assignments a
      ON a.employee_id = te.employee_id
      AND a.dealership_id = te.dealership_id
      AND a.status = 'active'
    WHERE te.dealership_id = p_dealership_id
      AND te.clock_out IS NULL
      AND te.status = 'active'
      AND (a.schedule_template->>'shift_end_time') IS NOT NULL
      AND NOW() > (DATE(te.clock_in) + (a.schedule_template->>'shift_end_time')::TIME)
  ),
  reminder_stats AS (
    SELECT
      r.time_entry_id,
      COUNT(*) AS reminder_count,
      MAX(r.sent_at) AS last_reminder_at
    FROM detail_hub_punch_out_reminders r
    GROUP BY r.time_entry_id
  )
  SELECT
    ed.time_entry_id,
    ed.employee_id,
    ed.employee_name,
    ed.employee_phone,
    ed.dealership_id,
    ed.clock_in,
    ed.shift_end_time,
    ed.shift_end_datetime,
    ed.minutes_overdue,
    -- Determine action needed
    CASE
      -- Need first reminder
      WHEN COALESCE(rs.reminder_count, 0) = 0
           AND ed.minutes_overdue >= p_first_reminder_threshold
      THEN 'first_reminder'

      -- Need second reminder
      WHEN rs.reminder_count = 1
           AND ed.minutes_overdue >= p_second_reminder_threshold
      THEN 'second_reminder'

      -- Need auto-close
      WHEN ed.minutes_overdue >= p_auto_close_threshold
      THEN 'auto_close'

      ELSE NULL
    END AS action,
    COALESCE(rs.reminder_count, 0) AS reminder_count,
    rs.last_reminder_at
  FROM entry_details ed
  LEFT JOIN reminder_stats rs ON rs.time_entry_id = ed.time_entry_id
  WHERE
    -- Only return entries that need action
    CASE
      WHEN COALESCE(rs.reminder_count, 0) = 0
           AND ed.minutes_overdue >= p_first_reminder_threshold
      THEN true

      WHEN rs.reminder_count = 1
           AND ed.minutes_overdue >= p_second_reminder_threshold
      THEN true

      WHEN ed.minutes_overdue >= p_auto_close_threshold
      THEN true

      ELSE false
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION find_overdue_punches(INTEGER, INTEGER, INTEGER, INTEGER) TO authenticated;

-- =====================================================
-- SEED DATA: Create default configs for existing dealerships
-- =====================================================
INSERT INTO detail_hub_auto_close_config (
  dealership_id,
  first_reminder_minutes,
  second_reminder_minutes,
  auto_close_window_minutes,
  sms_enabled,
  push_enabled,
  require_supervisor_review,
  enabled
)
SELECT
  id AS dealership_id,
  30 AS first_reminder_minutes,
  60 AS second_reminder_minutes,
  120 AS auto_close_window_minutes,
  true AS sms_enabled,
  true AS push_enabled,
  true AS require_supervisor_review,
  true AS enabled
FROM dealerships
WHERE id NOT IN (SELECT dealership_id FROM detail_hub_auto_close_config)
ON CONFLICT (dealership_id) DO NOTHING;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON TABLE detail_hub_auto_close_config IS 'Per-dealership configuration for automatic punch-out closing system';
COMMENT ON TABLE detail_hub_punch_out_reminders IS 'Log of all reminders sent for forgotten punch-outs';
COMMENT ON FUNCTION find_overdue_punches IS 'Identifies time entries that need reminders or auto-close based on shift end time';

COMMENT ON COLUMN detail_hub_time_entries.auto_close_reason IS 'Human-readable reason why this punch was automatically closed';
COMMENT ON COLUMN detail_hub_time_entries.auto_closed_at IS 'Timestamp when this punch was automatically closed by the system';
COMMENT ON COLUMN detail_hub_time_entries.requires_supervisor_review IS 'Flag indicating this auto-closed punch requires manual supervisor review';
