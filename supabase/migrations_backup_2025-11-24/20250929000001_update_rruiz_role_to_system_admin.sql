-- Update rruiz@lima.llc role to system_admin for Get Ready Setup access
UPDATE public.profiles
SET role = 'system_admin'
WHERE email = 'rruiz@lima.llc';

-- Comment documenting this change
COMMENT ON TABLE public.profiles IS 'Updated rruiz@lima.llc role from admin to system_admin for full system access including Get Ready Setup';