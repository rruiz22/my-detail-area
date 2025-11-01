-- Create dealer_groups table for multi-dealership permission system
-- This table defines groups within each dealer (Salespersons, Service Team, etc.)

CREATE TABLE IF NOT EXISTS public.dealer_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id INTEGER NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL, -- 'Salespersons', 'Service Team', 'Recon Team', etc.
  slug VARCHAR(100) NOT NULL, -- 'salespersons', 'service', 'recon', 'carwash'
  description TEXT,
  allowed_order_types TEXT[] NOT NULL DEFAULT '{}', -- ['sales'] or ['service'] or ['recon', 'carwash']
  permissions JSONB DEFAULT '{"orders": "edit", "contacts": "view"}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Constraints
  UNIQUE(dealer_id, slug),
  CONSTRAINT valid_order_types CHECK (
    allowed_order_types <@ ARRAY['sales', 'service', 'recon', 'carwash']
  )
);

-- Create indexes for performance
CREATE INDEX idx_dealer_groups_dealer_id ON public.dealer_groups(dealer_id);
CREATE INDEX idx_dealer_groups_active ON public.dealer_groups(dealer_id, is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.dealer_groups ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see groups from their assigned dealer
CREATE POLICY "dealer_groups_isolation" ON public.dealer_groups
FOR ALL TO authenticated
USING (
  dealer_id = (
    SELECT dealership_id
    FROM public.profiles
    WHERE id = auth.uid()
  )
  OR
  -- System admin can see all groups
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'system_admin'
  )
);

-- Insert default groups for existing dealers
DO $$
DECLARE
  dealer_record RECORD;
BEGIN
  FOR dealer_record IN SELECT id FROM public.dealerships WHERE status = 'active'
  LOOP
    -- Salespersons Group
    INSERT INTO public.dealer_groups (dealer_id, name, slug, description, allowed_order_types)
    VALUES (
      dealer_record.id,
      'Salespersons',
      'salespersons',
      'Sales representatives who handle vehicle sales',
      ARRAY['sales']
    );

    -- Service Team Group
    INSERT INTO public.dealer_groups (dealer_id, name, slug, description, allowed_order_types)
    VALUES (
      dealer_record.id,
      'Service Team',
      'service',
      'Service advisors and technicians who handle service orders',
      ARRAY['service']
    );

    -- Recon Team Group
    INSERT INTO public.dealer_groups (dealer_id, name, slug, description, allowed_order_types)
    VALUES (
      dealer_record.id,
      'Recon Team',
      'recon',
      'Reconditioning specialists who handle vehicle preparation',
      ARRAY['recon']
    );

    -- Car Wash Team Group
    INSERT INTO public.dealer_groups (dealer_id, name, slug, description, allowed_order_types)
    VALUES (
      dealer_record.id,
      'Car Wash Team',
      'carwash',
      'Car wash attendants who handle quick service',
      ARRAY['carwash']
    );

    -- Management Group (access to all modules)
    INSERT INTO public.dealer_groups (dealer_id, name, slug, description, allowed_order_types)
    VALUES (
      dealer_record.id,
      'Management',
      'management',
      'Managers with access to all order types and reports',
      ARRAY['sales', 'service', 'recon', 'carwash']
    );

  END LOOP;
END $$;