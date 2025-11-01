-- Phase 1: Add Soft Delete Support to get_ready_vehicles
-- CAUTIOUS APPROACH: Add field, functions, and views without breaking existing functionality

-- 1. Add deleted_at column (nullable - existing records will be NULL = not deleted)
ALTER TABLE get_ready_vehicles
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Add index for performance (queries will filter by deleted_at IS NULL)
CREATE INDEX IF NOT EXISTS idx_get_ready_vehicles_deleted_at 
ON get_ready_vehicles(deleted_at) 
WHERE deleted_at IS NULL;

-- 3. Add deleted_by column to track who soft-deleted the vehicle
ALTER TABLE get_ready_vehicles
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) DEFAULT NULL;

-- 4. Create safe soft delete function
CREATE OR REPLACE FUNCTION soft_delete_vehicle(
  p_vehicle_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_vehicle RECORD;
  v_result JSONB;
BEGIN
  -- Check if vehicle exists and is not already deleted
  SELECT * INTO v_vehicle
  FROM get_ready_vehicles
  WHERE id = p_vehicle_id
  AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Vehicle not found or already deleted'
    );
  END IF;

  -- Soft delete the vehicle
  UPDATE get_ready_vehicles
  SET 
    deleted_at = NOW(),
    deleted_by = p_user_id,
    updated_at = NOW()
  WHERE id = p_vehicle_id;

  -- Log the soft delete activity
  INSERT INTO get_ready_vehicle_activity_log (
    vehicle_id, dealer_id, activity_type, action_by, description
  ) VALUES (
    p_vehicle_id, 
    v_vehicle.dealer_id, 
    'vehicle_deleted', 
    p_user_id,
    'Vehicle soft deleted: ' || v_vehicle.stock_number
  );

  RETURN jsonb_build_object(
    'success', true,
    'vehicle_id', p_vehicle_id,
    'stock_number', v_vehicle.stock_number
  );
END;
$$;

-- 5. Create restore function
CREATE OR REPLACE FUNCTION restore_vehicle(
  p_vehicle_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_vehicle RECORD;
BEGIN
  -- Check if vehicle exists and is deleted
  SELECT * INTO v_vehicle
  FROM get_ready_vehicles
  WHERE id = p_vehicle_id
  AND deleted_at IS NOT NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Vehicle not found or not deleted'
    );
  END IF;

  -- Restore the vehicle
  UPDATE get_ready_vehicles
  SET 
    deleted_at = NULL,
    deleted_by = NULL,
    updated_at = NOW()
  WHERE id = p_vehicle_id;

  -- Log the restore activity
  INSERT INTO get_ready_vehicle_activity_log (
    vehicle_id, dealer_id, activity_type, action_by, description
  ) VALUES (
    p_vehicle_id, 
    v_vehicle.dealer_id, 
    'vehicle_restored', 
    p_user_id,
    'Vehicle restored: ' || v_vehicle.stock_number
  );

  RETURN jsonb_build_object(
    'success', true,
    'vehicle_id', p_vehicle_id,
    'stock_number', v_vehicle.stock_number
  );
END;
$$;

-- 6. Create view for active vehicles (backward compatibility)
CREATE OR REPLACE VIEW active_get_ready_vehicles AS
SELECT * FROM get_ready_vehicles
WHERE deleted_at IS NULL;

-- 7. Create view for deleted vehicles (for restore UI)
CREATE OR REPLACE VIEW deleted_get_ready_vehicles AS
SELECT * FROM get_ready_vehicles
WHERE deleted_at IS NOT NULL
ORDER BY deleted_at DESC;

-- 8. Grant permissions
GRANT SELECT ON active_get_ready_vehicles TO authenticated;
GRANT SELECT ON deleted_get_ready_vehicles TO authenticated;

COMMENT ON COLUMN get_ready_vehicles.deleted_at IS 'Soft delete timestamp - NULL means active, timestamp means deleted';
COMMENT ON COLUMN get_ready_vehicles.deleted_by IS 'User who soft-deleted this vehicle';
COMMENT ON FUNCTION soft_delete_vehicle IS 'Safely soft delete a vehicle instead of hard delete';
COMMENT ON FUNCTION restore_vehicle IS 'Restore a soft-deleted vehicle';
