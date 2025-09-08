-- Fase 3 Día 3: Management Dashboard - Estadísticas y Analytics

-- Crear función para obtener estadísticas del sistema
CREATE OR REPLACE FUNCTION public.get_system_stats()
RETURNS TABLE(
  total_dealerships INTEGER,
  active_dealerships INTEGER,
  total_users INTEGER,
  active_users INTEGER,
  total_orders INTEGER,
  orders_this_month INTEGER,
  orders_this_week INTEGER,
  pending_invitations INTEGER,
  system_health_score DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Dealerships
    (SELECT COUNT(*)::INTEGER FROM dealerships WHERE deleted_at IS NULL) as total_dealerships,
    (SELECT COUNT(*)::INTEGER FROM dealerships WHERE status = 'active' AND deleted_at IS NULL) as active_dealerships,
    
    -- Users
    (SELECT COUNT(*)::INTEGER FROM dealer_memberships WHERE is_active = true) as total_users,
    (SELECT COUNT(*)::INTEGER FROM dealer_memberships dm 
     JOIN profiles p ON p.id = dm.user_id 
     WHERE dm.is_active = true) as active_users,
    
    -- Orders
    (SELECT COUNT(*)::INTEGER FROM orders) as total_orders,
    (SELECT COUNT(*)::INTEGER FROM orders WHERE created_at >= date_trunc('month', CURRENT_DATE)) as orders_this_month,
    (SELECT COUNT(*)::INTEGER FROM orders WHERE created_at >= date_trunc('week', CURRENT_DATE)) as orders_this_week,
    
    -- Invitations
    (SELECT COUNT(*)::INTEGER FROM dealer_invitations 
     WHERE accepted_at IS NULL AND expires_at > now()) as pending_invitations,
    
    -- System Health Score (percentage based on active dealerships and users)
    (
      CASE 
        WHEN (SELECT COUNT(*) FROM dealerships WHERE deleted_at IS NULL) = 0 THEN 0
        ELSE 
          ROUND(
            (
              (SELECT COUNT(*) FROM dealerships WHERE status = 'active' AND deleted_at IS NULL)::DECIMAL * 50 +
              (SELECT COUNT(*) FROM dealer_memberships WHERE is_active = true)::DECIMAL * 30 +
              (SELECT CASE WHEN COUNT(*) > 0 THEN 20 ELSE 0 END FROM orders WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')
            ) / 100 * 100, 1
          )
      END
    )::DECIMAL as system_health_score;
END;
$$;

-- Crear función para obtener actividad reciente del sistema
CREATE OR REPLACE FUNCTION public.get_recent_system_activity()
RETURNS TABLE(
  activity_type TEXT,
  activity_description TEXT,
  entity_type TEXT,
  entity_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  user_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  -- Recent dealership creations
  SELECT 
    'dealership_created'::TEXT as activity_type,
    ('Nuevo concesionario creado: ' || d.name)::TEXT as activity_description,
    'dealership'::TEXT as entity_type,
    d.id::TEXT as entity_id,
    d.created_at,
    ''::TEXT as user_email
  FROM dealerships d
  WHERE d.created_at >= CURRENT_DATE - INTERVAL '7 days'
  AND d.deleted_at IS NULL
  
  UNION ALL
  
  -- Recent invitations
  SELECT 
    'invitation_sent'::TEXT as activity_type,
    ('Invitación enviada a: ' || di.email)::TEXT as activity_description,
    'invitation'::TEXT as entity_type,
    di.id::TEXT as entity_id,
    di.created_at,
    COALESCE(p.email, '')::TEXT as user_email
  FROM dealer_invitations di
  LEFT JOIN profiles p ON p.id = di.inviter_id
  WHERE di.created_at >= CURRENT_DATE - INTERVAL '7 days'
  
  UNION ALL
  
  -- Recent memberships
  SELECT 
    'user_joined'::TEXT as activity_type,
    ('Usuario se unió al concesionario')::TEXT as activity_description,
    'membership'::TEXT as entity_type,
    dm.id::TEXT as entity_id,
    dm.created_at,
    COALESCE(p.email, '')::TEXT as user_email
  FROM dealer_memberships dm
  LEFT JOIN profiles p ON p.id = dm.user_id
  WHERE dm.created_at >= CURRENT_DATE - INTERVAL '7 days'
  
  ORDER BY created_at DESC
  LIMIT 20;
END;
$$;

-- Crear función para obtener estadísticas de rendimiento por concesionario
CREATE OR REPLACE FUNCTION public.get_dealership_performance_stats()
RETURNS TABLE(
  dealership_id BIGINT,
  dealership_name TEXT,
  total_users INTEGER,
  active_users INTEGER,
  total_orders INTEGER,
  orders_this_month INTEGER,
  avg_orders_per_user DECIMAL,
  user_growth_rate DECIMAL,
  last_activity TIMESTAMP WITH TIME ZONE,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id as dealership_id,
    d.name as dealership_name,
    
    -- Users
    COALESCE(user_stats.total_users, 0)::INTEGER as total_users,
    COALESCE(user_stats.active_users, 0)::INTEGER as active_users,
    
    -- Orders
    COALESCE(order_stats.total_orders, 0)::INTEGER as total_orders,
    COALESCE(order_stats.orders_this_month, 0)::INTEGER as orders_this_month,
    
    -- Performance metrics
    CASE 
      WHEN COALESCE(user_stats.active_users, 0) = 0 THEN 0
      ELSE ROUND(COALESCE(order_stats.total_orders, 0)::DECIMAL / user_stats.active_users, 2)
    END as avg_orders_per_user,
    
    -- Growth rate (simplified)
    CASE 
      WHEN COALESCE(user_stats.total_users, 0) = 0 THEN 0
      ELSE ROUND((COALESCE(user_stats.active_users, 0)::DECIMAL / user_stats.total_users) * 100, 1)
    END as user_growth_rate,
    
    -- Last activity
    GREATEST(
      d.updated_at,
      COALESCE(order_stats.last_order_date, d.created_at)
    ) as last_activity,
    
    d.status::TEXT
  FROM dealerships d
  LEFT JOIN (
    SELECT 
      dm.dealer_id,
      COUNT(*)::INTEGER as total_users,
      COUNT(CASE WHEN dm.is_active THEN 1 END)::INTEGER as active_users
    FROM dealer_memberships dm
    GROUP BY dm.dealer_id
  ) user_stats ON user_stats.dealer_id = d.id
  LEFT JOIN (
    SELECT 
      o.dealer_id,
      COUNT(*)::INTEGER as total_orders,
      COUNT(CASE WHEN o.created_at >= date_trunc('month', CURRENT_DATE) THEN 1 END)::INTEGER as orders_this_month,
      MAX(o.created_at) as last_order_date
    FROM orders o
    GROUP BY o.dealer_id
  ) order_stats ON order_stats.dealer_id = d.id
  WHERE d.deleted_at IS NULL
  ORDER BY 
    CASE d.status 
      WHEN 'active' THEN 1
      WHEN 'inactive' THEN 2
      WHEN 'suspended' THEN 3
    END,
    total_orders DESC, 
    active_users DESC;
END;
$$;

-- Crear índices para mejorar rendimiento de consultas de analytics
CREATE INDEX IF NOT EXISTS idx_dealerships_status_deleted 
ON dealerships(status) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_dealer_memberships_active 
ON dealer_memberships(dealer_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_orders_dealer_created 
ON orders(dealer_id, created_at);

CREATE INDEX IF NOT EXISTS idx_dealer_invitations_pending 
ON dealer_invitations(created_at) WHERE accepted_at IS NULL AND expires_at > now();