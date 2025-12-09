-- Auto-assign dealer membership role based on profile's global_role
-- This ensures future dealer memberships inherit the correct role automatically

-- Function to auto-assign role from profile
CREATE OR REPLACE FUNCTION auto_assign_dealer_membership_role()
RETURNS TRIGGER AS $$
BEGIN
  -- If role is not provided (NULL), inherit from profile's global_role
  IF NEW.role IS NULL THEN
    NEW.role := (
      SELECT global_role
      FROM profiles
      WHERE id = NEW.user_id
      LIMIT 1
    );

    -- If global_role is also NULL, default to 'dealer_user'
    IF NEW.role IS NULL THEN
      NEW.role := 'dealer_user';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires BEFORE INSERT
DROP TRIGGER IF EXISTS auto_assign_role_trigger ON dealer_memberships;
CREATE TRIGGER auto_assign_role_trigger
  BEFORE INSERT ON dealer_memberships
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_dealer_membership_role();

-- Add comment for documentation
COMMENT ON FUNCTION auto_assign_dealer_membership_role() IS
  'Automatically assigns dealer membership role from profiles.global_role when role is NULL. Falls back to dealer_user if global_role is also NULL.';
