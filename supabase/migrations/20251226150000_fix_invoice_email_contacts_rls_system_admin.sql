-- =====================================================
-- FIX INVOICE EMAIL CONTACTS RLS FOR SYSTEM ADMINS
-- Created: 2025-12-26
-- Description: Update RLS policies to allow system admins
--              and supermanagers access to all dealerships
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view contacts for their accessible dealerships" ON public.invoice_email_contacts;
DROP POLICY IF EXISTS "Users can create contacts for their accessible dealerships" ON public.invoice_email_contacts;
DROP POLICY IF EXISTS "Users can update contacts for their accessible dealerships" ON public.invoice_email_contacts;
DROP POLICY IF EXISTS "Users can delete contacts for their accessible dealerships" ON public.invoice_email_contacts;

-- =====================================================
-- NEW POLICIES WITH SYSTEM ADMIN SUPPORT
-- =====================================================

-- SELECT Policy
CREATE POLICY "invoice_email_contacts_select"
  ON public.invoice_email_contacts
  FOR SELECT
  TO authenticated
  USING (
    -- System admin can see all contacts
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'system_admin'
    )
    OR
    -- Supermanager can see all contacts
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'supermanager'
    )
    OR
    -- Users with active dealer membership can see their dealership contacts
    dealership_id IN (
      SELECT dealer_id
      FROM public.dealer_memberships
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

-- INSERT Policy
CREATE POLICY "invoice_email_contacts_insert"
  ON public.invoice_email_contacts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- System admin can create contacts for any dealership
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'system_admin'
    )
    OR
    -- Supermanager can create contacts for any dealership
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'supermanager'
    )
    OR
    -- Users with active dealer membership can create contacts for their dealership
    dealership_id IN (
      SELECT dealer_id
      FROM public.dealer_memberships
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

-- UPDATE Policy
CREATE POLICY "invoice_email_contacts_update"
  ON public.invoice_email_contacts
  FOR UPDATE
  TO authenticated
  USING (
    -- System admin can update any contacts
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'system_admin'
    )
    OR
    -- Supermanager can update any contacts
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'supermanager'
    )
    OR
    -- Users with active dealer membership can update their dealership contacts
    dealership_id IN (
      SELECT dealer_id
      FROM public.dealer_memberships
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

-- DELETE Policy
CREATE POLICY "invoice_email_contacts_delete"
  ON public.invoice_email_contacts
  FOR DELETE
  TO authenticated
  USING (
    -- System admin can delete any contacts
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'system_admin'
    )
    OR
    -- Supermanager can delete any contacts
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'supermanager'
    )
    OR
    -- Users with active dealer membership can delete their dealership contacts
    dealership_id IN (
      SELECT dealer_id
      FROM public.dealer_memberships
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

-- =====================================================
-- ALSO FIX invoice_email_history POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view email history for their accessible dealerships" ON public.invoice_email_history;
DROP POLICY IF EXISTS "Users can create email history for their accessible dealerships" ON public.invoice_email_history;

-- SELECT Policy for email history
CREATE POLICY "invoice_email_history_select"
  ON public.invoice_email_history
  FOR SELECT
  TO authenticated
  USING (
    -- System admin can see all history
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'system_admin'
    )
    OR
    -- Supermanager can see all history
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'supermanager'
    )
    OR
    -- Users with active dealer membership
    dealership_id IN (
      SELECT dealer_id
      FROM public.dealer_memberships
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

-- INSERT Policy for email history
CREATE POLICY "invoice_email_history_insert"
  ON public.invoice_email_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- System admin can create history for any dealership
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'system_admin'
    )
    OR
    -- Supermanager can create history for any dealership
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'supermanager'
    )
    OR
    -- Users with active dealer membership
    dealership_id IN (
      SELECT dealer_id
      FROM public.dealer_memberships
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
  );

-- =====================================================
-- VERIFY
-- =====================================================
-- Run this query to verify policies were created:
-- SELECT schemaname, tablename, policyname
-- FROM pg_policies
-- WHERE tablename IN ('invoice_email_contacts', 'invoice_email_history');
