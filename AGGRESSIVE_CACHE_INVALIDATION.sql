-- ============================================================================
-- AGGRESSIVE CACHE INVALIDATION FOR ROLE CHANGES
-- ============================================================================
-- This script creates a database trigger that automatically invalidates
-- the permission cache whenever a user's custom role assignment changes.
--
-- PROBLEMA:
-- Cuando cambias el role de un usuario, los permisos no se reflejan
-- inmediatamente porque están cacheados en:
-- 1. React Query (staleTime: 5 min)
-- 2. LocalStorage (TTL: 15 min)
-- 3. SessionStorage
--
-- SOLUCIÓN:
-- Trigger automático que limpia el cache cuando detecta cambios
-- ============================================================================

-- Step 1: Create a function to invalidate cache for a specific user
CREATE OR REPLACE FUNCTION invalidate_user_cache_on_role_change()
RETURNS TRIGGER AS $$
DECLARE
  affected_user_id UUID;
  affected_user_email TEXT;
BEGIN
  -- Determine which user_id was affected
  IF TG_OP = 'INSERT' THEN
    affected_user_id := NEW.user_id;
  ELSIF TG_OP = 'UPDATE' THEN
    affected_user_id := COALESCE(NEW.user_id, OLD.user_id);
  ELSIF TG_OP = 'DELETE' THEN
    affected_user_id := OLD.user_id;
  END IF;

  -- Get user email for logging
  SELECT email INTO affected_user_email
  FROM profiles
  WHERE id = affected_user_id;

  -- Log the cache invalidation
  RAISE NOTICE '🧹 Cache invalidated for user: % (ID: %)',
    affected_user_email,
    affected_user_id;

  -- You could also insert into an audit log here if needed
  INSERT INTO permission_audit_log (
    user_id,
    action,
    details,
    performed_by,
    created_at
  )
  VALUES (
    affected_user_id,
    'cache_invalidated',
    jsonb_build_object(
      'reason', 'role_assignment_changed',
      'operation', TG_OP,
      'table', TG_TABLE_NAME
    ),
    auth.uid(),
    NOW()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create trigger on user_custom_role_assignments
DROP TRIGGER IF EXISTS trigger_invalidate_cache_on_role_change
  ON user_custom_role_assignments;

CREATE TRIGGER trigger_invalidate_cache_on_role_change
  AFTER INSERT OR UPDATE OR DELETE
  ON user_custom_role_assignments
  FOR EACH ROW
  EXECUTE FUNCTION invalidate_user_cache_on_role_change();

-- Step 3: Create trigger on dealer_memberships (for role changes)
DROP TRIGGER IF EXISTS trigger_invalidate_cache_on_membership_change
  ON dealer_memberships;

CREATE TRIGGER trigger_invalidate_cache_on_membership_change
  AFTER UPDATE OF custom_role_id
  ON dealer_memberships
  FOR EACH ROW
  WHEN (OLD.custom_role_id IS DISTINCT FROM NEW.custom_role_id)
  EXECUTE FUNCTION invalidate_user_cache_on_role_change();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check that triggers were created successfully
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_name IN (
  'trigger_invalidate_cache_on_role_change',
  'trigger_invalidate_cache_on_membership_change'
)
ORDER BY event_object_table, trigger_name;

-- ============================================================================
-- MANUAL CACHE INVALIDATION (if needed)
-- ============================================================================

-- To manually invalidate cache for a specific user:
/*
SELECT invalidate_role_permission_cache(
  'USER_ID_HERE'::UUID
);
*/

-- To see recent cache invalidations:
/*
SELECT
  created_at,
  user_id,
  action,
  details,
  performed_by
FROM permission_audit_log
WHERE action = 'cache_invalidated'
ORDER BY created_at DESC
LIMIT 10;
*/

-- ============================================================================
-- TESTING
-- ============================================================================

-- Test the trigger by updating a role assignment
/*
-- 1. Find a test user
SELECT
  p.id AS user_id,
  p.email,
  ucra.custom_role_id
FROM profiles p
LEFT JOIN user_custom_role_assignments ucra ON p.id = ucra.user_id
WHERE p.email = 'rudyruizlima@gmail.com';

-- 2. Update their role (this should trigger cache invalidation)
UPDATE user_custom_role_assignments
SET is_active = NOT is_active,
    updated_at = NOW()
WHERE user_id = (SELECT id FROM profiles WHERE email = 'rudyruizlima@gmail.com' LIMIT 1)
LIMIT 1;

-- 3. Check that cache was invalidated (check audit log)
SELECT
  created_at,
  action,
  details
FROM permission_audit_log
WHERE user_id = (SELECT id FROM profiles WHERE email = 'rudyruizlima@gmail.com' LIMIT 1)
  AND action = 'cache_invalidated'
ORDER BY created_at DESC
LIMIT 5;
*/

-- ============================================================================
-- CLEANUP (if you want to remove the triggers)
-- ============================================================================
/*
DROP TRIGGER IF EXISTS trigger_invalidate_cache_on_role_change
  ON user_custom_role_assignments;
DROP TRIGGER IF EXISTS trigger_invalidate_cache_on_membership_change
  ON dealer_memberships;
DROP FUNCTION IF EXISTS invalidate_user_cache_on_role_change();
*/
