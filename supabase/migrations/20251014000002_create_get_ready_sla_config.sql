-- =====================================================
-- GET READY SLA CONFIGURATION TABLE
-- Configurable time goals and alert thresholds per dealership
-- =====================================================

-- =====================================================
-- 1. CREATE SLA CONFIGURATION TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.get_ready_sla_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id BIGINT NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,

  -- Global time goals (in days)
  default_time_goal INTEGER NOT NULL DEFAULT 4 CHECK (default_time_goal BETWEEN 1 AND 14),
  max_time_goal INTEGER NOT NULL DEFAULT 7 CHECK (max_time_goal BETWEEN 1 AND 14),

  -- Alert thresholds (in days)
  green_threshold INTEGER NOT NULL DEFAULT 1 CHECK (green_threshold >= 0),
  warning_threshold INTEGER NOT NULL DEFAULT 3 CHECK (warning_threshold > green_threshold),
  danger_threshold INTEGER NOT NULL DEFAULT 4 CHECK (danger_threshold > warning_threshold),

  -- Notifications
  enable_notifications BOOLEAN DEFAULT true,
  notification_recipients TEXT[], -- Array of email addresses or user IDs

  -- Business hours (optional, for SLA calculations)
  business_hours_start TIME DEFAULT '08:00:00',
  business_hours_end TIME DEFAULT '18:00:00',
  business_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5], -- Mon-Fri (1=Monday, 7=Sunday)
  count_weekends BOOLEAN DEFAULT true,
  count_business_hours_only BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),

  -- Ensure one config per dealer
  UNIQUE(dealer_id)
);

-- Add comments
COMMENT ON TABLE public.get_ready_sla_config IS 'Configurable SLA settings for Get Ready module per dealership';
COMMENT ON COLUMN public.get_ready_sla_config.default_time_goal IS 'Default time goal in days (1-14)';
COMMENT ON COLUMN public.get_ready_sla_config.max_time_goal IS 'Maximum allowed time goal in days (1-14)';
COMMENT ON COLUMN public.get_ready_sla_config.green_threshold IS 'Days threshold for green status (optimal)';
COMMENT ON COLUMN public.get_ready_sla_config.warning_threshold IS 'Days threshold for warning status';
COMMENT ON COLUMN public.get_ready_sla_config.danger_threshold IS 'Days threshold for danger/critical status';
COMMENT ON COLUMN public.get_ready_sla_config.count_business_hours_only IS 'If true, only count business hours in SLA calculations';

-- =====================================================
-- 2. CREATE STEP-SPECIFIC SLA OVERRIDES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.get_ready_step_sla_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sla_config_id UUID NOT NULL REFERENCES public.get_ready_sla_config(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL REFERENCES public.get_ready_steps(id) ON DELETE CASCADE,

  -- Step-specific overrides
  time_goal INTEGER NOT NULL CHECK (time_goal BETWEEN 1 AND 14),
  green_threshold INTEGER NOT NULL CHECK (green_threshold >= 0),
  warning_threshold INTEGER NOT NULL CHECK (warning_threshold > green_threshold),
  danger_threshold INTEGER NOT NULL CHECK (danger_threshold > warning_threshold),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One override per step per config
  UNIQUE(sla_config_id, step_id)
);

COMMENT ON TABLE public.get_ready_step_sla_config IS 'Step-specific SLA overrides (optional)';
COMMENT ON COLUMN public.get_ready_step_sla_config.time_goal IS 'Time goal in days for this specific step';

-- =====================================================
-- 3. CREATE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_get_ready_sla_config_dealer
  ON public.get_ready_sla_config(dealer_id);

CREATE INDEX IF NOT EXISTS idx_get_ready_step_sla_config_config
  ON public.get_ready_step_sla_config(sla_config_id);

CREATE INDEX IF NOT EXISTS idx_get_ready_step_sla_config_step
  ON public.get_ready_step_sla_config(step_id);

-- =====================================================
-- 4. ENABLE RLS
-- =====================================================
ALTER TABLE public.get_ready_sla_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.get_ready_step_sla_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for get_ready_sla_config
CREATE POLICY "Users can view SLA config for their dealerships"
  ON public.get_ready_sla_config FOR SELECT
  USING (user_has_active_dealer_membership(auth.uid(), dealer_id));

CREATE POLICY "Admins can manage SLA config for their dealerships"
  ON public.get_ready_sla_config FOR ALL
  USING (
    user_has_active_dealer_membership(auth.uid(), dealer_id)
    AND user_has_group_permission(auth.uid(), dealer_id, 'get_ready.manage_settings')
  )
  WITH CHECK (
    user_has_active_dealer_membership(auth.uid(), dealer_id)
    AND user_has_group_permission(auth.uid(), dealer_id, 'get_ready.manage_settings')
  );

-- RLS Policies for get_ready_step_sla_config
CREATE POLICY "Users can view step SLA config for their dealerships"
  ON public.get_ready_step_sla_config FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.get_ready_sla_config
      WHERE id = sla_config_id
        AND user_has_active_dealer_membership(auth.uid(), dealer_id)
    )
  );

CREATE POLICY "Admins can manage step SLA config for their dealerships"
  ON public.get_ready_step_sla_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.get_ready_sla_config
      WHERE id = sla_config_id
        AND user_has_active_dealer_membership(auth.uid(), dealer_id)
        AND user_has_group_permission(auth.uid(), dealer_id, 'get_ready.manage_settings')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.get_ready_sla_config
      WHERE id = sla_config_id
        AND user_has_active_dealer_membership(auth.uid(), dealer_id)
        AND user_has_group_permission(auth.uid(), dealer_id, 'get_ready.manage_settings')
    )
  );

-- =====================================================
-- 5. TRIGGERS
-- =====================================================
CREATE TRIGGER trigger_get_ready_sla_config_updated_at
  BEFORE UPDATE ON public.get_ready_sla_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_get_ready_step_sla_config_updated_at
  BEFORE UPDATE ON public.get_ready_step_sla_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- Function to get SLA status based on days in step
CREATE OR REPLACE FUNCTION public.get_sla_status_for_vehicle(
  p_vehicle_id UUID,
  p_dealer_id BIGINT
)
RETURNS TEXT AS $$
DECLARE
  v_days_in_step INTEGER;
  v_config RECORD;
  v_step_config RECORD;
  v_green_threshold INTEGER;
  v_warning_threshold INTEGER;
  v_danger_threshold INTEGER;
BEGIN
  -- Get vehicle's days in step
  SELECT days_in_step INTO v_days_in_step
  FROM public.get_ready_vehicles
  WHERE id = p_vehicle_id;

  -- Get SLA config for dealer
  SELECT * INTO v_config
  FROM public.get_ready_sla_config
  WHERE dealer_id = p_dealer_id;

  -- If no config, use defaults
  IF v_config IS NULL THEN
    v_green_threshold := 1;
    v_warning_threshold := 3;
    v_danger_threshold := 4;
  ELSE
    v_green_threshold := v_config.green_threshold;
    v_warning_threshold := v_config.warning_threshold;
    v_danger_threshold := v_config.danger_threshold;

    -- Check for step-specific override
    SELECT * INTO v_step_config
    FROM public.get_ready_step_sla_config sc
    JOIN public.get_ready_vehicles v ON v.id = p_vehicle_id
    WHERE sc.sla_config_id = v_config.id
      AND sc.step_id = v.step_id;

    IF v_step_config IS NOT NULL THEN
      v_green_threshold := v_step_config.green_threshold;
      v_warning_threshold := v_step_config.warning_threshold;
      v_danger_threshold := v_step_config.danger_threshold;
    END IF;
  END IF;

  -- Determine status
  IF v_days_in_step <= v_green_threshold THEN
    RETURN 'on_track';
  ELSIF v_days_in_step <= v_warning_threshold THEN
    RETURN 'warning';
  ELSE
    RETURN 'critical';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get SLA config with step overrides
CREATE OR REPLACE FUNCTION public.get_sla_config_for_dealer(p_dealer_id BIGINT)
RETURNS TABLE (
  config_id UUID,
  default_time_goal INTEGER,
  max_time_goal INTEGER,
  green_threshold INTEGER,
  warning_threshold INTEGER,
  danger_threshold INTEGER,
  step_id TEXT,
  step_time_goal INTEGER,
  step_green_threshold INTEGER,
  step_warning_threshold INTEGER,
  step_danger_threshold INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id as config_id,
    c.default_time_goal,
    c.max_time_goal,
    c.green_threshold,
    c.warning_threshold,
    c.danger_threshold,
    sc.step_id,
    sc.time_goal as step_time_goal,
    sc.green_threshold as step_green_threshold,
    sc.warning_threshold as step_warning_threshold,
    sc.danger_threshold as step_danger_threshold
  FROM public.get_ready_sla_config c
  LEFT JOIN public.get_ready_step_sla_config sc ON sc.sla_config_id = c.id
  WHERE c.dealer_id = p_dealer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- 7. INSERT DEFAULT CONFIGS FOR EXISTING DEALERSHIPS
-- =====================================================
INSERT INTO public.get_ready_sla_config (
  dealer_id,
  default_time_goal,
  max_time_goal,
  green_threshold,
  warning_threshold,
  danger_threshold
)
SELECT
  d.id,
  4,  -- 4 days default
  7,  -- 7 days max
  1,  -- <= 1 day = green
  3,  -- 2-3 days = warning
  4   -- >= 4 days = danger
FROM public.dealerships d
WHERE NOT EXISTS (
  SELECT 1 FROM public.get_ready_sla_config
  WHERE dealer_id = d.id
);

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================
GRANT SELECT ON public.get_ready_sla_config TO authenticated;
GRANT SELECT ON public.get_ready_step_sla_config TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sla_status_for_vehicle(UUID, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sla_config_for_dealer(BIGINT) TO authenticated;
