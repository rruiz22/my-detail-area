-- =====================================================
-- STEP-SPECIFIC WORK ITEM TEMPLATES
-- Allows templates to be associated with specific steps
-- =====================================================

-- Add step_id column to work_item_templates (nullable for backward compatibility)
ALTER TABLE work_item_templates
ADD COLUMN IF NOT EXISTS step_id TEXT REFERENCES get_ready_steps(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_work_item_templates_step ON work_item_templates(dealer_id, step_id, is_active, auto_assign);

-- Comment to explain the field
COMMENT ON COLUMN work_item_templates.step_id IS 'Optional: Associates template with specific step. NULL = global template (created when vehicle is added). Non-NULL = step-specific template (created when vehicle enters that step).';

-- =====================================================
-- TRIGGER: Auto-create work items when vehicle changes step
-- =====================================================

-- Function to auto-create work items when vehicle enters a new step
CREATE OR REPLACE FUNCTION auto_create_step_work_items()
RETURNS TRIGGER AS $$
DECLARE
  template_record RECORD;
BEGIN
  -- Only trigger when step_id changes (not on initial INSERT since that's handled by vehicle creation)
  IF (TG_OP = 'UPDATE' AND OLD.step_id IS DISTINCT FROM NEW.step_id) THEN

    -- Log the step change
    RAISE NOTICE 'Vehicle % moved from step % to step %', NEW.id, OLD.step_id, NEW.step_id;

    -- Create work items from templates associated with the new step
    FOR template_record IN
      SELECT *
      FROM work_item_templates
      WHERE dealer_id = NEW.dealer_id
        AND step_id = NEW.step_id
        AND is_active = true
        AND auto_assign = true
      ORDER BY order_index
    LOOP
      -- Check if work item with same title already exists for this vehicle
      IF NOT EXISTS (
        SELECT 1 FROM get_ready_work_items
        WHERE vehicle_id = NEW.id
          AND title = template_record.name
      ) THEN
        -- Insert new work item from template
        INSERT INTO get_ready_work_items (
          vehicle_id,
          dealer_id,
          title,
          description,
          work_type,
          status,
          priority,
          estimated_cost,
          actual_cost,
          estimated_hours,
          actual_hours,
          approval_required
        ) VALUES (
          NEW.id,
          NEW.dealer_id,
          template_record.name,
          template_record.description,
          template_record.work_type,
          'pending',
          template_record.priority,
          template_record.estimated_cost,
          0,
          template_record.estimated_hours,
          0,
          template_record.approval_required
        );

        RAISE NOTICE 'Created work item "%" for vehicle %', template_record.name, NEW.id;
      ELSE
        RAISE NOTICE 'Work item "%" already exists for vehicle %, skipping', template_record.name, NEW.id;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_auto_create_step_work_items ON get_ready_vehicles;

-- Create trigger on get_ready_vehicles for step changes
CREATE TRIGGER trigger_auto_create_step_work_items
  AFTER UPDATE ON get_ready_vehicles
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_step_work_items();

-- =====================================================
-- MIGRATION NOTES
-- =====================================================
-- 1. Existing templates without step_id remain global (created when vehicle is added)
-- 2. Templates with step_id will auto-create when vehicle enters that step
-- 3. Duplicate prevention: checks if work item with same title already exists
-- 4. Only works for templates with auto_assign = true and is_active = true
