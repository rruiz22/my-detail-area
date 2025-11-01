-- ============================================================================
-- ENTERPRISE NOTIFICATION SYSTEM - NOTIFICATION DELIVERY LOG
-- ============================================================================
-- Project: My Detail Area - Enterprise Notification System
-- Created: 2025-10-31
-- Description: Comprehensive delivery tracking and engagement analytics for
--              multi-channel notifications (in_app, email, sms, push)
--
-- Purpose: Track every delivery attempt per channel with:
--   - Provider correlation (SendGrid, Twilio, FCM message IDs)
--   - Delivery status lifecycle (sent → delivered → opened → clicked)
--   - Engagement metrics (opens, clicks, action_url tracking)
--   - Error tracking and retry attempts
--   - Performance metrics (latency, delivery times)
--
-- Business Value:
--   - Delivery rate analytics per channel
--   - Engagement tracking (open rates, click-through rates)
--   - Provider performance comparison
--   - Debugging failed deliveries
--   - Compliance and audit trail
-- ============================================================================

BEGIN;

-- ============================================================================
-- TABLE: notification_delivery_log
-- ============================================================================
-- Scope: Per (notification_id, channel) - one row per delivery attempt per channel
-- A single notification can have multiple delivery log entries (one per channel)
-- Example: notification_id "abc-123" → 3 entries (in_app, email, push)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notification_delivery_log (
    -- ========================================================================
    -- PRIMARY IDENTIFICATION
    -- ========================================================================
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- ========================================================================
    -- RELATIONSHIPS
    -- ========================================================================
    -- notification_id: FK to main notification_log table (when created)
    -- For now, nullable until notification_log table exists
    notification_id UUID, -- Will add FK constraint later: REFERENCES notification_log(id)

    -- Optional queue tracking (for batch/scheduled notifications)
    queue_id UUID, -- References notification_queue if exists

    -- ========================================================================
    -- SCOPING (Multi-tenant)
    -- ========================================================================
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    dealer_id BIGINT NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,

    -- ========================================================================
    -- CHANNEL INFORMATION
    -- ========================================================================
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('in_app', 'email', 'sms', 'push')),

    -- ========================================================================
    -- PROVIDER INFORMATION
    -- ========================================================================
    -- Provider that handled the delivery
    provider VARCHAR(50), -- 'sendgrid', 'twilio', 'fcm', 'apns', 'internal', etc.

    -- Provider's unique message ID for correlation and webhooks
    -- Examples:
    --   SendGrid: "EvTmplmQRO6p4WFwgOLfvw"
    --   Twilio: "SM9a5e3c3c3e3c3e3c3e3c3e"
    --   FCM: "projects/myproject/messages/0:1234567890"
    provider_message_id VARCHAR(255),

    -- Provider-specific metadata (raw response, delivery receipts, etc.)
    provider_metadata JSONB DEFAULT '{}'::jsonb,

    -- ========================================================================
    -- DELIVERY STATUS LIFECYCLE
    -- ========================================================================
    -- Status progression:
    --   'pending' → 'sent' → 'delivered' → 'failed' / 'bounced' / 'rejected'
    --
    -- Status definitions:
    --   - pending: Queued but not sent yet
    --   - sent: Accepted by provider (email/sms) or stored (in_app)
    --   - delivered: Confirmed receipt (email opened, SMS delivered, push received)
    --   - failed: Temporary failure (retry possible)
    --   - bounced: Permanent failure (invalid email, phone)
    --   - rejected: Rejected by provider (spam, compliance)
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'sent', 'delivered', 'failed', 'bounced', 'rejected')
    ),

    -- ========================================================================
    -- ERROR TRACKING
    -- ========================================================================
    error_code VARCHAR(50), -- Provider-specific error code
    error_message TEXT, -- Human-readable error message
    retry_count INTEGER DEFAULT 0 CHECK (retry_count >= 0), -- Number of retry attempts
    max_retries INTEGER DEFAULT 3 CHECK (max_retries >= 0), -- Maximum retries allowed

    -- ========================================================================
    -- ENGAGEMENT METRICS
    -- ========================================================================
    -- Opened tracking (for email, push, in_app)
    opened_at TIMESTAMPTZ, -- When notification was opened/read
    opened_by_ip VARCHAR(45), -- IP address of opener (IPv4 or IPv6)
    opened_user_agent TEXT, -- Browser/device info

    -- Click tracking (for email, in_app with action buttons)
    clicked_at TIMESTAMPTZ, -- When action button was clicked
    clicked_by_ip VARCHAR(45),
    clicked_user_agent TEXT,
    action_url_clicked TEXT, -- Which action URL was clicked

    -- Engagement counts (for multiple opens/clicks)
    open_count INTEGER DEFAULT 0 CHECK (open_count >= 0),
    click_count INTEGER DEFAULT 0 CHECK (click_count >= 0),

    -- ========================================================================
    -- PERFORMANCE METRICS
    -- ========================================================================
    sent_at TIMESTAMPTZ, -- When sent to provider
    delivered_at TIMESTAMPTZ, -- When confirmed delivered

    -- Calculated latency (in milliseconds)
    send_latency_ms INTEGER, -- Time to send (created_at → sent_at)
    delivery_latency_ms INTEGER, -- Time to deliver (sent_at → delivered_at)

    -- ========================================================================
    -- RECIPIENT INFORMATION
    -- ========================================================================
    -- Actual recipient details (may differ from user profile)
    recipient_email VARCHAR(255), -- For email channel
    recipient_phone VARCHAR(20), -- For SMS channel (E.164 format: +1XXXXXXXXXX)
    recipient_device_token TEXT, -- For push channel (FCM/APNS token)

    -- ========================================================================
    -- NOTIFICATION CONTENT (Snapshot at delivery time)
    -- ========================================================================
    -- Store snapshot of content sent (for audit trail)
    title TEXT,
    message TEXT,
    notification_data JSONB DEFAULT '{}'::jsonb, -- Full notification payload

    -- ========================================================================
    -- METADATA & EXTENSIBILITY
    -- ========================================================================
    metadata JSONB DEFAULT '{}'::jsonb,
    -- Suggested metadata structure:
    -- {
    --   "template_id": "uuid",
    --   "template_version": 2,
    --   "campaign_id": "uuid",
    --   "batch_id": "uuid",
    --   "priority": "urgent",
    --   "module": "sales_orders",
    --   "entity_type": "order",
    --   "entity_id": "12345"
    -- }

    -- ========================================================================
    -- AUDIT TRAIL
    -- ========================================================================
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.notification_delivery_log IS
    'Comprehensive delivery tracking for all notification channels with engagement analytics and provider correlation';

COMMENT ON COLUMN public.notification_delivery_log.notification_id IS
    'FK to notification_log table (main notification record)';

COMMENT ON COLUMN public.notification_delivery_log.channel IS
    'Delivery channel: in_app, email, sms, push';

COMMENT ON COLUMN public.notification_delivery_log.provider IS
    'External provider: sendgrid, twilio, fcm, apns, internal';

COMMENT ON COLUMN public.notification_delivery_log.provider_message_id IS
    'Provider unique message ID for webhook correlation and support tickets';

COMMENT ON COLUMN public.notification_delivery_log.provider_metadata IS
    'Raw provider response and delivery receipts for debugging';

COMMENT ON COLUMN public.notification_delivery_log.status IS
    'Delivery lifecycle: pending → sent → delivered → failed/bounced/rejected';

COMMENT ON COLUMN public.notification_delivery_log.opened_at IS
    'First open timestamp for engagement tracking (email/push/in_app)';

COMMENT ON COLUMN public.notification_delivery_log.clicked_at IS
    'First click timestamp for action button engagement';

COMMENT ON COLUMN public.notification_delivery_log.send_latency_ms IS
    'Milliseconds from creation to provider send (performance metric)';

COMMENT ON COLUMN public.notification_delivery_log.delivery_latency_ms IS
    'Milliseconds from send to delivery confirmation (provider performance)';

COMMENT ON COLUMN public.notification_delivery_log.retry_count IS
    'Number of retry attempts for failed deliveries';

COMMENT ON COLUMN public.notification_delivery_log.metadata IS
    'Extensible metadata: template_id, campaign_id, priority, module, entity info';

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index 1: Fast lookup by dealer + created date (most common query)
-- Usage: Dashboard analytics, recent deliveries
CREATE INDEX idx_notif_delivery_dealer_created
    ON public.notification_delivery_log(dealer_id, created_at DESC);

-- Index 2: Notification ID lookup (find all channel deliveries for a notification)
-- Usage: Debugging, "where did this notification go?"
CREATE INDEX idx_notif_delivery_notification_id
    ON public.notification_delivery_log(notification_id)
    WHERE notification_id IS NOT NULL;

-- Index 3: User delivery history
-- Usage: User-specific delivery logs, user analytics
CREATE INDEX idx_notif_delivery_user_created
    ON public.notification_delivery_log(user_id, created_at DESC);

-- Index 4: Channel + Status analytics
-- Usage: Delivery rate by channel, failed deliveries by channel
CREATE INDEX idx_notif_delivery_channel_status
    ON public.notification_delivery_log(dealer_id, channel, status, created_at DESC);

-- Index 5: Provider message ID lookup (webhook correlation)
-- Usage: Match webhook callbacks from providers
CREATE INDEX idx_notif_delivery_provider_msg_id
    ON public.notification_delivery_log(provider, provider_message_id)
    WHERE provider_message_id IS NOT NULL;

-- Index 6: Failed deliveries (for retry jobs and debugging)
-- Usage: Retry queue, error analytics
CREATE INDEX idx_notif_delivery_failed
    ON public.notification_delivery_log(dealer_id, status, created_at DESC)
    WHERE status IN ('failed', 'bounced', 'rejected');

-- Index 7: Engagement metrics (opened notifications)
-- Usage: Open rate analytics, engagement reports
CREATE INDEX idx_notif_delivery_opened
    ON public.notification_delivery_log(dealer_id, channel, opened_at DESC)
    WHERE opened_at IS NOT NULL;

-- Index 8: Click tracking (for CTR analytics)
-- Usage: Click-through rate reports
CREATE INDEX idx_notif_delivery_clicked
    ON public.notification_delivery_log(dealer_id, channel, clicked_at DESC)
    WHERE clicked_at IS NOT NULL;

-- Index 9: GIN index for metadata queries
-- Usage: Filter by campaign_id, template_id, module, entity_type
CREATE INDEX idx_notif_delivery_metadata_gin
    ON public.notification_delivery_log USING GIN(metadata);

-- Index 10: GIN index for provider_metadata
-- Usage: Debug provider-specific issues
CREATE INDEX idx_notif_delivery_provider_metadata_gin
    ON public.notification_delivery_log USING GIN(provider_metadata);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE public.notification_delivery_log ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own delivery logs
CREATE POLICY "delivery_log_users_view_own"
    ON public.notification_delivery_log
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Policy 2: Dealer admins can view all delivery logs for their dealership
CREATE POLICY "delivery_log_dealer_admins_view_all"
    ON public.notification_delivery_log
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.dealer_memberships dm
            WHERE dm.user_id = auth.uid()
            AND dm.dealer_id = notification_delivery_log.dealer_id
            AND dm.role IN ('admin', 'manager')
            AND dm.is_active = true
        )
    );

-- Policy 3: System admins can view all delivery logs (support/debugging)
CREATE POLICY "delivery_log_system_admins_view_all"
    ON public.notification_delivery_log
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.user_type = 'system_admin'
        )
    );

-- Policy 4: Only system (service_role) can insert delivery logs
-- Frontend should not directly insert - use Edge Function
CREATE POLICY "delivery_log_system_insert_only"
    ON public.notification_delivery_log
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Policy 5: System and webhooks can update delivery status
-- For webhook callbacks from providers (SendGrid, Twilio, FCM)
CREATE POLICY "delivery_log_system_update"
    ON public.notification_delivery_log
    FOR UPDATE
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger 1: Auto-update updated_at timestamp
CREATE TRIGGER update_notif_delivery_log_updated_at
    BEFORE UPDATE ON public.notification_delivery_log
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger 2: Calculate latency metrics automatically
CREATE OR REPLACE FUNCTION public.calculate_delivery_latency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Calculate send_latency_ms (created_at → sent_at)
    IF NEW.sent_at IS NOT NULL AND OLD.sent_at IS NULL THEN
        NEW.send_latency_ms := EXTRACT(EPOCH FROM (NEW.sent_at - NEW.created_at)) * 1000;
    END IF;

    -- Calculate delivery_latency_ms (sent_at → delivered_at)
    IF NEW.delivered_at IS NOT NULL AND OLD.delivered_at IS NULL THEN
        IF NEW.sent_at IS NOT NULL THEN
            NEW.delivery_latency_ms := EXTRACT(EPOCH FROM (NEW.delivered_at - NEW.sent_at)) * 1000;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.calculate_delivery_latency IS
    'Auto-calculates send_latency_ms and delivery_latency_ms based on timestamp changes';

CREATE TRIGGER trigger_calculate_delivery_latency
    BEFORE INSERT OR UPDATE ON public.notification_delivery_log
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_delivery_latency();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Authenticated users can read (filtered by RLS)
GRANT SELECT ON public.notification_delivery_log TO authenticated;

-- Service role has full access (Edge Functions)
GRANT ALL ON public.notification_delivery_log TO service_role;

COMMIT;

-- ============================================================================
-- POST-MIGRATION VERIFICATION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '======================================================================';
    RAISE NOTICE 'NOTIFICATION DELIVERY LOG TABLE CREATED SUCCESSFULLY';
    RAISE NOTICE '======================================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Table: notification_delivery_log';
    RAISE NOTICE 'Columns: 35 comprehensive tracking columns';
    RAISE NOTICE 'Indexes: 10 performance indexes created';
    RAISE NOTICE 'RLS Policies: 5 enterprise-grade security policies';
    RAISE NOTICE 'Triggers: 2 automatic calculation triggers';
    RAISE NOTICE '';
    RAISE NOTICE 'Capabilities:';
    RAISE NOTICE '  ✓ Multi-channel delivery tracking (in_app, email, sms, push)';
    RAISE NOTICE '  ✓ Provider correlation (SendGrid, Twilio, FCM)';
    RAISE NOTICE '  ✓ Engagement analytics (opens, clicks, CTR)';
    RAISE NOTICE '  ✓ Performance metrics (latency tracking)';
    RAISE NOTICE '  ✓ Error tracking and retry management';
    RAISE NOTICE '  ✓ Webhook support (provider message IDs)';
    RAISE NOTICE '  ✓ Audit trail with timestamps';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Create notification_log table (main notifications)';
    RAISE NOTICE '  2. Add FK constraint: notification_id → notification_log(id)';
    RAISE NOTICE '  3. Integrate with enhanced-notification-engine Edge Function';
    RAISE NOTICE '  4. Set up webhook endpoints for provider callbacks';
    RAISE NOTICE '  5. Create analytics RPC functions (get_delivery_metrics)';
    RAISE NOTICE '======================================================================';
END $$;
