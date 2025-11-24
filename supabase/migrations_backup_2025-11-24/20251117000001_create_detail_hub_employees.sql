-- =====================================================
-- DETAIL HUB: EMPLOYEES TABLE
-- =====================================================
-- Purpose: Core employee management for DetailHub module
-- Features: Employee profiles, face recognition enrollment, fallback methods
-- Author: Claude Code
-- Date: 2025-11-17
-- =====================================================

-- Create custom types for DetailHub
CREATE TYPE detail_hub_employee_role AS ENUM (
  'detailer',
  'car_wash',
  'supervisor',
  'manager',
  'technician'
);

CREATE TYPE detail_hub_department AS ENUM (
  'detail',
  'car_wash',
  'service',
  'management'
);

CREATE TYPE detail_hub_employee_status AS ENUM (
  'active',
  'inactive',
  'suspended',
  'terminated'
);

-- =====================================================
-- TABLE: detail_hub_employees
-- =====================================================
CREATE TABLE IF NOT EXISTS detail_hub_employees (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id INTEGER NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  employee_number TEXT NOT NULL,

  -- Personal information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,

  -- Employment details
  role detail_hub_employee_role NOT NULL DEFAULT 'detailer',
  department detail_hub_department NOT NULL DEFAULT 'detail',
  hourly_rate DECIMAL(10,2),
  hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status detail_hub_employee_status NOT NULL DEFAULT 'active',

  -- Face Recognition (AWS Rekognition / Future implementation)
  face_enrolled BOOLEAN NOT NULL DEFAULT false,
  face_collection_id TEXT, -- AWS Rekognition Collection ID
  face_id TEXT, -- AWS Rekognition Face ID
  face_confidence DECIMAL(5,2), -- 0-100 confidence score
  enrolled_at TIMESTAMPTZ,

  -- Fallback authentication methods
  fallback_photo_url TEXT, -- Supabase Storage URL for photo verification
  fallback_photo_enabled BOOLEAN NOT NULL DEFAULT false,
  pin_code TEXT, -- Encrypted PIN for manual punch (4-6 digits)

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_employee_number_per_dealership UNIQUE (dealership_id, employee_number),
  CONSTRAINT valid_email CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_hourly_rate CHECK (hourly_rate IS NULL OR hourly_rate > 0),
  CONSTRAINT valid_face_confidence CHECK (face_confidence IS NULL OR (face_confidence >= 0 AND face_confidence <= 100)),
  CONSTRAINT valid_pin_code CHECK (pin_code IS NULL OR (LENGTH(pin_code) >= 4 AND LENGTH(pin_code) <= 6))
);

-- =====================================================
-- INDEXES for performance optimization
-- =====================================================
CREATE INDEX idx_detail_hub_employees_dealership ON detail_hub_employees(dealership_id);
CREATE INDEX idx_detail_hub_employees_status ON detail_hub_employees(status) WHERE status = 'active';
CREATE INDEX idx_detail_hub_employees_employee_number ON detail_hub_employees(employee_number);
CREATE INDEX idx_detail_hub_employees_face_enrolled ON detail_hub_employees(face_enrolled) WHERE face_enrolled = true;
CREATE INDEX idx_detail_hub_employees_department ON detail_hub_employees(department);

-- =====================================================
-- TRIGGER: Auto-update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_detail_hub_employees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_detail_hub_employees_updated_at
  BEFORE UPDATE ON detail_hub_employees
  FOR EACH ROW
  EXECUTE FUNCTION update_detail_hub_employees_updated_at();

-- =====================================================
-- FUNCTION: Generate next employee number
-- =====================================================
CREATE OR REPLACE FUNCTION generate_employee_number(p_dealership_id INTEGER)
RETURNS TEXT AS $$
DECLARE
  v_max_number INTEGER;
  v_next_number TEXT;
BEGIN
  -- Get the highest employee number for this dealership
  SELECT COALESCE(
    MAX(
      CAST(
        REGEXP_REPLACE(employee_number, '[^0-9]', '', 'g') AS INTEGER
      )
    ),
    0
  )
  INTO v_max_number
  FROM detail_hub_employees
  WHERE dealership_id = p_dealership_id;

  -- Generate next number with EMP prefix and zero padding
  v_next_number := 'EMP' || LPAD((v_max_number + 1)::TEXT, 3, '0');

  RETURN v_next_number;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE detail_hub_employees ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view employees from their dealerships
CREATE POLICY "Users can view employees from their dealerships"
  ON detail_hub_employees
  FOR SELECT
  USING (
    dealership_id IN (
      SELECT dm.dealership_id
      FROM dealer_memberships dm
      WHERE dm.user_id = auth.uid()
    )
  );

-- Policy: Managers and admins can insert employees
CREATE POLICY "Managers can insert employees"
  ON detail_hub_employees
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM dealer_memberships dm
      WHERE dm.user_id = auth.uid()
        AND dm.dealership_id = detail_hub_employees.dealership_id
        AND dm.role IN ('dealer_admin', 'dealer_manager', 'system_admin')
    )
  );

-- Policy: Managers and admins can update employees
CREATE POLICY "Managers can update employees"
  ON detail_hub_employees
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM dealer_memberships dm
      WHERE dm.user_id = auth.uid()
        AND dm.dealership_id = detail_hub_employees.dealership_id
        AND dm.role IN ('dealer_admin', 'dealer_manager', 'system_admin')
    )
  );

-- Policy: Only admins can delete employees
CREATE POLICY "Admins can delete employees"
  ON detail_hub_employees
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM dealer_memberships dm
      WHERE dm.user_id = auth.uid()
        AND dm.dealership_id = detail_hub_employees.dealership_id
        AND dm.role IN ('dealer_admin', 'system_admin')
    )
  );

-- =====================================================
-- COMMENTS for documentation
-- =====================================================
COMMENT ON TABLE detail_hub_employees IS 'DetailHub employee master table with face recognition and fallback authentication';
COMMENT ON COLUMN detail_hub_employees.employee_number IS 'Unique employee identifier per dealership (e.g., EMP001, EMP002)';
COMMENT ON COLUMN detail_hub_employees.face_collection_id IS 'AWS Rekognition Collection ID for face recognition';
COMMENT ON COLUMN detail_hub_employees.face_id IS 'AWS Rekognition Face ID for biometric authentication';
COMMENT ON COLUMN detail_hub_employees.fallback_photo_url IS 'Backup photo URL when face recognition fails (requires manual approval)';
COMMENT ON COLUMN detail_hub_employees.pin_code IS 'Encrypted PIN code for manual time clock punch (4-6 digits)';
