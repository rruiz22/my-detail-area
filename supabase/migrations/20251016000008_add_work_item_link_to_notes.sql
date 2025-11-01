-- =====================================================
-- ADD WORK ITEM LINK TO VEHICLE NOTES
-- Date: 2025-10-16
-- Allow linking notes to specific work items
-- =====================================================

-- Add linked_work_item_id column to vehicle_notes
ALTER TABLE public.vehicle_notes
  ADD COLUMN IF NOT EXISTS linked_work_item_id UUID REFERENCES public.get_ready_work_items(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_vehicle_notes_linked_work_item
  ON public.vehicle_notes(linked_work_item_id)
  WHERE linked_work_item_id IS NOT NULL;

-- Comment
COMMENT ON COLUMN public.vehicle_notes.linked_work_item_id IS
  'Optional link to specific work item that this note relates to';
