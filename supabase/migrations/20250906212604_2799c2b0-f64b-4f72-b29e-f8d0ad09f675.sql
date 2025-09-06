-- Comprehensive RBAC System Implementation

-- Create enums for the role system
CREATE TYPE public.user_type AS ENUM ('dealer', 'detail');

CREATE TYPE public.dealer_role AS ENUM (
  'salesperson',
  'service_advisor', 
  'lot_guy',
  'sales_manager',
  'service_manager',
  'dispatcher',
  'receptionist'
);

CREATE TYPE public.detail_role AS ENUM (
  'super_manager',
  'detail_manager', 
  'detail_staff',
  'quality_inspector',
  'mobile_technician'
);

CREATE TYPE public.app_module AS ENUM (
  'dashboard',
  'sales_orders',
  'service_orders', 
  'recon_orders',
  'car_wash',
  'reports',
  'settings',
  'dealerships',
  'users'
);

CREATE TYPE public.permission_level AS ENUM (
  'none',
  'read', 
  'write',
  'delete',
  'admin'
);

-- Add user_type to profiles table
ALTER TABLE public.profiles ADD COLUMN user_type public.user_type DEFAULT 'dealer';

-- Create roles table
CREATE TABLE public.roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  user_type public.user_type NOT NULL,
  dealer_role public.dealer_role,
  detail_role public.detail_role,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system_role BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create role_permissions table
CREATE TABLE public.role_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  module public.app_module NOT NULL,
  permission_level public.permission_level NOT NULL DEFAULT 'none',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(role_id, module)
);

-- Create user_role_assignments table
CREATE TABLE public.user_role_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.profiles(id),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role_id)
);

-- Enable RLS on new tables
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_role_assignments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for roles table
CREATE POLICY "Users can view all roles" ON public.roles FOR SELECT USING (true);

-- Create RLS policies for role_permissions table  
CREATE POLICY "Users can view role permissions" ON public.role_permissions FOR SELECT USING (true);

-- Create RLS policies for user_role_assignments table
CREATE POLICY "Users can view own role assignments" ON public.user_role_assignments 
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Managers can view dealership user assignments" ON public.user_role_assignments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles p1, public.profiles p2
    WHERE p1.id = auth.uid() 
    AND p2.id = user_role_assignments.user_id
    AND p1.dealership_id = p2.dealership_id
    AND p1.role IN ('manager', 'admin')
  )
);

CREATE POLICY "Admins can manage all assignments" ON public.user_role_assignments 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Create trigger for updated_at columns
CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_role_assignments_updated_at
  BEFORE UPDATE ON public.user_role_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get user permissions
CREATE OR REPLACE FUNCTION public.get_user_permissions(user_uuid UUID)
RETURNS TABLE(module public.app_module, permission_level public.permission_level)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rp.module,
    MAX(rp.permission_level) as permission_level
  FROM public.user_role_assignments ura
  JOIN public.roles r ON r.id = ura.role_id
  JOIN public.role_permissions rp ON rp.role_id = r.id
  WHERE ura.user_id = user_uuid 
  AND ura.is_active = true
  AND r.is_active = true
  AND (ura.expires_at IS NULL OR ura.expires_at > now())
  GROUP BY rp.module;
END;
$$;

-- Create function to check specific permission
CREATE OR REPLACE FUNCTION public.has_permission(
  user_uuid UUID, 
  check_module public.app_module, 
  required_level public.permission_level
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_permission public.permission_level;
  permission_hierarchy INTEGER[] := ARRAY[0, 1, 2, 3, 4]; -- none, read, write, delete, admin
  required_index INTEGER;
  user_index INTEGER;
BEGIN
  -- Get user's permission for the module
  SELECT permission_level INTO user_permission
  FROM public.get_user_permissions(user_uuid)
  WHERE module = check_module;
  
  -- If no permission found, default to 'none'
  IF user_permission IS NULL THEN
    user_permission := 'none';
  END IF;
  
  -- Get array indices for comparison
  required_index := CASE required_level
    WHEN 'none' THEN 0
    WHEN 'read' THEN 1
    WHEN 'write' THEN 2
    WHEN 'delete' THEN 3
    WHEN 'admin' THEN 4
  END;
  
  user_index := CASE user_permission
    WHEN 'none' THEN 0
    WHEN 'read' THEN 1
    WHEN 'write' THEN 2
    WHEN 'delete' THEN 3
    WHEN 'admin' THEN 4
  END;
  
  -- Check if user has required permission level or higher
  RETURN user_index >= required_index;
END;
$$;

-- Create function to get user roles
CREATE OR REPLACE FUNCTION public.get_user_roles(user_uuid UUID)
RETURNS TABLE(
  role_id UUID,
  role_name TEXT,
  display_name TEXT,
  user_type public.user_type,
  dealer_role public.dealer_role,
  detail_role public.detail_role,
  expires_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.name,
    r.display_name,
    r.user_type,
    r.dealer_role,
    r.detail_role,
    ura.expires_at
  FROM public.user_role_assignments ura
  JOIN public.roles r ON r.id = ura.role_id
  WHERE ura.user_id = user_uuid 
  AND ura.is_active = true
  AND r.is_active = true
  AND (ura.expires_at IS NULL OR ura.expires_at > now());
END;
$$;

-- Create function to assign role to user
CREATE OR REPLACE FUNCTION public.assign_role(
  target_user_id UUID,
  role_name TEXT,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_uuid UUID;
BEGIN
  -- Get role ID
  SELECT id INTO role_uuid FROM public.roles WHERE name = role_name AND is_active = true;
  
  IF role_uuid IS NULL THEN
    RAISE EXCEPTION 'Role % not found', role_name;
  END IF;
  
  -- Insert or update role assignment
  INSERT INTO public.user_role_assignments (user_id, role_id, assigned_by, expires_at)
  VALUES (target_user_id, role_uuid, auth.uid(), expires_at)
  ON CONFLICT (user_id, role_id) 
  DO UPDATE SET 
    is_active = true,
    expires_at = EXCLUDED.expires_at,
    updated_at = now();
    
  RETURN true;
END;
$$;