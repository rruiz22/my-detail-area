-- Add missing foreign key constraints for remote_kiosk_tokens table
-- This enables joins with profiles table for created_by and revoked_by fields

-- Add foreign key for created_by ’ profiles(id)
ALTER TABLE remote_kiosk_tokens
ADD CONSTRAINT remote_kiosk_tokens_created_by_fkey
FOREIGN KEY (created_by)
REFERENCES profiles(id)
ON DELETE SET NULL;

-- Add foreign key for revoked_by ’ profiles(id)
ALTER TABLE remote_kiosk_tokens
ADD CONSTRAINT remote_kiosk_tokens_revoked_by_fkey
FOREIGN KEY (revoked_by)
REFERENCES profiles(id)
ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_remote_kiosk_tokens_created_by ON remote_kiosk_tokens(created_by);
CREATE INDEX IF NOT EXISTS idx_remote_kiosk_tokens_revoked_by ON remote_kiosk_tokens(revoked_by);
