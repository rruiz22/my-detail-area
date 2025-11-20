/**
 * Add Face Recognition Support to Detail Hub Employees
 *
 * This migration adds columns for storing facial recognition data:
 * - face_descriptor: 128-dimensional vector from face-api.js
 * - face_enrolled_at: Timestamp when face was enrolled
 * - face_enrollment_photo_url: Reference photo used for enrollment
 *
 * Privacy considerations:
 * - Face descriptors are numerical vectors, not photos
 * - All processing happens client-side
 * - Employees can opt-in voluntarily
 * - Data can be deleted at any time
 */

-- Add face recognition columns to detail_hub_employees
ALTER TABLE detail_hub_employees
  ADD COLUMN IF NOT EXISTS face_descriptor FLOAT8[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS face_enrolled_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS face_enrollment_photo_url TEXT DEFAULT NULL;

-- Add index for employees with enrolled faces (speeds up 1:N matching)
CREATE INDEX IF NOT EXISTS idx_employees_face_enrolled
  ON detail_hub_employees(dealership_id, id)
  WHERE face_descriptor IS NOT NULL;

-- Add index for fast lookup by enrollment status
CREATE INDEX IF NOT EXISTS idx_employees_face_status
  ON detail_hub_employees(dealership_id, status)
  WHERE face_descriptor IS NOT NULL AND status = 'active';

-- Add comments for documentation
COMMENT ON COLUMN detail_hub_employees.face_descriptor IS
  'Face descriptor (128D vector from face-api.js) for facial recognition. Array of 128 float values.';

COMMENT ON COLUMN detail_hub_employees.face_enrolled_at IS
  'Timestamp when employee face was enrolled for facial recognition';

COMMENT ON COLUMN detail_hub_employees.face_enrollment_photo_url IS
  'URL of photo used for face enrollment (stored in Supabase Storage for reference)';

-- Function to validate face descriptor length (must be exactly 128 values)
CREATE OR REPLACE FUNCTION validate_face_descriptor()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.face_descriptor IS NOT NULL THEN
    -- Check array length is exactly 128
    IF array_length(NEW.face_descriptor, 1) != 128 THEN
      RAISE EXCEPTION 'Face descriptor must have exactly 128 dimensions, got %',
        array_length(NEW.face_descriptor, 1);
    END IF;

    -- Auto-set enrollment timestamp if not provided
    IF NEW.face_enrolled_at IS NULL THEN
      NEW.face_enrolled_at := NOW();
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to validate face descriptor on insert/update
DROP TRIGGER IF EXISTS trigger_validate_face_descriptor ON detail_hub_employees;
CREATE TRIGGER trigger_validate_face_descriptor
  BEFORE INSERT OR UPDATE OF face_descriptor ON detail_hub_employees
  FOR EACH ROW
  EXECUTE FUNCTION validate_face_descriptor();

-- Create audit log for face enrollment events
CREATE TABLE IF NOT EXISTS detail_hub_face_enrollment_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES detail_hub_employees(id) ON DELETE CASCADE,
  dealership_id INTEGER NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('enrolled', 'updated', 'deleted')),
  performed_by UUID REFERENCES auth.users(id),
  photo_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for audit log queries
CREATE INDEX IF NOT EXISTS idx_face_enrollment_log_employee
  ON detail_hub_face_enrollment_log(employee_id, created_at DESC);

-- Add RLS policies for face enrollment log
ALTER TABLE detail_hub_face_enrollment_log ENABLE ROW LEVEL SECURITY;

-- Allow dealership members to view their own enrollment logs
CREATE POLICY "Dealership members can view face enrollment logs"
  ON detail_hub_face_enrollment_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dealer_memberships
      WHERE dealer_memberships.user_id = auth.uid()
        AND dealer_memberships.dealership_id = detail_hub_face_enrollment_log.dealership_id
    )
  );

-- Function to log face enrollment events (called from app)
CREATE OR REPLACE FUNCTION log_face_enrollment(
  p_employee_id UUID,
  p_action TEXT,
  p_photo_url TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_dealership_id INTEGER;
  v_log_id UUID;
BEGIN
  -- Get dealership_id from employee
  SELECT dealership_id INTO v_dealership_id
  FROM detail_hub_employees
  WHERE id = p_employee_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employee not found: %', p_employee_id;
  END IF;

  -- Insert audit log
  INSERT INTO detail_hub_face_enrollment_log (
    employee_id,
    dealership_id,
    action,
    performed_by,
    photo_url,
    metadata
  ) VALUES (
    p_employee_id,
    v_dealership_id,
    p_action,
    auth.uid(),
    p_photo_url,
    p_metadata
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on logging function
GRANT EXECUTE ON FUNCTION log_face_enrollment(UUID, TEXT, TEXT, JSONB) TO authenticated;

-- Add comment
COMMENT ON FUNCTION log_face_enrollment IS
  'Logs face enrollment events (enrolled, updated, deleted) for audit trail';

-- View to easily query employees with face recognition enabled
CREATE OR REPLACE VIEW detail_hub_employees_with_faces AS
SELECT
  e.id,
  e.employee_number,
  e.first_name,
  e.last_name,
  e.dealership_id,
  e.face_enrolled_at,
  e.face_enrollment_photo_url,
  e.status,
  d.name as dealership_name,
  -- Include descriptor length for verification
  array_length(e.face_descriptor, 1) as descriptor_length,
  -- Include face enrollment status
  CASE
    WHEN e.face_descriptor IS NOT NULL THEN true
    ELSE false
  END as has_face_enrolled
FROM detail_hub_employees e
JOIN dealerships d ON d.id = e.dealership_id
WHERE e.face_descriptor IS NOT NULL
  AND e.status = 'active';

-- Add RLS to view
ALTER VIEW detail_hub_employees_with_faces SET (security_invoker = true);

-- Grant select on view
GRANT SELECT ON detail_hub_employees_with_faces TO authenticated;

COMMENT ON VIEW detail_hub_employees_with_faces IS
  'View of active employees with face recognition enrolled. Excludes actual face descriptors for privacy.';
