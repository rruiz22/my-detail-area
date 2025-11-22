-- =====================================================
-- FIX DETAIL HUB KIOSKS TABLE - MIGRATION COMPLETA
-- =====================================================
-- INSTRUCCIONES:
-- 1. Abre: https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/sql/new
-- 2. Copia TODO este archivo (Ctrl+A, Ctrl+C)
-- 3. Pega en SQL Editor (Ctrl+V)
-- 4. Click "Run" (o Ctrl+Enter)
-- 5. Verifica que aparezca "Success"
-- =====================================================

-- PASO 1: Limpiar estado existente
DROP TABLE IF EXISTS detail_hub_kiosks CASCADE;
DROP TYPE IF EXISTS detail_hub_camera_status CASCADE;
DROP TYPE IF EXISTS detail_hub_kiosk_status CASCADE;

-- PASO 2: Crear tipos ENUM
CREATE TYPE detail_hub_kiosk_status AS ENUM ('online', 'offline', 'warning', 'maintenance');
CREATE TYPE detail_hub_camera_status AS ENUM ('active', 'inactive', 'error');

-- PASO 3: Crear tabla con TODAS las columnas
CREATE TABLE detail_hub_kiosks (
  -- Identificación
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id INTEGER NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  kiosk_code TEXT NOT NULL,

  -- Información del kiosk
  name TEXT NOT NULL,
  location TEXT,
  description TEXT,

  -- Configuración de red
  ip_address INET,
  mac_address MACADDR,

  -- Monitoreo de estado
  status detail_hub_kiosk_status NOT NULL DEFAULT 'offline',
  camera_status detail_hub_camera_status NOT NULL DEFAULT 'inactive',
  last_ping TIMESTAMPTZ,
  last_heartbeat TIMESTAMPTZ,

  -- Configuración de reconocimiento facial
  face_recognition_enabled BOOLEAN NOT NULL DEFAULT true,
  face_confidence_threshold INTEGER NOT NULL DEFAULT 80,

  -- Configuración de comportamiento
  kiosk_mode BOOLEAN NOT NULL DEFAULT true,
  auto_sleep BOOLEAN NOT NULL DEFAULT true,
  sleep_timeout_minutes INTEGER NOT NULL DEFAULT 30,
  allow_manual_entry BOOLEAN NOT NULL DEFAULT true,
  require_photo_fallback BOOLEAN NOT NULL DEFAULT false,

  -- Configuración de pantalla
  screen_brightness INTEGER NOT NULL DEFAULT 80,
  volume INTEGER NOT NULL DEFAULT 75,
  theme TEXT DEFAULT 'default',

  -- Estadísticas
  total_punches INTEGER NOT NULL DEFAULT 0,
  punches_today INTEGER NOT NULL DEFAULT 0,
  last_punch_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_kiosk_code_per_dealership UNIQUE (dealership_id, kiosk_code),
  CONSTRAINT valid_brightness CHECK (screen_brightness >= 0 AND screen_brightness <= 100),
  CONSTRAINT valid_volume CHECK (volume >= 0 AND volume <= 100),
  CONSTRAINT valid_confidence_threshold CHECK (face_confidence_threshold >= 0 AND face_confidence_threshold <= 100),
  CONSTRAINT valid_sleep_timeout CHECK (sleep_timeout_minutes >= 0)
);

-- PASO 4: Crear índices para performance
CREATE INDEX idx_detail_hub_kiosks_dealership ON detail_hub_kiosks(dealership_id);
CREATE INDEX idx_detail_hub_kiosks_status ON detail_hub_kiosks(status);
CREATE INDEX idx_detail_hub_kiosks_kiosk_code ON detail_hub_kiosks(kiosk_code);

-- PASO 4.5: Crear función para auto-actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- PASO 4.6: Crear trigger para auto-actualizar updated_at
CREATE TRIGGER trigger_update_detail_hub_kiosks_updated_at
  BEFORE UPDATE ON detail_hub_kiosks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- PASO 5: Habilitar Row Level Security
ALTER TABLE detail_hub_kiosks ENABLE ROW LEVEL SECURITY;

-- PASO 6: Crear políticas RLS
CREATE POLICY "Users can view kiosks from their dealerships"
  ON detail_hub_kiosks
  FOR SELECT
  USING (
    dealership_id IN (
      SELECT dm.dealer_id
      FROM dealer_memberships dm
      WHERE dm.user_id = auth.uid()
    )
  );

CREATE POLICY "Managers can insert kiosks"
  ON detail_hub_kiosks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM dealer_memberships dm
      WHERE dm.user_id = auth.uid()
        AND dm.dealer_id = detail_hub_kiosks.dealership_id
        AND dm.role IN ('dealer_admin', 'dealer_manager', 'system_admin')
    )
  );

CREATE POLICY "Managers can update kiosks"
  ON detail_hub_kiosks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM dealer_memberships dm
      WHERE dm.user_id = auth.uid()
        AND dm.dealer_id = detail_hub_kiosks.dealership_id
        AND dm.role IN ('dealer_admin', 'dealer_manager', 'system_admin')
    )
  );

CREATE POLICY "Admins can delete kiosks"
  ON detail_hub_kiosks
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM dealer_memberships dm
      WHERE dm.user_id = auth.uid()
        AND dm.dealer_id = detail_hub_kiosks.dealership_id
        AND dm.role IN ('dealer_admin', 'system_admin')
    )
  );

-- PASO 7: Crear funciones helper
CREATE OR REPLACE FUNCTION update_kiosk_heartbeat(
  p_kiosk_code TEXT,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE detail_hub_kiosks
  SET
    last_heartbeat = NOW(),
    last_ping = NOW(),
    status = 'online',
    ip_address = COALESCE(p_ip_address, ip_address) -- Update IP if provided, keep existing if NULL
  WHERE kiosk_code = p_kiosk_code;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_kiosk_punch_counter(p_kiosk_code TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE detail_hub_kiosks
  SET
    total_punches = total_punches + 1,
    punches_today = punches_today + 1,
    last_punch_at = NOW()
  WHERE kiosk_code = p_kiosk_code;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION reset_kiosk_daily_counter()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_punch_at IS NOT NULL AND
     OLD.last_punch_at IS NOT NULL AND
     DATE(NEW.last_punch_at) > DATE(OLD.last_punch_at) THEN
    NEW.punches_today := 1;
  ELSIF NEW.last_punch_at IS NOT NULL AND OLD.last_punch_at IS NULL THEN
    NEW.punches_today := 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_kiosk_statistics(p_dealership_id INTEGER)
RETURNS TABLE (
  total_kiosks BIGINT,
  online_kiosks BIGINT,
  offline_kiosks BIGINT,
  total_punches_today BIGINT,
  average_uptime DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) AS total_kiosks,
    COUNT(*) FILTER (WHERE status = 'online') AS online_kiosks,
    COUNT(*) FILTER (WHERE status = 'offline') AS offline_kiosks,
    COALESCE(SUM(punches_today), 0) AS total_punches_today,
    ROUND(
      (COUNT(*) FILTER (WHERE status = 'online')::DECIMAL / NULLIF(COUNT(*), 0)) * 100,
      2
    ) AS average_uptime
  FROM detail_hub_kiosks
  WHERE dealership_id = p_dealership_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- PASO 8: Crear triggers
CREATE TRIGGER trigger_reset_kiosk_daily_counter
  BEFORE UPDATE OF last_punch_at ON detail_hub_kiosks
  FOR EACH ROW
  EXECUTE FUNCTION reset_kiosk_daily_counter();

-- PASO 9: Agregar comentarios
COMMENT ON TABLE detail_hub_kiosks IS 'Kiosk device management for DetailHub time clock stations';
COMMENT ON COLUMN detail_hub_kiosks.kiosk_code IS 'Unique kiosk identifier (e.g., KIOSK-001)';
COMMENT ON COLUMN detail_hub_kiosks.camera_status IS 'Camera operational status for face recognition';
COMMENT ON COLUMN detail_hub_kiosks.last_heartbeat IS 'Last communication timestamp from kiosk device';
COMMENT ON COLUMN detail_hub_kiosks.face_confidence_threshold IS 'Minimum confidence score (0-100) required for face recognition acceptance';
COMMENT ON COLUMN detail_hub_kiosks.kiosk_mode IS 'When true, device is locked to time clock only (no other apps/browser)';
COMMENT ON COLUMN detail_hub_kiosks.require_photo_fallback IS 'When true, always capture photo even if face recognition succeeds';

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- Ejecuta estas queries en pestañas separadas para verificar:

-- 1. Verificar que camera_status existe:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'detail_hub_kiosks' AND column_name = 'camera_status';

-- 2. Verificar todas las columnas:
-- SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'detail_hub_kiosks' ORDER BY ordinal_position;

-- 3. Verificar políticas RLS:
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'detail_hub_kiosks';

-- 4. Verificar funciones:
-- SELECT routine_name FROM information_schema.routines WHERE routine_name LIKE '%kiosk%';

-- =====================================================
-- FIN DE LA MIGRACIÓN
-- =====================================================
