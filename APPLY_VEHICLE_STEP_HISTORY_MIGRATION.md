# Aplicar Migración: Vehicle Step History

Esta migración crea el sistema completo de seguimiento de tiempo por pasos para el módulo Get Ready.

## 🎯 ¿Qué hace esta migración?

1. **Crea la tabla `vehicle_step_history`** - Tabla principal para rastrear el tiempo de cada vehículo en cada paso
2. **Configura RLS (Row Level Security)** - Políticas de seguridad
3. **Crea índices** - Para optimizar el rendimiento
4. **Instala triggers automáticos** - Para actualizar el historial cuando los vehículos cambian de paso
5. **Crea funciones auxiliares** - Para obtener tiempos acumulados y estadísticas
6. **Migra vehículos existentes** - Crea entradas de historial para todos los vehículos actuales
7. **Crea vistas analíticas** - Para consultar fácilmente los tiempos

## 🚀 Método 1: Dashboard de Supabase (Recomendado)

Este es el método más seguro y directo:

### Pasos:

1. **Abre tu proyecto en Supabase Dashboard**
   - Ve a: https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr

2. **Navega al SQL Editor**
   - En el menú lateral, haz clic en "SQL Editor"
   - O ve directamente a: https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/sql/new

3. **Copia el contenido de la migración**
   - Abre el archivo: `supabase/migrations/20251013000000_create_vehicle_step_history.sql`
   - Selecciona todo el contenido (Ctrl+A)
   - Copia (Ctrl+C)

4. **Pega y ejecuta**
   - Pega el SQL en el editor (Ctrl+V)
   - Haz clic en el botón "RUN" o presiona Ctrl+Enter
   - Espera a que se complete la ejecución (puede tardar unos segundos)

5. **Verifica el resultado**
   - Deberías ver un mensaje de éxito
   - Ve a "Table Editor" y busca la tabla `vehicle_step_history`
   - Deberías ver entradas para tus vehículos existentes

## 🔧 Método 2: Script Automatizado (Avanzado)

Si prefieres ejecutar la migración desde la línea de comandos:

### Prerrequisitos:

Necesitas la **Service Role Key** de Supabase:
1. Ve a: https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/settings/api
2. Copia la "service_role" key (⚠️ **NUNCA** la compartas o la subas a Git)

### Ejecutar:

```powershell
# En PowerShell
$env:VITE_SUPABASE_URL="https://swfnnrpzpkdypbrzmgnr.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key-aqui"
node scripts/apply_vehicle_step_history_migration.js
```

## ✅ Verificación

Después de aplicar la migración, verifica que todo funcione:

### 1. Verifica la tabla

```sql
-- Ejecuta en SQL Editor
SELECT COUNT(*) FROM vehicle_step_history;
```

Deberías ver al menos tantas entradas como vehículos activos tengas.

### 2. Verifica las funciones

```sql
-- Prueba la función de tiempos por paso
SELECT * FROM get_vehicle_step_times('id-de-un-vehiculo-aqui');
```

### 3. Verifica la vista

```sql
-- Consulta la vista de tiempos actuales
SELECT * FROM vehicle_step_times_current LIMIT 10;
```

### 4. Verifica en la aplicación

1. Abre el módulo Get Ready en tu aplicación
2. Selecciona un vehículo
3. Ve a la pestaña "Timeline" en el panel de detalles
4. Deberías ver el nuevo componente de seguimiento de tiempo con:
   - Tiempo total en proceso
   - Tiempo en el paso actual
   - Tiempo acumulado por cada paso visitado

## 🐛 Solución de Problemas

### Error: "relation already exists"

Si la tabla ya existe, puedes eliminarla primero:

```sql
DROP TABLE IF EXISTS public.vehicle_step_history CASCADE;
```

Luego vuelve a ejecutar la migración completa.

### Error: "function does not exist"

Algunas funciones auxiliares pueden tener dependencias. Asegúrate de ejecutar todo el SQL de una vez, no por partes.

### Error: "permission denied"

Asegúrate de estar usando una cuenta con permisos de administrador en Supabase, o la service_role key en el método automatizado.

## 📊 Estructura de la Tabla

```sql
vehicle_step_history
├── id (UUID, PK)
├── vehicle_id (UUID, FK → get_ready_vehicles)
├── step_id (TEXT, FK → get_ready_steps)
├── dealer_id (BIGINT, FK → dealerships)
├── entry_date (TIMESTAMPTZ)
├── exit_date (TIMESTAMPTZ, nullable)
├── hours_accumulated (DECIMAL)
├── visit_number (INTEGER)
├── is_current_visit (BOOLEAN)
├── notes (TEXT, nullable)
├── metadata (JSONB)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)
```

## 🔄 Comportamiento Automático

Una vez aplicada la migración, el sistema funcionará automáticamente:

1. **Al crear un vehículo nuevo**: Se crea automáticamente su primera entrada en el historial
2. **Al mover un vehículo a un nuevo paso**:
   - Se cierra la entrada actual (se calcula `hours_accumulated`)
   - Se crea una nueva entrada para el nuevo paso
   - Si el vehículo regresa a un paso anterior, se incrementa el `visit_number`
3. **Consultas en tiempo real**: Las funciones calculan automáticamente el tiempo actual basándose en `entry_date`

## 📝 Notas Importantes

- ✅ Esta migración es **idempotente** - puedes ejecutarla múltiples veces sin problemas
- ✅ **No pierde datos** - Todos los vehículos existentes se migran automáticamente
- ✅ **No afecta funcionalidad existente** - Solo agrega nuevas capacidades
- ⚠️ La migración incluye la inserción de datos históricos para vehículos existentes
- ⚠️ Si tienes muchos vehículos, la primera ejecución puede tardar unos segundos

## 🎉 Después de la Migración

Una vez aplicada, la aplicación ya tiene todo listo para:
- Mostrar tiempos exactos por paso
- Rastrear múltiples visitas al mismo paso
- Calcular tiempo total desde "dispatch" hasta "front line"
- Generar reportes de rendimiento por paso
- Identificar cuellos de botella en el proceso

¡La funcionalidad ya está implementada en el frontend y lista para usar!
