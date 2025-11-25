-- =====================================================
-- Permission Audit Trail System
-- =====================================================
-- Description: Comprehensive audit logging for permission changes
-- Author: Claude Code
-- Date: 2025-10-27
-- =====================================================

-- Create audit trail table
CREATE TABLE IF NOT EXISTS permission_audit_trail (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Who made the change
    actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_email TEXT NOT NULL,
    actor_role TEXT NOT NULL,

    -- What was changed
    action_type TEXT NOT NULL CHECK (action_type IN (
        'role_created',
        'role_updated',
        'role_deleted',
        'role_assigned',
        'role_unassigned',
        'permission_granted',
        'permission_revoked',
        'module_enabled',
        'module_disabled',
        'system_permission_granted',
        'system_permission_revoked'
    )),

    -- Target of the change
    target_type TEXT NOT NULL CHECK (target_type IN (
        'role',
        'user',
        'module',
        'permission'
    )),
    target_id TEXT, -- Can be role_id, user_id, module name, etc.
    target_name TEXT, -- Human-readable name

    -- Dealership context
    dealer_id INTEGER REFERENCES dealerships(id) ON DELETE CASCADE,
    dealer_name TEXT,

    -- Change details
    old_value JSONB, -- Previous state
    new_value JSONB, -- New state
    delta JSONB, -- What changed

    -- Metadata
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    reason TEXT, -- Optional reason for the change

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Indexing
    CONSTRAINT valid_target CHECK (target_id IS NOT NULL OR target_name IS NOT NULL)
);

-- Create indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_permission_audit_trail_actor
    ON permission_audit_trail(actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_permission_audit_trail_target
    ON permission_audit_trail(target_type, target_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_permission_audit_trail_dealer
    ON permission_audit_trail(dealer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_permission_audit_trail_action
    ON permission_audit_trail(action_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_permission_audit_trail_created_at
    ON permission_audit_trail(created_at DESC);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_permission_audit_trail_actor_dealer
    ON permission_audit_trail(actor_id, dealer_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE permission_audit_trail ENABLE ROW LEVEL SECURITY;

-- RLS Policy: System admins can see all audit logs
CREATE POLICY "System admins can view all audit logs"
    ON permission_audit_trail
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'system_admin'
        )
    );

-- RLS Policy: Dealer admins can see audit logs for their dealership
CREATE POLICY "Dealer admins can view their dealership audit logs"
    ON permission_audit_trail
    FOR SELECT
    TO authenticated
    USING (
        dealer_id IN (
            SELECT dealership_id FROM profiles
            WHERE profiles.id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM dealer_custom_roles dcr
            JOIN user_custom_role_assignments ucra ON dcr.id = ucra.custom_role_id
            JOIN role_system_permissions rsp ON dcr.id = rsp.role_id
            WHERE ucra.user_id = auth.uid()
            AND rsp.permission = 'manage_users'
        )
    );

-- RLS Policy: Users can see audit logs about themselves
CREATE POLICY "Users can view their own audit logs"
    ON permission_audit_trail
    FOR SELECT
    TO authenticated
    USING (
        actor_id = auth.uid()
        OR target_id = auth.uid()::TEXT
    );

-- Function to log permission changes
CREATE OR REPLACE FUNCTION log_permission_change(
    p_actor_id UUID,
    p_action_type TEXT,
    p_target_type TEXT,
    p_target_id TEXT DEFAULT NULL,
    p_target_name TEXT DEFAULT NULL,
    p_dealer_id INTEGER DEFAULT NULL,
    p_old_value JSONB DEFAULT NULL,
    p_new_value JSONB DEFAULT NULL,
    p_reason TEXT DEFAULT NULL,
    p_ip_address TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_session_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_actor_email TEXT;
    v_actor_role TEXT;
    v_dealer_name TEXT;
    v_delta JSONB;
    v_audit_id UUID;
BEGIN
    -- Get actor details
    SELECT email, role INTO v_actor_email, v_actor_role
    FROM profiles
    WHERE id = p_actor_id;

    IF v_actor_email IS NULL THEN
        RAISE EXCEPTION 'Actor not found: %', p_actor_id;
    END IF;

    -- Get dealer name if provided
    IF p_dealer_id IS NOT NULL THEN
        SELECT name INTO v_dealer_name
        FROM dealerships
        WHERE id = p_dealer_id;
    END IF;

    -- Calculate delta (what changed)
    IF p_old_value IS NOT NULL AND p_new_value IS NOT NULL THEN
        v_delta := jsonb_build_object(
            'added', (
                SELECT jsonb_object_agg(key, value)
                FROM jsonb_each(p_new_value)
                WHERE NOT (p_old_value ? key) OR p_old_value->key IS DISTINCT FROM value
            ),
            'removed', (
                SELECT jsonb_object_agg(key, value)
                FROM jsonb_each(p_old_value)
                WHERE NOT (p_new_value ? key)
            ),
            'modified', (
                SELECT jsonb_object_agg(
                    key,
                    jsonb_build_object(
                        'old', p_old_value->key,
                        'new', value
                    )
                )
                FROM jsonb_each(p_new_value)
                WHERE (p_old_value ? key) AND p_old_value->key IS DISTINCT FROM value
            )
        );
    END IF;

    -- Insert audit log
    INSERT INTO permission_audit_trail (
        actor_id,
        actor_email,
        actor_role,
        action_type,
        target_type,
        target_id,
        target_name,
        dealer_id,
        dealer_name,
        old_value,
        new_value,
        delta,
        ip_address,
        user_agent,
        session_id,
        reason
    ) VALUES (
        p_actor_id,
        v_actor_email,
        v_actor_role,
        p_action_type,
        p_target_type,
        p_target_id,
        p_target_name,
        p_dealer_id,
        v_dealer_name,
        p_old_value,
        p_new_value,
        v_delta,
        p_ip_address::INET,
        p_user_agent,
        p_session_id,
        p_reason
    )
    RETURNING id INTO v_audit_id;

    RETURN v_audit_id;
END;
$$;

-- Trigger function to auto-log role changes
CREATE OR REPLACE FUNCTION auto_log_role_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_action_type TEXT;
    v_old_value JSONB;
    v_new_value JSONB;
BEGIN
    -- Determine action type
    IF TG_OP = 'INSERT' THEN
        v_action_type := 'role_created';
        v_new_value := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        v_action_type := 'role_updated';
        v_old_value := to_jsonb(OLD);
        v_new_value := to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        v_action_type := 'role_deleted';
        v_old_value := to_jsonb(OLD);
    END IF;

    -- Log the change
    PERFORM log_permission_change(
        p_actor_id := auth.uid(),
        p_action_type := v_action_type,
        p_target_type := 'role',
        p_target_id := COALESCE(NEW.id::TEXT, OLD.id::TEXT),
        p_target_name := COALESCE(NEW.name, OLD.name),
        p_dealer_id := COALESCE(NEW.dealer_id, OLD.dealer_id),
        p_old_value := v_old_value,
        p_new_value := v_new_value
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply trigger to dealer_custom_roles table
DROP TRIGGER IF EXISTS trg_log_role_changes ON dealer_custom_roles;
CREATE TRIGGER trg_log_role_changes
    AFTER INSERT OR UPDATE OR DELETE ON dealer_custom_roles
    FOR EACH ROW
    EXECUTE FUNCTION auto_log_role_changes();

-- Trigger function to auto-log role assignments
CREATE OR REPLACE FUNCTION auto_log_role_assignments()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_action_type TEXT;
    v_role_name TEXT;
    v_user_email TEXT;
BEGIN
    -- Determine action type
    IF TG_OP = 'INSERT' THEN
        v_action_type := 'role_assigned';
    ELSIF TG_OP = 'DELETE' THEN
        v_action_type := 'role_unassigned';
    END IF;

    -- Get role and user details
    SELECT name INTO v_role_name
    FROM dealer_custom_roles
    WHERE id = COALESCE(NEW.custom_role_id, OLD.custom_role_id);

    SELECT email INTO v_user_email
    FROM profiles
    WHERE id = COALESCE(NEW.user_id, OLD.user_id);

    -- Log the change
    PERFORM log_permission_change(
        p_actor_id := auth.uid(),
        p_action_type := v_action_type,
        p_target_type := 'user',
        p_target_id := COALESCE(NEW.user_id::TEXT, OLD.user_id::TEXT),
        p_target_name := v_user_email,
        p_old_value := CASE WHEN TG_OP = 'DELETE' THEN jsonb_build_object('role', v_role_name) ELSE NULL END,
        p_new_value := CASE WHEN TG_OP = 'INSERT' THEN jsonb_build_object('role', v_role_name) ELSE NULL END
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply trigger to user_custom_role_assignments table
DROP TRIGGER IF EXISTS trg_log_role_assignments ON user_custom_role_assignments;
CREATE TRIGGER trg_log_role_assignments
    AFTER INSERT OR DELETE ON user_custom_role_assignments
    FOR EACH ROW
    EXECUTE FUNCTION auto_log_role_assignments();

-- View for easy audit log querying
CREATE OR REPLACE VIEW permission_audit_log_summary AS
SELECT
    pat.id,
    pat.created_at,
    pat.action_type,
    pat.actor_email,
    pat.actor_role,
    pat.target_type,
    pat.target_name,
    pat.dealer_name,
    pat.reason,
    CASE
        WHEN pat.delta IS NOT NULL THEN jsonb_pretty(pat.delta)
        ELSE NULL
    END AS changes_summary
FROM permission_audit_trail pat
ORDER BY pat.created_at DESC;

-- Grant permissions
GRANT SELECT ON permission_audit_trail TO authenticated;
GRANT SELECT ON permission_audit_log_summary TO authenticated;
GRANT EXECUTE ON FUNCTION log_permission_change TO authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Permission audit trail system created successfully';
    RAISE NOTICE '   - Table: permission_audit_trail';
    RAISE NOTICE '   - Function: log_permission_change()';
    RAISE NOTICE '   - Triggers: Auto-logging for roles and assignments';
    RAISE NOTICE '   - View: permission_audit_log_summary';
    RAISE NOTICE '   - RLS policies: Configured for system admins, dealer admins, and users';
END $$;
