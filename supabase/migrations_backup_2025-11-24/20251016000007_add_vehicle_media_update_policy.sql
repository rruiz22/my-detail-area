-- =====================================================
-- ADD MISSING UPDATE POLICY FOR VEHICLE_MEDIA
-- Date: 2025-10-16
-- Issue: No UPDATE policy exists, blocking all updates
-- =====================================================

-- Create UPDATE policy for vehicle_media
CREATE POLICY "Users can update media for their dealerships"
  ON public.vehicle_media FOR UPDATE
  USING (
    user_has_active_dealer_membership(auth.uid(), dealer_id)
    AND
    user_has_group_permission(auth.uid(), dealer_id, 'get_ready.write')
  )
  WITH CHECK (
    user_has_active_dealer_membership(auth.uid(), dealer_id)
    AND
    user_has_group_permission(auth.uid(), dealer_id, 'get_ready.write')
  );

COMMENT ON POLICY "Users can update media for their dealerships" ON public.vehicle_media IS
  'Allows users to update media metadata (category, annotations, work item link) for their dealerships';
