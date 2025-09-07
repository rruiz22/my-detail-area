-- Script para crear usuario admin rruiz@lima.llc
-- Ejecuta este script en el Dashboard de Supabase > SQL Editor

-- 1. Actualizar la función handle_new_user para incluir rruiz@lima.llc como admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public 
AS $$
DECLARE
  admin_role_id UUID;
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, email, first_name, last_name, user_type, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    'dealer',
    CASE 
      WHEN NEW.email IN ('admin@test.com', 'admin@company.com', 'rruiz@mydetailarea.com', 'rruiz@lima.llc') THEN 'admin' 
      ELSE 'viewer' 
    END
  );
  
  -- If this is an admin user, assign system_admin role and dealer membership
  IF NEW.email IN ('admin@test.com', 'admin@company.com', 'rruiz@mydetailarea.com', 'rruiz@lima.llc') THEN
    -- Get the system_admin role ID
    SELECT id INTO admin_role_id FROM public.roles WHERE name = 'system_admin' LIMIT 1;
    
    IF admin_role_id IS NOT NULL THEN
      -- Assign system admin role
      INSERT INTO public.user_role_assignments (user_id, role_id, assigned_by, is_active)
      VALUES (NEW.id, admin_role_id, NEW.id, true);
      
      -- Create dealer membership for dealer 5 (o el dealer principal)
      INSERT INTO public.dealer_memberships (user_id, dealer_id, is_active, joined_at)
      VALUES (NEW.id, 5, true, now());
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Comentario de documentación
COMMENT ON FUNCTION public.handle_new_user() IS 'Updated to include rruiz@lima.llc as admin user with full system permissions';

-- 3. Verificar que el rol system_admin existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'system_admin') THEN
    RAISE NOTICE 'WARNING: system_admin role does not exist. Creating it...';
    
    INSERT INTO public.roles (id, name, display_name, user_type, is_system_role, created_at)
    VALUES (
      gen_random_uuid(),
      'system_admin',
      'System Administrator',
      'dealer',
      true,
      now()
    );
    
    -- Agregar permisos completos al rol system_admin
    INSERT INTO public.role_permissions (role_id, module, permission_level)
    SELECT 
      r.id,
      m.module,
      'admin'::public.permission_level
    FROM public.roles r
    CROSS JOIN (
      SELECT unnest(enum_range(NULL::public.app_module)) AS module
    ) m
    WHERE r.name = 'system_admin';
    
    RAISE NOTICE 'system_admin role created successfully with full permissions';
  ELSE
    RAISE NOTICE 'system_admin role already exists';
  END IF;
END $$;

-- 4. Verificar que el dealer 5 existe, si no, crear uno por defecto
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.dealerships WHERE id = 5) THEN
    RAISE NOTICE 'WARNING: Dealer 5 does not exist. Creating default dealer...';
    
    INSERT INTO public.dealerships (id, name, address, city, state, zip, phone, email, created_at)
    VALUES (
      5,
      'Main Dealership',
      '123 Main St',
      'Lima',
      'Lima',
      '15001',
      '+51-1-234-5678',
      'contact@lima.llc',
      now()
    );
    
    RAISE NOTICE 'Default dealer created successfully';
  ELSE
    RAISE NOTICE 'Dealer 5 already exists';
  END IF;
END $$;

-- 5. Mensaje de confirmación
SELECT 'Usuario admin configurado correctamente. Ahora puedes registrarte con rruiz@lima.llc y tendrás permisos de administrador completos.' AS message;
