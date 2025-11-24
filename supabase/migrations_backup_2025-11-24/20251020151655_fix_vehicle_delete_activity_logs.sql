-- Fix: Prevent FK errors when logging activities for deleted vehicles
-- Issue: When a vehicle is deleted, CASCADE deletes vehicle_media and vehicle_notes
-- Their DELETE triggers try to log activities but vehicle no longer exists
-- Solution: Check if vehicle exists before inserting activity log

-- Fix log_vehicle_media_activities function
CREATE OR REPLACE FUNCTION public.log_vehicle_media_activities()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_vehicle_id UUID;
  v_dealer_id BIGINT;
  v_action_by UUID;
  v_vehicle_exists BOOLEAN;
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

  -- DELETE (media deleted) - FIX: Check if vehicle still exists
  IF TG_OP = 'DELETE' THEN
    -- Check if vehicle exists (might be cascading delete)
    SELECT EXISTS(
      SELECT 1 FROM get_ready_vehicles WHERE id = v_vehicle_id
    ) INTO v_vehicle_exists;

    -- Only log if vehicle still exists (user manually deleted media)
    -- Skip logging if vehicle is being deleted (cascading delete)
    IF v_vehicle_exists THEN
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
    END IF;

    RETURN OLD;
  END IF;

  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error logging media activity: %', SQLERRM;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Fix log_vehicle_note_activities function (same issue)
CREATE OR REPLACE FUNCTION public.log_vehicle_note_activities()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_vehicle_id UUID;
  v_dealer_id BIGINT;
  v_action_by UUID;
  v_vehicle_exists BOOLEAN;
BEGIN
  v_vehicle_id := COALESCE(NEW.vehicle_id, OLD.vehicle_id);
  v_dealer_id := COALESCE(NEW.dealer_id, OLD.dealer_id);

  -- INSERT (note added)
  IF TG_OP = 'INSERT' THEN
    v_action_by := NEW.created_by;

    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by, description, metadata
    ) VALUES (
      v_vehicle_id, v_dealer_id, 'note_added', v_action_by,
      'Note added',
      jsonb_build_object(
        'note_id', NEW.id,
        'content_preview', LEFT(NEW.content, 100)
      )
    );
    RETURN NEW;
  END IF;

  -- UPDATE (note edited)
  IF TG_OP = 'UPDATE' AND OLD.content IS DISTINCT FROM NEW.content THEN
    v_action_by := auth.uid();

    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by, description, metadata
    ) VALUES (
      v_vehicle_id, v_dealer_id, 'note_edited', v_action_by,
      'Note edited',
      jsonb_build_object(
        'note_id', NEW.id
      )
    );
    RETURN NEW;
  END IF;

  -- DELETE (note deleted) - FIX: Check if vehicle still exists
  IF TG_OP = 'DELETE' THEN
    -- Check if vehicle exists (might be cascading delete)
    SELECT EXISTS(
      SELECT 1 FROM get_ready_vehicles WHERE id = v_vehicle_id
    ) INTO v_vehicle_exists;

    -- Only log if vehicle still exists (user manually deleted note)
    -- Skip logging if vehicle is being deleted (cascading delete)
    IF v_vehicle_exists THEN
      v_action_by := auth.uid();

      INSERT INTO get_ready_vehicle_activity_log (
        vehicle_id, dealer_id, activity_type, action_by, description, metadata
      ) VALUES (
        v_vehicle_id, v_dealer_id, 'note_deleted', v_action_by,
        'Note deleted',
        jsonb_build_object(
          'content_preview', LEFT(OLD.content, 100)
        )
      );
    END IF;

    RETURN OLD;
  END IF;

  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error logging note activity: %', SQLERRM;
  RETURN COALESCE(NEW, OLD);
END;
$function$;
