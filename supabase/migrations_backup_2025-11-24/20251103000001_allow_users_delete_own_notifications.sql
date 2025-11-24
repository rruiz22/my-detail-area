-- Migration: Allow users to delete their own notifications
-- Created: 2025-11-03
-- Purpose: Add RLS policy to allow authenticated users to delete their own notifications

-- Add policy to allow users to delete their own notifications
CREATE POLICY "notif_log_users_delete_own"
    ON public.notification_log
    FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- Add comment for documentation
COMMENT ON POLICY "notif_log_users_delete_own" ON public.notification_log IS
    'Allow authenticated users to delete their own notifications';

-- Grant delete permission to authenticated role (if not already granted)
GRANT DELETE ON public.notification_log TO authenticated;

-- Test the policy (optional - can be removed in production)
DO $$
BEGIN
    RAISE NOTICE '✅ RLS Policy created: Users can now delete their own notifications';
    RAISE NOTICE '   - Policy: notif_log_users_delete_own';
    RAISE NOTICE '   - Scope: User can delete WHERE user_id = auth.uid()';
END $$;
