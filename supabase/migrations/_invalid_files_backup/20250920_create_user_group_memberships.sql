-- Create user_group_memberships table for assigning users to dealer groups
-- This table manages which users belong to which groups within their dealer

CREATE TABLE IF NOT EXISTS public.user_group_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.dealer_groups(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,

  -- Constraints
  UNIQUE(user_id, group_id)
);

-- Create indexes for performance
CREATE INDEX idx_user_group_memberships_user_id ON public.user_group_memberships(user_id);
CREATE INDEX idx_user_group_memberships_group_id ON public.user_group_memberships(group_id);
CREATE INDEX idx_user_group_memberships_active ON public.user_group_memberships(user_id, is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.user_group_memberships ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see memberships related to their dealer
CREATE POLICY "user_group_memberships_isolation" ON public.user_group_memberships
FOR ALL TO authenticated
USING (
  -- Users can see their own memberships
  user_id = auth.uid()
  OR
  -- Users can see memberships for groups in their dealer
  EXISTS (
    SELECT 1 FROM public.dealer_groups dg
    JOIN public.profiles p ON p.dealership_id = dg.dealer_id
    WHERE dg.id = group_id
    AND p.id = auth.uid()
    AND p.role IN ('manager', 'system_admin')
  )
  OR
  -- System admin can see all memberships
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'system_admin'
  )
);

-- Create function to get user's allowed order types based on groups
CREATE OR REPLACE FUNCTION public.get_user_allowed_order_types(user_uuid UUID)
RETURNS TEXT[]
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    ARRAY_AGG(DISTINCT unnest_val),
    '{}'::TEXT[]
  )
  FROM (
    SELECT unnest(dg.allowed_order_types) as unnest_val
    FROM public.dealer_groups dg
    JOIN public.user_group_memberships ugm ON dg.id = ugm.group_id
    WHERE ugm.user_id = user_uuid
    AND ugm.is_active = true
    AND dg.is_active = true
  ) AS flattened;
$$;

-- Create function to check if user can access specific order type
CREATE OR REPLACE FUNCTION public.can_user_access_order_type(
  user_uuid UUID,
  target_order_type TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    -- System admin can access everything
    (SELECT role FROM public.profiles WHERE id = user_uuid) = 'system_admin'
    OR
    -- Manager can access everything from their dealer
    (SELECT role FROM public.profiles WHERE id = user_uuid) = 'manager'
    OR
    -- Detail users can access all order types from their dealer
    (
      (SELECT role FROM public.profiles WHERE id = user_uuid) = 'dealer_user'
      AND (SELECT user_type FROM public.profiles WHERE id = user_uuid) = 'detail'
    )
    OR
    -- Dealer users can access based on their groups
    (
      (SELECT role FROM public.profiles WHERE id = user_uuid) = 'dealer_user'
      AND (SELECT user_type FROM public.profiles WHERE id = user_uuid) = 'dealer'
      AND target_order_type = ANY(public.get_user_allowed_order_types(user_uuid))
    );
$$;