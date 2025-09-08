-- Fix security vulnerability in detail_users table
-- Add proper user_id foreign key and update RLS policies

-- Step 1: Add user_id column to properly reference auth.users
ALTER TABLE public.detail_users 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: Create index for performance
CREATE INDEX idx_detail_users_user_id ON public.detail_users(user_id);

-- Step 3: Update existing records to link with auth.users based on email
-- This is a one-time migration to populate the user_id field
UPDATE public.detail_users 
SET user_id = auth_users.id
FROM auth.users as auth_users
WHERE detail_users.email = auth_users.email
AND detail_users.user_id IS NULL;

-- Step 4: Drop the old insecure RLS policies
DROP POLICY IF EXISTS "secure_view_own_profile_only" ON public.detail_users;
DROP POLICY IF EXISTS "secure_update_own_profile_only" ON public.detail_users;
DROP POLICY IF EXISTS "secure_block_all_inserts" ON public.detail_users;
DROP POLICY IF EXISTS "secure_block_all_deletes" ON public.detail_users;

-- Step 5: Create new secure RLS policies using auth.uid()
CREATE POLICY "Users can view own profile only" 
ON public.detail_users 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile only" 
ON public.detail_users 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Step 6: Admins can manage all detail users (if needed)
CREATE POLICY "Admins can manage all detail users" 
ON public.detail_users 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- Step 7: Block direct inserts/deletes for non-admin users for security
CREATE POLICY "Block unauthorized inserts" 
ON public.detail_users 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

CREATE POLICY "Block unauthorized deletes" 
ON public.detail_users 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- Step 8: Add constraint to ensure user_id is not null for new records
-- (We'll make this optional initially to avoid issues with existing data)
-- ALTER TABLE public.detail_users 
-- ADD CONSTRAINT detail_users_user_id_not_null 
-- CHECK (user_id IS NOT NULL);

-- Step 9: Create a trigger to automatically populate user_id on insert
CREATE OR REPLACE FUNCTION public.set_detail_user_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Set user_id to the authenticated user's ID if not already set
  IF NEW.user_id IS NULL THEN
    NEW.user_id = auth.uid();
  END IF;
  
  -- Ensure the user_id matches the authenticated user (security check)
  IF NEW.user_id != auth.uid() AND NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Cannot set user_id to a different user unless you are an admin';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER set_detail_user_id_trigger
  BEFORE INSERT OR UPDATE ON public.detail_users
  FOR EACH ROW
  EXECUTE FUNCTION public.set_detail_user_id();