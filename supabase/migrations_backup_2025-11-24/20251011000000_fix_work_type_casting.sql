-- =====================================================
-- FIX WORK TYPE CASTING ISSUE
-- Issue: work_item_templates.work_type is VARCHAR but
-- get_ready_work_items.work_type expects work_item_type enum
-- =====================================================

-- Drop and recreate the trigger function with proper casting
CREATE OR REPLACE FUNCTION auto_create_step_work_items()
RETURNS TRIGGER AS $$
DECLARE
  template_record RECORD;
BEGIN
  -- Check if step_id has changed (vehicle moved to new step)
  IF OLD.step_id IS DISTINCT FROM NEW.step_id THEN
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
        -- Insert new work item from template with proper type casting
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
          template_record.work_type::work_item_type, -- ✅ CAST to enum type
          'pending'::work_item_status,
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

-- =====================================================
-- COMMENTS
-- =====================================================
-- This migration fixes the type casting issue when creating work items
-- from templates. The work_type column in work_item_templates is VARCHAR(50)
-- but needs to be cast to work_item_type enum when inserting into get_ready_work_items.
