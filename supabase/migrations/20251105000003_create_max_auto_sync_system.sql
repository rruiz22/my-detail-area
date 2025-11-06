-- Migration: Create Max.Auto Auto-Sync System
-- Description: Creates tables and policies for automated Max.Auto inventory synchronization
-- Author: Claude Code
-- Date: 2025-11-05

-- =============================================================================
-- 1. Create dealer_max_auto_config table
-- =============================================================================

CREATE TABLE IF NOT EXISTS dealer_max_auto_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dealer_id BIGINT NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,

  -- Auto-sync configuration
  auto_sync_enabled BOOLEAN DEFAULT false NOT NULL,
  sync_frequency_hours INTEGER DEFAULT 12 NOT NULL CHECK (sync_frequency_hours IN (6, 12, 24)),

  -- Encrypted credentials
  username_encrypted TEXT NOT NULL,
  username_iv TEXT NOT NULL,
  username_tag TEXT NOT NULL,
  password_encrypted TEXT NOT NULL,
  password_iv TEXT NOT NULL,
  password_tag TEXT NOT NULL,

  -- Last sync status
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT CHECK (last_sync_status IN ('success', 'failed', 'in_progress')),
  last_sync_details JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Constraints
  UNIQUE(dealer_id)
);

-- Add indexes
CREATE INDEX idx_dealer_max_auto_config_dealer_id
  ON dealer_max_auto_config(dealer_id);

CREATE INDEX idx_dealer_max_auto_config_auto_sync_enabled
  ON dealer_max_auto_config(auto_sync_enabled)
  WHERE auto_sync_enabled = true;

-- Add comments
COMMENT ON TABLE dealer_max_auto_config IS 'Configuration for automated Max.Auto inventory synchronization per dealership';
COMMENT ON COLUMN dealer_max_auto_config.auto_sync_enabled IS 'Whether automatic synchronization is enabled';
COMMENT ON COLUMN dealer_max_auto_config.sync_frequency_hours IS 'How often to sync (6, 12, or 24 hours)';
COMMENT ON COLUMN dealer_max_auto_config.username_encrypted IS 'AES-256-GCM encrypted Max.Auto username';
COMMENT ON COLUMN dealer_max_auto_config.password_encrypted IS 'AES-256-GCM encrypted Max.Auto password';

-- =============================================================================
-- 2. Create RLS Policies
-- =============================================================================

ALTER TABLE dealer_max_auto_config ENABLE ROW LEVEL SECURITY;

-- System admins can view all configs
CREATE POLICY "System admins can view all Max.Auto configs"
  ON dealer_max_auto_config
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'system_admin'
  );

-- Dealer admins can view their own dealer config
CREATE POLICY "Dealer admins can view their Max.Auto config"
  ON dealer_max_auto_config
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM dealer_memberships dm
      JOIN dealer_groups dg ON dm.group_id = dg.id
      WHERE dm.user_id = auth.uid()
        AND dm.dealer_id = dealer_max_auto_config.dealer_id
        AND dg.name IN ('admin', 'dealer_admin', 'system_admin')
    )
  );

-- Dealer admins can insert/update their own dealer config
CREATE POLICY "Dealer admins can manage their Max.Auto config"
  ON dealer_max_auto_config
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM dealer_memberships dm
      JOIN dealer_groups dg ON dm.group_id = dg.id
      WHERE dm.user_id = auth.uid()
        AND dm.dealer_id = dealer_max_auto_config.dealer_id
        AND dg.name IN ('admin', 'dealer_admin', 'system_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM dealer_memberships dm
      JOIN dealer_groups dg ON dm.group_id = dg.id
      WHERE dm.user_id = auth.uid()
        AND dm.dealer_id = dealer_max_auto_config.dealer_id
        AND dg.name IN ('admin', 'dealer_admin', 'system_admin')
    )
  );

-- =============================================================================
-- 3. Create trigger for updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION update_dealer_max_auto_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_dealer_max_auto_config_updated_at
  BEFORE UPDATE ON dealer_max_auto_config
  FOR EACH ROW
  EXECUTE FUNCTION update_dealer_max_auto_config_updated_at();

-- =============================================================================
-- 4. Update dealer_inventory_sync_log to support auto-sync
-- =============================================================================

-- Add comment to clarify sync_type values
COMMENT ON COLUMN dealer_inventory_sync_log.sync_type IS 'Type of sync: csv_upload (manual), auto_dms_sync (automated), or manual_dms_sync';

-- =============================================================================
-- 5. Create Storage Bucket (if not exists)
-- =============================================================================

-- Note: Storage bucket creation is typically done via Supabase UI or separate script
-- This is documented here for reference

-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('dealer-inventory-imports', 'dealer-inventory-imports', false)
-- ON CONFLICT (id) DO NOTHING;

-- Create storage policies for auto-sync service
-- CREATE POLICY "Service role can upload to dealer-inventory-imports"
--   ON storage.objects FOR INSERT
--   TO service_role
--   WITH CHECK (bucket_id = 'dealer-inventory-imports');

-- =============================================================================
-- 6. Grant permissions
-- =============================================================================

-- Grant select to authenticated users (filtered by RLS)
GRANT SELECT ON dealer_max_auto_config TO authenticated;
GRANT INSERT, UPDATE, DELETE ON dealer_max_auto_config TO authenticated;

-- Grant all to service_role (for Railway bot)
GRANT ALL ON dealer_max_auto_config TO service_role;

-- =============================================================================
-- Migration complete
-- =============================================================================

-- Verify table was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'dealer_max_auto_config'
  ) THEN
    RAISE NOTICE 'Table dealer_max_auto_config created successfully';
  ELSE
    RAISE EXCEPTION 'Failed to create table dealer_max_auto_config';
  END IF;
END $$;
