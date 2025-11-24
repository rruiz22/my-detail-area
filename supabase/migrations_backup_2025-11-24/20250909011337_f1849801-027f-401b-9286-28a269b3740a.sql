-- Create comprehensive analytics functions for Reports module

-- Function to get orders analytics with filters
CREATE OR REPLACE FUNCTION public.get_orders_analytics(
  p_dealer_id bigint,
  p_start_date timestamp with time zone DEFAULT (now() - interval '30 days'),
  p_end_date timestamp with time zone DEFAULT now(),
  p_order_type text DEFAULT 'all',
  p_status text DEFAULT 'all'
)
RETURNS TABLE(
  total_orders integer,
  pending_orders integer,
  in_progress_orders integer,
  completed_orders integer,
  cancelled_orders integer,
  total_revenue numeric,
  avg_order_value numeric,
  completion_rate numeric,
  avg_processing_time_hours numeric,
  sla_compliance_rate numeric,
  daily_data jsonb,
  status_distribution jsonb,
  type_distribution jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH order_stats AS (
    SELECT 
      o.status,
      o.order_type,
      o.total_amount,
      o.created_at,
      o.completed_at,
      o.sla_deadline,
      CASE 
        WHEN o.completed_at IS NOT NULL AND o.sla_deadline IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (o.completed_at - o.created_at)) / 3600 
      END as processing_hours,
      CASE 
        WHEN o.completed_at IS NOT NULL AND o.sla_deadline IS NOT NULL 
        AND o.completed_at <= o.sla_deadline THEN 1 
        ELSE 0 
      END as sla_compliant
    FROM orders o
    WHERE o.dealer_id = p_dealer_id
    AND o.created_at >= p_start_date
    AND o.created_at <= p_end_date
    AND (p_order_type = 'all' OR o.order_type = p_order_type)
    AND (p_status = 'all' OR o.status = p_status)
  ),
  daily_stats AS (
    SELECT 
      DATE(created_at) as order_date,
      COUNT(*) as daily_count,
      SUM(COALESCE(total_amount, 0)) as daily_revenue
    FROM order_stats
    GROUP BY DATE(created_at)
    ORDER BY order_date
  )
  SELECT 
    COUNT(*)::integer as total_orders,
    COUNT(CASE WHEN status = 'pending' THEN 1 END)::integer as pending_orders,
    COUNT(CASE WHEN status = 'in_progress' THEN 1 END)::integer as in_progress_orders,
    COUNT(CASE WHEN status = 'completed' THEN 1 END)::integer as completed_orders,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END)::integer as cancelled_orders,
    
    COALESCE(SUM(total_amount), 0)::numeric as total_revenue,
    COALESCE(AVG(total_amount), 0)::numeric as avg_order_value,
    
    CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND((COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*)), 2)
      ELSE 0 
    END::numeric as completion_rate,
    
    COALESCE(AVG(processing_hours), 0)::numeric as avg_processing_time_hours,
    
    CASE 
      WHEN COUNT(CASE WHEN completed_at IS NOT NULL AND sla_deadline IS NOT NULL THEN 1 END) > 0 THEN
        ROUND((SUM(sla_compliant) * 100.0 / COUNT(CASE WHEN completed_at IS NOT NULL AND sla_deadline IS NOT NULL THEN 1 END)), 2)
      ELSE 0 
    END::numeric as sla_compliance_rate,
    
    -- Daily data for charts
    COALESCE(
      json_agg(
        json_build_object(
          'date', daily_stats.order_date,
          'orders', daily_stats.daily_count,
          'revenue', daily_stats.daily_revenue
        ) ORDER BY daily_stats.order_date
      ), '[]'::json
    )::jsonb as daily_data,
    
    -- Status distribution for pie charts
    COALESCE(
      json_agg(DISTINCT
        json_build_object(
          'name', order_stats.status,
          'value', (SELECT COUNT(*) FROM order_stats os2 WHERE os2.status = order_stats.status)
        )
      ) FILTER (WHERE order_stats.status IS NOT NULL), '[]'::json
    )::jsonb as status_distribution,
    
    -- Type distribution for charts
    COALESCE(
      json_agg(DISTINCT
        json_build_object(
          'name', order_stats.order_type,
          'value', (SELECT COUNT(*) FROM order_stats os3 WHERE os3.order_type = order_stats.order_type)
        )
      ) FILTER (WHERE order_stats.order_type IS NOT NULL), '[]'::json
    )::jsonb as type_distribution
    
  FROM order_stats
  LEFT JOIN daily_stats ON 1=1;
END;
$$;

-- Function to get revenue analytics with time grouping
CREATE OR REPLACE FUNCTION public.get_revenue_analytics(
  p_dealer_id bigint,
  p_start_date timestamp with time zone DEFAULT (now() - interval '12 months'),
  p_end_date timestamp with time zone DEFAULT now(),
  p_grouping text DEFAULT 'monthly' -- daily, weekly, monthly
)
RETURNS TABLE(
  period_data jsonb,
  total_revenue numeric,
  avg_revenue_per_period numeric,
  growth_rate numeric,
  top_services jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  date_format text;
  interval_text text;
BEGIN
  -- Set format based on grouping
  CASE p_grouping
    WHEN 'daily' THEN 
      date_format := 'YYYY-MM-DD';
      interval_text := '1 day';
    WHEN 'weekly' THEN 
      date_format := 'IYYY-IW';
      interval_text := '1 week';
    WHEN 'monthly' THEN 
      date_format := 'YYYY-MM';
      interval_text := '1 month';
    ELSE 
      date_format := 'YYYY-MM';
      interval_text := '1 month';
  END CASE;

  RETURN QUERY
  WITH revenue_periods AS (
    SELECT 
      to_char(o.created_at, date_format) as period,
      SUM(COALESCE(o.total_amount, 0)) as period_revenue,
      COUNT(*) as period_orders,
      o.created_at
    FROM orders o
    WHERE o.dealer_id = p_dealer_id
    AND o.created_at >= p_start_date
    AND o.created_at <= p_end_date
    AND o.status = 'completed'
    GROUP BY to_char(o.created_at, date_format), date_trunc(p_grouping, o.created_at)
    ORDER BY date_trunc(p_grouping, o.created_at)
  ),
  service_revenue AS (
    SELECT 
      service_data->>'name' as service_name,
      SUM((service_data->>'price')::numeric) as service_total
    FROM orders o,
         jsonb_array_elements(o.services) as service_data
    WHERE o.dealer_id = p_dealer_id
    AND o.created_at >= p_start_date
    AND o.created_at <= p_end_date
    AND o.status = 'completed'
    GROUP BY service_data->>'name'
    ORDER BY service_total DESC
    LIMIT 10
  )
  SELECT 
    -- Period data for charts
    COALESCE(
      json_agg(
        json_build_object(
          'period', rp.period,
          'revenue', rp.period_revenue,
          'orders', rp.period_orders
        ) ORDER BY rp.created_at
      ), '[]'::json
    )::jsonb as period_data,
    
    COALESCE(SUM(rp.period_revenue), 0)::numeric as total_revenue,
    COALESCE(AVG(rp.period_revenue), 0)::numeric as avg_revenue_per_period,
    
    -- Growth rate calculation (current vs previous period)
    CASE 
      WHEN COUNT(*) >= 2 THEN
        ROUND(
          ((LAST_VALUE(rp.period_revenue) OVER (ORDER BY rp.created_at ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) - 
           FIRST_VALUE(rp.period_revenue) OVER (ORDER BY rp.created_at ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)) * 100.0 /
           NULLIF(FIRST_VALUE(rp.period_revenue) OVER (ORDER BY rp.created_at ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING), 0)
          ), 2
        )
      ELSE 0
    END::numeric as growth_rate,
    
    -- Top services by revenue
    COALESCE(
      (SELECT json_agg(
        json_build_object(
          'name', sr.service_name,
          'revenue', sr.service_total
        )
      ) FROM service_revenue sr), '[]'::json
    )::jsonb as top_services
    
  FROM revenue_periods rp
  CROSS JOIN service_revenue sr
  WHERE rp.period IS NOT NULL;
END;
$$;

-- Function to get performance trends
CREATE OR REPLACE FUNCTION public.get_performance_trends(
  p_dealer_id bigint,
  p_start_date timestamp with time zone DEFAULT (now() - interval '90 days'),
  p_end_date timestamp with time zone DEFAULT now()
)
RETURNS TABLE(
  efficiency_trends jsonb,
  sla_trends jsonb,
  volume_trends jsonb,
  department_performance jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH weekly_performance AS (
    SELECT 
      date_trunc('week', o.created_at) as week_start,
      o.order_type,
      COUNT(*) as weekly_orders,
      COUNT(CASE WHEN o.status = 'completed' THEN 1 END) as completed_orders,
      AVG(CASE 
        WHEN o.completed_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (o.completed_at - o.created_at)) / 3600 
      END) as avg_processing_hours,
      COUNT(CASE 
        WHEN o.completed_at IS NOT NULL AND o.sla_deadline IS NOT NULL 
        AND o.completed_at <= o.sla_deadline THEN 1 
      END) * 100.0 / NULLIF(COUNT(CASE 
        WHEN o.completed_at IS NOT NULL AND o.sla_deadline IS NOT NULL THEN 1 
      END), 0) as sla_compliance_rate
    FROM orders o
    WHERE o.dealer_id = p_dealer_id
    AND o.created_at >= p_start_date
    AND o.created_at <= p_end_date
    GROUP BY date_trunc('week', o.created_at), o.order_type
  )
  SELECT 
    -- Efficiency trends (processing time)
    COALESCE(
      json_agg(DISTINCT
        json_build_object(
          'week', wp.week_start,
          'efficiency', COALESCE(wp.avg_processing_hours, 0)
        ) ORDER BY wp.week_start
      ) FILTER (WHERE wp.week_start IS NOT NULL), '[]'::json
    )::jsonb as efficiency_trends,
    
    -- SLA compliance trends
    COALESCE(
      json_agg(DISTINCT
        json_build_object(
          'week', wp.week_start,
          'sla_rate', COALESCE(wp.sla_compliance_rate, 0)
        ) ORDER BY wp.week_start
      ) FILTER (WHERE wp.week_start IS NOT NULL), '[]'::json
    )::jsonb as sla_trends,
    
    -- Volume trends
    COALESCE(
      json_agg(DISTINCT
        json_build_object(
          'week', wp.week_start,
          'volume', wp.weekly_orders
        ) ORDER BY wp.week_start
      ) FILTER (WHERE wp.week_start IS NOT NULL), '[]'::json
    )::jsonb as volume_trends,
    
    -- Department performance
    COALESCE(
      json_agg(DISTINCT
        json_build_object(
          'department', wp.order_type,
          'total_orders', SUM(wp.weekly_orders),
          'completion_rate', ROUND(SUM(wp.completed_orders) * 100.0 / NULLIF(SUM(wp.weekly_orders), 0), 2),
          'avg_processing_time', ROUND(AVG(wp.avg_processing_hours), 2)
        )
      ) FILTER (WHERE wp.order_type IS NOT NULL), '[]'::json
    )::jsonb as department_performance
    
  FROM weekly_performance wp;
END;
$$;