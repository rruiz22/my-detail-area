-- =====================================================
-- MIGRATION: Password Reset System Tables & Security
-- Created: 2025-11-05
-- Description: Admin-controlled password reset system
-- =====================================================

-- =====================================================
-- 1. PASSWORD RESET REQUESTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.password_reset_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'expired', 'cancelled')),
  request_type TEXT NOT NULL CHECK (request_type IN ('email_reset', 'temp_password', 'force_change')),
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  temp_password TEXT, -- Encrypted temp password if applicable
  force_change_on_login BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for password_reset_requests
CREATE INDEX idx_password_reset_user ON public.password_reset_requests(user_id);
CREATE INDEX idx_password_reset_admin ON public.password_reset_requests(admin_id);
CREATE INDEX idx_password_reset_status ON public.password_reset_requests(status);
CREATE INDEX idx_password_reset_token ON public.password_reset_requests(token);
CREATE INDEX idx_password_reset_expires ON public.password_reset_requests(expires_at);

-- RLS for password_reset_requests
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Only system_admin can view
CREATE POLICY "System admins can view all password resets"
  ON public.password_reset_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'system_admin'
    )
  );

-- Policy: Only system_admin can create
CREATE POLICY "System admins can create password resets"
  ON public.password_reset_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'system_admin'
    )
  );

-- Policy: Only system_admin can update
CREATE POLICY "System admins can update password resets"
  ON public.password_reset_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'system_admin'
    )
  );

COMMENT ON TABLE public.password_reset_requests IS 'Admin-initiated password reset requests';
COMMENT ON COLUMN public.password_reset_requests.token IS 'Unique token for password reset (UUID)';
COMMENT ON COLUMN public.password_reset_requests.temp_password IS 'Temporary password (stored in plaintext - consider encryption)';
COMMENT ON COLUMN public.password_reset_requests.metadata IS 'Additional metadata (email_sent, email_id, etc.)';

-- =====================================================
-- 2. BULK PASSWORD OPERATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.bulk_password_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type TEXT NOT NULL CHECK (operation_type IN ('bulk_reset', 'bulk_force_change', 'bulk_temp_password')),
  initiated_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dealer_id INTEGER NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  target_filters JSONB NOT NULL DEFAULT '{}',
  total_users INTEGER DEFAULT 0,
  processed_users INTEGER DEFAULT 0,
  successful_operations INTEGER DEFAULT 0,
  failed_operations INTEGER DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_details JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for bulk_password_operations
CREATE INDEX idx_bulk_password_dealer ON public.bulk_password_operations(dealer_id);
CREATE INDEX idx_bulk_password_initiator ON public.bulk_password_operations(initiated_by);
CREATE INDEX idx_bulk_password_status ON public.bulk_password_operations(status);
CREATE INDEX idx_bulk_password_created ON public.bulk_password_operations(created_at DESC);

-- RLS for bulk_password_operations
ALTER TABLE public.bulk_password_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System admins can view all bulk operations"
  ON public.bulk_password_operations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'system_admin'
    )
  );

CREATE POLICY "System admins can create bulk operations"
  ON public.bulk_password_operations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'system_admin'
    )
  );

CREATE POLICY "System admins can update bulk operations"
  ON public.bulk_password_operations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'system_admin'
    )
  );

COMMENT ON TABLE public.bulk_password_operations IS 'Bulk password operations tracking';
COMMENT ON COLUMN public.bulk_password_operations.target_filters IS 'Filters used to select target users (role, department, etc.)';
COMMENT ON COLUMN public.bulk_password_operations.error_details IS 'Array of error objects for failed operations';

-- =====================================================
-- 3. PASSWORD HISTORY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.password_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  change_reason TEXT
);

-- Indexes for password_history
CREATE INDEX idx_password_history_user ON public.password_history(user_id);
CREATE INDEX idx_password_history_created ON public.password_history(created_at DESC);

-- RLS for password_history
ALTER TABLE public.password_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own password history"
  ON public.password_history FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System admins can view all password history"
  ON public.password_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'system_admin'
    )
  );

CREATE POLICY "System can insert password history"
  ON public.password_history FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE public.password_history IS 'Historical password hashes for reuse prevention';
COMMENT ON COLUMN public.password_history.password_hash IS 'Hashed password (bcrypt/argon2)';
COMMENT ON COLUMN public.password_history.change_reason IS 'Reason for password change (admin_reset, user_initiated, expired, etc.)';

-- =====================================================
-- 4. SECURITY POLICIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.security_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id INTEGER NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  policy_name TEXT NOT NULL,
  policy_value JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(dealer_id, policy_name)
);

-- Indexes for security_policies
CREATE INDEX IF NOT EXISTS idx_security_policies_dealer ON public.security_policies(dealer_id);
CREATE INDEX IF NOT EXISTS idx_security_policies_name ON public.security_policies(policy_name);
CREATE INDEX IF NOT EXISTS idx_security_policies_active ON public.security_policies(is_active);

-- RLS for security_policies
ALTER TABLE public.security_policies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view their dealer security policies" ON public.security_policies;
  DROP POLICY IF EXISTS "System admins can manage all security policies" ON public.security_policies;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Users can view their dealer security policies"
  ON public.security_policies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.dealer_memberships
      WHERE dealer_memberships.user_id = auth.uid()
      AND dealer_memberships.dealer_id = security_policies.dealer_id
      AND dealer_memberships.is_active = TRUE
    )
  );

CREATE POLICY "System admins can manage all security policies"
  ON public.security_policies FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'system_admin'
    )
  );

COMMENT ON TABLE public.security_policies IS 'Dealer-specific security policies';
COMMENT ON COLUMN public.security_policies.policy_value IS 'Policy configuration (min_length, require_uppercase, etc.)';

-- =====================================================
-- 5. TRIGGERS
-- =====================================================

-- Trigger function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to password_reset_requests
DROP TRIGGER IF EXISTS update_password_reset_requests_updated_at ON public.password_reset_requests;
CREATE TRIGGER update_password_reset_requests_updated_at
  BEFORE UPDATE ON public.password_reset_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to security_policies
DROP TRIGGER IF EXISTS update_security_policies_updated_at ON public.security_policies;
CREATE TRIGGER update_security_policies_updated_at
  BEFORE UPDATE ON public.security_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. UTILITY FUNCTIONS
-- =====================================================

-- Function to expire old password reset requests
CREATE OR REPLACE FUNCTION expire_old_password_resets()
RETURNS void AS $$
BEGIN
  UPDATE public.password_reset_requests
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'pending'
  AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION expire_old_password_resets() TO authenticated;

COMMENT ON FUNCTION expire_old_password_resets() IS 'Marks expired password reset requests as expired (run periodically via cron)';

-- =====================================================
-- 7. INITIAL DATA
-- =====================================================

-- Insert default security policy for existing dealerships
-- (Only if security_policies table was just created)
INSERT INTO public.security_policies (dealer_id, policy_name, policy_value, created_by, is_active)
SELECT
  d.id,
  'password_policy',
  jsonb_build_object(
    'min_length', 6,
    'require_uppercase', true,
    'require_lowercase', true,
    'require_numbers', true,
    'require_special', false,
    'max_age_days', 90,
    'history_count', 5,
    'max_failed_attempts', 5,
    'lockout_duration_minutes', 15
  ),
  (SELECT id FROM auth.users WHERE email = 'rruiz@lima.llc' LIMIT 1),
  true
FROM public.dealerships d
WHERE NOT EXISTS (
  SELECT 1 FROM public.security_policies sp
  WHERE sp.dealer_id = d.id AND sp.policy_name = 'password_policy'
);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Tables created:
--   - password_reset_requests (admin-initiated resets)
--   - bulk_password_operations (bulk operations tracking)
--   - password_history (password reuse prevention)
--   - security_policies (dealer-specific policies)
--
-- Security:
--   - RLS enabled on all tables
--   - Only system_admin can manage password resets
--   - Users can view their own password history
--
-- Functions:
--   - expire_old_password_resets() - Cleanup utility
--   - update_updated_at_column() - Trigger function
-- =====================================================
