# 🚀 Aplicar Migración de SLA Configuration

## Paso 1: Copiar el Script SQL

Abre el archivo:
```
supabase/migrations/20251014000002_create_get_ready_sla_config.sql
```

## Paso 2: Ir a Supabase Dashboard

1. Abre https://app.supabase.com
2. Selecciona tu proyecto
3. Ve a **SQL Editor** (en el menú lateral)
4. Click en **"New Query"**

## Paso 3: Ejecutar la Migración

1. **Copia TODO el contenido** del archivo SQL
2. **Pégalo** en el editor SQL
3. Click en **"Run"** o presiona `Ctrl + Enter`

## Paso 4: Verificar la Ejecución

Deberías ver varios mensajes de éxito:

✅ `CREATE TABLE` - Tablas creadas
✅ `CREATE INDEX` - Índices creados
✅ `CREATE POLICY` - Políticas RLS creadas
✅ `CREATE FUNCTION` - Funciones creadas
✅ `INSERT` - Configuraciones por defecto insertadas

## Paso 5: Verificar las Tablas

Ejecuta este query para verificar:

```sql
-- Ver configuraciones creadas
SELECT
  dealer_id,
  default_time_goal,
  max_time_goal,
  green_threshold,
  warning_threshold,
  danger_threshold
FROM public.get_ready_sla_config
ORDER BY dealer_id;
```

Deberías ver una fila por cada dealership con los valores por defecto:
- `default_time_goal: 4`
- `max_time_goal: 7`
- `green_threshold: 1`
- `warning_threshold: 3`
- `danger_threshold: 4`

## Paso 6: Probar las Funciones

```sql
-- Obtener configuración de un dealer
SELECT * FROM public.get_sla_config_for_dealer(5);

-- Obtener status SLA de un vehículo
SELECT public.get_sla_status_for_vehicle(
  '50f4631f-febe-48b5-bc8b-0fd7fab2f1d6'::uuid,
  9
);
```

## ✅ Checklist Post-Migración

- [ ] Tablas creadas correctamente
- [ ] Políticas RLS activas
- [ ] Funciones creadas y ejecutables
- [ ] Configuraciones por defecto insertadas
- [ ] Permisos `authenticated` otorgados

## 🎉 ¡Migración Completa!

Ahora puedes:

1. **Usar el hook en React**:
   ```typescript
   const { data: config } = useGetReadySLAConfig(dealerId);
   ```

2. **Agregar el panel a Settings**:
   ```typescript
   <SLAConfigurationPanel />
   ```

3. **Probar la interfaz** navegando a la página de configuración

## 🐛 Troubleshooting

**Error: "relation already exists"**
- Las tablas ya están creadas, esto es normal
- La migración usa `CREATE TABLE IF NOT EXISTS`

**Error: "permission denied"**
- Asegúrate de usar una key con permisos de admin
- Verifica que estás en el proyecto correcto

**No aparecen configuraciones**
- Ejecuta manualmente el INSERT:
```sql
INSERT INTO public.get_ready_sla_config (
  dealer_id, default_time_goal, max_time_goal,
  green_threshold, warning_threshold, danger_threshold
)
SELECT d.id, 4, 7, 1, 3, 4
FROM public.dealerships d
WHERE NOT EXISTS (
  SELECT 1 FROM public.get_ready_sla_config WHERE dealer_id = d.id
);
```

## 📝 Notas Adicionales

- La migración es **idempotente**: puedes ejecutarla múltiples veces
- Los datos existentes **NO se perderán**
- Las configuraciones por defecto solo se crean si no existen
- Todas las operaciones usan transacciones

## 🔄 Rollback (si es necesario)

Si necesitas revertir la migración:

```sql
DROP TABLE IF EXISTS public.get_ready_step_sla_config CASCADE;
DROP TABLE IF EXISTS public.get_ready_sla_config CASCADE;
DROP FUNCTION IF EXISTS public.get_sla_status_for_vehicle(UUID, BIGINT);
DROP FUNCTION IF EXISTS public.get_sla_config_for_dealer(BIGINT);
```

⚠️ **Advertencia**: Esto eliminará toda la configuración guardada.
