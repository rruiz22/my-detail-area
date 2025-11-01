-- =====================================================
-- NOTE REPLIES ACTIVITY TRACKING
-- Date: 2025-10-16
-- Track replies to vehicle notes in activity log
-- =====================================================

CREATE OR REPLACE FUNCTION log_note_reply_activities()
RETURNS TRIGGER AS $$
DECLARE
  v_vehicle_id UUID;
  v_dealer_id BIGINT;
  v_action_by UUID;
  v_content_preview TEXT;
BEGIN
  v_dealer_id := COALESCE(NEW.dealer_id, OLD.dealer_id);

  -- Get vehicle_id from parent note
  SELECT vehicle_id INTO v_vehicle_id
  FROM vehicle_notes
  WHERE id = COALESCE(NEW.note_id, OLD.note_id);

  IF v_vehicle_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- INSERT (new reply)
  IF TG_OP = 'INSERT' THEN
    v_action_by := NEW.author_id;
    v_content_preview := LEFT(NEW.content, 100);

    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by, description, metadata
    ) VALUES (
      v_vehicle_id, v_dealer_id, 'note_reply_added', v_action_by,
      'Reply added: ' || v_content_preview || CASE WHEN LENGTH(NEW.content) > 100 THEN '...' ELSE '' END,
      jsonb_build_object(
        'reply_id', NEW.id,
        'note_id', NEW.note_id
      )
    );
    RETURN NEW;
  END IF;

  -- DELETE (reply deleted)
  IF TG_OP = 'DELETE' THEN
    v_action_by := auth.uid();
    v_content_preview := LEFT(OLD.content, 100);

    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by, description, metadata
    ) VALUES (
      v_vehicle_id, v_dealer_id, 'note_reply_deleted', v_action_by,
      'Reply deleted: ' || v_content_preview || CASE WHEN LENGTH(OLD.content) > 100 THEN '...' ELSE '' END,
      jsonb_build_object('note_id', OLD.note_id)
    );
    RETURN OLD;
  END IF;

  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error logging note reply activity: %', SQLERRM;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for vehicle_note_replies
DROP TRIGGER IF EXISTS trigger_log_note_reply_insert ON public.vehicle_note_replies;
CREATE TRIGGER trigger_log_note_reply_insert
  AFTER INSERT ON public.vehicle_note_replies
  FOR EACH ROW
  EXECUTE FUNCTION log_note_reply_activities();

DROP TRIGGER IF EXISTS trigger_log_note_reply_delete ON public.vehicle_note_replies;
CREATE TRIGGER trigger_log_note_reply_delete
  AFTER DELETE ON public.vehicle_note_replies
  FOR EACH ROW
  EXECUTE FUNCTION log_note_reply_activities();

COMMENT ON FUNCTION log_note_reply_activities() IS
  'Tracks note reply activities (add, delete) for get_ready vehicles';
