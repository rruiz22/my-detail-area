-- ============================================================================
-- ANNOUNCEMENTS SYSTEM
-- ============================================================================
-- Sistema de anuncios globales para mostrar notificaciones, alertas y
-- mensajes importantes a usuarios específicos basado en roles y dealers.
--
-- Features:
-- - Soporte para contenido HTML rico
-- - Filtrado por roles y dealers
-- - Fechas de vigencia (start_date, end_date)
-- - Prioridad para ordenamiento
-- - Solo system_admin puede gestionar
-- ============================================================================

-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL, -- HTML content
  type text NOT NULL CHECK (type IN ('info', 'warning', 'alert', 'success')),
  priority integer DEFAULT 0, -- Mayor prioridad = se muestra primero
  is_active boolean DEFAULT true,
  start_date timestamptz DEFAULT now(),
  end_date timestamptz, -- NULL = sin fecha de expiración
  target_roles text[], -- NULL = todos los roles, ['system_admin', 'dealer_admin', etc.]
  target_dealer_ids integer[], -- NULL = todos los dealers
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_announcements_is_active ON announcements(is_active);
CREATE INDEX idx_announcements_start_date ON announcements(start_date);
CREATE INDEX idx_announcements_end_date ON announcements(end_date);
CREATE INDEX idx_announcements_priority ON announcements(priority DESC);
CREATE INDEX idx_announcements_target_roles ON announcements USING gin(target_roles);
CREATE INDEX idx_announcements_target_dealer_ids ON announcements USING gin(target_dealer_ids);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW
  EXECUTE FUNCTION update_announcements_updated_at();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Policy: System admins can do everything
CREATE POLICY "system_admins_full_access" ON announcements
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'system_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'system_admin'
    )
  );

-- Policy: All authenticated users can view active announcements
-- that match their role and dealer (or are global)
CREATE POLICY "users_view_active_announcements" ON announcements
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND is_active = true
    AND (start_date IS NULL OR start_date <= now())
    AND (end_date IS NULL OR end_date >= now())
    AND (
      -- Announcement is global (no role filter)
      target_roles IS NULL
      OR
      -- User's role is in target_roles
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = ANY(target_roles)
      )
    )
    AND (
      -- Announcement is global (no dealer filter)
      target_dealer_ids IS NULL
      OR
      -- User's dealer is in target_dealer_ids
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.dealership_id = ANY(target_dealer_ids)
      )
      OR
      -- System admins can see all announcements
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'system_admin'
      )
    )
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get active announcements for current user
CREATE OR REPLACE FUNCTION get_active_announcements()
RETURNS SETOF announcements
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT a.*
  FROM announcements a
  LEFT JOIN profiles p ON p.id = auth.uid()
  WHERE a.is_active = true
    AND (a.start_date IS NULL OR a.start_date <= now())
    AND (a.end_date IS NULL OR a.end_date >= now())
    AND (
      -- Global announcement (no role filter)
      a.target_roles IS NULL
      OR
      -- User's role matches
      p.role = ANY(a.target_roles)
    )
    AND (
      -- Global announcement (no dealer filter)
      a.target_dealer_ids IS NULL
      OR
      -- User's dealer matches
      p.dealership_id = ANY(a.target_dealer_ids)
      OR
      -- System admin sees all
      p.role = 'system_admin'
    )
  ORDER BY a.priority DESC, a.created_at DESC;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_active_announcements() TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE announcements IS 'Sistema de anuncios globales para notificaciones y alertas';
COMMENT ON COLUMN announcements.type IS 'Tipo de anuncio: info, warning, alert, success';
COMMENT ON COLUMN announcements.priority IS 'Prioridad de visualización (mayor = primero)';
COMMENT ON COLUMN announcements.target_roles IS 'Roles específicos (NULL = todos)';
COMMENT ON COLUMN announcements.target_dealer_ids IS 'Dealers específicos (NULL = todos)';
COMMENT ON FUNCTION get_active_announcements() IS 'Obtiene anuncios activos filtrados por usuario actual';
