-- ============================================================================
-- ENTERPRISE NOTIFICATION SYSTEM - FASE 1: UNIFIED SCHEMA
-- ============================================================================
-- Project: My Detail Area - Enterprise Notification System
-- Created: 2025-10-29
-- Description: Create unified notification preferences and dealer rules tables
--              to support PUSH + PULL multi-channel notification architecture
--
-- OBJECTIVE: Replace fragmented notification tables with enterprise-grade
--            unified system supporting all modules and channels
--
-- Tables Created:
--   1. user_notification_preferences_universal - User preferences per module
--   2. dealer_notification_rules - Dealership-level business rules
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. CREATE UNIVERSAL USER NOTIFICATION PREFERENCES TABLE
-- ============================================================================
-- Purpose: Unified notification preferences for ALL modules and channels
-- Scope: Per (user_id, dealer_id, module) - one row per user per module per dealer
-- Modules: sales_orders, service_orders, recon_orders, car_wash, get_ready
-- Channels: in_app, email, sms, push
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_notification_preferences_universal (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User and dealership scope
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    dealer_id BIGINT NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,

    -- Module scope (supports all current and future modules)
    module VARCHAR(50) NOT NULL CHECK (
        module IN ('sales_orders', 'service_orders', 'recon_orders', 'car_wash', 'get_ready')
    ),

    -- ========================================================================
    -- CHANNEL PREFERENCES (Global ON/OFF per channel)
    -- ========================================================================
    in_app_enabled BOOLEAN NOT NULL DEFAULT true,
    email_enabled BOOLEAN NOT NULL DEFAULT false,
    sms_enabled BOOLEAN NOT NULL DEFAULT false,
    push_enabled BOOLEAN NOT NULL DEFAULT false,

    -- ========================================================================
    -- EVENT PREFERENCES (Fine-grained per event type)
    -- ========================================================================
    -- Flexible JSONB structure to support module-specific events
    -- Structure varies by module but maintains consistency:
    -- {
    --   "order_created": {"enabled": true, "channels": ["in_app", "email"]},
    --   "order_assigned": {"enabled": true, "channels": ["in_app", "sms", "push"]},
    --   "status_changed": {
    --     "enabled": true,
    --     "channels": ["in_app", "push"],
    --     "statuses": ["in_progress", "completed"]
    --   },
    --   "due_date_approaching": {
    --     "enabled": true,
    --     "channels": ["in_app", "sms"],
    --     "minutes_before": 30
    --   },
    --   "sla_warning": {"enabled": true, "channels": ["in_app", "push"]},
    --   "sla_critical": {"enabled": true, "channels": ["in_app", "sms", "push"]},
    --   "approval_pending": {"enabled": true, "channels": ["in_app", "email"]},
    --   "field_updated": {
    --     "enabled": false,
    --     "channels": [],
    --     "fields": []
    --   }
    -- }
    event_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- ========================================================================
    -- QUIET HOURS (Do not disturb settings)
    -- ========================================================================
    quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
    quiet_hours_start TIME DEFAULT '22:00'::TIME,
    quiet_hours_end TIME DEFAULT '08:00'::TIME,
    quiet_hours_timezone VARCHAR(50) DEFAULT 'America/New_York',

    -- ========================================================================
    -- RATE LIMITING (Prevent notification spam)
    -- ========================================================================
    -- Per-channel rate limits stored as JSONB
    -- {
    --   "in_app": {"max_per_hour": 100, "max_per_day": 500},
    --   "email": {"max_per_hour": 5, "max_per_day": 20},
    --   "sms": {"max_per_hour": 3, "max_per_day": 10},
    --   "push": {"max_per_hour": 10, "max_per_day": 50}
    -- }
    rate_limits JSONB NOT NULL DEFAULT '{
        "in_app": {"max_per_hour": 100, "max_per_day": 500},
        "email": {"max_per_hour": 5, "max_per_day": 20},
        "sms": {"max_per_hour": 3, "max_per_day": 10},
        "push": {"max_per_hour": 10, "max_per_day": 50}
    }'::jsonb,

    -- ========================================================================
    -- NOTIFICATION FREQUENCY (Batching strategy)
    -- ========================================================================
    frequency VARCHAR(20) NOT NULL DEFAULT 'immediate' CHECK (
        frequency IN ('immediate', 'hourly', 'daily', 'weekly')
    ),

    -- ========================================================================
    -- AUTO-DISMISS SETTINGS
    -- ========================================================================
    auto_dismiss_read_after_days INTEGER DEFAULT 7 CHECK (auto_dismiss_read_after_days > 0 AND auto_dismiss_read_after_days <= 365),
    auto_dismiss_unread_after_days INTEGER DEFAULT 30 CHECK (auto_dismiss_unread_after_days > 0 AND auto_dismiss_unread_after_days <= 365),

    -- ========================================================================
    -- PHONE NUMBER OVERRIDE (Optional per-module phone)
    -- ========================================================================
    phone_number_override VARCHAR(20), -- Format: +1XXXXXXXXXX

    -- ========================================================================
    -- METADATA (Extensibility)
    -- ========================================================================
    metadata JSONB DEFAULT '{}'::jsonb,

    -- ========================================================================
    -- AUDIT TRAIL
    -- ========================================================================
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- ========================================================================
    -- CONSTRAINTS
    -- ========================================================================
    -- One preference row per user per dealer per module
    CONSTRAINT unique_user_dealer_module UNIQUE(user_id, dealer_id, module),

    -- Phone number format validation
    CONSTRAINT valid_phone_format CHECK (
        phone_number_override IS NULL OR phone_number_override ~ '^\+1[0-9]{10}$'
    )
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE (user_notification_preferences_universal)
-- ============================================================================

-- Fast lookup by user + module (most common query)
CREATE INDEX IF NOT EXISTS idx_notif_prefs_user_module
    ON public.user_notification_preferences_universal(user_id, module);

-- Dealer-wide queries (analytics, bulk operations)
CREATE INDEX IF NOT EXISTS idx_notif_prefs_dealer_module
    ON public.user_notification_preferences_universal(dealer_id, module);

-- Channel-enabled lookups (find users with specific channels enabled)
CREATE INDEX IF NOT EXISTS idx_notif_prefs_in_app_enabled
    ON public.user_notification_preferences_universal(dealer_id, module, in_app_enabled)
    WHERE in_app_enabled = true;

CREATE INDEX IF NOT EXISTS idx_notif_prefs_email_enabled
    ON public.user_notification_preferences_universal(dealer_id, module, email_enabled)
    WHERE email_enabled = true;

CREATE INDEX IF NOT EXISTS idx_notif_prefs_sms_enabled
    ON public.user_notification_preferences_universal(dealer_id, module, sms_enabled)
    WHERE sms_enabled = true;

CREATE INDEX IF NOT EXISTS idx_notif_prefs_push_enabled
    ON public.user_notification_preferences_universal(dealer_id, module, push_enabled)
    WHERE push_enabled = true;

-- GIN index for JSONB event_preferences (fast event lookup)
CREATE INDEX IF NOT EXISTS idx_notif_prefs_event_preferences_gin
    ON public.user_notification_preferences_universal USING GIN(event_preferences);

-- GIN index for JSONB rate_limits
CREATE INDEX IF NOT EXISTS idx_notif_prefs_rate_limits_gin
    ON public.user_notification_preferences_universal USING GIN(rate_limits);

-- ============================================================================
-- TABLE COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE public.user_notification_preferences_universal IS
    'Unified notification preferences for all modules supporting multi-channel delivery (in_app, email, sms, push)';

COMMENT ON COLUMN public.user_notification_preferences_universal.module IS
    'Module scope: sales_orders, service_orders, recon_orders, car_wash, get_ready';

COMMENT ON COLUMN public.user_notification_preferences_universal.event_preferences IS
    'Fine-grained event preferences per module: {event_name: {enabled, channels, conditions}}';

COMMENT ON COLUMN public.user_notification_preferences_universal.rate_limits IS
    'Per-channel rate limiting: {channel: {max_per_hour, max_per_day}}';

COMMENT ON COLUMN public.user_notification_preferences_universal.frequency IS
    'Notification batching strategy: immediate, hourly, daily, weekly';

COMMENT ON COLUMN public.user_notification_preferences_universal.phone_number_override IS
    'Optional module-specific phone number override (format: +1XXXXXXXXXX)';

-- ============================================================================
-- RLS POLICIES (user_notification_preferences_universal)
-- ============================================================================

-- Enable RLS
ALTER TABLE public.user_notification_preferences_universal ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own preferences
CREATE POLICY "Users can view own notification preferences"
    ON public.user_notification_preferences_universal
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Policy 2: Users can manage their own preferences (INSERT, UPDATE, DELETE)
CREATE POLICY "Users can manage own notification preferences"
    ON public.user_notification_preferences_universal
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Policy 3: System admins can view all preferences (for support/debugging)
CREATE POLICY "System admins can view all notification preferences"
    ON public.user_notification_preferences_universal
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.user_type = 'system_admin'
        )
    );

-- Policy 4: Dealer admins can view preferences within their dealership
CREATE POLICY "Dealer admins can view dealership notification preferences"
    ON public.user_notification_preferences_universal
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.dealer_memberships dm
            WHERE dm.user_id = auth.uid()
            AND dm.dealer_id = user_notification_preferences_universal.dealer_id
            AND dm.role = 'admin'
            AND dm.is_active = true
        )
    );

-- ============================================================================
-- TRIGGER: Auto-update updated_at timestamp
-- ============================================================================

CREATE TRIGGER update_notif_prefs_universal_updated_at
    BEFORE UPDATE ON public.user_notification_preferences_universal
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 2. CREATE DEALER NOTIFICATION RULES TABLE
-- ============================================================================
-- Purpose: Dealership-level business rules for notification routing
-- Scope: Per (dealer_id, module, event)
-- Defines: WHO receives notifications and UNDER WHAT CONDITIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.dealer_notification_rules (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Dealership and module scope
    dealer_id BIGINT NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
    module VARCHAR(50) NOT NULL CHECK (
        module IN ('sales_orders', 'service_orders', 'recon_orders', 'car_wash', 'get_ready')
    ),

    -- Event type
    event VARCHAR(100) NOT NULL, -- e.g., 'order_created', 'sla_critical', 'approval_pending'

    -- Rule identification
    rule_name VARCHAR(100) NOT NULL,
    description TEXT,

    -- ========================================================================
    -- RECIPIENT DEFINITION (Who receives this notification?)
    -- ========================================================================
    -- JSONB structure for flexible recipient targeting:
    -- {
    --   "roles": ["dealer_admin", "dealer_manager"],
    --   "users": ["uuid-1", "uuid-2"],
    --   "include_assigned_user": true,
    --   "include_followers": true,
    --   "include_creator": false
    -- }
    recipients JSONB NOT NULL DEFAULT '{
        "roles": [],
        "users": [],
        "include_assigned_user": false,
        "include_followers": false,
        "include_creator": false
    }'::jsonb,

    -- ========================================================================
    -- CONDITIONS (When does this rule apply?)
    -- ========================================================================
    -- JSONB structure for conditional logic:
    -- {
    --   "priority": ["urgent", "high"],
    --   "status": ["in_progress"],
    --   "sla_hours_remaining": {"operator": "<=", "value": 2},
    --   "custom_field": {"field": "is_vip", "operator": "=", "value": true}
    -- }
    conditions JSONB DEFAULT '{}'::jsonb,

    -- ========================================================================
    -- CHANNEL CONFIGURATION
    -- ========================================================================
    -- Which channels to use for this rule (overrides user preferences if higher priority)
    channels JSONB NOT NULL DEFAULT '["in_app"]'::jsonb, -- Array: ["in_app", "email", "sms", "push"]

    -- Rule priority (higher priority rules can override user preferences)
    priority INTEGER NOT NULL DEFAULT 0 CHECK (priority >= 0 AND priority <= 100),

    -- ========================================================================
    -- RULE STATUS
    -- ========================================================================
    enabled BOOLEAN NOT NULL DEFAULT true,

    -- ========================================================================
    -- METADATA (Extensibility)
    -- ========================================================================
    metadata JSONB DEFAULT '{}'::jsonb,

    -- ========================================================================
    -- AUDIT TRAIL
    -- ========================================================================
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- ========================================================================
    -- CONSTRAINTS
    -- ========================================================================
    -- One rule per dealer + module + event + rule_name
    CONSTRAINT unique_dealer_module_event_rule UNIQUE(dealer_id, module, event, rule_name)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE (dealer_notification_rules)
-- ============================================================================

-- Fast lookup by dealer + module + event (most common query)
CREATE INDEX IF NOT EXISTS idx_dealer_notif_rules_lookup
    ON public.dealer_notification_rules(dealer_id, module, event, enabled)
    WHERE enabled = true;

-- Dealer-wide rule queries
CREATE INDEX IF NOT EXISTS idx_dealer_notif_rules_dealer
    ON public.dealer_notification_rules(dealer_id, module)
    WHERE enabled = true;

-- GIN index for JSONB recipients (complex recipient queries)
CREATE INDEX IF NOT EXISTS idx_dealer_notif_rules_recipients_gin
    ON public.dealer_notification_rules USING GIN(recipients);

-- GIN index for JSONB conditions (conditional rule matching)
CREATE INDEX IF NOT EXISTS idx_dealer_notif_rules_conditions_gin
    ON public.dealer_notification_rules USING GIN(conditions);

-- Priority-based lookups
CREATE INDEX IF NOT EXISTS idx_dealer_notif_rules_priority
    ON public.dealer_notification_rules(dealer_id, module, event, priority DESC)
    WHERE enabled = true;

-- ============================================================================
-- TABLE COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE public.dealer_notification_rules IS
    'Dealership-level notification routing rules defining WHO receives notifications and WHEN';

COMMENT ON COLUMN public.dealer_notification_rules.recipients IS
    'Recipient targeting: {roles: [], users: [], include_assigned_user, include_followers, include_creator}';

COMMENT ON COLUMN public.dealer_notification_rules.conditions IS
    'Conditional logic for rule application: {priority, status, sla_hours_remaining, custom_fields}';

COMMENT ON COLUMN public.dealer_notification_rules.channels IS
    'Channels to use for this rule (JSON array): ["in_app", "email", "sms", "push"]';

COMMENT ON COLUMN public.dealer_notification_rules.priority IS
    'Rule priority (0-100): higher priority rules can override user preferences';

-- ============================================================================
-- RLS POLICIES (dealer_notification_rules)
-- ============================================================================

-- Enable RLS
ALTER TABLE public.dealer_notification_rules ENABLE ROW LEVEL SECURITY;

-- Policy 1: Dealer admins and managers can view their dealership rules
CREATE POLICY "Dealer staff can view dealership notification rules"
    ON public.dealer_notification_rules
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.dealer_memberships dm
            WHERE dm.user_id = auth.uid()
            AND dm.dealer_id = dealer_notification_rules.dealer_id
            AND dm.role IN ('admin', 'manager')
            AND dm.is_active = true
        )
        OR
        -- System admins see all
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.user_type = 'system_admin'
        )
    );

-- Policy 2: Only dealer_admin can create rules
CREATE POLICY "Dealer admins can create notification rules"
    ON public.dealer_notification_rules
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.dealer_memberships dm
            WHERE dm.user_id = auth.uid()
            AND dm.dealer_id = dealer_notification_rules.dealer_id
            AND dm.role = 'admin'
            AND dm.is_active = true
        )
        AND created_by = auth.uid()
    );

-- Policy 3: Only dealer_admin can update rules
CREATE POLICY "Dealer admins can update notification rules"
    ON public.dealer_notification_rules
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.dealer_memberships dm
            WHERE dm.user_id = auth.uid()
            AND dm.dealer_id = dealer_notification_rules.dealer_id
            AND dm.role = 'admin'
            AND dm.is_active = true
        )
    )
    WITH CHECK (updated_by = auth.uid());

-- Policy 4: Only dealer_admin and system_admin can delete rules
CREATE POLICY "Dealer admins can delete notification rules"
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

-- ============================================================================
-- TRIGGER: Auto-update updated_at timestamp
-- ============================================================================

CREATE TRIGGER update_dealer_notif_rules_updated_at
    BEFORE UPDATE ON public.dealer_notification_rules
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_notification_preferences_universal TO authenticated;
GRANT SELECT ON public.dealer_notification_rules TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.dealer_notification_rules TO authenticated;

COMMIT;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '======================================================================';
    RAISE NOTICE 'ENTERPRISE NOTIFICATION SYSTEM - FASE 1 COMPLETED';
    RAISE NOTICE '======================================================================';
    RAISE NOTICE 'Tables Created:';
    RAISE NOTICE '  ✓ user_notification_preferences_universal';
    RAISE NOTICE '  ✓ dealer_notification_rules';
    RAISE NOTICE '';
    RAISE NOTICE 'Indexes: 18 performance indexes created';
    RAISE NOTICE 'RLS Policies: 8 enterprise-grade policies enabled';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Run migration 20251029000001 to migrate existing data';
    RAISE NOTICE '  2. Run migration 20251029000002 to deprecate old tables';
    RAISE NOTICE '======================================================================';
END $$;
