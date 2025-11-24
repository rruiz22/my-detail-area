-- Remove unused security definer function that's causing linter warning
-- This function was created as a placeholder but is not being used
DROP FUNCTION IF EXISTS public.is_system_admin(uuid);

-- Remove any references or comments about the dropped function
COMMENT ON TABLE public.detail_users IS 'SECURITY HARDENED: RLS policies restrict access to own data only. Password hashes and personal data are now protected from unauthorized access.';