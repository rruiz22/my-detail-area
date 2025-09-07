# Configuración de Usuario Admin - rruiz@lima.llc

## Resumen
Se ha configurado el sistema para reconocer automáticamente a `rruiz@lima.llc` como usuario administrador con permisos completos.

## Pasos para Implementar

### 1. Ejecutar el Script de Configuración

1. Ve al **Dashboard de Supabase**: https://supabase.com/dashboard
2. Navega a tu proyecto: `my-detail-area`
3. Ve a **SQL Editor** en la barra lateral
4. Copia y pega el contenido del archivo `setup_admin_user.sql`
5. Haz clic en **Run** para ejecutar el script

### 2. Verificar la Configuración

1. En el **SQL Editor**, ejecuta el contenido del archivo `verify_admin_setup.sql`
2. Revisa que:
   - El rol `system_admin` existe
   - Los permisos están asignados correctamente
   - La función `handle_new_user` incluye tu email

### 3. Registrarse como Admin

1. Ve a tu aplicación web
2. Regístrate usando el email: `rruiz@lima.llc`
3. El sistema automáticamente:
   - Creará tu perfil con rol `admin`
   - Asignará el rol `system_admin`
   - Te dará acceso a todas las funcionalidades

## ¿Qué hace el script?

### ✅ Actualiza la función `handle_new_user`
- Agrega `rruiz@lima.llc` a la lista de emails admin
- Asigna automáticamente permisos de administrador al registrarse

### ✅ Verifica/Crea el rol `system_admin`
- Crea el rol si no existe
- Asigna permisos `admin` para todos los módulos:
  - dashboard
  - sales_orders
  - service_orders
  - recon_orders
  - car_wash
  - reports
  - settings
  - dealerships
  - users

### ✅ Verifica/Crea dealership por defecto
- Asegura que existe un dealership (ID: 5) para asignar al admin

## Permisos del Usuario Admin

Una vez registrado con `rruiz@lima.llc`, tendrás:

- ✅ **Acceso completo** a todos los módulos
- ✅ **Gestión de usuarios** - crear, editar, eliminar usuarios
- ✅ **Gestión de dealerships** - crear, editar dealerships
- ✅ **Configuración del sistema** - ajustes globales
- ✅ **Reportes avanzados** - acceso a todos los reportes
- ✅ **Gestión de permisos** - asignar roles a otros usuarios

## Estructura de Roles

```
system_admin (rruiz@lima.llc)
├── dashboard: admin
├── sales_orders: admin
├── service_orders: admin
├── recon_orders: admin
├── car_wash: admin
├── reports: admin
├── settings: admin
├── dealerships: admin
└── users: admin
```

## Troubleshooting

### Si el script falla:
1. Verifica que estés conectado al proyecto correcto
2. Asegúrate de tener permisos de escritura en la base de datos
3. Revisa los logs de Supabase para errores específicos

### Si no apareces como admin después del registro:
1. Ejecuta `verify_admin_setup.sql` para revisar la configuración
2. Verifica que usaste exactamente `rruiz@lima.llc` al registrarte
3. Revisa la tabla `profiles` para confirmar tu entrada

## Archivos Incluidos

- `setup_admin_user.sql` - Script principal de configuración
- `verify_admin_setup.sql` - Script de verificación
- `20250907194733_add_rruiz_lima_admin.sql` - Migración de Supabase
- `ADMIN_SETUP_README.md` - Este archivo de instrucciones

## Contacto

Si tienes problemas con la configuración, los archivos están listos y solo necesitas ejecutar los scripts SQL en el Dashboard de Supabase.
