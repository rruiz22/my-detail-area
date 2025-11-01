-- Use existing dealership_id column in profiles table for multi-dealer isolation
-- This ensures every user belongs to a specific dealer

-- Ensure dealership_id is NOT NULL for all existing users
UPDATE public.profiles
SET dealership_id = (
  SELECT id FROM public.dealerships
  WHERE status = 'active'
  ORDER BY id ASC
  LIMIT 1
)
WHERE dealership_id IS NULL;

-- Make dealership_id required for new users
ALTER TABLE public.profiles
ALTER COLUMN dealership_id SET NOT NULL;

-- Add default value for new user registrations
ALTER TABLE public.profiles
ALTER COLUMN dealership_id SET DEFAULT (
  SELECT id FROM public.dealerships
  WHERE status = 'active'
  ORDER BY id ASC
  LIMIT 1
);

-- Create index for performance (critical for multi-dealer queries)
CREATE INDEX IF NOT EXISTS idx_profiles_dealership_id ON public.profiles(dealership_id);

-- Update the role field to use the new simplified roles
-- First add the new roles to the enum if they don't exist
DO $$
BEGIN
  -- Add new role values if they don't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'dealer_user' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
    ALTER TYPE user_role ADD VALUE 'dealer_user';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'manager' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')) THEN
    ALTER TYPE user_role ADD VALUE 'manager';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Migrate existing users to simplified role system
-- You may need to adjust these mappings based on your current data
UPDATE public.profiles
SET role = CASE
  WHEN role = 'admin' THEN 'system_admin'::user_role
  WHEN role = 'dealer_admin' THEN 'manager'::user_role
  WHEN role = 'dealer_manager' THEN 'manager'::user_role
  WHEN role IN ('dealer_employee', 'detail_user') THEN 'dealer_user'::user_role
  ELSE 'dealer_user'::user_role
END
WHERE role NOT IN ('system_admin', 'manager', 'dealer_user');

-- Add constraint to ensure user_type is valid
ALTER TABLE public.profiles
ADD CONSTRAINT valid_user_type
CHECK (user_type IN ('dealer', 'detail'));

-- Update user_type for existing users if not set
UPDATE public.profiles
SET user_type = CASE
  WHEN role = 'system_admin' THEN 'dealer'
  WHEN user_type IS NULL THEN 'dealer'
  ELSE user_type
END
WHERE user_type IS NULL OR user_type = '';

-- Create function to get user's effective permissions
CREATE OR REPLACE FUNCTION public.get_user_effective_permissions(user_uuid UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_profile RECORD;
  allowed_order_types TEXT[];
  result JSONB;
BEGIN
  -- Get user profile
  SELECT * INTO user_profile
  FROM public.profiles
  WHERE id = user_uuid;

  IF NOT FOUND THEN
    RETURN '{"error": "User not found"}'::JSONB;
  END IF;

  -- Initialize result
  result := jsonb_build_object(
    'user_id', user_uuid,
    'role', user_profile.role,
    'user_type', user_profile.user_type,
    'assigned_dealer_id', user_profile.assigned_dealer_id,
    'can_delete_orders', false,
    'allowed_order_types', '[]'::JSONB
  );

  -- System admin has full access
  IF user_profile.role = 'system_admin' THEN
    result := result || jsonb_build_object(
      'can_delete_orders', true,
      'allowed_order_types', '["sales", "service", "recon", "carwash"]'::JSONB,
      'access_level', 'full'
    );
    RETURN result;
  END IF;

  -- Manager has access to all order types in their dealer
  IF user_profile.role = 'manager' THEN
    result := result || jsonb_build_object(
      'allowed_order_types', '["sales", "service", "recon", "carwash"]'::JSONB,
      'access_level', 'manager'
    );
    RETURN result;
  END IF;

  -- dealer_user permissions
  IF user_profile.role = 'dealer_user' THEN
    IF user_profile.user_type = 'detail' THEN
      -- Detail users can access all order types
      result := result || jsonb_build_object(
        'allowed_order_types', '["sales", "service", "recon", "carwash"]'::JSONB,
        'access_level', 'detail'
      );
    ELSE
      -- Dealer users: access based on groups
      SELECT public.get_user_allowed_order_types(user_uuid) INTO allowed_order_types;
      result := result || jsonb_build_object(
        'allowed_order_types', to_jsonb(allowed_order_types),
        'access_level', 'dealer'
      );
    END IF;
  END IF;

  RETURN result;
END;
$$;