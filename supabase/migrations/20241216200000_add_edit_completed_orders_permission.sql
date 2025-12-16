-- =====================================================
-- Add 'edit_completed_orders' Permission with EXTREME CAUTION
-- =====================================================
-- Description: Allows authorized users to edit completed/cancelled orders
-- Security: Restricted to managers and admins by default
-- Audit: All changes logged to order_change_audit table
-- Date: 2024-12-16
-- Author: System
-- =====================================================

-- SAFETY CHECK: Ensure we're in the right database
DO $$
BEGIN
    IF current_database() NOT IN ('postgres', 'mydetailarea') THEN
        RAISE EXCEPTION 'Wrong database! Expected postgres or mydetailarea, got %', current_database();
    END IF;
END $$;

-- =====================================================
-- STEP 1: Create audit table FIRST (most important for tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS order_change_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Order context
    order_id UUID NOT NULL,
    order_number TEXT NOT NULL,
    order_type TEXT NOT NULL CHECK (order_type IN ('sales', 'service', 'recon', 'carwash')),
    order_status TEXT NOT NULL CHECK (order_status IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold')),

    -- Who made the change
    changed_by UUID NOT NULL,
    changed_by_email TEXT NOT NULL,
    changed_by_role TEXT,

    -- What was changed
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,

    -- Why changed (optional but recommended)
    reason TEXT,

    -- Context
    dealer_id INTEGER NOT NULL,
    ip_address INET,
    user_agent TEXT,

    -- Timestamps (immutable)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_change CHECK (old_value IS DISTINCT FROM new_value),
    CONSTRAINT valid_order_id CHECK (order_id IS NOT NULL),
    CONSTRAINT valid_field_name CHECK (field_name IS NOT NULL AND field_name != '')
);

-- Add foreign keys ONLY if tables exist (safe approach)
DO $$
BEGIN
    -- Add foreign key to orders table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN
        ALTER TABLE order_change_audit
        ADD CONSTRAINT fk_order_change_audit_order
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;
    END IF;

    -- Add foreign key to auth.users if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        ALTER TABLE order_change_audit
        ADD CONSTRAINT fk_order_change_audit_user
        FOREIGN KEY (changed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;

    -- Add foreign key to dealerships if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dealerships') THEN
        ALTER TABLE order_change_audit
        ADD CONSTRAINT fk_order_change_audit_dealer
        FOREIGN KEY (dealer_id) REFERENCES dealerships(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_order_change_audit_order_id ON order_change_audit(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_change_audit_changed_by ON order_change_audit(changed_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_change_audit_dealer ON order_change_audit(dealer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_change_audit_created_at ON order_change_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_change_audit_field_name ON order_change_audit(field_name);

-- Enable Row Level Security (CRITICAL for multi-tenant security)
ALTER TABLE order_change_audit ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (safe recreation)
DROP POLICY IF EXISTS "System admins view all order change audits" ON order_change_audit;
DROP POLICY IF EXISTS "Users view order change audits for their dealership" ON order_change_audit;
DROP POLICY IF EXISTS "Authorized users can create order change audits" ON order_change_audit;

-- RLS Policy: System admins see all
CREATE POLICY "System admins view all order change audits"
    ON order_change_audit FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'system_admin'
        )
    );

-- RLS Policy: Users see changes for their dealership
CREATE POLICY "Users view order change audits for their dealership"
    ON order_change_audit FOR SELECT TO authenticated
    USING (
        dealer_id IN (
            SELECT dealership_id FROM profiles
            WHERE profiles.id = auth.uid()
        )
    );

-- RLS Policy: Only authorized users can create audit records
CREATE POLICY "Authorized users can create order change audits"
    ON order_change_audit FOR INSERT TO authenticated
    WITH CHECK (
        dealer_id IN (
            SELECT dealership_id FROM profiles
            WHERE profiles.id = auth.uid()
        )
    );

-- =====================================================
-- STEP 2: Create safe logging function with validation
-- =====================================================
CREATE OR REPLACE FUNCTION log_order_field_change(
    p_order_id UUID,
    p_field_name TEXT,
    p_old_value TEXT,
    p_new_value TEXT,
    p_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_order_record RECORD;
    v_user_record RECORD;
    v_audit_id UUID;
BEGIN
    -- SAFETY: Validate inputs
    IF p_order_id IS NULL THEN
        RAISE EXCEPTION 'Order ID cannot be null';
    END IF;

    IF p_field_name IS NULL OR p_field_name = '' THEN
        RAISE EXCEPTION 'Field name cannot be null or empty';
    END IF;

    -- SAFETY: Check if values actually changed
    IF p_old_value IS NOT DISTINCT FROM p_new_value THEN
        RAISE NOTICE 'Values are identical, skipping audit log';
        RETURN NULL;
    END IF;

    -- Get order details with validation
    SELECT id, order_number, order_type, status, dealer_id
    INTO STRICT v_order_record
    FROM orders
    WHERE id = p_order_id;

    -- Get user details with validation
    SELECT p.id, p.email, p.role
    INTO STRICT v_user_record
    FROM profiles p
    WHERE p.id = auth.uid();

    -- SAFETY: Verify user belongs to same dealership
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND dealership_id = v_order_record.dealer_id
    ) AND v_user_record.role != 'system_admin' THEN
        RAISE EXCEPTION 'User does not have access to this dealership';
    END IF;

    -- Insert audit record with all safety checks passed
    INSERT INTO order_change_audit (
        order_id,
        order_number,
        order_type,
        order_status,
        changed_by,
        changed_by_email,
        changed_by_role,
        field_name,
        old_value,
        new_value,
        reason,
        dealer_id,
        ip_address,
        user_agent
    ) VALUES (
        p_order_id,
        v_order_record.order_number,
        v_order_record.order_type,
        v_order_record.status,
        v_user_record.id,
        v_user_record.email,
        v_user_record.role,
        p_field_name,
        p_old_value,
        p_new_value,
        p_reason,
        v_order_record.dealer_id,
        inet_client_addr(),
        current_setting('request.headers', true)::json->>'user-agent'
    )
    RETURNING id INTO v_audit_id;

    RETURN v_audit_id;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RAISE EXCEPTION 'Order or user not found: order_id=%, user_id=%', p_order_id, auth.uid();
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to log order change: %', SQLERRM;
END;
$$;

-- Grant minimal necessary permissions
GRANT SELECT ON order_change_audit TO authenticated;
GRANT INSERT ON order_change_audit TO authenticated;
GRANT EXECUTE ON FUNCTION log_order_field_change TO authenticated;

-- =====================================================
-- STEP 3: Add module permissions (only if table exists)
-- =====================================================
DO $$
BEGIN
    -- Check if module_permissions table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'module_permissions') THEN
        -- Add permissions for each order module
        INSERT INTO module_permissions (module, permission_key, display_name, description, is_active)
        VALUES
            ('sales_orders', 'edit_completed_orders', 'Edit Completed Orders', 'Override to edit completed or cancelled sales orders (changes are audited)', true),
            ('service_orders', 'edit_completed_orders', 'Edit Completed Orders', 'Override to edit completed or cancelled service orders (changes are audited)', true),
            ('recon_orders', 'edit_completed_orders', 'Edit Completed Orders', 'Override to edit completed or cancelled recon orders (changes are audited)', true),
            ('car_wash', 'edit_completed_orders', 'Edit Completed Orders', 'Override to edit completed or cancelled car wash orders (changes are audited)', true)
        ON CONFLICT (module, permission_key) DO UPDATE
        SET
            display_name = EXCLUDED.display_name,
            description = EXCLUDED.description,
            is_active = EXCLUDED.is_active;

        RAISE NOTICE '✅ Module permissions added successfully';
    ELSE
        RAISE WARNING '⚠️  module_permissions table not found, skipping permission creation';
    END IF;
END $$;

-- =====================================================
-- STEP 4: Grant to manager roles (CAUTIOUS approach)
-- =====================================================
DO $$
DECLARE
    r RECORD;
    perm_record RECORD;
    grant_count INTEGER := 0;
BEGIN
    -- Only proceed if required tables exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dealer_custom_roles') THEN
        RAISE NOTICE '⚠️  dealer_custom_roles table not found, skipping role grants';
        RETURN;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'role_module_permissions_new') THEN
        RAISE NOTICE '⚠️  role_module_permissions_new table not found, skipping role grants';
        RETURN;
    END IF;

    -- CAUTIOUS: Only grant to roles explicitly marked as manager-level
    -- NOT automatically granting to all roles with "manager" in the name
    FOR r IN
        SELECT id, role_name, display_name, dealer_id
        FROM dealer_custom_roles
        WHERE (
            role_name IN ('dealer_admin', 'dealer_manager') -- Explicit trusted roles
            OR (role_name ILIKE '%manager%' AND role_name NOT ILIKE '%assistant%') -- Careful pattern match
        )
        AND is_active = true
        AND dealer_id IS NOT NULL -- Only dealer-specific roles
    LOOP
        -- For each order module, grant edit_completed_orders permission
        FOR perm_record IN
            SELECT id, module
            FROM module_permissions
            WHERE permission_key = 'edit_completed_orders'
            AND module IN ('sales_orders', 'service_orders', 'recon_orders', 'car_wash')
        LOOP
            -- Grant permission (skip if already exists)
            INSERT INTO role_module_permissions_new (role_id, permission_id)
            VALUES (r.id, perm_record.id)
            ON CONFLICT DO NOTHING;

            grant_count := grant_count + 1;
        END LOOP;

        RAISE NOTICE '✅ Granted edit_completed_orders permissions to role: % (dealer_id: %)', r.display_name, r.dealer_id;
    END LOOP;

    RAISE NOTICE '✅ Total permissions granted: %', grant_count;
END $$;

-- =====================================================
-- VERIFICATION & ROLLBACK INFORMATION
-- =====================================================
DO $$
BEGIN
    -- Verify audit table was created
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_change_audit') THEN
        RAISE NOTICE '✅ VERIFICATION: order_change_audit table created successfully';
    ELSE
        RAISE EXCEPTION '❌ VERIFICATION FAILED: order_change_audit table not created';
    END IF;

    -- Verify function was created
    IF EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'log_order_field_change') THEN
        RAISE NOTICE '✅ VERIFICATION: log_order_field_change function created successfully';
    ELSE
        RAISE EXCEPTION '❌ VERIFICATION FAILED: log_order_field_change function not created';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE '✅ MIGRATION COMPLETED SUCCESSFULLY';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'New Features Added:';
    RAISE NOTICE '  - order_change_audit table for tracking changes';
    RAISE NOTICE '  - log_order_field_change() function for safe logging';
    RAISE NOTICE '  - edit_completed_orders permission for 4 modules';
    RAISE NOTICE '  - RLS policies configured for multi-tenant security';
    RAISE NOTICE '';
    RAISE NOTICE 'To ROLLBACK if needed:';
    RAISE NOTICE '  DROP TABLE IF EXISTS order_change_audit CASCADE;';
    RAISE NOTICE '  DROP FUNCTION IF EXISTS log_order_field_change CASCADE;';
    RAISE NOTICE '  DELETE FROM module_permissions WHERE permission_key = ''edit_completed_orders'';';
    RAISE NOTICE '==========================================';
END $$;