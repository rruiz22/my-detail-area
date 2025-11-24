-- Remove the unnecessary SECURITY DEFINER function that's causing the linter warning
-- This function isn't needed for current functionality

DROP FUNCTION IF EXISTS public.get_user_role_secure(text);

-- Also remove the other SECURITY DEFINER function created earlier if it exists
DROP FUNCTION IF EXISTS public.is_system_admin(uuid);
DROP FUNCTION IF EXISTS public.is_admin(uuid);

-- Document the cleanup
COMMENT ON TABLE public.detail_users IS 'SECURITY HARDENED: Table protected by restrictive RLS policies. Users can only access their own data. All SECURITY DEFINER functions removed to eliminate potential security vectors.';