-- Fix RLS policies for dealerships table to allow authenticated users to manage dealerships

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to manage dealerships" ON public.dealerships;

-- Create more permissive policies for dealerships table
-- Allow authenticated users to view all dealerships
CREATE POLICY "Allow authenticated users to view dealerships"
ON public.dealerships 
FOR SELECT 
TO authenticated
USING (true);

-- Allow authenticated users to insert dealerships
CREATE POLICY "Allow authenticated users to insert dealerships"
ON public.dealerships 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update dealerships
CREATE POLICY "Allow authenticated users to update dealerships"
ON public.dealerships 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete dealerships
CREATE POLICY "Allow authenticated users to delete dealerships"
ON public.dealerships 
FOR DELETE 
TO authenticated
USING (true);