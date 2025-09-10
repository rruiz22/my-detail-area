-- Create NFC Tags table for managing physical NFC tags
CREATE TABLE public.nfc_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tag_uid TEXT NOT NULL UNIQUE, -- NFC tag unique identifier
  tag_type TEXT NOT NULL DEFAULT 'vehicle', -- vehicle, location, order, tool
  name TEXT NOT NULL,
  description TEXT,
  dealer_id BIGINT NOT NULL,
  
  -- Associated entities
  vehicle_vin TEXT,
  order_id UUID,
  location_name TEXT,
  location_coordinates POINT, -- GPS coordinates
  
  -- Tag configuration
  tag_data JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_permanent BOOLEAN NOT NULL DEFAULT false, -- Can't be overwritten
  
  -- Metadata
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_scanned_at TIMESTAMP WITH TIME ZONE,
  scan_count INTEGER NOT NULL DEFAULT 0
);

-- Create NFC Scans table for tracking all NFC interactions
CREATE TABLE public.nfc_scans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tag_id UUID NOT NULL REFERENCES public.nfc_tags(id) ON DELETE CASCADE,
  
  -- Scan details
  scanned_by UUID NOT NULL,
  scan_location POINT, -- GPS coordinates at scan time
  scan_address TEXT, -- Geocoded address
  
  -- Device info
  device_info JSONB NOT NULL DEFAULT '{}',
  user_agent TEXT,
  
  -- Action taken
  action_type TEXT NOT NULL DEFAULT 'read', -- read, write, update, locate
  action_data JSONB NOT NULL DEFAULT '{}',
  
  -- Context
  order_id UUID,
  context_data JSONB NOT NULL DEFAULT '{}',
  
  -- Timestamps
  scanned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Analytics
  session_id TEXT,
  is_unique_scan BOOLEAN NOT NULL DEFAULT false
);

-- Create NFC Workflows table for automated actions
CREATE TABLE public.nfc_workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Trigger conditions
  trigger_tag_type TEXT NOT NULL, -- vehicle, location, order
  trigger_conditions JSONB NOT NULL DEFAULT '{}',
  
  -- Actions to perform
  actions JSONB NOT NULL DEFAULT '[]', -- Array of actions
  
  -- Configuration
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 1,
  
  -- Tracking
  execution_count INTEGER NOT NULL DEFAULT 0,
  last_executed_at TIMESTAMP WITH TIME ZONE,
  
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_nfc_tags_dealer_id ON public.nfc_tags(dealer_id);
CREATE INDEX idx_nfc_tags_tag_uid ON public.nfc_tags(tag_uid);
CREATE INDEX idx_nfc_tags_vehicle_vin ON public.nfc_tags(vehicle_vin);
CREATE INDEX idx_nfc_tags_order_id ON public.nfc_tags(order_id);
CREATE INDEX idx_nfc_tags_location ON public.nfc_tags USING GIST(location_coordinates);

CREATE INDEX idx_nfc_scans_tag_id ON public.nfc_scans(tag_id);
CREATE INDEX idx_nfc_scans_scanned_by ON public.nfc_scans(scanned_by);
CREATE INDEX idx_nfc_scans_scanned_at ON public.nfc_scans(scanned_at);
CREATE INDEX idx_nfc_scans_order_id ON public.nfc_scans(order_id);
CREATE INDEX idx_nfc_scans_location ON public.nfc_scans USING GIST(scan_location);

CREATE INDEX idx_nfc_workflows_dealer_id ON public.nfc_workflows(dealer_id);
CREATE INDEX idx_nfc_workflows_trigger_type ON public.nfc_workflows(trigger_tag_type);

-- Enable Row Level Security
ALTER TABLE public.nfc_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfc_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfc_workflows ENABLE ROW LEVEL SECURITY;

-- RLS Policies for NFC Tags
CREATE POLICY "Users can view NFC tags for their dealer"
ON public.nfc_tags
FOR SELECT
USING (is_admin() OR user_has_active_dealer_membership(auth.uid(), dealer_id));

CREATE POLICY "Users can create NFC tags for their dealer"
ON public.nfc_tags
FOR INSERT
WITH CHECK (
  (created_by = auth.uid()) AND 
  (is_admin() OR (
    user_has_active_dealer_membership(auth.uid(), dealer_id) AND 
    user_has_group_permission(auth.uid(), dealer_id, 'nfc.create')
  ))
);

CREATE POLICY "Users can update NFC tags they have permission for"
ON public.nfc_tags
FOR UPDATE
USING (
  is_admin() OR (
    user_has_active_dealer_membership(auth.uid(), dealer_id) AND 
    (created_by = auth.uid() OR user_has_group_permission(auth.uid(), dealer_id, 'nfc.update'))
  )
);

CREATE POLICY "Users can delete NFC tags they have permission for"
ON public.nfc_tags
FOR DELETE
USING (
  is_admin() OR (
    user_has_active_dealer_membership(auth.uid(), dealer_id) AND 
    (created_by = auth.uid() OR user_has_group_permission(auth.uid(), dealer_id, 'nfc.delete'))
  )
);

-- RLS Policies for NFC Scans
CREATE POLICY "Users can view NFC scans for accessible tags"
ON public.nfc_scans
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.nfc_tags nt 
    WHERE nt.id = nfc_scans.tag_id 
    AND (is_admin() OR user_has_active_dealer_membership(auth.uid(), nt.dealer_id))
  )
);

CREATE POLICY "Users can create NFC scans"
ON public.nfc_scans
FOR INSERT
WITH CHECK (
  (scanned_by = auth.uid()) AND
  EXISTS (
    SELECT 1 FROM public.nfc_tags nt 
    WHERE nt.id = nfc_scans.tag_id 
    AND (is_admin() OR user_has_active_dealer_membership(auth.uid(), nt.dealer_id))
  )
);

-- RLS Policies for NFC Workflows
CREATE POLICY "Users can manage NFC workflows for their dealer"
ON public.nfc_workflows
FOR ALL
USING (
  is_admin() OR (
    user_has_active_dealer_membership(auth.uid(), dealer_id) AND 
    user_has_group_permission(auth.uid(), dealer_id, 'nfc.workflows')
  )
)
WITH CHECK (
  (created_by = auth.uid()) AND
  (is_admin() OR (
    user_has_active_dealer_membership(auth.uid(), dealer_id) AND 
    user_has_group_permission(auth.uid(), dealer_id, 'nfc.workflows')
  ))
);

-- Create function to update NFC tag scan statistics
CREATE OR REPLACE FUNCTION public.update_nfc_tag_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.nfc_tags 
  SET 
    scan_count = scan_count + 1,
    last_scanned_at = NEW.scanned_at,
    updated_at = now()
  WHERE id = NEW.tag_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for NFC tag statistics
CREATE TRIGGER update_nfc_tag_stats_trigger
  AFTER INSERT ON public.nfc_scans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_nfc_tag_stats();

-- Create function to execute NFC workflows
CREATE OR REPLACE FUNCTION public.execute_nfc_workflows(
  p_tag_id UUID,
  p_scan_data JSONB DEFAULT '{}'
)
RETURNS JSONB AS $$
DECLARE
  tag_record RECORD;
  workflow_record RECORD;
  executed_workflows JSONB := '[]'::JSONB;
  workflow_result JSONB;
BEGIN
  -- Get tag information
  SELECT * INTO tag_record FROM public.nfc_tags WHERE id = p_tag_id;
  
  IF NOT FOUND THEN
    RETURN '{"error": "Tag not found"}'::JSONB;
  END IF;
  
  -- Find matching workflows
  FOR workflow_record IN 
    SELECT * FROM public.nfc_workflows 
    WHERE dealer_id = tag_record.dealer_id 
    AND trigger_tag_type = tag_record.tag_type
    AND is_active = true
    ORDER BY priority DESC
  LOOP
    -- Execute workflow (simplified - would contain actual workflow logic)
    workflow_result := jsonb_build_object(
      'workflow_id', workflow_record.id,
      'workflow_name', workflow_record.name,
      'executed_at', now(),
      'actions_executed', workflow_record.actions
    );
    
    executed_workflows := executed_workflows || workflow_result;
    
    -- Update execution count
    UPDATE public.nfc_workflows 
    SET 
      execution_count = execution_count + 1,
      last_executed_at = now()
    WHERE id = workflow_record.id;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'tag_id', p_tag_id,
    'executed_workflows', executed_workflows
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get NFC analytics
CREATE OR REPLACE FUNCTION public.get_nfc_analytics(
  p_dealer_id BIGINT,
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT (now() - interval '30 days'),
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT now()
)
RETURNS TABLE (
  total_tags BIGINT,
  active_tags BIGINT,
  total_scans BIGINT,
  unique_scanners BIGINT,
  avg_scans_per_tag NUMERIC,
  popular_locations JSONB,
  daily_scan_trends JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH tag_stats AS (
    SELECT 
      COUNT(*) as total_tags,
      COUNT(*) FILTER (WHERE is_active = true) as active_tags
    FROM public.nfc_tags 
    WHERE dealer_id = p_dealer_id
  ),
  scan_stats AS (
    SELECT 
      COUNT(*) as total_scans,
      COUNT(DISTINCT scanned_by) as unique_scanners
    FROM public.nfc_scans ns
    JOIN public.nfc_tags nt ON nt.id = ns.tag_id
    WHERE nt.dealer_id = p_dealer_id
    AND ns.scanned_at BETWEEN p_start_date AND p_end_date
  ),
  location_stats AS (
    SELECT 
      jsonb_agg(
        jsonb_build_object(
          'location', scan_address,
          'count', scan_count
        ) ORDER BY scan_count DESC
      ) as popular_locations
    FROM (
      SELECT 
        COALESCE(scan_address, 'Unknown Location') as scan_address,
        COUNT(*) as scan_count
      FROM public.nfc_scans ns
      JOIN public.nfc_tags nt ON nt.id = ns.tag_id
      WHERE nt.dealer_id = p_dealer_id
      AND ns.scanned_at BETWEEN p_start_date AND p_end_date
      AND scan_address IS NOT NULL
      GROUP BY scan_address
      ORDER BY scan_count DESC
      LIMIT 10
    ) loc_counts
  ),
  daily_trends AS (
    SELECT 
      jsonb_agg(
        jsonb_build_object(
          'date', scan_date,
          'scans', scan_count
        ) ORDER BY scan_date
      ) as daily_scan_trends
    FROM (
      SELECT 
        DATE(ns.scanned_at) as scan_date,
        COUNT(*) as scan_count
      FROM public.nfc_scans ns
      JOIN public.nfc_tags nt ON nt.id = ns.tag_id
      WHERE nt.dealer_id = p_dealer_id
      AND ns.scanned_at BETWEEN p_start_date AND p_end_date
      GROUP BY DATE(ns.scanned_at)
      ORDER BY scan_date
    ) daily_counts
  )
  SELECT 
    ts.total_tags,
    ts.active_tags,
    ss.total_scans,
    ss.unique_scanners,
    CASE 
      WHEN ts.active_tags > 0 THEN ss.total_scans::NUMERIC / ts.active_tags 
      ELSE 0 
    END as avg_scans_per_tag,
    COALESCE(ls.popular_locations, '[]'::JSONB),
    COALESCE(dt.daily_scan_trends, '[]'::JSONB)
  FROM tag_stats ts
  CROSS JOIN scan_stats ss
  CROSS JOIN location_stats ls
  CROSS JOIN daily_trends dt;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;