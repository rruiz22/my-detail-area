-- Create RLS policies for complete multi-dealer isolation
-- This ensures users only see data from their assigned dealership

-- ==================================================
-- ORDERS TABLE - Core isolation policy
-- ==================================================

-- Enable RLS on orders table
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Policy 1: Dealer isolation for orders
CREATE POLICY "orders_dealer_isolation" ON public.orders
FOR ALL TO authenticated
USING (
  dealer_id = (
    SELECT dealership_id
    FROM public.profiles
    WHERE id = auth.uid()
  )
  OR
  -- System admin can see all orders
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'system_admin'
  )
);

-- Policy 2: Order type access based on user groups (for dealer_user + user_type:'dealer')
CREATE POLICY "orders_module_access" ON public.orders
FOR SELECT TO authenticated
USING (
  -- System admin sees everything
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'system_admin'
  )
  OR
  -- Manager sees all order types from their dealer
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'manager'
    AND p.dealership_id = dealer_id
  )
  OR
  -- Detail users see all order types from their dealer
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'dealer_user'
    AND p.user_type = 'detail'
    AND p.dealership_id = dealer_id
  )
  OR
  -- Dealer users see only order types allowed by their groups
  (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'dealer_user'
      AND p.user_type = 'dealer'
      AND p.dealership_id = dealer_id
    )
    AND
    order_type = ANY(public.get_user_allowed_order_types(auth.uid()))
  )
);

-- Policy 3: Order editing restrictions (only non-completed/cancelled orders)
CREATE POLICY "orders_edit_status_restriction" ON public.orders
FOR UPDATE TO authenticated
USING (
  -- Can only edit if status is not completed or cancelled
  status NOT IN ('completed', 'cancelled')
  AND
  -- Must pass dealer isolation check
  (
    dealer_id = (
      SELECT dealership_id
      FROM public.profiles
      WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'system_admin'
    )
  )
);

-- Policy 4: Order deletion (only system_admin)
CREATE POLICY "orders_delete_admin_only" ON public.orders
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'system_admin'
  )
);

-- ==================================================
-- PROFILES TABLE - User visibility isolation
-- ==================================================

-- Policy: Users can only see profiles from their dealer
CREATE POLICY "profiles_dealer_isolation" ON public.profiles
FOR SELECT TO authenticated
USING (
  dealership_id = (
    SELECT dealership_id
    FROM public.profiles
    WHERE id = auth.uid()
  )
  OR
  -- System admin can see all profiles
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'system_admin'
  )
  OR
  -- Users can always see their own profile
  id = auth.uid()
);

-- ==================================================
-- CONTACTS TABLE - Dealer isolation (if applicable)
-- ==================================================

-- Check if contacts table exists and has dealer_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dealership_contacts') THEN
    -- Enable RLS on contacts
    ALTER TABLE public.dealership_contacts ENABLE ROW LEVEL SECURITY;

    -- Contacts isolation policy
    CREATE POLICY "contacts_dealer_isolation" ON public.dealership_contacts
    FOR ALL TO authenticated
    USING (
      dealership_id = (
        SELECT dealership_id
        FROM public.profiles
        WHERE id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role = 'system_admin'
      )
    );
  END IF;
END $$;

-- ==================================================
-- PERFORMANCE OPTIMIZATION
-- ==================================================

-- Critical indexes for multi-dealer performance
CREATE INDEX IF NOT EXISTS idx_orders_dealer_type_status ON public.orders(dealer_id, order_type, status);
CREATE INDEX IF NOT EXISTS idx_orders_dealer_created ON public.orders(dealer_id, created_at DESC);

-- Index for frequent permission checks
CREATE INDEX IF NOT EXISTS idx_profiles_role_dealership ON public.profiles(role, dealership_id);

-- ==================================================
-- HELPER FUNCTIONS FOR PERMISSIONS
-- ==================================================

-- Function to check if user can edit specific order
CREATE OR REPLACE FUNCTION public.can_user_edit_order(
  user_uuid UUID,
  target_order_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.profiles p ON p.id = user_uuid
    WHERE o.id = target_order_id
    AND (
      -- System admin can edit everything
      p.role = 'system_admin'
      OR
      (
        -- Same dealer check
        o.dealer_id = p.dealership_id
        AND
        -- Status check (can't edit completed/cancelled)
        o.status NOT IN ('completed', 'cancelled')
        AND
        (
          -- Manager can edit any order from their dealer
          p.role = 'manager'
          OR
          -- Detail users can edit any order type from their dealer
          (p.role = 'dealer_user' AND p.user_type = 'detail')
          OR
          -- Dealer users can edit based on their groups
          (
            p.role = 'dealer_user'
            AND p.user_type = 'dealer'
            AND o.order_type = ANY(public.get_user_allowed_order_types(user_uuid))
          )
        )
      )
    )
  );
$$;