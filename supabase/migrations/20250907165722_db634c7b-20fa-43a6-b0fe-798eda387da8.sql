-- Drop existing restrictive policies for dealer_groups
DROP POLICY IF EXISTS "secure_manage_dealer_groups" ON public.dealer_groups;

-- Create more permissive policies for dealer_groups
-- Allow dealer members to manage groups
CREATE POLICY "dealer_members_can_manage_groups" 
ON public.dealer_groups 
FOR ALL 
USING (user_has_dealer_membership(auth.uid(), dealer_id))
WITH CHECK (user_has_dealer_membership(auth.uid(), dealer_id));

-- Add missing policies for dealer_membership_groups
-- Drop existing policy if exists
DROP POLICY IF EXISTS "secure_manage_membership_groups" ON public.dealer_membership_groups;

-- Allow dealer members to manage membership groups
CREATE POLICY "dealer_members_can_manage_membership_groups" 
ON public.dealer_membership_groups 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.dealer_memberships dm
    JOIN public.dealer_groups dg ON dg.dealer_id = dm.dealer_id
    WHERE dm.user_id = auth.uid() 
    AND dm.is_active = true
    AND (dg.id = dealer_membership_groups.group_id OR dm.id = dealer_membership_groups.membership_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.dealer_memberships dm
    JOIN public.dealer_groups dg ON dg.dealer_id = dm.dealer_id
    WHERE dm.user_id = auth.uid() 
    AND dm.is_active = true
    AND (dg.id = dealer_membership_groups.group_id OR dm.id = dealer_membership_groups.membership_id)
  )
);