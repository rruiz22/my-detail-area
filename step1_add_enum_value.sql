-- STEP 1: Add system_admin to user_type enum
-- Execute this first, then execute step2_fix_rls_policies.sql

-- Check current enum values
SELECT 'Current user_type enum values:' as info;
SELECT enumlabel FROM pg_enum WHERE enumtypid = (
  SELECT oid FROM pg_type WHERE typname = 'user_type'
) ORDER BY enumlabel;

-- Add system_admin to the enum if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'system_admin' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_type')
  ) THEN
    ALTER TYPE user_type ADD VALUE 'system_admin';
    RAISE NOTICE 'Added system_admin to user_type enum';
  ELSE
    RAISE NOTICE 'system_admin already exists in user_type enum';
  END IF;
END $$;

-- Verify the addition
SELECT 'Updated user_type enum values:' as info;
SELECT enumlabel FROM pg_enum WHERE enumtypid = (
  SELECT oid FROM pg_type WHERE typname = 'user_type'
) ORDER BY enumlabel;