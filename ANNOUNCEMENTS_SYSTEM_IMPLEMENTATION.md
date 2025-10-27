# Sistema de Anuncios - Implementación Completa

## 📋 Resumen

Se ha implementado exitosamente un sistema completo de anuncios globales que permite a los system-admin crear, gestionar y mostrar anuncios/alertas a usuarios específicos basados en roles y dealers.

## ✅ Componentes Implementados

### 1. Base de Datos
- **Archivo**: `supabase/migrations/20251026000000_create_announcements_system.sql`
- **Tabla**: `announcements` con los siguientes campos:
  - `id`: UUID (Primary Key)
  - `title`: Título del anuncio
  - `content`: Contenido HTML
  - `type`: Tipo (info, warning, alert, success)
  - `priority`: Prioridad de visualización (mayor = primero)
  - `is_active`: Estado activo/inactivo
  - `start_date`: Fecha de inicio (opcional)
  - `end_date`: Fecha de fin (opcional)
  - `target_roles`: Roles específicos (NULL = todos)
  - `target_dealer_ids`: Dealers específicos (NULL = todos)
  - `created_by`: Usuario creador
  - `created_at`, `updated_at`: Timestamps
- **RLS Policies**:
  - System admins tienen acceso completo
  - Usuarios autenticados pueden ver anuncios activos filtrados por su rol y dealer
- **Función RPC**: `get_active_announcements()` para obtención optimizada

### 2. Hook de React Query
- **Archivo**: `src/hooks/useAnnouncements.ts`
- **Hooks disponibles**:
  - `useActiveAnnouncements()`: Para usuarios (muestra anuncios filtrados)
  - `useAllAnnouncements()`: Para admin (todos los anuncios)
  - `useCreateAnnouncement()`: Crear nuevo anuncio
  - `useUpdateAnnouncement()`: Actualizar anuncio
  - `useDeleteAnnouncement()`: Eliminar anuncio
  - `useToggleAnnouncementStatus()`: Activar/desactivar
- **Características**:
  - Caché automático con React Query
  - Refetch cada 5 minutos para anuncios activos
  - Toast notifications para feedback de usuario

### 3. Componente Banner
- **Archivo**: `src/components/announcements/AnnouncementBanner.tsx`
- **Características**:
  - Muestra múltiples anuncios apilados
  - Estilos según tipo (info=azul, warning=amarillo, alert=rojo, success=verde)
  - Renderiza HTML sanitizado con DOMPurify
  - Animaciones suaves de entrada
  - Responsive design
  - Iconos según tipo de anuncio
  - **NOTA**: Los anuncios NO se pueden cerrar por los usuarios (según requerimiento)

### 4. Página de Administración
- **Archivo**: `src/pages/Announcements.tsx`
- **Ruta**: `/announcements` (solo accesible para system-admin)
- **Funcionalidades**:
  - Lista de todos los anuncios con vista de cards
  - Formulario crear/editar con:
    - Título y contenido (con soporte HTML)
    - Tipo (select con 4 opciones)
    - Prioridad (número)
    - Fechas inicio/fin (date pickers)
    - Toggle activo/inactivo
  - Vista previa en tiempo real del contenido HTML
  - Acciones rápidas: Editar, Activar/Desactivar, Eliminar
  - Diálogo de confirmación para eliminación
  - Badges visuales para tipo y estado

### 5. Integración en Layout
- **Archivo**: `src/components/DashboardLayout.tsx`
- **Ubicación**: Debajo del header (antes del contenido main)
- El banner se muestra automáticamente en todas las páginas de la aplicación

### 6. Navegación
- **App.tsx**: Agregada ruta `/announcements` con `ProtectedRoute`
- **AppSidebar.tsx**: Link agregado en sección "System Admin" (solo visible para system_admin)
- **Icono**: Megaphone (lucide-react)

### 7. Traducciones
- **Archivos actualizados**:
  - `public/translations/en.json`
  - `public/translations/es.json`
  - `public/translations/pt-BR.json`
- **Claves agregadas**: Sección completa `announcements` con todos los labels y mensajes

## 🚀 Cómo Aplicar la Migración

### Opción 1: Supabase CLI (Recomendado)
```bash
# Desde la carpeta raíz del proyecto
cd supabase
npx supabase login  # Si no estás autenticado
npx supabase db push
```

### Opción 2: Supabase Dashboard
1. Ir a tu proyecto en https://supabase.com
2. Navegar a "SQL Editor"
3. Copiar el contenido de `supabase/migrations/20251026000000_create_announcements_system.sql`
4. Pegar y ejecutar

### Opción 3: Supabase Studio (Local)
1. Abrir Supabase Studio (si estás en desarrollo local)
2. Ir a SQL Editor
3. Ejecutar el contenido del archivo de migración

## 🧪 Cómo Probar el Sistema

### 1. Verificar la Migración
```sql
-- Verificar que la tabla existe
SELECT * FROM announcements LIMIT 1;

-- Verificar políticas RLS
SELECT * FROM pg_policies WHERE tablename = 'announcements';
```

### 2. Crear un Anuncio de Prueba (como system_admin)
1. Iniciar sesión como `system_admin`
2. Ir a `/announcements` desde el sidebar
3. Hacer clic en "Create Announcement"
4. Llenar el formulario:
   - **Título**: "¡Bienvenido al Sistema de Anuncios!"
   - **Contenido**: `<p>Este es un <b>anuncio de prueba</b> con <i>HTML</i>.</p>`
   - **Tipo**: Info
   - **Prioridad**: 10
   - **Estado**: Activo (toggle on)
5. Guardar

### 3. Verificar el Banner
1. Navegar a cualquier página (Dashboard, Sales, etc.)
2. El banner debería aparecer debajo del header
3. Verificar que se muestra el anuncio con el estilo correcto

### 4. Probar Filtrado por Roles
```sql
-- Crear anuncio solo para dealer_admin
INSERT INTO announcements (title, content, type, target_roles, is_active)
VALUES ('Anuncio para Admins', '<p>Solo admins de dealer ven esto</p>', 'warning', ARRAY['dealer_admin'], true);
```
- Iniciar sesión con usuario dealer_admin → Debería ver el anuncio
- Iniciar sesión con usuario regular → NO debería ver el anuncio

### 5. Probar Filtrado por Dealers
```sql
-- Crear anuncio solo para dealer_id = 1
INSERT INTO announcements (title, content, type, target_dealer_ids, is_active)
VALUES ('Anuncio Específico', '<p>Solo para dealer 1</p>', 'info', ARRAY[1], true);
```
- Usuario del dealer 1 → Debería ver el anuncio
- Usuario de otro dealer → NO debería ver el anuncio

### 6. Probar Fechas de Vigencia
1. Crear anuncio con `end_date` en el pasado → NO debería mostrarse
2. Crear anuncio con `start_date` en el futuro → NO debería mostrarse
3. Crear anuncio sin fechas → Siempre se muestra (mientras esté activo)

### 7. Probar Prioridad
1. Crear varios anuncios con diferentes prioridades (0, 5, 10, 20)
2. Los anuncios deberían mostrarse ordenados de mayor a menor prioridad

## 🎨 Tipos de Anuncios y Colores

| Tipo | Color | Uso Recomendado |
|------|-------|-----------------|
| `info` | Azul | Información general, novedades |
| `warning` | Amarillo | Advertencias, mantenimientos programados |
| `alert` | Rojo | Alertas críticas, problemas urgentes |
| `success` | Verde | Confirmaciones, éxitos, actualizaciones positivas |

## 🔒 Seguridad

1. **RLS Activado**: Solo system_admin puede crear/editar/eliminar
2. **HTML Sanitizado**: DOMPurify previene XSS attacks
3. **Validaciones**: Frontend y backend validan datos
4. **Filtrado por Usuario**: Los anuncios se filtran automáticamente por rol y dealer

## 📝 Notas Importantes

1. **Sin Botón de Cerrar**: Los anuncios NO tienen botón de cierre (según requerimiento 3c)
   - Si en el futuro se desea agregar esta funcionalidad, descomentar el código en `AnnouncementBanner.tsx` (líneas marcadas)

2. **HTML Permitido**: Tags seguros para contenido rico
   - Permitidos: `<b>`, `<i>`, `<em>`, `<strong>`, `<a>`, `<p>`, `<br>`, `<ul>`, `<ol>`, `<li>`, `<span>`, `<div>`
   - Bloqueados: `<script>`, `<iframe>`, `<object>`, etc.

3. **Refetch Automático**: Los anuncios se recargan cada 5 minutos automáticamente

4. **Performance**:
   - Índices creados en campos frecuentemente consultados
   - RPC function para queries optimizadas
   - React Query caché para minimizar requests

## 🐛 Troubleshooting

### El banner no aparece
- Verificar que hay anuncios activos en la BD
- Verificar las fechas de vigencia
- Verificar filtros de roles/dealers
- Revisar console del navegador para errores

### Error de permisos
- Verificar que las políticas RLS están aplicadas
- Verificar que el usuario tiene rol `system_admin` en la tabla `profiles`

### Anuncio no se guarda
- Verificar autenticación de Supabase
- Revisar console para errores de validación
- Verificar que todos los campos requeridos están completos

## 📚 Archivos Modificados/Creados

### Nuevos Archivos
1. `supabase/migrations/20251026000000_create_announcements_system.sql`
2. `src/hooks/useAnnouncements.ts`
3. `src/components/announcements/AnnouncementBanner.tsx`
4. `src/pages/Announcements.tsx`
5. `ANNOUNCEMENTS_SYSTEM_IMPLEMENTATION.md`

### Archivos Modificados
1. `src/components/DashboardLayout.tsx` (agregado banner)
2. `src/App.tsx` (agregada ruta)
3. `src/components/AppSidebar.tsx` (agregado link)
4. `public/translations/en.json` (traducciones)
5. `public/translations/es.json` (traducciones)
6. `public/translations/pt-BR.json` (traducciones)

## ✨ Próximos Pasos Opcionales

1. **Analytics**: Agregar tracking de visualizaciones de anuncios
2. **Programación**: Interfaz para programar anuncios futuros
3. **Plantillas**: Sistema de plantillas predefinidas
4. **Rich Text Editor**: Integrar TinyMCE o similar para edición visual
5. **Imágenes**: Soporte para subir imágenes en anuncios
6. **Notificaciones**: Integrar con sistema de notificaciones existente

---

**Implementado por**: Claude Sonnet 4.5
**Fecha**: 26 de Octubre, 2025
**Estado**: ✅ Completo y listo para usar
