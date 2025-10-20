# 🔄 Soft Delete Implementation - Setup Instructions

## ⚠️ IMPORTANT: Manual Migration Required

The Supabase MCP doesn't support DDL operations (ALTER TABLE). You need to apply the migration manually.

## 📋 Step-by-Step Instructions

### Step 1: Open Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project: **swfnnrpzpkdypbrzmgnr**
3. Navigate to **SQL Editor** (left sidebar)
4. Click **New query**

### Step 2: Execute Migration SQL

Copy and paste the entire SQL from:
```
apps/mydetailarea/supabase/migrations/20251020160035_add_soft_delete_to_vehicles.sql
```

Or copy this directly:

```sql
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
```

### Step 3: Run the Query

1. Click **Run** button (or press Ctrl+Enter)
2. Wait for success message
3. Verify no errors

### Step 4: Verify Migration

Run this query to verify:
```sql
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'get_ready_vehicles'
AND column_name IN ('deleted_at', 'deleted_by');
```

Expected result:
```
column_name | data_type                   | is_nullable
deleted_at  | timestamp with time zone    | YES
deleted_by  | uuid                        | YES
```

### Step 5: Test Functions

```sql
-- Test soft delete function exists
SELECT proname, pronargs
FROM pg_proc
WHERE proname IN ('soft_delete_vehicle', 'restore_vehicle');
```

Expected: 2 rows returned

---

## 🎯 Next Steps (After Migration Applied)

Once you confirm the migration is applied successfully, I will:

1. ✅ Update `useVehicleManagement` hook to use `soft_delete_vehicle()`
2. ✅ Add filter `WHERE deleted_at IS NULL` to all vehicle queries
3. ✅ Create "Deleted Vehicles" view in UI
4. ✅ Add "Restore" button functionality
5. ✅ Update RLS policies if needed
6. ✅ Test complete flow

---

## 🔄 Rollback Plan (If Needed)

If something goes wrong:
```sql
-- Remove columns (WARNING: This will lose soft-delete data)
ALTER TABLE get_ready_vehicles DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE get_ready_vehicles DROP COLUMN IF EXISTS deleted_by;

-- Drop functions
DROP FUNCTION IF EXISTS soft_delete_vehicle;
DROP FUNCTION IF EXISTS restore_vehicle;

-- Drop views
DROP VIEW IF EXISTS active_get_ready_vehicles;
DROP VIEW IF EXISTS deleted_get_ready_vehicles;
```

---

**Ready to proceed?** Let me know when you've applied the migration successfully!
