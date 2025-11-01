-- =====================================================
-- COMPLETE ACTIVITY TRACKING - Notes & Media
-- Date: 2025-10-16
-- Tracks all vehicle-related activities for audit trail
-- =====================================================

-- =====================================================
-- TRIGGER 3: Log Vehicle Note Activities
-- =====================================================

CREATE OR REPLACE FUNCTION log_vehicle_note_activities()
RETURNS TRIGGER AS $$
DECLARE
  v_vehicle_id UUID;
  v_dealer_id BIGINT;
  v_action_by UUID;
  v_content_preview TEXT;
BEGIN
  v_vehicle_id := COALESCE(NEW.vehicle_id, OLD.vehicle_id);

  -- Get dealer_id from parent vehicle
  SELECT dealer_id INTO v_dealer_id
  FROM get_ready_vehicles
  WHERE id = v_vehicle_id;

  IF v_dealer_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- INSERT (new note)
  IF TG_OP = 'INSERT' THEN
    v_action_by := NEW.created_by;
    v_content_preview := LEFT(NEW.content, 100);

    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by, description, metadata
    ) VALUES (
      v_vehicle_id, v_dealer_id, 'note_added', v_action_by,
      'Note added: ' || v_content_preview || CASE WHEN LENGTH(NEW.content) > 100 THEN '...' ELSE '' END,
      jsonb_build_object(
        'note_id', NEW.id,
        'note_type', NEW.note_type,
        'is_pinned', NEW.is_pinned
      )
    );
    RETURN NEW;
  END IF;

  -- UPDATE (note edited)
  IF TG_OP = 'UPDATE' THEN
    v_action_by := NEW.created_by; -- Note: updated_by would be better if it exists

    IF OLD.content IS DISTINCT FROM NEW.content THEN
      v_content_preview := LEFT(NEW.content, 100);

      INSERT INTO get_ready_vehicle_activity_log (
        vehicle_id, dealer_id, activity_type, action_by, description, metadata
      ) VALUES (
        v_vehicle_id, v_dealer_id, 'note_updated', v_action_by,
        'Note updated: ' || v_content_preview || CASE WHEN LENGTH(NEW.content) > 100 THEN '...' ELSE '' END,
        jsonb_build_object('note_id', NEW.id, 'note_type', NEW.note_type)
      );
    END IF;

    RETURN NEW;
  END IF;

  -- DELETE (note deleted)
  IF TG_OP = 'DELETE' THEN
    v_action_by := auth.uid(); -- Current user deleting
    v_content_preview := LEFT(OLD.content, 100);

    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by, description, metadata
    ) VALUES (
      v_vehicle_id, v_dealer_id, 'note_deleted', v_action_by,
      'Note deleted: ' || v_content_preview || CASE WHEN LENGTH(OLD.content) > 100 THEN '...' ELSE '' END,
      jsonb_build_object('note_type', OLD.note_type)
    );
    RETURN OLD;
  END IF;

  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't block the operation
  RAISE WARNING 'Error logging note activity: %', SQLERRM;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for vehicle_notes
DROP TRIGGER IF EXISTS trigger_log_vehicle_note_insert ON public.vehicle_notes;
CREATE TRIGGER trigger_log_vehicle_note_insert
  AFTER INSERT ON public.vehicle_notes
  FOR EACH ROW
  EXECUTE FUNCTION log_vehicle_note_activities();

DROP TRIGGER IF EXISTS trigger_log_vehicle_note_update ON public.vehicle_notes;
CREATE TRIGGER trigger_log_vehicle_note_update
  AFTER UPDATE ON public.vehicle_notes
  FOR EACH ROW
  EXECUTE FUNCTION log_vehicle_note_activities();

DROP TRIGGER IF EXISTS trigger_log_vehicle_note_delete ON public.vehicle_notes;
CREATE TRIGGER trigger_log_vehicle_note_delete
  AFTER DELETE ON public.vehicle_notes
  FOR EACH ROW
  EXECUTE FUNCTION log_vehicle_note_activities();

-- =====================================================
-- TRIGGER 4: Log Vehicle Media Activities
-- =====================================================

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

  -- DELETE (media deleted)
  IF TG_OP = 'DELETE' THEN
    v_action_by := auth.uid(); -- Current user deleting

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
  -- Log error but don't block the operation
  RAISE WARNING 'Error logging media activity: %', SQLERRM;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for vehicle_media
DROP TRIGGER IF EXISTS trigger_log_vehicle_media_insert ON public.vehicle_media;
CREATE TRIGGER trigger_log_vehicle_media_insert
  AFTER INSERT ON public.vehicle_media
  FOR EACH ROW
  EXECUTE FUNCTION log_vehicle_media_activities();

DROP TRIGGER IF EXISTS trigger_log_vehicle_media_delete ON public.vehicle_media;
CREATE TRIGGER trigger_log_vehicle_media_delete
  AFTER DELETE ON public.vehicle_media
  FOR EACH ROW
  EXECUTE FUNCTION log_vehicle_media_activities();

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON FUNCTION log_vehicle_note_activities() IS
  'Tracks all note activities (add, update, delete) for get_ready vehicles';

COMMENT ON FUNCTION log_vehicle_media_activities() IS
  'Tracks all media activities (upload, delete) for get_ready vehicles';
