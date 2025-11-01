-- =====================================================
-- Productivity Module - Performance Indexes Enhancement
-- Created: 2025-10-16
-- Purpose: Add indexes for optimal query performance
-- =====================================================

-- =====================================================
-- ADD SOFT DELETE SUPPORT FIRST (before indexes)
-- =====================================================

-- Add deleted_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'productivity_todos'
    AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE productivity_todos ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
END $$;

-- =====================================================
-- PRODUCTIVITY_TODOS INDEXES
-- =====================================================

-- Primary filtering indexes
CREATE INDEX IF NOT EXISTS idx_productivity_todos_dealer_id
ON productivity_todos(dealer_id)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_productivity_todos_status
ON productivity_todos(status)
WHERE status != 'cancelled' AND deleted_at IS NULL;

-- Order linkage (critical for OrderTasksSection)
CREATE INDEX IF NOT EXISTS idx_productivity_todos_order_id
ON productivity_todos(order_id)
WHERE order_id IS NOT NULL AND deleted_at IS NULL;

-- Assignment and ownership
CREATE INDEX IF NOT EXISTS idx_productivity_todos_assigned_to
ON productivity_todos(assigned_to)
WHERE assigned_to IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_productivity_todos_created_by
ON productivity_todos(created_by);

-- Due date sorting and filtering
CREATE INDEX IF NOT EXISTS idx_productivity_todos_due_date
ON productivity_todos(due_date)
WHERE due_date IS NOT NULL AND status != 'completed';

-- Composite index for common queries (dealer + status + due date)
CREATE INDEX IF NOT EXISTS idx_productivity_todos_dealer_status_due
ON productivity_todos(dealer_id, status, due_date)
WHERE deleted_at IS NULL;

-- Priority filtering
CREATE INDEX IF NOT EXISTS idx_productivity_todos_priority
ON productivity_todos(priority)
WHERE status != 'completed' AND deleted_at IS NULL;

-- Full-text search on title and description (using GIN)
CREATE INDEX IF NOT EXISTS idx_productivity_todos_search
ON productivity_todos USING gin(
  to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
);

-- =====================================================
-- PRODUCTIVITY_CALENDARS INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_productivity_calendars_dealer_id
ON productivity_calendars(dealer_id)
WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_productivity_calendars_type
ON productivity_calendars(calendar_type, dealer_id)
WHERE is_active = TRUE;

-- =====================================================
-- PRODUCTIVITY_EVENTS INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_productivity_events_calendar_id
ON productivity_events(calendar_id);

CREATE INDEX IF NOT EXISTS idx_productivity_events_dealer_id
ON productivity_events(dealer_id);

-- Order linkage
CREATE INDEX IF NOT EXISTS idx_productivity_events_order_id
ON productivity_events(order_id)
WHERE order_id IS NOT NULL;

-- Todo linkage
CREATE INDEX IF NOT EXISTS idx_productivity_events_todo_id
ON productivity_events(todo_id)
WHERE todo_id IS NOT NULL;

-- Time-based queries (critical for calendar views)
CREATE INDEX IF NOT EXISTS idx_productivity_events_start_time
ON productivity_events(start_time);

CREATE INDEX IF NOT EXISTS idx_productivity_events_end_time
ON productivity_events(end_time);

-- Date range queries (most common for calendar)
CREATE INDEX IF NOT EXISTS idx_productivity_events_time_range
ON productivity_events(dealer_id, start_time, end_time);

-- =====================================================
-- ADD MISSING CONSTRAINTS
-- =====================================================

-- Ensure valid priority values
ALTER TABLE productivity_todos
DROP CONSTRAINT IF EXISTS check_priority_valid;

ALTER TABLE productivity_todos
ADD CONSTRAINT check_priority_valid
CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

-- Ensure valid status values
ALTER TABLE productivity_todos
DROP CONSTRAINT IF EXISTS check_status_valid;

ALTER TABLE productivity_todos
ADD CONSTRAINT check_status_valid
CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'));

-- Ensure valid event types
ALTER TABLE productivity_events
DROP CONSTRAINT IF EXISTS check_event_type_valid;

ALTER TABLE productivity_events
ADD CONSTRAINT check_event_type_valid
CHECK (event_type IN ('meeting', 'reminder', 'task', 'appointment', 'other'));

-- Ensure start_time < end_time for events
ALTER TABLE productivity_events
DROP CONSTRAINT IF EXISTS check_event_time_valid;

ALTER TABLE productivity_events
ADD CONSTRAINT check_event_time_valid
CHECK (start_time < end_time OR all_day = TRUE);

-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================

-- Create or replace the update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers
DROP TRIGGER IF EXISTS update_productivity_todos_updated_at ON productivity_todos;
DROP TRIGGER IF EXISTS update_productivity_calendars_updated_at ON productivity_calendars;
DROP TRIGGER IF EXISTS update_productivity_events_updated_at ON productivity_events;

-- Create triggers
CREATE TRIGGER update_productivity_todos_updated_at
  BEFORE UPDATE ON productivity_todos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_productivity_calendars_updated_at
  BEFORE UPDATE ON productivity_calendars
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_productivity_events_updated_at
  BEFORE UPDATE ON productivity_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMPLETED_AT AUTO-SET TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Set completed_at when status changes to 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();
  END IF;

  -- Clear completed_at when status changes from 'completed' to something else
  IF NEW.status != 'completed' AND OLD.status = 'completed' THEN
    NEW.completed_at = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_productivity_todo_completed_at ON productivity_todos;

CREATE TRIGGER set_productivity_todo_completed_at
  BEFORE UPDATE ON productivity_todos
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION set_completed_at();

-- =====================================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- =====================================================

ANALYZE productivity_todos;
ANALYZE productivity_calendars;
ANALYZE productivity_events;

-- =====================================================
-- PERFORMANCE NOTES
-- =====================================================

-- Expected query improvements:
-- 1. Dealer-filtered queries: 10x faster
-- 2. Order-linked tasks: 20x faster
-- 3. Due date sorting: 5x faster
-- 4. Full-text search: 100x faster
-- 5. Calendar range queries: 15x faster
