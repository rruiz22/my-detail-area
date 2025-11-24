-- =====================================================
-- Add role column to dealer_memberships
-- =====================================================
-- Description: Adds role column to dealer_memberships for direct role assignment
-- Author: Claude Code
-- Date: 2025-10-04
-- Issue: Invitation acceptance fails because accept_dealer_invitation tries to insert
--        into non-existent 'role' column
-- =====================================================

-- Add role column to dealer_memberships
ALTER TABLE dealer_memberships
ADD COLUMN IF NOT EXISTS role TEXT;

-- Add comment for documentation
COMMENT ON COLUMN dealer_memberships.role IS
'Direct role assignment for this membership. Used for quick role checks without joining through groups.';

-- Create index for performance on role-based queries
CREATE INDEX IF NOT EXISTS idx_dealer_memberships_dealer_role
ON dealer_memberships(dealer_id, role);

-- Populate role column for existing memberships based on their primary group
-- This ensures backward compatibility for existing data
UPDATE dealer_memberships dm
SET role = (
  SELECT dg.name
  FROM dealer_membership_groups dmg
  JOIN dealer_groups dg ON dg.id = dmg.group_id
  WHERE dmg.membership_id = dm.id
  ORDER BY dmg.assigned_at ASC
  LIMIT 1
)
WHERE dm.role IS NULL
AND EXISTS (
  SELECT 1
  FROM dealer_membership_groups dmg
  WHERE dmg.membership_id = dm.id
);

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Successfully added role column to dealer_memberships table';
  RAISE NOTICE 'Updated % existing memberships with role data',
    (SELECT COUNT(*) FROM dealer_memberships WHERE role IS NOT NULL);
END $$;
