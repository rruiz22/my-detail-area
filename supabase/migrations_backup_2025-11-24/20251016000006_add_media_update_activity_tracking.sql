-- =====================================================
-- MEDIA UPDATE ACTIVITY TRACKING
-- Date: 2025-10-16
-- Track when media is annotated or updated
-- =====================================================

-- Update the media activities function to handle UPDATE events
CREATE OR REPLACE FUNCTION log_vehicle_media_activities()
RETURNS TRIGGER AS $$
DECLARE
  v_vehicle_id UUID;
  v_dealer_id BIGINT;
  v_action_by UUID;
BEGIN
  v_vehicle_id := COALESCE(NEW.vehicle_id, OLD.vehicle_id);
  v_dealer_id := COALESCE(NEW.dealer_id, OLD.dealer_id);

  -- INSERT (media uploaded)
  IF TG_OP = 'INSERT' THEN
    v_action_by := NEW.uploaded_by;

    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by, description, metadata
    ) VALUES (
      v_vehicle_id, v_dealer_id, 'media_uploaded', v_action_by,
      'Media uploaded: ' || NEW.file_name,
      jsonb_build_object(
        'media_id', NEW.id,
        'file_name', NEW.file_name,
        'file_type', NEW.file_type,
        'category', NEW.category,
        'file_size', NEW.file_size,
        'linked_work_item_id', NEW.linked_work_item_id
      )
    );
    RETURN NEW;
  END IF;

  -- UPDATE (media annotations or category changed)
  IF TG_OP = 'UPDATE' THEN
    v_action_by := auth.uid();

    -- Check if annotations were added/changed
    IF OLD.annotations IS DISTINCT FROM NEW.annotations AND NEW.annotations IS NOT NULL THEN
      INSERT INTO get_ready_vehicle_activity_log (
        vehicle_id, dealer_id, activity_type, action_by, description, metadata
      ) VALUES (
        v_vehicle_id, v_dealer_id, 'media_annotated', v_action_by,
        'Media annotated: ' || NEW.file_name,
        jsonb_build_object(
          'media_id', NEW.id,
          'file_name', NEW.file_name
        )
      );
    END IF;

    -- Check if category changed
    IF OLD.category IS DISTINCT FROM NEW.category THEN
      INSERT INTO get_ready_vehicle_activity_log (
        vehicle_id, dealer_id, activity_type, action_by, description, metadata
      ) VALUES (
        v_vehicle_id, v_dealer_id, 'media_updated', v_action_by,
        'Media category changed: ' || NEW.file_name,
        jsonb_build_object(
          'media_id', NEW.id,
          'file_name', NEW.file_name,
          'old_category', OLD.category,
          'new_category', NEW.category
        )
      );
    END IF;

    RETURN NEW;
  END IF;

  -- DELETE (media deleted)
  IF TG_OP = 'DELETE' THEN
    v_action_by := auth.uid();

    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by, description, metadata
    ) VALUES (
      v_vehicle_id, v_dealer_id, 'media_deleted', v_action_by,
      'Media deleted: ' || OLD.file_name,
      jsonb_build_object(
        'file_name', OLD.file_name,
        'category', OLD.category
      )
    );
    RETURN OLD;
  END IF;

  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error logging media activity: %', SQLERRM;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add trigger for UPDATE events
DROP TRIGGER IF EXISTS trigger_log_vehicle_media_update ON public.vehicle_media;
CREATE TRIGGER trigger_log_vehicle_media_update
  AFTER UPDATE ON public.vehicle_media
  FOR EACH ROW
  EXECUTE FUNCTION log_vehicle_media_activities();
