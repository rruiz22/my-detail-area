-- CRITICAL SECURITY FIX: Remove anonymous access from sensitive tables
-- This fixes the major security vulnerabilities detected by the scanner

-- Fix dealer_invitations table - Remove anonymous access
DROP POLICY IF EXISTS "Dealers can create invitations for their dealership" ON public.dealer_invitations;
DROP POLICY IF EXISTS "Users can view invitations they created or received" ON public.dealer_invitations;
DROP POLICY IF EXISTS "Inviter can update their invitations" ON public.dealer_invitations;

-- Create secure authenticated-only policies for dealer_invitations
CREATE POLICY "Authenticated dealers can create invitations for their dealership" 
ON public.dealer_invitations
FOR INSERT 
TO authenticated
WITH CHECK (
  is_admin() OR user_has_active_dealer_membership(auth.uid(), dealer_id)
);

CREATE POLICY "Authenticated users can view invitations they created or received" 
ON public.dealer_invitations
FOR SELECT 
TO authenticated
USING (
  (inviter_id = auth.uid()) OR 
  (email = auth.email()) OR 
  is_admin()
);

CREATE POLICY "Authenticated inviters can update their invitations" 
ON public.dealer_invitations
FOR UPDATE 
TO authenticated
USING ((inviter_id = auth.uid()) OR is_admin())
WITH CHECK ((inviter_id = auth.uid()) OR is_admin());

-- Fix dealership_contacts table - Remove anonymous access
DROP POLICY IF EXISTS "Admins can manage all contacts" ON public.dealership_contacts;
DROP POLICY IF EXISTS "Managers can manage dealership contacts" ON public.dealership_contacts;
DROP POLICY IF EXISTS "Users can view dealership contacts" ON public.dealership_contacts;

-- Create secure authenticated-only policies for dealership_contacts
CREATE POLICY "Authenticated admins can manage all contacts" 
ON public.dealership_contacts
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Authenticated managers can manage dealership contacts" 
ON public.dealership_contacts
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.dealership_id = dealership_contacts.dealership_id 
    AND profiles.role = ANY(ARRAY['admin', 'manager'])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.dealership_id = dealership_contacts.dealership_id 
    AND profiles.role = ANY(ARRAY['admin', 'manager'])
  )
);

CREATE POLICY "Authenticated users can view dealership contacts" 
ON public.dealership_contacts
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND (
      profiles.dealership_id = dealership_contacts.dealership_id OR 
      profiles.role = 'admin'
    )
  )
);

-- Fix dealerships table - Remove anonymous access  
DROP POLICY IF EXISTS "Admins can manage all dealerships" ON public.dealerships;
DROP POLICY IF EXISTS "Users can manage assigned dealership" ON public.dealerships;
DROP POLICY IF EXISTS "Users can create first dealership" ON public.dealerships;
DROP POLICY IF EXISTS "Users can view assigned dealership" ON public.dealerships;

-- Create secure authenticated-only policies for dealerships
CREATE POLICY "Authenticated admins can manage all dealerships" 
ON public.dealerships
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Authenticated users can manage assigned dealership" 
ON public.dealerships
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND (
      profiles.dealership_id = dealerships.id OR 
      profiles.role = 'admin'
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND (
      profiles.dealership_id = dealerships.id OR 
      profiles.role = 'admin'
    )
  )
);

CREATE POLICY "Authenticated users can create first dealership" 
ON public.dealerships
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.dealership_id IS NULL
  )
);

CREATE POLICY "Authenticated users can view assigned dealership" 
ON public.dealerships
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND (
      profiles.dealership_id = dealerships.id OR 
      profiles.role = 'admin'
    )
  )
);