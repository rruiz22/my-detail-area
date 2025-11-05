-- =====================================================
-- GET READY MODULE - ADDITIONAL ACTIVITY LOG TRIGGERS
-- Notes, Media, and Approval Request Activities
-- Date: November 4, 2025
-- Version: 1.0
-- =====================================================

-- Drop existing triggers if they exist (idempotent)
DROP TRIGGER IF EXISTS trigger_log_vehicle_notes_activities ON public.vehicle_notes;
DROP TRIGGER IF EXISTS trigger_log_vehicle_media_activities ON public.vehicle_media;
DROP TRIGGER IF EXISTS trigger_log_vehicle_changes ON public.get_ready_vehicles;

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS log_vehicle_notes_activities();
DROP FUNCTION IF EXISTS log_vehicle_media_activities();
DROP FUNCTION IF EXISTS log_vehicle_changes();

-- =====================================================
-- TRIGGER: AUTO-LOG VEHICLE NOTES ACTIVITIES
-- =====================================================

CREATE OR REPLACE FUNCTION log_vehicle_notes_activities()
RETURNS TRIGGER AS $$
DECLARE
  v_vehicle_id UUID;
  v_dealer_id BIGINT;
  v_note_type_formatted TEXT;
BEGIN
  v_vehicle_id := COALESCE(NEW.vehicle_id, OLD.vehicle_id);
  v_dealer_id := COALESCE(NEW.dealer_id, OLD.dealer_id);

  -- INSERT: Note Added
  IF TG_OP = 'INSERT' THEN
    v_note_type_formatted := UPPER(SUBSTRING(NEW.note_type FROM 1 FOR 1)) ||
                              SUBSTRING(NEW.note_type FROM 2);

    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by, description, metadata
    ) VALUES (
      v_vehicle_id,
      v_dealer_id,
      'note_added',
      NEW.author_id,
      format('Note added: %s note', v_note_type_formatted),
      jsonb_build_object(
        'note_id', NEW.id,
        'note_type', NEW.note_type,
        'is_pinned', NEW.is_pinned,
        'content_preview', LEFT(NEW.content, 100)
      )
    );
    RETURN NEW;
  END IF;

  -- UPDATE: Note Updated
  IF TG_OP = 'UPDATE' THEN
    -- Only log if content or pin status changed
    IF OLD.content IS DISTINCT FROM NEW.content OR
       OLD.is_pinned IS DISTINCT FROM NEW.is_pinned THEN

      INSERT INTO get_ready_vehicle_activity_log (
        vehicle_id, dealer_id, activity_type, action_by, description, metadata
      ) VALUES (
        v_vehicle_id,
        v_dealer_id,
        'note_updated',
        NEW.author_id,
        CASE
          WHEN OLD.is_pinned IS DISTINCT FROM NEW.is_pinned THEN
            format('Note %s', CASE WHEN NEW.is_pinned THEN 'pinned' ELSE 'unpinned' END)
          ELSE 'Note updated'
        END,
        jsonb_build_object(
          'note_id', NEW.id,
          'note_type', NEW.note_type,
          'is_pinned', NEW.is_pinned,
          'pin_changed', OLD.is_pinned IS DISTINCT FROM NEW.is_pinned
        )
      );
    END IF;
    RETURN NEW;
  END IF;

  -- DELETE: Note Deleted
  IF TG_OP = 'DELETE' THEN
    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by, description, metadata
    ) VALUES (
      v_vehicle_id,
      v_dealer_id,
      'note_deleted',
      OLD.author_id,
      format('%s note deleted', UPPER(SUBSTRING(OLD.note_type FROM 1 FOR 1)) ||
                                 SUBSTRING(OLD.note_type FROM 2)),
      jsonb_build_object(
        'note_type', OLD.note_type,
        'was_pinned', OLD.is_pinned
      )
    );
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_log_vehicle_notes_activities
  AFTER INSERT OR UPDATE OR DELETE ON public.vehicle_notes
  FOR EACH ROW
  EXECUTE FUNCTION log_vehicle_notes_activities();

-- =====================================================
-- TRIGGER: AUTO-LOG VEHICLE MEDIA ACTIVITIES
-- =====================================================

CREATE OR REPLACE FUNCTION log_vehicle_media_activities()
RETURNS TRIGGER AS $$
DECLARE
  v_vehicle_id UUID;
  v_dealer_id BIGINT;
  v_media_type TEXT;
BEGIN
  v_vehicle_id := COALESCE(NEW.vehicle_id, OLD.vehicle_id);
  v_dealer_id := COALESCE(NEW.dealer_id, OLD.dealer_id);

  -- INSERT: Media Uploaded
  IF TG_OP = 'INSERT' THEN
    -- Determine media type from MIME type
    v_media_type := CASE
      WHEN NEW.file_type LIKE 'image/%' THEN 'photo'
      WHEN NEW.file_type LIKE 'video/%' THEN 'video'
      ELSE 'document'
    END;

    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by, description, metadata
    ) VALUES (
      v_vehicle_id,
      v_dealer_id,
      'media_uploaded',
      NEW.uploaded_by,
      format('%s uploaded: %s',
        UPPER(SUBSTRING(v_media_type FROM 1 FOR 1)) || SUBSTRING(v_media_type FROM 2),
        NEW.file_name),
      jsonb_build_object(
        'media_id', NEW.id,
        'file_name', NEW.file_name,
        'file_type', NEW.file_type,
        'file_size', NEW.file_size,
        'category', NEW.category,
        'media_type', v_media_type,
        'linked_work_item_id', NEW.linked_work_item_id
      )
    );
    RETURN NEW;
  END IF;

  -- DELETE: Media Deleted
  IF TG_OP = 'DELETE' THEN
    v_media_type := CASE
      WHEN OLD.file_type LIKE 'image/%' THEN 'photo'
      WHEN OLD.file_type LIKE 'video/%' THEN 'video'
      ELSE 'document'
    END;

    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by, description, metadata
    ) VALUES (
      v_vehicle_id,
      v_dealer_id,
      'media_deleted',
      OLD.uploaded_by,
      format('%s deleted: %s',
        UPPER(SUBSTRING(v_media_type FROM 1 FOR 1)) || SUBSTRING(v_media_type FROM 2),
        OLD.file_name),
      jsonb_build_object(
        'file_name', OLD.file_name,
        'file_type', OLD.file_type,
        'category', OLD.category,
        'media_type', v_media_type
      )
    );
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_log_vehicle_media_activities
  AFTER INSERT OR DELETE ON public.vehicle_media
  FOR EACH ROW
  EXECUTE FUNCTION log_vehicle_media_activities();

-- =====================================================
-- TRIGGER: AUTO-LOG VEHICLE CHANGES (UPDATED)
-- Including new approval_requested logic
-- =====================================================

CREATE OR REPLACE FUNCTION log_vehicle_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_dealer_id BIGINT;
  v_old_step_name TEXT;
  v_new_step_name TEXT;
BEGIN
  v_dealer_id := COALESCE(NEW.dealer_id, OLD.dealer_id);

  -- ========== INSERT: Vehicle Created ==========
  IF TG_OP = 'INSERT' THEN
    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by, description, metadata
    ) VALUES (
      NEW.id,
      v_dealer_id,
      'vehicle_created',
      auth.uid(),
      format('Vehicle added: %s %s %s (Stock: %s)',
        NEW.vehicle_year, NEW.vehicle_make, NEW.vehicle_model, NEW.stock_number),
      jsonb_build_object(
        'stock_number', NEW.stock_number,
        'vin', NEW.vin,
        'workflow_type', NEW.workflow_type,
        'priority', NEW.priority
      )
    );
    RETURN NEW;
  END IF;

  -- ========== UPDATE: Track Specific Changes ==========
  IF TG_OP = 'UPDATE' THEN

    -- 1. Step Changed
    IF OLD.step_id IS DISTINCT FROM NEW.step_id THEN
      SELECT name INTO v_old_step_name
        FROM get_ready_steps WHERE id = OLD.step_id;
      SELECT name INTO v_new_step_name
        FROM get_ready_steps WHERE id = NEW.step_id;

      INSERT INTO get_ready_vehicle_activity_log (
        vehicle_id, dealer_id, activity_type, action_by,
        field_name, old_value, new_value, description, metadata
      ) VALUES (
        NEW.id, v_dealer_id, 'step_changed', auth.uid(),
        'step_id',
        COALESCE(v_old_step_name, 'None'),
        COALESCE(v_new_step_name, 'None'),
        format('Moved from "%s" to "%s"',
          COALESCE(v_old_step_name, 'None'),
          COALESCE(v_new_step_name, 'None')),
        jsonb_build_object(
          'old_step_id', OLD.step_id,
          'new_step_id', NEW.step_id,
          'old_step_name', v_old_step_name,
          'new_step_name', v_new_step_name
        )
      );
    END IF;

    -- 2. Priority Changed
    IF OLD.priority IS DISTINCT FROM NEW.priority THEN
      INSERT INTO get_ready_vehicle_activity_log (
        vehicle_id, dealer_id, activity_type, action_by,
        field_name, old_value, new_value, description
      ) VALUES (
        NEW.id, v_dealer_id, 'priority_changed', auth.uid(),
        'priority', OLD.priority, NEW.priority,
        format('Priority changed from %s to %s',
          UPPER(OLD.priority), UPPER(NEW.priority))
      );
    END IF;

    -- 3. Workflow Type Changed
    IF OLD.workflow_type IS DISTINCT FROM NEW.workflow_type THEN
      INSERT INTO get_ready_vehicle_activity_log (
        vehicle_id, dealer_id, activity_type, action_by,
        field_name, old_value, new_value, description
      ) VALUES (
        NEW.id, v_dealer_id, 'workflow_changed', auth.uid(),
        'workflow_type', OLD.workflow_type, NEW.workflow_type,
        format('Workflow changed from %s to %s',
          UPPER(OLD.workflow_type), UPPER(NEW.workflow_type))
      );
    END IF;

    -- 4. Approval Requested (NEW LOGIC)
    IF (OLD.requires_approval = false OR OLD.requires_approval IS NULL)
       AND NEW.requires_approval = true
       AND NEW.approval_status = 'pending' THEN

      INSERT INTO get_ready_vehicle_activity_log (
        vehicle_id, dealer_id, activity_type, action_by, description, metadata
      ) VALUES (
        NEW.id,
        v_dealer_id,
        'approval_requested',
        auth.uid(),
        'Approval requested for vehicle',
        jsonb_build_object(
          'workflow_type', NEW.workflow_type,
          'priority', NEW.priority,
          'current_step', NEW.step_id
        )
      );
    END IF;

    -- 5. Approval Status Changed
    IF OLD.approval_status IS DISTINCT FROM NEW.approval_status THEN
      IF NEW.approval_status = 'approved' THEN
        INSERT INTO get_ready_vehicle_activity_log (
          vehicle_id, dealer_id, activity_type, action_by, description, metadata
        ) VALUES (
          NEW.id, v_dealer_id, 'approval_granted', auth.uid(),
          'Vehicle approval granted',
          jsonb_build_object(
            'approved_by', NEW.approved_by,
            'approved_at', NEW.approved_at,
            'approval_reason', NEW.approval_reason
          )
        );
      ELSIF NEW.approval_status = 'rejected' THEN
        INSERT INTO get_ready_vehicle_activity_log (
          vehicle_id, dealer_id, activity_type, action_by, description, metadata
        ) VALUES (
          NEW.id, v_dealer_id, 'approval_rejected', auth.uid(),
          format('Vehicle approval rejected: %s', COALESCE(NEW.rejection_reason, 'No reason provided')),
          jsonb_build_object(
            'rejected_by', NEW.rejected_by,
            'rejected_at', NEW.rejected_at,
            'rejection_reason', NEW.rejection_reason
          )
        );
      END IF;
    END IF;

    -- 6. SLA Status Changed (Warning/Critical)
    IF OLD.sla_status IS DISTINCT FROM NEW.sla_status THEN
      IF NEW.sla_status = 'critical' THEN
        INSERT INTO get_ready_vehicle_activity_log (
          vehicle_id, dealer_id, activity_type, action_by, description
        ) VALUES (
          NEW.id, v_dealer_id, 'sla_critical', auth.uid(),
          format('⚠️ SLA CRITICAL: Vehicle has been in current step for %s days',
            NEW.days_in_step)
        );
      ELSIF NEW.sla_status = 'warning' THEN
        INSERT INTO get_ready_vehicle_activity_log (
          vehicle_id, dealer_id, activity_type, action_by, description
        ) VALUES (
          NEW.id, v_dealer_id, 'sla_warning', auth.uid(),
          format('⚠️ SLA WARNING: Vehicle approaching time limit (%s days)',
            NEW.days_in_step)
        );
      END IF;
    END IF;

    -- 7. Vehicle Completed
    IF OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL THEN
      INSERT INTO get_ready_vehicle_activity_log (
        vehicle_id, dealer_id, activity_type, action_by, description, metadata
      ) VALUES (
        NEW.id, v_dealer_id, 'vehicle_completed', auth.uid(),
        format('✅ Vehicle completed (Total time: %s days)', NEW.days_to_frontline),
        jsonb_build_object(
          'days_to_frontline', NEW.days_to_frontline,
          'total_cost', NEW.total_holding_cost,
          'completed_at', NEW.completed_at
        )
      );
    END IF;

    RETURN NEW;
  END IF;

  -- ========== DELETE: Soft Delete ==========
  IF TG_OP = 'DELETE' THEN
    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by, description, metadata
    ) VALUES (
      OLD.id, v_dealer_id, 'vehicle_deleted', auth.uid(),
      format('Vehicle removed: %s %s %s (Stock: %s)',
        OLD.vehicle_year, OLD.vehicle_make, OLD.vehicle_model, OLD.stock_number),
      jsonb_build_object('stock_number', OLD.stock_number, 'vin', OLD.vin)
    );
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_log_vehicle_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.get_ready_vehicles
  FOR EACH ROW
  EXECUTE FUNCTION log_vehicle_changes();

-- =====================================================
-- VERIFICATION COMMENTS
-- =====================================================

-- ✅ Notes Activities:
--    - note_added: Triggered on INSERT into vehicle_notes
--    - note_updated: Triggered on UPDATE (content or is_pinned changes)
--    - note_deleted: Triggered on DELETE from vehicle_notes

-- ✅ Media Activities:
--    - media_uploaded: Triggered on INSERT into vehicle_media
--    - media_deleted: Triggered on DELETE from vehicle_media

-- ✅ Approval Activities:
--    - approval_requested: Triggered when requires_approval changes to true
--    - approval_granted: Already exists in V3 (approval_status = 'approved')
--    - approval_rejected: Already exists in V3 (approval_status = 'rejected')

-- All triggers use SECURITY DEFINER for proper permissions
-- All triggers populate metadata with contextual information
-- All triggers are idempotent and safe to rerun
