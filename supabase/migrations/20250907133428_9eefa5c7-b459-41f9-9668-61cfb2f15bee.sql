-- Fix infinite recursion in dealer_memberships RLS policies
-- First, create security definer functions to avoid recursive queries

-- Function to check if user has membership in a dealer
CREATE OR REPLACE FUNCTION public.user_has_dealer_membership(user_uuid uuid, target_dealer_id bigint)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dealer_memberships 
    WHERE user_id = user_uuid 
    AND dealer_id = target_dealer_id 
    AND is_active = true
  );
$$;

-- Function to check if user has specific group permission
CREATE OR REPLACE FUNCTION public.user_has_group_permission(user_uuid uuid, target_dealer_id bigint, permission_name text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.dealer_memberships dm
    JOIN public.dealer_membership_groups dmg ON dmg.membership_id = dm.id
    JOIN public.dealer_groups dg ON dg.id = dmg.group_id
    WHERE dm.user_id = user_uuid 
    AND dm.dealer_id = target_dealer_id
    AND dm.is_active = true
    AND dg.permissions ? permission_name
  );
$$;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view memberships in their dealer" ON public.dealer_memberships;
DROP POLICY IF EXISTS "Users with users.manage can modify memberships" ON public.dealer_memberships;

-- Create new secure policies using the functions
CREATE POLICY "secure_view_dealer_memberships" 
ON public.dealer_memberships 
FOR SELECT 
USING (public.user_has_dealer_membership(auth.uid(), dealer_id));

CREATE POLICY "secure_manage_dealer_memberships" 
ON public.dealer_memberships 
FOR ALL 
USING (public.user_has_group_permission(auth.uid(), dealer_id, 'users.manage'));

-- Fix dealer_groups RLS policies to use security definer functions
DROP POLICY IF EXISTS "Users can view dealer groups where they have membership" ON public.dealer_groups;
DROP POLICY IF EXISTS "Users with groups.manage can modify dealer groups" ON public.dealer_groups;

CREATE POLICY "secure_view_dealer_groups" 
ON public.dealer_groups 
FOR SELECT 
USING (public.user_has_dealer_membership(auth.uid(), dealer_id));

CREATE POLICY "secure_manage_dealer_groups" 
ON public.dealer_groups 
FOR ALL 
USING (public.user_has_group_permission(auth.uid(), dealer_id, 'groups.manage'));

-- Fix dealer_membership_groups RLS policy
DROP POLICY IF EXISTS "Users can view membership groups in their dealer" ON public.dealer_membership_groups;

CREATE POLICY "secure_view_membership_groups" 
ON public.dealer_membership_groups 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.dealer_memberships dm 
    WHERE dm.id = membership_id 
    AND public.user_has_dealer_membership(auth.uid(), dm.dealer_id)
  )
);

-- Secure system tables - restrict roles table access
DROP POLICY IF EXISTS "Users can view all roles" ON public.roles;

CREATE POLICY "secure_view_roles" 
ON public.roles 
FOR SELECT 
USING (
  -- Only allow authenticated users to view roles relevant to their user type
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND (
      roles.user_type = p.user_type 
      OR p.role = 'admin'
    )
  )
);

-- Secure role_permissions table access
DROP POLICY IF EXISTS "Users can view role permissions" ON public.role_permissions;

CREATE POLICY "secure_view_role_permissions" 
ON public.role_permissions 
FOR SELECT 
USING (
  -- Only allow users to see permissions for roles they could be assigned
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.roles r ON r.id = role_id
    WHERE p.id = auth.uid() 
    AND (
      r.user_type = p.user_type 
      OR p.role = 'admin'
    )
  )
);