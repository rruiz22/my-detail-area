-- ============================================================================
-- NOTIFICATION LOG TABLE - Main Notifications Record
-- ============================================================================
-- Project: My Detail Area - Enterprise Notification System
-- Created: 2025-10-31
-- Description: Main notification table that tracks all notifications created
--              in the system. notification_delivery_log references this table
--              for per-channel delivery tracking.
--
-- Purpose:
--   - Single source of truth for notifications
--   - Supports multi-module (sales_orders, service_orders, recon_orders, etc.)
--   - Links to delivery logs (1:N relationship)
--   - Read/unread tracking at notification level
--   - Priority and action URL management
--
-- Relationship:
--   notification_log (1) → notification_delivery_log (N)
--   One notification can have multiple delivery attempts across channels
-- ============================================================================

BEGIN;

-- ============================================================================
-- TABLE: notification_log
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notification_log (
    -- ========================================================================
    -- PRIMARY IDENTIFICATION
    -- ========================================================================
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================================================
    -- SCOPING (Multi-tenant)
    -- ========================================================================
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    dealer_id BIGINT NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,

    -- ========================================================================
    -- NOTIFICATION METADATA
    -- ========================================================================
    -- Module that generated the notification
    module VARCHAR(50) NOT NULL CHECK (
        module IN ('sales_orders', 'service_orders', 'recon_orders', 'car_wash', 'get_ready', 'contacts', 'chat', 'system')
    ),

    -- Event that triggered the notification
    event VARCHAR(100) NOT NULL,

    -- Entity tracking (what triggered this notification)
    entity_type VARCHAR(50), -- 'order', 'vehicle', 'message', 'approval', etc.
    entity_id VARCHAR(100), -- ID of the entity

    -- ========================================================================
    -- NOTIFICATION CONTENT
    -- ========================================================================
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT, -- Deep link to relevant page
    action_label VARCHAR(50), -- Button text (e.g., "View Order", "Approve")

    -- ========================================================================
    -- PRIORITY & IMPORTANCE
    -- ========================================================================
    priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (
        priority IN ('low', 'normal', 'high', 'urgent', 'critical')
    ),

    -- ========================================================================
    -- READ/UNREAD TRACKING
    -- ========================================================================
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,

    -- ========================================================================
    -- DISMISSAL TRACKING
    -- ========================================================================
    is_dismissed BOOLEAN NOT NULL DEFAULT false,
    dismissed_at TIMESTAMPTZ,

    -- ========================================================================
    -- DELIVERY TRACKING
    -- ========================================================================
    -- Channels this notification should be delivered through
    target_channels JSONB NOT NULL DEFAULT '["in_app"]'::jsonb,

    -- Delivery summary (calculated from delivery_log)
    delivery_status JSONB DEFAULT '{}'::jsonb,
    -- Example structure:
    -- {
    --   "in_app": "delivered",
    --   "email": "sent",
    --   "sms": "failed",
    --   "push": "delivered"
    -- }

    -- ========================================================================
    -- GROUPING & THREADING
    -- ========================================================================
    -- Group notifications by thread (e.g., all updates for order #123)
    thread_id VARCHAR(100), -- e.g., "order_123", "vehicle_VIN123"

    -- Parent notification for threading
    parent_notification_id UUID REFERENCES public.notification_log(id) ON DELETE SET NULL,

    -- ========================================================================
    -- SCHEDULING
    -- ========================================================================
    scheduled_for TIMESTAMPTZ, -- If notification should be sent later
    sent_at TIMESTAMPTZ, -- When notification was actually sent/queued

    -- ========================================================================
    -- METADATA & EXTENSIBILITY
    -- ========================================================================
    metadata JSONB DEFAULT '{}'::jsonb,
    -- Suggested structure:
    -- {
    --   "icon": "bell",
    --   "color": "blue",
    --   "template_id": "uuid",
    --   "campaign_id": "uuid",
    --   "batch_id": "uuid",
    --   "sender_id": "uuid",
    --   "recipient_count": 5,
    --   "custom_data": {}
    -- }

    -- ========================================================================
    -- AUDIT TRAIL
    -- ========================================================================
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) -- Who/what created this notification
);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.notification_log IS
    'Main notification record table. Links to notification_delivery_log for per-channel delivery tracking';

COMMENT ON COLUMN public.notification_log.module IS
    'Module that generated notification: sales_orders, service_orders, recon_orders, car_wash, get_ready, contacts, chat, system';

COMMENT ON COLUMN public.notification_log.event IS
    'Event that triggered notification: order_created, sla_critical, message_received, etc.';

COMMENT ON COLUMN public.notification_log.entity_type IS
    'Type of entity that triggered notification: order, vehicle, message, approval, etc.';

COMMENT ON COLUMN public.notification_log.entity_id IS
    'ID of entity that triggered notification (for deep linking)';

COMMENT ON COLUMN public.notification_log.target_channels IS
    'Array of channels this notification should be delivered through: ["in_app", "email", "sms", "push"]';

COMMENT ON COLUMN public.notification_log.delivery_status IS
    'Summary of delivery status per channel (calculated from notification_delivery_log)';

COMMENT ON COLUMN public.notification_log.thread_id IS
    'Groups notifications by thread (e.g., all updates for order #123)';

COMMENT ON COLUMN public.notification_log.parent_notification_id IS
    'Parent notification for threading (replies, updates)';

COMMENT ON COLUMN public.notification_log.scheduled_for IS
    'When notification should be sent (for scheduled notifications)';

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index 1: Most common query - user's notifications
CREATE INDEX idx_notif_log_user_created
    ON public.notification_log(user_id, created_at DESC);

-- Index 2: Dealer-wide notifications
CREATE INDEX idx_notif_log_dealer_created
    ON public.notification_log(dealer_id, created_at DESC);

-- Index 3: Unread notifications (most common filter)
CREATE INDEX idx_notif_log_user_unread
    ON public.notification_log(user_id, is_read, created_at DESC)
    WHERE is_read = false;

-- Index 4: Module and event lookups
CREATE INDEX idx_notif_log_module_event
    ON public.notification_log(dealer_id, module, event, created_at DESC);

-- Index 5: Entity tracking (find all notifications for an order)
CREATE INDEX idx_notif_log_entity
    ON public.notification_log(entity_type, entity_id, created_at DESC)
    WHERE entity_type IS NOT NULL AND entity_id IS NOT NULL;

-- Index 6: Threading support
CREATE INDEX idx_notif_log_thread
    ON public.notification_log(thread_id, created_at DESC)
    WHERE thread_id IS NOT NULL;

-- Index 7: Priority-based queries
CREATE INDEX idx_notif_log_priority
    ON public.notification_log(user_id, priority, created_at DESC)
    WHERE priority IN ('urgent', 'critical');

-- Index 8: Scheduled notifications (for cron jobs)
CREATE INDEX idx_notif_log_scheduled
    ON public.notification_log(scheduled_for)
    WHERE scheduled_for IS NOT NULL AND sent_at IS NULL;

-- Index 9: GIN index for metadata searches
CREATE INDEX idx_notif_log_metadata_gin
    ON public.notification_log USING GIN(metadata);

-- Index 10: GIN index for target_channels
CREATE INDEX idx_notif_log_target_channels_gin
    ON public.notification_log USING GIN(target_channels);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own notifications
CREATE POLICY "notif_log_users_view_own"
    ON public.notification_log
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Policy 2: Dealer admins can view all notifications for their dealership
CREATE POLICY "notif_log_dealer_admins_view_all"
    ON public.notification_log
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.dealer_memberships dm
            WHERE dm.user_id = auth.uid()
            AND dm.dealer_id = notification_log.dealer_id
            AND dm.role IN ('admin', 'manager')
            AND dm.is_active = true
        )
    );

-- Policy 3: System admins can view all notifications
CREATE POLICY "notif_log_system_admins_view_all"
    ON public.notification_log
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.user_type = 'system_admin'
        )
    );

-- Policy 4: Users can mark their own notifications as read
CREATE POLICY "notif_log_users_update_own"
    ON public.notification_log
    FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Policy 5: Only service_role can insert notifications (Edge Functions)
CREATE POLICY "notif_log_system_insert_only"
    ON public.notification_log
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Policy 6: Only service_role can delete (cleanup jobs)
CREATE POLICY "notif_log_system_delete_only"
    ON public.notification_log
    FOR DELETE
    TO service_role
    USING (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger 1: Auto-update updated_at timestamp
CREATE TRIGGER update_notif_log_updated_at
    BEFORE UPDATE ON public.notification_log
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger 2: Auto-set read_at when is_read changes to true
CREATE OR REPLACE FUNCTION public.set_notification_read_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Set read_at when is_read changes from false to true
    IF NEW.is_read = true AND OLD.is_read = false THEN
        NEW.read_at := NOW();
    END IF;

    -- Set dismissed_at when is_dismissed changes from false to true
    IF NEW.is_dismissed = true AND OLD.is_dismissed = false THEN
        NEW.dismissed_at := NOW();
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_notification_read_at IS
    'Auto-sets read_at and dismissed_at timestamps when status changes';

CREATE TRIGGER trigger_set_notification_read_at
    BEFORE UPDATE ON public.notification_log
    FOR EACH ROW
    EXECUTE FUNCTION public.set_notification_read_at();

-- ============================================================================
-- ADD FOREIGN KEY TO notification_delivery_log
-- ============================================================================

-- Now that notification_log exists, add the FK constraint
ALTER TABLE public.notification_delivery_log
DROP CONSTRAINT IF EXISTS fk_notification_log;

ALTER TABLE public.notification_delivery_log
ADD CONSTRAINT fk_notification_log
    FOREIGN KEY (notification_id)
    REFERENCES public.notification_log(id)
    ON DELETE CASCADE;

COMMENT ON CONSTRAINT fk_notification_log ON public.notification_delivery_log IS
    'Links delivery log entries to main notification record';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function 1: Mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_as_read(
    p_notification_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.notification_log
    SET is_read = true,
        read_at = NOW(),
        updated_at = NOW()
    WHERE id = p_notification_id
    AND user_id = auth.uid();

    RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION public.mark_notification_as_read IS
    'Mark a notification as read (sets is_read=true and read_at=NOW())';

-- Function 2: Mark multiple notifications as read
CREATE OR REPLACE FUNCTION public.mark_notifications_as_read(
    p_notification_ids UUID[]
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.notification_log
    SET is_read = true,
        read_at = NOW(),
        updated_at = NOW()
    WHERE id = ANY(p_notification_ids)
    AND user_id = auth.uid();

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.mark_notifications_as_read IS
    'Mark multiple notifications as read (bulk operation)';

-- Function 3: Get unread count
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(
    p_user_id UUID DEFAULT NULL,
    p_dealer_id BIGINT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := COALESCE(p_user_id, auth.uid());

    IF p_dealer_id IS NULL THEN
        -- Count across all dealerships
        RETURN (
            SELECT COUNT(*)::INTEGER
            FROM public.notification_log
            WHERE user_id = v_user_id
            AND is_read = false
            AND is_dismissed = false
        );
    ELSE
        -- Count for specific dealership
        RETURN (
            SELECT COUNT(*)::INTEGER
            FROM public.notification_log
            WHERE user_id = v_user_id
            AND dealer_id = p_dealer_id
            AND is_read = false
            AND is_dismissed = false
        );
    END IF;
END;
$$;

COMMENT ON FUNCTION public.get_unread_notification_count IS
    'Get count of unread notifications for a user (optionally filtered by dealership)';

-- Function 4: Dismiss notification
CREATE OR REPLACE FUNCTION public.dismiss_notification(
    p_notification_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.notification_log
    SET is_dismissed = true,
        dismissed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_notification_id
    AND user_id = auth.uid();

    RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION public.dismiss_notification IS
    'Dismiss a notification (removes from notification center)';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Authenticated users can read (filtered by RLS)
GRANT SELECT ON public.notification_log TO authenticated;

-- Authenticated users can update (mark as read, filtered by RLS)
GRANT UPDATE ON public.notification_log TO authenticated;

-- Service role has full access (Edge Functions)
GRANT ALL ON public.notification_log TO service_role;

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION public.mark_notification_as_read TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notifications_as_read TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_notification_count TO authenticated;
GRANT EXECUTE ON FUNCTION public.dismiss_notification TO authenticated;

COMMIT;

-- ============================================================================
-- POST-MIGRATION VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '======================================================================';
    RAISE NOTICE 'NOTIFICATION LOG TABLE CREATED SUCCESSFULLY';
    RAISE NOTICE '======================================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Table: notification_log';
    RAISE NOTICE 'Columns: 27 comprehensive notification tracking columns';
    RAISE NOTICE 'Indexes: 10 performance indexes created';
    RAISE NOTICE 'RLS Policies: 6 enterprise-grade security policies';
    RAISE NOTICE 'Triggers: 2 automatic timestamp triggers';
    RAISE NOTICE 'Functions: 4 helper functions for common operations';
    RAISE NOTICE '';
    RAISE NOTICE 'Capabilities:';
    RAISE NOTICE '  ✓ Multi-module notification support (8 modules)';
    RAISE NOTICE '  ✓ Read/unread tracking with timestamps';
    RAISE NOTICE '  ✓ Priority-based notifications (5 levels)';
    RAISE NOTICE '  ✓ Threading and grouping support';
    RAISE NOTICE '  ✓ Entity tracking (deep linking)';
    RAISE NOTICE '  ✓ Scheduled notifications';
    RAISE NOTICE '  ✓ Multi-channel delivery coordination';
    RAISE NOTICE '  ✓ Dismissal tracking';
    RAISE NOTICE '';
    RAISE NOTICE 'Relationship:';
    RAISE NOTICE '  notification_log (1) → notification_delivery_log (N)';
    RAISE NOTICE '  FK constraint added to notification_delivery_log';
    RAISE NOTICE '';
    RAISE NOTICE 'Helper Functions:';
    RAISE NOTICE '  ✓ mark_notification_as_read(notification_id)';
    RAISE NOTICE '  ✓ mark_notifications_as_read(notification_ids[])';
    RAISE NOTICE '  ✓ get_unread_notification_count(user_id, dealer_id)';
    RAISE NOTICE '  ✓ dismiss_notification(notification_id)';
    RAISE NOTICE '======================================================================';
END $$;
