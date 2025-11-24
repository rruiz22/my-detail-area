-- Fix: Prevent counter update triggers from causing FK errors during vehicle deletion
-- Issue: When vehicle is deleted, CASCADE deletes media/notes, triggers try to update
-- vehicle counters which fires log_vehicle_changes trigger, which tries to insert
-- into activity_log with vehicle_id that's being deleted
-- Solution: Skip counter updates during DELETE operations (counters cleaned when vehicle deleted anyway)

-- Fix update_vehicle_media_count to skip updates during DELETE
CREATE OR REPLACE FUNCTION public.update_vehicle_media_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  vehicle_record RECORD;
  new_count INTEGER;
BEGIN
  -- Skip counter updates during DELETE operations
  -- Counters will be cleaned when vehicle is deleted anyway
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  -- For INSERT/UPDATE, use NEW record
  SELECT id INTO vehicle_record FROM public.get_ready_vehicles WHERE id = NEW.vehicle_id;

  IF FOUND THEN
    -- Count media for this vehicle
    SELECT COUNT(*) INTO new_count
    FROM public.vehicle_media
    WHERE vehicle_id = NEW.vehicle_id;

    -- Update the count
    UPDATE public.get_ready_vehicles
    SET media_count = new_count
    WHERE id = NEW.vehicle_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Fix update_vehicle_notes_count to skip updates during DELETE
CREATE OR REPLACE FUNCTION public.update_vehicle_notes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  vehicle_record RECORD;
  new_count INTEGER;
BEGIN
  -- Skip counter updates during DELETE operations
  -- Counters will be cleaned when vehicle is deleted anyway
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  -- For INSERT/UPDATE, use NEW record
  SELECT id INTO vehicle_record FROM public.get_ready_vehicles WHERE id = NEW.vehicle_id;

  IF FOUND THEN
    -- Count notes for this vehicle
    SELECT COUNT(*) INTO new_count
    FROM public.vehicle_notes
    WHERE vehicle_id = NEW.vehicle_id;

    -- Update the count
    UPDATE public.get_ready_vehicles
    SET notes_count = new_count
    WHERE id = NEW.vehicle_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;
