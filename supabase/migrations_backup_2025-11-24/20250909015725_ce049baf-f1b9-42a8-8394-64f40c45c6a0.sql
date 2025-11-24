-- CRITICAL SECURITY FIX: Remove anonymous access from sensitive tables
-- Fix policy names and ensure no conflicts

-- Fix dealer_invitations table
DROP POLICY IF EXISTS "Authenticated dealers can create invitations for their dealersh" ON public.dealer_invitations;
DROP POLICY IF EXISTS "Authenticated dealers can create invitations for their dealership" ON public.dealer_invitations;
DROP POLICY IF EXISTS "Authenticated users can view invitations they created or received" ON public.dealer_invitations;
DROP POLICY IF EXISTS "Authenticated inviters can update their invitations" ON public.dealer_invitations;

-- Create secure policies for dealer_invitations (short names)
CREATE POLICY "auth_create_invitations" 
ON public.dealer_invitations
FOR INSERT 
TO authenticated
WITH CHECK (
  is_admin() OR user_has_active_dealer_membership(auth.uid(), dealer_id)
);

CREATE POLICY "auth_view_invitations" 
ON public.dealer_invitations
FOR SELECT 
TO authenticated
USING (
  (inviter_id = auth.uid()) OR 
  (email = auth.email()) OR 
  is_admin()
);

CREATE POLICY "auth_update_invitations" 
ON public.dealer_invitations
FOR UPDATE 
TO authenticated
USING ((inviter_id = auth.uid()) OR is_admin())
WITH CHECK ((inviter_id = auth.uid()) OR is_admin());

-- Fix dealership_contacts table  
DROP POLICY IF EXISTS "Authenticated admins can manage all contacts" ON public.dealership_contacts;
DROP POLICY IF EXISTS "Authenticated managers can manage dealership contacts" ON public.dealership_contacts;
DROP POLICY IF EXISTS "Authenticated users can view dealership contacts" ON public.dealership_contacts;

-- Create secure policies for dealership_contacts (short names)
CREATE POLICY "auth_admin_manage_contacts" 
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

CREATE POLICY "auth_manager_manage_contacts" 
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

CREATE POLICY "auth_view_contacts" 
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

-- Fix dealerships table
DROP POLICY IF EXISTS "Authenticated admins can manage all dealerships" ON public.dealerships;
DROP POLICY IF EXISTS "Authenticated users can manage assigned dealership" ON public.dealerships;
DROP POLICY IF EXISTS "Authenticated users can create first dealership" ON public.dealerships;
DROP POLICY IF EXISTS "Authenticated users can view assigned dealership" ON public.dealerships;

-- Create secure policies for dealerships (short names)
CREATE POLICY "auth_admin_manage_dealerships" 
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

CREATE POLICY "auth_manage_assigned_dealership" 
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

CREATE POLICY "auth_create_first_dealership" 
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

CREATE POLICY "auth_view_assigned_dealership" 
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