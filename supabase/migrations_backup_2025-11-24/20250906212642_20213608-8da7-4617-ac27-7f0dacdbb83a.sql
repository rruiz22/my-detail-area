-- Insert default roles and permissions

-- Insert dealer roles
INSERT INTO public.roles (name, display_name, description, user_type, dealer_role) VALUES
('dealer_salesperson', 'Salesperson', 'Handles customer sales and inquiries', 'dealer', 'salesperson'),
('dealer_service_advisor', 'Service Advisor', 'Manages service appointments and customer relations', 'dealer', 'service_advisor'),
('dealer_lot_guy', 'Lot Attendant', 'Manages inventory and vehicle preparation', 'dealer', 'lot_guy'),
('dealer_sales_manager', 'Sales Manager', 'Oversees sales team and operations', 'dealer', 'sales_manager'),
('dealer_service_manager', 'Service Manager', 'Manages service department operations', 'dealer', 'service_manager'),
('dealer_dispatcher', 'Dispatcher', 'Coordinates work assignments and schedules', 'dealer', 'dispatcher'),
('dealer_receptionist', 'Receptionist', 'Handles front desk and customer service', 'dealer', 'receptionist');

-- Insert detail roles
INSERT INTO public.roles (name, display_name, description, user_type, detail_role) VALUES
('detail_super_manager', 'Super Manager', 'Full system access and management', 'detail', 'super_manager'),
('detail_manager', 'Detail Manager', 'Manages dealership operations and users', 'detail', 'detail_manager'),
('detail_staff', 'Detail Staff', 'Operational access to assigned modules', 'detail', 'detail_staff'),
('detail_quality_inspector', 'Quality Inspector', 'Reviews and audits operations', 'detail', 'quality_inspector'),
('detail_mobile_technician', 'Mobile Technician', 'Field service and mobile operations', 'detail', 'mobile_technician');

-- Get role IDs for permission assignments
DO $$
DECLARE
    salesperson_id UUID;
    service_advisor_id UUID;
    lot_guy_id UUID;
    sales_manager_id UUID;
    service_manager_id UUID;
    dispatcher_id UUID;
    receptionist_id UUID;
    super_manager_id UUID;
    detail_manager_id UUID;
    detail_staff_id UUID;
    quality_inspector_id UUID;
    mobile_technician_id UUID;
BEGIN
    -- Get dealer role IDs
    SELECT id INTO salesperson_id FROM public.roles WHERE name = 'dealer_salesperson';
    SELECT id INTO service_advisor_id FROM public.roles WHERE name = 'dealer_service_advisor';
    SELECT id INTO lot_guy_id FROM public.roles WHERE name = 'dealer_lot_guy';
    SELECT id INTO sales_manager_id FROM public.roles WHERE name = 'dealer_sales_manager';
    SELECT id INTO service_manager_id FROM public.roles WHERE name = 'dealer_service_manager';
    SELECT id INTO dispatcher_id FROM public.roles WHERE name = 'dealer_dispatcher';
    SELECT id INTO receptionist_id FROM public.roles WHERE name = 'dealer_receptionist';
    
    -- Get detail role IDs
    SELECT id INTO super_manager_id FROM public.roles WHERE name = 'detail_super_manager';
    SELECT id INTO detail_manager_id FROM public.roles WHERE name = 'detail_manager';
    SELECT id INTO detail_staff_id FROM public.roles WHERE name = 'detail_staff';
    SELECT id INTO quality_inspector_id FROM public.roles WHERE name = 'detail_quality_inspector';
    SELECT id INTO mobile_technician_id FROM public.roles WHERE name = 'detail_mobile_technician';

    -- Salesperson permissions
    INSERT INTO public.role_permissions (role_id, module, permission_level) VALUES
    (salesperson_id, 'dashboard', 'read'),
    (salesperson_id, 'sales_orders', 'write'),
    (salesperson_id, 'reports', 'read');

    -- Service Advisor permissions
    INSERT INTO public.role_permissions (role_id, module, permission_level) VALUES
    (service_advisor_id, 'dashboard', 'read'),
    (service_advisor_id, 'service_orders', 'write'),
    (service_advisor_id, 'car_wash', 'write'),
    (service_advisor_id, 'reports', 'read');

    -- Lot Guy permissions
    INSERT INTO public.role_permissions (role_id, module, permission_level) VALUES
    (lot_guy_id, 'dashboard', 'read'),
    (lot_guy_id, 'recon_orders', 'write'),
    (lot_guy_id, 'car_wash', 'write');

    -- Sales Manager permissions
    INSERT INTO public.role_permissions (role_id, module, permission_level) VALUES
    (sales_manager_id, 'dashboard', 'read'),
    (sales_manager_id, 'sales_orders', 'admin'),
    (sales_manager_id, 'reports', 'admin'),
    (sales_manager_id, 'users', 'write');

    -- Service Manager permissions
    INSERT INTO public.role_permissions (role_id, module, permission_level) VALUES
    (service_manager_id, 'dashboard', 'read'),
    (service_manager_id, 'service_orders', 'admin'),
    (service_manager_id, 'car_wash', 'admin'),
    (service_manager_id, 'recon_orders', 'admin'),
    (service_manager_id, 'reports', 'admin'),
    (service_manager_id, 'users', 'write');

    -- Dispatcher permissions
    INSERT INTO public.role_permissions (role_id, module, permission_level) VALUES
    (dispatcher_id, 'dashboard', 'read'),
    (dispatcher_id, 'sales_orders', 'read'),
    (dispatcher_id, 'service_orders', 'read'),
    (dispatcher_id, 'recon_orders', 'read'),
    (dispatcher_id, 'car_wash', 'read');

    -- Receptionist permissions
    INSERT INTO public.role_permissions (role_id, module, permission_level) VALUES
    (receptionist_id, 'dashboard', 'read'),
    (receptionist_id, 'sales_orders', 'read'),
    (receptionist_id, 'service_orders', 'read');

    -- Super Manager permissions (full access)
    INSERT INTO public.role_permissions (role_id, module, permission_level) VALUES
    (super_manager_id, 'dashboard', 'admin'),
    (super_manager_id, 'sales_orders', 'admin'),
    (super_manager_id, 'service_orders', 'admin'),
    (super_manager_id, 'recon_orders', 'admin'),
    (super_manager_id, 'car_wash', 'admin'),
    (super_manager_id, 'reports', 'admin'),
    (super_manager_id, 'settings', 'admin'),
    (super_manager_id, 'dealerships', 'admin'),
    (super_manager_id, 'users', 'admin');

    -- Detail Manager permissions
    INSERT INTO public.role_permissions (role_id, module, permission_level) VALUES
    (detail_manager_id, 'dashboard', 'read'),
    (detail_manager_id, 'dealerships', 'admin'),
    (detail_manager_id, 'users', 'admin'),
    (detail_manager_id, 'reports', 'admin'),
    (detail_manager_id, 'settings', 'write');

    -- Detail Staff permissions
    INSERT INTO public.role_permissions (role_id, module, permission_level) VALUES
    (detail_staff_id, 'dashboard', 'read'),
    (detail_staff_id, 'sales_orders', 'read'),
    (detail_staff_id, 'service_orders', 'read'),
    (detail_staff_id, 'recon_orders', 'read'),
    (detail_staff_id, 'car_wash', 'read'),
    (detail_staff_id, 'reports', 'read');

    -- Quality Inspector permissions
    INSERT INTO public.role_permissions (role_id, module, permission_level) VALUES
    (quality_inspector_id, 'dashboard', 'read'),
    (quality_inspector_id, 'sales_orders', 'read'),
    (quality_inspector_id, 'service_orders', 'read'),
    (quality_inspector_id, 'recon_orders', 'read'),
    (quality_inspector_id, 'car_wash', 'read'),
    (quality_inspector_id, 'reports', 'admin');

    -- Mobile Technician permissions
    INSERT INTO public.role_permissions (role_id, module, permission_level) VALUES
    (mobile_technician_id, 'dashboard', 'read'),
    (mobile_technician_id, 'service_orders', 'write'),
    (mobile_technician_id, 'recon_orders', 'write');

END $$;