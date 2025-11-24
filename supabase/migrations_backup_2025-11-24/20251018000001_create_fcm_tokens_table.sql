-- Create FCM tokens table for Firebase Cloud Messaging
-- This table stores FCM tokens for push notifications (alternative to web-push)
-- Created: 2025-10-18

CREATE TABLE IF NOT EXISTS fcm_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dealer_id bigint NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  fcm_token text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Ensure unique combination of user, dealer, and token
  UNIQUE(user_id, dealer_id, fcm_token)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON fcm_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_dealer_id ON fcm_tokens(dealer_id);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_is_active ON fcm_tokens(is_active);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_dealer ON fcm_tokens(user_id, dealer_id);

-- Enable Row Level Security
ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own tokens
CREATE POLICY "Users can view own fcm tokens"
  ON fcm_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own tokens
CREATE POLICY "Users can insert own fcm tokens"
  ON fcm_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own tokens
CREATE POLICY "Users can update own fcm tokens"
  ON fcm_tokens
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own tokens
CREATE POLICY "Users can delete own fcm tokens"
  ON fcm_tokens
  FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can manage all tokens (for Edge Function)
CREATE POLICY "Service role can manage all fcm tokens"
  ON fcm_tokens
  FOR ALL
  USING (auth.role() = 'service_role');

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_fcm_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_fcm_tokens_updated_at_trigger
  BEFORE UPDATE ON fcm_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_fcm_tokens_updated_at();

-- Add comment for documentation
COMMENT ON TABLE fcm_tokens IS 'Firebase Cloud Messaging tokens for push notifications (FCM alternative to web-push)';
COMMENT ON COLUMN fcm_tokens.fcm_token IS 'Firebase Cloud Messaging registration token';
COMMENT ON COLUMN fcm_tokens.is_active IS 'Whether the token is currently active and should receive notifications';
