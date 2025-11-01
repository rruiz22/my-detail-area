-- Migration: Create user_custom_role_assignments table
-- Purpose: Link users to dealer_custom_roles for granular permission system
-- Author: Claude Code
-- Date: 2025-09-26
-- Risk Level: LOW (additive only, no data modification)

-- Create the assignment table
CREATE TABLE IF NOT EXISTS user_custom_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dealer_id bigint NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  custom_role_id uuid NOT NULL REFERENCES dealer_custom_roles(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES profiles(id),
  assigned_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Prevent duplicate assignments
  UNIQUE(user_id, dealer_id, custom_role_id)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_user_custom_role_active
  ON user_custom_role_assignments(user_id, is_active)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_custom_role_dealer
  ON user_custom_role_assignments(dealer_id, custom_role_id)
  WHERE is_active = true;

-- RLS policies (match dealership isolation pattern)
ALTER TABLE user_custom_role_assignments ENABLE ROW LEVEL SECURITY;

-- System admins can see all assignments
CREATE POLICY system_admin_all_access ON user_custom_role_assignments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'system_admin'
    )
  );

-- Users can see their own assignments
CREATE POLICY users_own_assignments ON user_custom_role_assignments
  FOR SELECT
  USING (user_id = auth.uid());

-- Dealer admins can manage assignments for their dealership
CREATE POLICY dealer_manage_assignments ON user_custom_role_assignments
  FOR ALL
  USING (
    dealer_id IN (
      SELECT dealership_id
      FROM profiles
      WHERE id = auth.uid()
    )
  );

-- Add helpful comment
COMMENT ON TABLE user_custom_role_assignments IS
  'Links users to custom roles within dealerships for granular permission control. Part of custom roles system migration.';