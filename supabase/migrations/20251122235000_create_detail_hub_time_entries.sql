-- Create table for DetailHub time clock entries
CREATE TABLE IF NOT EXISTS detail_hub_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES detail_hub_employees(id) ON DELETE CASCADE,
  dealership_id INTEGER NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('clock_in', 'clock_out', 'start_break', 'end_break')),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  photo_url TEXT,
  ip_address TEXT,
  user_agent TEXT,
  is_remote BOOLEAN DEFAULT FALSE,
  remote_token_id UUID, -- Will add FK constraint after remote_kiosk_tokens is created
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_time_entries_employee_id ON detail_hub_time_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_dealership_id ON detail_hub_time_entries(dealership_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_timestamp ON detail_hub_time_entries(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_remote_token ON detail_hub_time_entries(remote_token_id) WHERE remote_token_id IS NOT NULL;

-- Add RLS policies
ALTER TABLE detail_hub_time_entries ENABLE ROW LEVEL SECURITY;

-- Allow service role to do everything (for Edge Functions)
CREATE POLICY "Service role has full access to time entries"
ON detail_hub_time_entries
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow authenticated users to view time entries for their dealership
CREATE POLICY "Users can view time entries for their dealership"
ON detail_hub_time_entries
FOR SELECT
TO authenticated
USING (
  dealership_id IN (
    SELECT dealer_id
    FROM dealer_memberships
    WHERE user_id = auth.uid()
  )
);

-- Add comment
COMMENT ON TABLE detail_hub_time_entries IS
'Stores time clock entries for DetailHub employees (clock in/out, breaks).
Supports both local kiosk and remote kiosk (via temporary JWT tokens).';
