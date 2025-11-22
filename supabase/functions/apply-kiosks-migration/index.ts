// Temporary Edge Function to apply kiosks migration
// DELETE THIS FUNCTION AFTER SUCCESSFUL MIGRATION

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const MIGRATION_SQL = `
-- Drop existing table and types to ensure clean state
DROP TABLE IF EXISTS detail_hub_kiosks CASCADE;
DROP TYPE IF EXISTS detail_hub_camera_status CASCADE;
DROP TYPE IF EXISTS detail_hub_kiosk_status CASCADE;

-- Create custom types for kiosks
CREATE TYPE detail_hub_kiosk_status AS ENUM (
  'online',
  'offline',
  'warning',
  'maintenance'
);

CREATE TYPE detail_hub_camera_status AS ENUM (
  'active',
  'inactive',
  'error'
);

-- Create table with all columns
CREATE TABLE detail_hub_kiosks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id INTEGER NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  kiosk_code TEXT NOT NULL,
  name TEXT NOT NULL,
  location TEXT,
  description TEXT,
  ip_address INET,
  mac_address MACADDR,
  status detail_hub_kiosk_status NOT NULL DEFAULT 'offline',
  camera_status detail_hub_camera_status NOT NULL DEFAULT 'inactive',
  last_ping TIMESTAMPTZ,
  last_heartbeat TIMESTAMPTZ,
  face_recognition_enabled BOOLEAN NOT NULL DEFAULT true,
  face_confidence_threshold INTEGER NOT NULL DEFAULT 80,
  kiosk_mode BOOLEAN NOT NULL DEFAULT true,
  auto_sleep BOOLEAN NOT NULL DEFAULT true,
  sleep_timeout_minutes INTEGER NOT NULL DEFAULT 30,
  allow_manual_entry BOOLEAN NOT NULL DEFAULT true,
  require_photo_fallback BOOLEAN NOT NULL DEFAULT false,
  screen_brightness INTEGER NOT NULL DEFAULT 80,
  volume INTEGER NOT NULL DEFAULT 75,
  theme TEXT DEFAULT 'default',
  total_punches INTEGER NOT NULL DEFAULT 0,
  punches_today INTEGER NOT NULL DEFAULT 0,
  last_punch_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_kiosk_code_per_dealership UNIQUE (dealership_id, kiosk_code),
  CONSTRAINT valid_brightness CHECK (screen_brightness >= 0 AND screen_brightness <= 100),
  CONSTRAINT valid_volume CHECK (volume >= 0 AND volume <= 100),
  CONSTRAINT valid_confidence_threshold CHECK (face_confidence_threshold >= 0 AND face_confidence_threshold <= 100),
  CONSTRAINT valid_sleep_timeout CHECK (sleep_timeout_minutes >= 0)
);

-- Create indexes
CREATE INDEX idx_detail_hub_kiosks_dealership ON detail_hub_kiosks(dealership_id);
CREATE INDEX idx_detail_hub_kiosks_status ON detail_hub_kiosks(status);
CREATE INDEX idx_detail_hub_kiosks_kiosk_code ON detail_hub_kiosks(kiosk_code);

-- Enable RLS
ALTER TABLE detail_hub_kiosks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view kiosks from their dealerships"
  ON detail_hub_kiosks FOR SELECT
  USING (dealership_id IN (SELECT dm.dealership_id FROM dealer_memberships dm WHERE dm.user_id = auth.uid()));

CREATE POLICY "Managers can insert kiosks"
  ON detail_hub_kiosks FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM dealer_memberships dm WHERE dm.user_id = auth.uid() AND dm.dealership_id = detail_hub_kiosks.dealership_id AND dm.role IN ('dealer_admin', 'dealer_manager', 'system_admin')));

CREATE POLICY "Managers can update kiosks"
  ON detail_hub_kiosks FOR UPDATE
  USING (EXISTS (SELECT 1 FROM dealer_memberships dm WHERE dm.user_id = auth.uid() AND dm.dealership_id = detail_hub_kiosks.dealership_id AND dm.role IN ('dealer_admin', 'dealer_manager', 'system_admin')));

CREATE POLICY "Admins can delete kiosks"
  ON detail_hub_kiosks FOR DELETE
  USING (EXISTS (SELECT 1 FROM dealer_memberships dm WHERE dm.user_id = auth.uid() AND dm.dealership_id = detail_hub_kiosks.dealership_id AND dm.role IN ('dealer_admin', 'system_admin')));
`;

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log('Executing migration SQL...')

    // Execute migration using raw SQL
    const { data, error } = await supabaseAdmin
      .from('_migrations')
      .select('*')
      .limit(1)

    if (error) {
      console.error('Database connection error:', error)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Cannot connect to database',
          details: error
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 500
        }
      )
    }

    // Note: Supabase Edge Functions don't support direct SQL execution
    // This function documents the migration SQL but cannot execute it
    // Use the Supabase SQL Editor to run MIGRATION_SQL above

    return new Response(
      JSON.stringify({
        success: false,
        message: 'Edge Functions cannot execute raw SQL. Please use Supabase SQL Editor.',
        instructions: [
          '1. Go to https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/sql/new',
          '2. Copy the MIGRATION_SQL from this function',
          '3. Paste and execute in SQL Editor',
          '4. Verify table creation with: SELECT * FROM information_schema.columns WHERE table_name = \'detail_hub_kiosks\''
        ],
        migration_sql: MIGRATION_SQL
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
