-- Fix dealer_groups table field naming issue
-- This migration ensures consistency in field names

-- First, check if the table exists and what fields it has
DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dealer_groups') THEN
    RAISE NOTICE 'Table dealer_groups already exists, checking structure...';

    -- Check if the field exists with correct name
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dealer_groups' AND column_name = 'allowed_order_types') THEN
      RAISE NOTICE 'Field allowed_order_types exists, proceeding with data insertion...';
    ELSE
      RAISE NOTICE 'Field allowed_order_types does not exist, creating it...';
      -- Add the field if it doesn't exist
      ALTER TABLE public.dealer_groups ADD COLUMN allowed_order_types TEXT[] NOT NULL DEFAULT '{}';
    END IF;
  ELSE
    RAISE NOTICE 'Table dealer_groups does not exist, it will be created by the main migration...';
  END IF;
END $$;

-- Ensure rruiz@lima.llc is set as system_admin (immediate fix)
UPDATE public.profiles
SET
  role = 'system_admin',
  user_type = 'dealer',
  updated_at = NOW()
WHERE email = 'rruiz@lima.llc';

-- Ensure dealership_id is set for rruiz@lima.llc
UPDATE public.profiles
SET dealership_id = COALESCE(
  dealership_id,
  (SELECT id FROM public.dealerships WHERE status = 'active' ORDER BY id ASC LIMIT 1)
)
WHERE email = 'rruiz@lima.llc' AND dealership_id IS NULL;

-- Create simplified role enum if it doesn't exist
DO $$
BEGIN
  -- Check if the role enum exists
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('dealer_user', 'manager', 'system_admin');
  ELSE
    -- Add new values if they don't exist
    BEGIN
      ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'dealer_user';
      ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'manager';
      ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'system_admin';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- Verify rruiz@lima.llc is system_admin
DO $$
DECLARE
  user_role TEXT;
  user_dealer_id INTEGER;
BEGIN
  SELECT role, dealership_id INTO user_role, user_dealer_id
  FROM public.profiles
  WHERE email = 'rruiz@lima.llc';

  IF user_role = 'system_admin' THEN
    RAISE NOTICE 'SUCCESS: rruiz@lima.llc is configured as system_admin with dealer_id: %', user_dealer_id;
  ELSE
    RAISE WARNING 'WARNING: rruiz@lima.llc role is: % (expected: system_admin)', user_role;
  END IF;
END $$;