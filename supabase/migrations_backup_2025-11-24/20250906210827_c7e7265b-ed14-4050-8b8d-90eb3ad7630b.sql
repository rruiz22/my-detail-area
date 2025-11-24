-- Fix dealership creation RLS policies

-- Drop the existing restrictive policies
DROP POLICY IF EXISTS "Admins can manage all dealerships" ON public.dealerships;
DROP POLICY IF EXISTS "Users can view assigned dealership" ON public.dealerships;

-- Create more flexible policies

-- Allow admins to manage all dealerships
CREATE POLICY "Admins can manage all dealerships" 
ON public.dealerships 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Allow users to create their first dealership (when they don't have one assigned)
CREATE POLICY "Users can create first dealership" 
ON public.dealerships 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.dealership_id IS NULL
  )
);

-- Allow users to view and update their assigned dealership
CREATE POLICY "Users can manage assigned dealership" 
ON public.dealerships 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.dealership_id = dealerships.id OR profiles.role = 'admin')
  )
);

-- Allow users to view dealerships they're associated with
CREATE POLICY "Users can view assigned dealership" 
ON public.dealerships 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.dealership_id = dealerships.id OR profiles.role = 'admin')
  )
);

-- Create a function to automatically assign dealership to user after creation
CREATE OR REPLACE FUNCTION public.assign_dealership_to_creator()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the user's profile to assign them to the newly created dealership
  UPDATE public.profiles 
  SET dealership_id = NEW.id,
      role = CASE 
        WHEN role = 'viewer' THEN 'manager'
        ELSE role
      END,
      updated_at = NOW()
  WHERE id = auth.uid() 
  AND dealership_id IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to automatically assign dealership after creation
CREATE TRIGGER assign_dealership_after_insert
  AFTER INSERT ON public.dealerships
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_dealership_to_creator();