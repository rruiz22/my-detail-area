-- CRITICAL SECURITY FIX: Implement proper RLS policies and user profiles

-- First, create a profiles table for user data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('admin', 'manager', 'technician', 'viewer')),
  dealership_id BIGINT REFERENCES public.dealerships(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create trigger for auto-creating profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- CRITICAL: Fix overly permissive RLS policies on dealerships
DROP POLICY IF EXISTS "Allow authenticated users to delete dealerships" ON public.dealerships;
DROP POLICY IF EXISTS "Allow authenticated users to insert dealerships" ON public.dealerships;
DROP POLICY IF EXISTS "Allow authenticated users to update dealerships" ON public.dealerships;
DROP POLICY IF EXISTS "Allow authenticated users to view dealerships" ON public.dealerships;

-- Create secure dealership policies
CREATE POLICY "Admins can manage all dealerships" ON public.dealerships
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can view assigned dealership" ON public.dealerships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.dealership_id = dealerships.id OR profiles.role = 'admin')
    )
  );

-- CRITICAL: Fix overly permissive RLS policies on dealership_contacts
DROP POLICY IF EXISTS "Allow authenticated users to manage contacts" ON public.dealership_contacts;

-- Create secure contact policies
CREATE POLICY "Admins can manage all contacts" ON public.dealership_contacts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can view dealership contacts" ON public.dealership_contacts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.dealership_id = dealership_contacts.dealership_id OR profiles.role = 'admin')
    )
  );

CREATE POLICY "Managers can manage dealership contacts" ON public.dealership_contacts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.dealership_id = dealership_contacts.dealership_id
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Add updated_at trigger for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();