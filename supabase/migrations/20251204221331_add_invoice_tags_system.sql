-- =====================================================
-- INVOICE TAGS SYSTEM
-- Created: 2024-12-04
-- Description: Sistema de tags/etiquetas para invoices
--              - Tags únicos por dealer
--              - Colores automáticos
--              - Sugerencias basadas en uso
--              - Filtrable
-- =====================================================

-- Tabla para almacenar tags únicos por dealer
CREATE TABLE IF NOT EXISTS invoice_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id INTEGER NOT NULL,
  tag_name TEXT NOT NULL,
  color_index INTEGER DEFAULT 0 CHECK (color_index >= 0 AND color_index < 10),
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_dealer_tag UNIQUE(dealer_id, tag_name)
);

-- Tabla de relación muchos-a-muchos (invoice <-> tags)
CREATE TABLE IF NOT EXISTS invoice_tag_relations (
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES invoice_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (invoice_id, tag_id)
);

-- Índices para mejorar performance de queries
CREATE INDEX IF NOT EXISTS idx_invoice_tags_dealer ON invoice_tags(dealer_id);
CREATE INDEX IF NOT EXISTS idx_invoice_tags_usage ON invoice_tags(dealer_id, usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_tag_relations_invoice ON invoice_tag_relations(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_tag_relations_tag ON invoice_tag_relations(tag_id);

-- Habilitar Row Level Security
ALTER TABLE invoice_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_tag_relations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES - invoice_tags
-- =====================================================

-- Policy: usuarios pueden ver tags de su dealer
CREATE POLICY "Users can view their dealer tags"
  ON invoice_tags FOR SELECT
  USING (
    dealer_id IN (
      SELECT dealer_id FROM dealer_memberships
      WHERE user_id = auth.uid()
    )
  );

-- Policy: usuarios pueden crear tags en su dealer
CREATE POLICY "Users can create tags in their dealer"
  ON invoice_tags FOR INSERT
  WITH CHECK (
    dealer_id IN (
      SELECT dealer_id FROM dealer_memberships
      WHERE user_id = auth.uid()
    )
  );

-- Policy: usuarios pueden actualizar tags de su dealer
CREATE POLICY "Users can update their dealer tags"
  ON invoice_tags FOR UPDATE
  USING (
    dealer_id IN (
      SELECT dealer_id FROM dealer_memberships
      WHERE user_id = auth.uid()
    )
  );

-- Policy: usuarios pueden eliminar tags de su dealer (si no están en uso)
CREATE POLICY "Users can delete their dealer tags"
  ON invoice_tags FOR DELETE
  USING (
    dealer_id IN (
      SELECT dealer_id FROM dealer_memberships
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- RLS POLICIES - invoice_tag_relations
-- =====================================================

-- Policy: usuarios pueden ver relaciones de invoices de su dealer
CREATE POLICY "Users can view tag relations"
  ON invoice_tag_relations FOR SELECT
  USING (
    invoice_id IN (
      SELECT id FROM invoices
      WHERE dealer_id IN (
        SELECT dealer_id FROM dealer_memberships
        WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: usuarios pueden crear relaciones
CREATE POLICY "Users can create tag relations"
  ON invoice_tag_relations FOR INSERT
  WITH CHECK (
    invoice_id IN (
      SELECT id FROM invoices
      WHERE dealer_id IN (
        SELECT dealer_id FROM dealer_memberships
        WHERE user_id = auth.uid()
      )
    )
  );

-- Policy: usuarios pueden eliminar relaciones
CREATE POLICY "Users can delete tag relations"
  ON invoice_tag_relations FOR DELETE
  USING (
    invoice_id IN (
      SELECT id FROM invoices
      WHERE dealer_id IN (
        SELECT dealer_id FROM dealer_memberships
        WHERE user_id = auth.uid()
      )
    )
  );

-- =====================================================
-- RPC FUNCTIONS
-- =====================================================

-- Función para obtener tags de un invoice específico
CREATE OR REPLACE FUNCTION get_invoice_tags(p_invoice_id UUID)
RETURNS TABLE (
  id UUID,
  tag_name TEXT,
  color_index INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.tag_name,
    t.color_index
  FROM invoice_tags t
  INNER JOIN invoice_tag_relations r ON r.tag_id = t.id
  WHERE r.invoice_id = p_invoice_id
  ORDER BY t.tag_name ASC;
END;
$$;

-- Función para obtener tags sugeridos (más usados) de un dealer
CREATE OR REPLACE FUNCTION get_suggested_tags(
  p_dealer_id INTEGER,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  tag_name TEXT,
  color_index INTEGER,
  usage_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.tag_name,
    t.color_index,
    t.usage_count
  FROM invoice_tags t
  WHERE t.dealer_id = p_dealer_id
  ORDER BY t.usage_count DESC, t.tag_name ASC
  LIMIT p_limit;
END;
$$;

-- Función para actualizar tags de un invoice
CREATE OR REPLACE FUNCTION update_invoice_tags(
  p_invoice_id UUID,
  p_dealer_id INTEGER,
  p_tag_names TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tag_name TEXT;
  v_tag_id UUID;
  v_color_index INTEGER;
BEGIN
  -- 1. Eliminar todas las relaciones existentes del invoice
  DELETE FROM invoice_tag_relations
  WHERE invoice_id = p_invoice_id;

  -- 2. Si no hay tags, terminar aquí
  IF array_length(p_tag_names, 1) IS NULL THEN
    RETURN;
  END IF;

  -- 3. Para cada tag name proporcionado
  FOREACH v_tag_name IN ARRAY p_tag_names
  LOOP
    -- Limpiar espacios y convertir a lowercase para búsqueda
    v_tag_name := TRIM(v_tag_name);

    -- Saltar tags vacíos
    IF v_tag_name = '' THEN
      CONTINUE;
    END IF;

    -- Verificar si el tag ya existe para este dealer
    SELECT id, color_index INTO v_tag_id, v_color_index
    FROM invoice_tags
    WHERE dealer_id = p_dealer_id
      AND LOWER(tag_name) = LOWER(v_tag_name);

    -- Si el tag no existe, crearlo con color aleatorio
    IF v_tag_id IS NULL THEN
      v_color_index := floor(random() * 10)::INTEGER; -- 0-9 (10 colores)

      INSERT INTO invoice_tags (
        dealer_id,
        tag_name,
        color_index,
        usage_count
      )
      VALUES (
        p_dealer_id,
        v_tag_name,
        v_color_index,
        1
      )
      RETURNING id INTO v_tag_id;
    ELSE
      -- Si ya existe, incrementar contador de uso
      UPDATE invoice_tags
      SET
        usage_count = usage_count + 1,
        updated_at = NOW()
      WHERE id = v_tag_id;
    END IF;

    -- Crear la relación invoice <-> tag
    INSERT INTO invoice_tag_relations (invoice_id, tag_id)
    VALUES (p_invoice_id, v_tag_id)
    ON CONFLICT (invoice_id, tag_id) DO NOTHING;
  END LOOP;
END;
$$;

-- Función para obtener todos los tags únicos de un dealer con conteo de uso
CREATE OR REPLACE FUNCTION get_dealer_tags_summary(p_dealer_id INTEGER)
RETURNS TABLE (
  id UUID,
  tag_name TEXT,
  color_index INTEGER,
  usage_count INTEGER,
  invoice_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.tag_name,
    t.color_index,
    t.usage_count,
    COUNT(DISTINCT r.invoice_id)::INTEGER AS invoice_count
  FROM invoice_tags t
  LEFT JOIN invoice_tag_relations r ON r.tag_id = t.id
  WHERE t.dealer_id = p_dealer_id
  GROUP BY t.id, t.tag_name, t.color_index, t.usage_count
  ORDER BY COUNT(DISTINCT r.invoice_id) DESC, t.tag_name ASC;
END;
$$;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_invoice_tags_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_invoice_tags_timestamp
  BEFORE UPDATE ON invoice_tags
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_tags_updated_at();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE invoice_tags IS 'Catálogo de tags únicos por dealer para categorizar invoices';
COMMENT ON TABLE invoice_tag_relations IS 'Relación muchos-a-muchos entre invoices y tags';
COMMENT ON COLUMN invoice_tags.color_index IS 'Índice del color (0-9) para el tag';
COMMENT ON COLUMN invoice_tags.usage_count IS 'Contador de veces que se ha usado el tag';
COMMENT ON FUNCTION get_invoice_tags(UUID) IS 'Obtiene todos los tags de un invoice específico';
COMMENT ON FUNCTION get_suggested_tags(INTEGER, INTEGER) IS 'Obtiene tags sugeridos (más usados) para un dealer';
COMMENT ON FUNCTION update_invoice_tags(UUID, INTEGER, TEXT[]) IS 'Actualiza los tags de un invoice (elimina existentes y crea nuevos)';
COMMENT ON FUNCTION get_dealer_tags_summary(INTEGER) IS 'Obtiene resumen de todos los tags de un dealer con estadísticas';
