-- =====================================================
-- GET READY MODULE - Detail Panel Enhancement
-- Tables for Work Items, Media, Notes, and Timeline
-- =====================================================

-- Drop existing types if they exist (for clean rebuild)
DROP TYPE IF EXISTS work_item_status CASCADE;
DROP TYPE IF EXISTS work_item_type CASCADE;
DROP TYPE IF EXISTS note_type CASCADE;
DROP TYPE IF EXISTS timeline_event_type CASCADE;

-- =====================================================
-- ENUMS FOR DETAIL PANEL
-- =====================================================

-- Work item statuses
CREATE TYPE work_item_status AS ENUM ('pending', 'in_progress', 'completed', 'declined');

-- Work item types (recon categories)
CREATE TYPE work_item_type AS ENUM (
  'mechanical',
  'body_repair',
  'detailing',
  'safety_inspection',
  'reconditioning',
  'parts_ordering',
  'other'
);

-- Note types for communication
CREATE TYPE note_type AS ENUM (
  'general',
  'issue',
  'decision',
  'vendor_communication',
  'cost_change',
  'timeline_change',
  'quality_concern'
);

-- Timeline event types
CREATE TYPE timeline_event_type AS ENUM (
  'arrival',
  'step_change',
  'work_started',
  'work_completed',
  'vendor_sent',
  'vendor_returned',
  'parts_ordered',
  'parts_received',
  'inspection',
  'approval_needed',
  'cost_change',
  'delay',
  'completion'
);

-- =====================================================
-- 1. GET READY WORK ITEMS TABLE
-- Tracks individual work tasks for vehicle reconditioning
-- =====================================================
CREATE TABLE IF NOT EXISTS public.get_ready_work_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.get_ready_vehicles(id) ON DELETE CASCADE,
  dealer_id BIGINT NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,

  -- Work item details
  title TEXT NOT NULL,
  description TEXT,
  work_type work_item_type NOT NULL DEFAULT 'other',
  status work_item_status NOT NULL DEFAULT 'pending',

  -- Priority (1=critical, 2=standard, 3=low)
  priority INTEGER NOT NULL DEFAULT 2 CHECK (priority BETWEEN 1 AND 3),

  -- Cost tracking
  estimated_cost DECIMAL(10,2) DEFAULT 0,
  actual_cost DECIMAL(10,2) DEFAULT 0,

  -- Time tracking
  estimated_hours DECIMAL(5,2) DEFAULT 0,
  actual_hours DECIMAL(5,2) DEFAULT 0,

  -- Assignment
  assigned_technician UUID REFERENCES public.profiles(id),
  assigned_vendor_id UUID, -- External vendor reference (to be created later)

  -- Approval workflow
  approval_required BOOLEAN DEFAULT false,
  approval_status TEXT, -- 'pending', 'approved', 'declined'
  decline_reason TEXT,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,

  -- Parts tracking
  parts_required JSONB DEFAULT '[]'::jsonb,
  parts_status TEXT, -- 'none', 'ordered', 'received'

  -- Dependencies (array of work item IDs that must complete first)
  blocked_by UUID[],

  -- Scheduling
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,

  -- Media references
  photos_before TEXT[] DEFAULT '{}',
  photos_after TEXT[] DEFAULT '{}',

  -- Audit
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.get_ready_work_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view work items for their dealerships"
  ON public.get_ready_work_items FOR SELECT
  USING (user_has_active_dealer_membership(auth.uid(), dealer_id));

CREATE POLICY "Users can create work items for their dealerships"
  ON public.get_ready_work_items FOR INSERT
  WITH CHECK (
    user_has_active_dealer_membership(auth.uid(), dealer_id)
    AND user_has_group_permission(auth.uid(), dealer_id, 'get_ready.create')
  );

CREATE POLICY "Users can update work items for their dealerships"
  ON public.get_ready_work_items FOR UPDATE
  USING (
    user_has_active_dealer_membership(auth.uid(), dealer_id)
    AND user_has_group_permission(auth.uid(), dealer_id, 'get_ready.update')
  )
  WITH CHECK (
    user_has_active_dealer_membership(auth.uid(), dealer_id)
    AND user_has_group_permission(auth.uid(), dealer_id, 'get_ready.update')
  );

CREATE POLICY "Users can delete work items for their dealerships"
  ON public.get_ready_work_items FOR DELETE
  USING (
    user_has_active_dealer_membership(auth.uid(), dealer_id)
    AND user_has_group_permission(auth.uid(), dealer_id, 'get_ready.delete')
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_work_items_vehicle_id
  ON public.get_ready_work_items(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_work_items_dealer_id
  ON public.get_ready_work_items(dealer_id);

CREATE INDEX IF NOT EXISTS idx_work_items_status
  ON public.get_ready_work_items(status);

CREATE INDEX IF NOT EXISTS idx_work_items_assigned_technician
  ON public.get_ready_work_items(assigned_technician);

CREATE INDEX IF NOT EXISTS idx_work_items_approval_status
  ON public.get_ready_work_items(approval_status) WHERE approval_required = true;

-- =====================================================
-- 2. VEHICLE MEDIA TABLE
-- Photo and video documentation for vehicles
-- =====================================================
CREATE TABLE IF NOT EXISTS public.vehicle_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.get_ready_vehicles(id) ON DELETE CASCADE,
  dealer_id BIGINT NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,

  -- File information
  file_path TEXT NOT NULL, -- Supabase Storage path
  file_name TEXT NOT NULL,
  file_size INTEGER, -- bytes
  file_type TEXT, -- MIME type: image/jpeg, video/mp4, etc.
  thumbnail_path TEXT, -- Generated thumbnail path

  -- Categorization
  category TEXT NOT NULL, -- intake, damage, work_in_progress, completion, exterior_360, interior, undercarriage, engine_bay, vin_plates, odometer

  -- Metadata
  is_required BOOLEAN DEFAULT false,
  annotations JSONB DEFAULT '{}'::jsonb, -- Drawing data, notes, hotspots
  metadata JSONB DEFAULT '{}'::jsonb, -- GPS, device info, dimensions, etc.

  -- Work item association (optional)
  linked_work_item_id UUID REFERENCES public.get_ready_work_items(id) ON DELETE SET NULL,

  -- Audit
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.vehicle_media ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view media for their dealerships"
  ON public.vehicle_media FOR SELECT
  USING (user_has_active_dealer_membership(auth.uid(), dealer_id));

CREATE POLICY "Users can upload media for their dealerships"
  ON public.vehicle_media FOR INSERT
  WITH CHECK (
    user_has_active_dealer_membership(auth.uid(), dealer_id)
    AND user_has_group_permission(auth.uid(), dealer_id, 'get_ready.create')
  );

CREATE POLICY "Users can delete media for their dealerships"
  ON public.vehicle_media FOR DELETE
  USING (
    user_has_active_dealer_membership(auth.uid(), dealer_id)
    AND user_has_group_permission(auth.uid(), dealer_id, 'get_ready.delete')
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vehicle_media_vehicle_id
  ON public.vehicle_media(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_media_dealer_id
  ON public.vehicle_media(dealer_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_media_category
  ON public.vehicle_media(category);

CREATE INDEX IF NOT EXISTS idx_vehicle_media_created_at
  ON public.vehicle_media(created_at DESC);

-- =====================================================
-- 3. VEHICLE NOTES TABLE
-- Communication and activity log for vehicles
-- =====================================================
CREATE TABLE IF NOT EXISTS public.vehicle_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.get_ready_vehicles(id) ON DELETE CASCADE,
  dealer_id BIGINT NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,

  -- Note content
  note_type note_type NOT NULL DEFAULT 'general',
  content TEXT NOT NULL,

  -- System vs user generated
  is_system_generated BOOLEAN DEFAULT false,

  -- Author
  author_id UUID REFERENCES public.profiles(id),

  -- Mentions (array of user IDs)
  mentions UUID[],

  -- Attachments (array of file paths in Supabase Storage)
  attachments TEXT[] DEFAULT '{}',

  -- Work item linking
  linked_work_items UUID[],

  -- Visibility
  is_pinned BOOLEAN DEFAULT false,
  visibility TEXT DEFAULT 'internal', -- internal, vendor_visible, customer_visible

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.vehicle_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view notes for their dealerships"
  ON public.vehicle_notes FOR SELECT
  USING (user_has_active_dealer_membership(auth.uid(), dealer_id));

CREATE POLICY "Users can create notes for their dealerships"
  ON public.vehicle_notes FOR INSERT
  WITH CHECK (
    user_has_active_dealer_membership(auth.uid(), dealer_id)
  );

CREATE POLICY "Users can update their own notes"
  ON public.vehicle_notes FOR UPDATE
  USING (
    user_has_active_dealer_membership(auth.uid(), dealer_id)
    AND author_id = auth.uid()
  )
  WITH CHECK (
    user_has_active_dealer_membership(auth.uid(), dealer_id)
    AND author_id = auth.uid()
  );

CREATE POLICY "Users can delete their own notes"
  ON public.vehicle_notes FOR DELETE
  USING (
    user_has_active_dealer_membership(auth.uid(), dealer_id)
    AND author_id = auth.uid()
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vehicle_notes_vehicle_id
  ON public.vehicle_notes(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_notes_dealer_id
  ON public.vehicle_notes(dealer_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_notes_created_at
  ON public.vehicle_notes(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vehicle_notes_author_id
  ON public.vehicle_notes(author_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_notes_mentions
  ON public.vehicle_notes USING GIN (mentions);

-- =====================================================
-- 4. NOTE REPLIES TABLE (for threading)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.vehicle_note_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.vehicle_notes(id) ON DELETE CASCADE,
  dealer_id BIGINT NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,

  -- Reply content
  content TEXT NOT NULL,

  -- Author
  author_id UUID REFERENCES public.profiles(id),

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.vehicle_note_replies ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view note replies for their dealerships"
  ON public.vehicle_note_replies FOR SELECT
  USING (user_has_active_dealer_membership(auth.uid(), dealer_id));

CREATE POLICY "Users can create note replies for their dealerships"
  ON public.vehicle_note_replies FOR INSERT
  WITH CHECK (
    user_has_active_dealer_membership(auth.uid(), dealer_id)
  );

CREATE POLICY "Users can delete their own note replies"
  ON public.vehicle_note_replies FOR DELETE
  USING (
    user_has_active_dealer_membership(auth.uid(), dealer_id)
    AND author_id = auth.uid()
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_note_replies_note_id
  ON public.vehicle_note_replies(note_id);

CREATE INDEX IF NOT EXISTS idx_note_replies_created_at
  ON public.vehicle_note_replies(created_at DESC);

-- =====================================================
-- 5. VEHICLE TIMELINE EVENTS TABLE
-- Auto-populated chronological log of vehicle events
-- =====================================================
CREATE TABLE IF NOT EXISTS public.vehicle_timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.get_ready_vehicles(id) ON DELETE CASCADE,
  dealer_id BIGINT NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,

  -- Event classification
  event_type timeline_event_type NOT NULL,
  event_title TEXT NOT NULL,
  event_description TEXT,

  -- Visual indicators
  event_icon TEXT, -- lucide icon name
  event_color TEXT, -- hex color or tailwind class

  -- Timing
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  duration_hours DECIMAL(8,2), -- For step changes, work duration, etc.

  -- Source
  user_triggered BOOLEAN DEFAULT false,
  user_id UUID REFERENCES public.profiles(id),

  -- Impact
  cost_impact DECIMAL(10,2),
  delay_reason TEXT,

  -- Relationships
  linked_work_item UUID REFERENCES public.get_ready_work_items(id) ON DELETE SET NULL,
  linked_vendor_id UUID, -- External vendor reference (to be created later)

  -- Additional data
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.vehicle_timeline_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view timeline events for their dealerships"
  ON public.vehicle_timeline_events FOR SELECT
  USING (user_has_active_dealer_membership(auth.uid(), dealer_id));

CREATE POLICY "System can create timeline events"
  ON public.vehicle_timeline_events FOR INSERT
  WITH CHECK (true); -- Allow all inserts (will be from triggers/functions)

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_timeline_events_vehicle_id
  ON public.vehicle_timeline_events(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_timeline_events_dealer_id
  ON public.vehicle_timeline_events(dealer_id);

CREATE INDEX IF NOT EXISTS idx_timeline_events_timestamp
  ON public.vehicle_timeline_events(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_timeline_events_type
  ON public.vehicle_timeline_events(event_type);

-- =====================================================
-- 6. TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Update updated_at timestamp
CREATE TRIGGER trigger_work_items_updated_at
  BEFORE UPDATE ON public.get_ready_work_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_vehicle_notes_updated_at
  BEFORE UPDATE ON public.vehicle_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 7. AUTO-POPULATE TIMELINE EVENTS
-- =====================================================

-- Function to create timeline event when work item status changes
CREATE OR REPLACE FUNCTION public.create_work_item_timeline_event()
RETURNS TRIGGER AS $$
DECLARE
  event_title_text TEXT;
  event_desc_text TEXT;
  event_color_text TEXT;
BEGIN
  -- Determine event details based on status
  CASE NEW.status
    WHEN 'in_progress' THEN
      event_title_text := 'Work Started';
      event_desc_text := 'Started: ' || NEW.title;
      event_color_text := 'blue';
    WHEN 'completed' THEN
      event_title_text := 'Work Completed';
      event_desc_text := 'Completed: ' || NEW.title;
      event_color_text := 'green';
    WHEN 'declined' THEN
      event_title_text := 'Work Declined';
      event_desc_text := 'Declined: ' || NEW.title;
      event_color_text := 'red';
    ELSE
      RETURN NEW;
  END CASE;

  -- Insert timeline event
  INSERT INTO public.vehicle_timeline_events (
    vehicle_id,
    dealer_id,
    event_type,
    event_title,
    event_description,
    event_color,
    user_triggered,
    user_id,
    cost_impact,
    linked_work_item
  ) VALUES (
    NEW.vehicle_id,
    NEW.dealer_id,
    CASE NEW.status
      WHEN 'in_progress' THEN 'work_started'::timeline_event_type
      WHEN 'completed' THEN 'work_completed'::timeline_event_type
      ELSE 'delay'::timeline_event_type
    END,
    event_title_text,
    event_desc_text,
    event_color_text,
    true,
    NEW.created_by,
    NEW.actual_cost - NEW.estimated_cost,
    NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for work item status changes - INSERT
CREATE TRIGGER trigger_work_item_timeline_insert
  AFTER INSERT ON public.get_ready_work_items
  FOR EACH ROW
  EXECUTE FUNCTION public.create_work_item_timeline_event();

-- Trigger for work item status changes - UPDATE
CREATE TRIGGER trigger_work_item_timeline_update
  AFTER UPDATE OF status ON public.get_ready_work_items
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION public.create_work_item_timeline_event();

-- Function to create timeline event when vehicle step changes
CREATE OR REPLACE FUNCTION public.create_step_change_timeline_event()
RETURNS TRIGGER AS $$
DECLARE
  old_step_name TEXT;
  new_step_name TEXT;
BEGIN
  -- Get step names
  SELECT name INTO old_step_name FROM public.get_ready_steps WHERE id = OLD.step_id;
  SELECT name INTO new_step_name FROM public.get_ready_steps WHERE id = NEW.step_id;

  -- Insert timeline event
  INSERT INTO public.vehicle_timeline_events (
    vehicle_id,
    dealer_id,
    event_type,
    event_title,
    event_description,
    event_color,
    user_triggered,
    duration_hours
  ) VALUES (
    NEW.id,
    NEW.dealer_id,
    'step_change'::timeline_event_type,
    'Moved to ' || new_step_name,
    'Changed from ' || COALESCE(old_step_name, 'N/A') || ' to ' || new_step_name,
    'purple',
    true,
    NEW.days_in_step * 24.0
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for vehicle step changes
CREATE TRIGGER trigger_vehicle_step_change_timeline
  AFTER UPDATE OF step_id ON public.get_ready_vehicles
  FOR EACH ROW
  WHEN (NEW.step_id IS DISTINCT FROM OLD.step_id)
  EXECUTE FUNCTION public.create_step_change_timeline_event();

-- Function to create timeline event when note is added
CREATE OR REPLACE FUNCTION public.create_note_timeline_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create timeline event for important note types
  IF NEW.note_type IN ('issue', 'decision', 'cost_change', 'timeline_change', 'quality_concern') THEN
    INSERT INTO public.vehicle_timeline_events (
      vehicle_id,
      dealer_id,
      event_type,
      event_title,
      event_description,
      event_color,
      user_triggered,
      user_id
    ) VALUES (
      NEW.vehicle_id,
      NEW.dealer_id,
      CASE NEW.note_type
        WHEN 'cost_change' THEN 'cost_change'::timeline_event_type
        WHEN 'timeline_change' THEN 'delay'::timeline_event_type
        ELSE 'inspection'::timeline_event_type
      END,
      CASE NEW.note_type
        WHEN 'issue' THEN 'Issue Reported'
        WHEN 'decision' THEN 'Decision Made'
        WHEN 'cost_change' THEN 'Cost Changed'
        WHEN 'timeline_change' THEN 'Timeline Updated'
        WHEN 'quality_concern' THEN 'Quality Concern'
        ELSE 'Note Added'
      END,
      LEFT(NEW.content, 200),
      CASE NEW.note_type
        WHEN 'issue' THEN 'red'
        WHEN 'decision' THEN 'green'
        WHEN 'cost_change' THEN 'amber'
        WHEN 'timeline_change' THEN 'orange'
        WHEN 'quality_concern' THEN 'red'
        ELSE 'gray'
      END,
      true,
      NEW.author_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for important notes
CREATE TRIGGER trigger_note_timeline
  AFTER INSERT ON public.vehicle_notes
  FOR EACH ROW
  WHEN (NOT NEW.is_system_generated)
  EXECUTE FUNCTION public.create_note_timeline_event();

-- =====================================================
-- 8. INITIAL ARRIVAL TIMELINE EVENT
-- Create arrival event for existing vehicles
-- =====================================================
INSERT INTO public.vehicle_timeline_events (
  vehicle_id,
  dealer_id,
  event_type,
  event_title,
  event_description,
  event_color,
  timestamp
)
SELECT
  id,
  dealer_id,
  'arrival'::timeline_event_type,
  'Vehicle Received',
  'Vehicle added to reconditioning workflow',
  'blue',
  intake_date
FROM public.get_ready_vehicles
WHERE NOT EXISTS (
  SELECT 1 FROM public.vehicle_timeline_events
  WHERE vehicle_id = get_ready_vehicles.id
  AND event_type = 'arrival'
);