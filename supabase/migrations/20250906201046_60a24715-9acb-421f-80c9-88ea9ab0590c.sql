-- Create enums for better type safety and validation
CREATE TYPE dealership_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE subscription_plan AS ENUM ('basic', 'premium', 'enterprise');
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'technician', 'viewer');
CREATE TYPE user_department AS ENUM ('detailing', 'wash', 'service');
CREATE TYPE contact_department AS ENUM ('sales', 'service', 'parts', 'management', 'other');
CREATE TYPE language_code AS ENUM ('en', 'es', 'pt-BR');

-- DEALERSHIPS table
CREATE TABLE public.dealerships (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    country TEXT DEFAULT 'US',
    website TEXT,
    tax_number TEXT UNIQUE,
    logo_url TEXT,
    primary_color TEXT DEFAULT '#3B82F6',
    status dealership_status DEFAULT 'active',
    subscription_plan subscription_plan DEFAULT 'basic',
    max_users INTEGER DEFAULT 5,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- DEALERSHIP CONTACTS table
CREATE TABLE public.dealership_contacts (
    id BIGSERIAL PRIMARY KEY,
    dealership_id BIGINT NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    mobile_phone TEXT,
    position TEXT,
    department contact_department DEFAULT 'other',
    is_primary BOOLEAN DEFAULT FALSE,
    can_receive_notifications BOOLEAN DEFAULT TRUE,
    preferred_language language_code DEFAULT 'en',
    notes TEXT,
    avatar_url TEXT,
    status dealership_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- DETAIL USERS table  
CREATE TABLE public.detail_users (
    id BIGSERIAL PRIMARY KEY,
    dealership_id BIGINT REFERENCES public.dealerships(id) ON DELETE SET NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    role user_role DEFAULT 'viewer',
    department user_department DEFAULT 'detailing',
    employee_id TEXT,
    hire_date DATE,
    avatar_url TEXT,
    language_preference language_code DEFAULT 'en',
    timezone TEXT DEFAULT 'America/New_York',
    is_active BOOLEAN DEFAULT TRUE,
    can_access_all_dealerships BOOLEAN DEFAULT FALSE,
    assigned_dealerships JSONB DEFAULT '[]'::jsonb,
    permissions JSONB DEFAULT '{}'::jsonb,
    last_login_at TIMESTAMPTZ,
    email_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL
);

-- Create indexes for better performance
CREATE INDEX idx_dealerships_status ON public.dealerships(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_dealerships_plan ON public.dealerships(subscription_plan) WHERE deleted_at IS NULL;
CREATE INDEX idx_dealership_contacts_dealership ON public.dealership_contacts(dealership_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_dealership_contacts_primary ON public.dealership_contacts(dealership_id, is_primary) WHERE deleted_at IS NULL;
CREATE INDEX idx_detail_users_dealership ON public.detail_users(dealership_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_detail_users_email ON public.detail_users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_detail_users_role ON public.detail_users(role) WHERE deleted_at IS NULL;

-- Enable Row Level Security
ALTER TABLE public.dealerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealership_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detail_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies - For now, allowing all authenticated users to manage data
-- In production, these should be more restrictive based on user roles
CREATE POLICY "Allow authenticated users to manage dealerships" ON public.dealerships
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage contacts" ON public.dealership_contacts
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users to manage detail users" ON public.detail_users
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update updated_at
CREATE TRIGGER update_dealerships_updated_at
    BEFORE UPDATE ON public.dealerships
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_dealership_contacts_updated_at
    BEFORE UPDATE ON public.dealership_contacts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_detail_users_updated_at
    BEFORE UPDATE ON public.detail_users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to ensure only one primary contact per dealership
CREATE OR REPLACE FUNCTION public.ensure_single_primary_contact()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_primary = TRUE THEN
        -- Set all other contacts for this dealership to non-primary
        UPDATE public.dealership_contacts 
        SET is_primary = FALSE 
        WHERE dealership_id = NEW.dealership_id 
        AND id != NEW.id 
        AND deleted_at IS NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to ensure single primary contact
CREATE TRIGGER ensure_single_primary_contact_trigger
    AFTER INSERT OR UPDATE ON public.dealership_contacts
    FOR EACH ROW EXECUTE FUNCTION public.ensure_single_primary_contact();

-- Function to validate user limits based on subscription plan
CREATE OR REPLACE FUNCTION public.validate_user_limit()
RETURNS TRIGGER AS $$
DECLARE
    current_users INTEGER;
    max_allowed INTEGER;
BEGIN
    -- Get max users allowed for the dealership
    SELECT max_users INTO max_allowed 
    FROM public.dealerships 
    WHERE id = NEW.dealership_id;
    
    -- Count current active users for this dealership
    SELECT COUNT(*) INTO current_users
    FROM public.detail_users 
    WHERE dealership_id = NEW.dealership_id 
    AND is_active = TRUE 
    AND deleted_at IS NULL;
    
    -- Check if we're exceeding the limit (only for INSERT)
    IF TG_OP = 'INSERT' AND current_users >= max_allowed THEN
        RAISE EXCEPTION 'User limit exceeded. Maximum % users allowed for this subscription plan.', max_allowed;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate user limits
CREATE TRIGGER validate_user_limit_trigger
    BEFORE INSERT ON public.detail_users
    FOR EACH ROW EXECUTE FUNCTION public.validate_user_limit();