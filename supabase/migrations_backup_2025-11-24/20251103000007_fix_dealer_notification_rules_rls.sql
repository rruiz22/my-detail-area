-- ============================================================================
-- FIX DEALER NOTIFICATION RULES RLS POLICIES
-- ============================================================================
-- Allow system admins to manage notification rules
-- ============================================================================

BEGIN;

-- Drop existing policies
DROP POLICY IF EXISTS "Dealer admins can create notification rules" ON public.dealer_notification_rules;
DROP POLICY IF EXISTS "Dealer admins can update notification rules" ON public.dealer_notification_rules;
DROP POLICY IF EXISTS "Dealer admins can delete notification rules" ON public.dealer_notification_rules;

-- Policy 2: Dealer admins AND system admins can create rules
CREATE POLICY "Dealer admins and system admins can create notification rules"
    ON public.dealer_notification_rules
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- System admins can create rules for any dealer
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.user_type = 'system_admin'
        )
        OR
        -- Dealer admins can create rules for their dealership
        EXISTS (
            SELECT 1 FROM public.dealer_memberships dm
            WHERE dm.user_id = auth.uid()
            AND dm.dealer_id = dealer_notification_rules.dealer_id
            AND dm.role = 'admin'
            AND dm.is_active = true
        )
    );

-- Policy 3: Dealer admins AND system admins can update rules
CREATE POLICY "Dealer admins and system admins can update notification rules"
    ON public.dealer_notification_rules
    FOR UPDATE
    TO authenticated
    USING (
        -- System admins can update any rule
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.user_type = 'system_admin'
        )
        OR
        -- Dealer admins can update rules for their dealership
        EXISTS (
            SELECT 1 FROM public.dealer_memberships dm
            WHERE dm.user_id = auth.uid()
            AND dm.dealer_id = dealer_notification_rules.dealer_id
            AND dm.role = 'admin'
            AND dm.is_active = true
        )
    );

-- Policy 4: Dealer admins and system admins can delete rules (no change needed, already allows system admins)
CREATE POLICY "Dealer admins and system admins can delete notification rules"
    ON public.dealer_notification_rules
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.dealer_memberships dm
            WHERE dm.user_id = auth.uid()
            AND dm.dealer_id = dealer_notification_rules.dealer_id
            AND dm.role = 'admin'
            AND dm.is_active = true
        )
        OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.user_type = 'system_admin'
        )
    );

COMMIT;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '======================================================================';
    RAISE NOTICE 'DEALER NOTIFICATION RULES RLS POLICIES UPDATED';
    RAISE NOTICE '======================================================================';
    RAISE NOTICE 'Changes:';
    RAISE NOTICE '  ✓ System admins can now create notification rules';
    RAISE NOTICE '  ✓ System admins can now update notification rules';
    RAISE NOTICE '  ✓ System admins can now delete notification rules';
    RAISE NOTICE '  ✓ Dealer admins retain all previous permissions';
    RAISE NOTICE '======================================================================';
END $$;
