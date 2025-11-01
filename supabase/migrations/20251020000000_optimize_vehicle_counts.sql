-- =====================================================
-- OPTIMIZATION: Eliminate N+1 Queries for Vehicle Counts
-- Add triggers to automatically maintain media_count and notes_count
-- =====================================================

-- =====================================================
-- 1. ADD notes_count FIELD
-- =====================================================

-- Add notes_count column to get_ready_vehicles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'get_ready_vehicles'
    AND column_name = 'notes_count'
  ) THEN
    ALTER TABLE public.get_ready_vehicles
    ADD COLUMN notes_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_get_ready_vehicles_media_count
  ON public.get_ready_vehicles(media_count)
  WHERE media_count > 0;

CREATE INDEX IF NOT EXISTS idx_get_ready_vehicles_notes_count
  ON public.get_ready_vehicles(notes_count)
  WHERE notes_count > 0;

-- =====================================================
-- 2. TRIGGER FUNCTION FOR MEDIA COUNT
-- Automatically update media_count when media is added/deleted
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_vehicle_media_count()
RETURNS TRIGGER AS $$
DECLARE
  vehicle_record RECORD;
  new_count INTEGER;
BEGIN
  -- Determine which vehicle_id to update based on operation
  IF TG_OP = 'DELETE' THEN
    -- For DELETE, use OLD record
    SELECT id INTO vehicle_record FROM public.get_ready_vehicles WHERE id = OLD.vehicle_id;

    IF FOUND THEN
      -- Count remaining media for this vehicle
      SELECT COUNT(*) INTO new_count
      FROM public.vehicle_media
      WHERE vehicle_id = OLD.vehicle_id;

      -- Update the count
      UPDATE public.get_ready_vehicles
      SET media_count = new_count
      WHERE id = OLD.vehicle_id;
    END IF;

  ELSE
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
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on vehicle_media
DROP TRIGGER IF EXISTS trigger_update_vehicle_media_count ON public.vehicle_media;
CREATE TRIGGER trigger_update_vehicle_media_count
  AFTER INSERT OR UPDATE OR DELETE ON public.vehicle_media
  FOR EACH ROW
  EXECUTE FUNCTION public.update_vehicle_media_count();

-- =====================================================
-- 3. TRIGGER FUNCTION FOR NOTES COUNT
-- Automatically update notes_count when notes are added/deleted
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_vehicle_notes_count()
RETURNS TRIGGER AS $$
DECLARE
  vehicle_record RECORD;
  new_count INTEGER;
BEGIN
  -- Determine which vehicle_id to update based on operation
  IF TG_OP = 'DELETE' THEN
    -- For DELETE, use OLD record
    SELECT id INTO vehicle_record FROM public.get_ready_vehicles WHERE id = OLD.vehicle_id;

    IF FOUND THEN
      -- Count remaining notes for this vehicle
      SELECT COUNT(*) INTO new_count
      FROM public.vehicle_notes
      WHERE vehicle_id = OLD.vehicle_id;

      -- Update the count
      UPDATE public.get_ready_vehicles
      SET notes_count = new_count
      WHERE id = OLD.vehicle_id;
    END IF;

  ELSE
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
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on vehicle_notes
DROP TRIGGER IF EXISTS trigger_update_vehicle_notes_count ON public.vehicle_notes;
CREATE TRIGGER trigger_update_vehicle_notes_count
  AFTER INSERT OR UPDATE OR DELETE ON public.vehicle_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_vehicle_notes_count();

-- =====================================================
-- 4. BACKFILL EXISTING COUNTS
-- Populate initial values for existing vehicles
-- =====================================================

-- Update media_count for all existing vehicles
UPDATE public.get_ready_vehicles v
SET media_count = (
  SELECT COUNT(*)
  FROM public.vehicle_media m
  WHERE m.vehicle_id = v.id
);

-- Update notes_count for all existing vehicles
UPDATE public.get_ready_vehicles v
SET notes_count = (
  SELECT COUNT(*)
  FROM public.vehicle_notes n
  WHERE n.vehicle_id = v.id
);

-- =====================================================
-- 5. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON COLUMN public.get_ready_vehicles.media_count IS 'Automatically maintained count of media files. Updated via trigger on vehicle_media table.';
COMMENT ON COLUMN public.get_ready_vehicles.notes_count IS 'Automatically maintained count of notes. Updated via trigger on vehicle_notes table.';
COMMENT ON FUNCTION public.update_vehicle_media_count() IS 'Trigger function to automatically update media_count when media is added/removed';
COMMENT ON FUNCTION public.update_vehicle_notes_count() IS 'Trigger function to automatically update notes_count when notes are added/removed';
