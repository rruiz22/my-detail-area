-- Migration: Add is_last_step column to get_ready_steps
-- This column marks steps where the timer stops counting (e.g., Front Line, Wholesale)
-- Multiple steps can be marked as "last step"

-- 1. Add the is_last_step column
ALTER TABLE get_ready_steps
ADD COLUMN IF NOT EXISTS is_last_step BOOLEAN DEFAULT FALSE;

-- 2. Drop the unique constraint if it exists (allow multiple last steps)
DROP INDEX IF EXISTS idx_one_last_step_per_dealer;

-- 3. Create a regular index for performance when filtering by is_last_step
CREATE INDEX IF NOT EXISTS idx_last_steps_by_dealer
ON get_ready_steps (dealer_id, is_last_step)
WHERE is_last_step = TRUE;

-- 4. Create or replace the trigger function that pauses timer when vehicle enters last step
CREATE OR REPLACE FUNCTION handle_vehicle_enters_last_step()
RETURNS TRIGGER AS $$
DECLARE
  v_is_last_step BOOLEAN;
BEGIN
  -- Only run when step_id changes
  IF OLD.step_id IS DISTINCT FROM NEW.step_id THEN
    -- Check if the new step is marked as "last step"
    SELECT is_last_step INTO v_is_last_step
    FROM get_ready_steps
    WHERE id = NEW.step_id;

    -- If entering a last step, pause the timer and record frontline date
    IF v_is_last_step = TRUE THEN
      NEW.timer_paused := TRUE;
      NEW.frontline_reached_at := COALESCE(NEW.frontline_reached_at, NOW());
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create the trigger (drop first if exists to update)
DROP TRIGGER IF EXISTS trg_vehicle_enters_last_step ON get_ready_vehicles;

CREATE TRIGGER trg_vehicle_enters_last_step
BEFORE UPDATE ON get_ready_vehicles
FOR EACH ROW
EXECUTE FUNCTION handle_vehicle_enters_last_step();

-- 6. Add comment for documentation
COMMENT ON COLUMN get_ready_steps.is_last_step IS
'When TRUE, vehicles entering this step will have their timer paused (timer_paused=TRUE) and frontline_reached_at set to current timestamp. Multiple steps per dealer can be marked as last step (e.g., Front Line, Wholesale, Sold).';
