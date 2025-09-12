# My Detail Area - Database Schema Documentation

**Project:** `swfnnrpzpkdypbrzmgnr`  
**Generated:** September 11, 2025  
**Database:** PostgreSQL via Supabase

## Overview

The My Detail Area system is an enterprise-grade dealership management platform built on PostgreSQL with Supabase. The database follows a multi-tenant architecture with row-level security (RLS) and supports multiple dealerships with sophisticated user management.

## Core Architecture Principles

- **Multi-tenant**: Each dealership is isolated with RLS policies
- **Audit Trail**: All tables include created_at, updated_at, and soft deletion with deleted_at
- **Internationalization**: Built-in support for EN, ES, PT-BR languages
- **Type Safety**: Extensive use of PostgreSQL ENUMs for data validation
- **Performance**: Strategic indexing for high-performance queries
- **Security**: Row-level security on all sensitive tables

## Database Enums

```sql
-- User and permission enums
CREATE TYPE user_type AS ENUM ('system_admin', 'dealer_admin', 'dealer_manager', 'dealer_user');
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'technician', 'viewer');
CREATE TYPE user_department AS ENUM ('detailing', 'wash', 'service');

-- Dealership management
CREATE TYPE dealership_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE subscription_plan AS ENUM ('basic', 'premium', 'enterprise');
CREATE TYPE contact_department AS ENUM ('sales', 'service', 'parts', 'management', 'other');

-- Order management
CREATE TYPE order_type AS ENUM ('sales', 'service', 'recon', 'carwash');
CREATE TYPE order_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'partial', 'refunded', 'cancelled');

-- Communication and notifications
CREATE TYPE message_type AS ENUM ('info', 'warning', 'success', 'error');
CREATE TYPE notification_type AS ENUM ('order_update', 'payment', 'system', 'reminder', 'chat');

-- NFC and IoT
CREATE TYPE tag_type AS ENUM ('vehicle', 'location', 'order', 'tool');
CREATE TYPE action_type AS ENUM ('read', 'write', 'update', 'locate');

-- Internationalization
CREATE TYPE language_code AS ENUM ('en', 'es', 'pt-BR');
```

## Core Tables

### 1. Dealership Management

#### `dealerships`
The central table for dealership information and configuration.

```sql
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
```

**Key Features:**
- Unique tax number constraint
- Subscription-based user limits
- Customizable branding (logo_url, primary_color)
- Soft deletion support
- Automatic timestamp management

#### `dealership_contacts`
Contact management for each dealership with department organization.

```sql
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
```

**Key Features:**
- Single primary contact per dealership (enforced by trigger)
- Multi-language preference support
- Notification preferences
- Department-based organization

### 2. User Management System

The system uses a dual-table approach for user management during migration:

#### `profiles` (New System)
Modern user management integrated with Supabase Auth.

```sql
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY,  -- Maps to auth.users.id
    email TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    user_type user_type DEFAULT 'dealer_user',
    is_active BOOLEAN DEFAULT TRUE,
    language_preference language_code DEFAULT 'en',
    timezone TEXT DEFAULT 'America/New_York',
    email_verified BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `dealer_memberships`
Many-to-many relationship between users and dealerships with role-based permissions.

```sql
CREATE TABLE public.dealer_memberships (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    dealer_id BIGINT NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
    role user_role DEFAULT 'viewer',
    permissions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    invited_at TIMESTAMPTZ,
    joined_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Permission System:**
- **system_admin**: Full system access
- **dealer_admin**: Full dealership management
- **dealer_manager**: Operational management
- **dealer_user**: Basic user access

#### `detail_users` (Legacy System)
Legacy user table being migrated to the new profiles system.

### 3. Order Management

#### `orders`
Central order management for all order types (sales, service, recon, carwash).

```sql
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dealer_id BIGINT NOT NULL REFERENCES public.dealerships(id),
    order_type order_type NOT NULL,
    order_number TEXT UNIQUE NOT NULL,
    status order_status DEFAULT 'pending',
    
    -- Vehicle Information
    vehicle_vin TEXT,
    vehicle_year INTEGER,
    vehicle_make TEXT,
    vehicle_model TEXT,
    vehicle_color TEXT,
    vehicle_mileage INTEGER,
    license_plate TEXT,
    
    -- Customer Information  
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    
    -- Order Details
    description TEXT,
    work_requested TEXT,
    total_amount DECIMAL(10,2),
    payment_status payment_status DEFAULT 'pending',
    estimated_completion TIMESTAMPTZ,
    actual_completion TIMESTAMPTZ,
    
    -- QR and Tracking
    qr_code TEXT,
    short_link TEXT,
    qr_scan_count INTEGER DEFAULT 0,
    
    -- Assignment and Notes
    assigned_to UUID,
    created_by UUID NOT NULL,
    notes TEXT,
    attachments JSONB DEFAULT '[]',
    custom_fields JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Features:**
- Unified order system for all business types
- VIN integration for vehicle orders
- QR code generation and tracking
- Flexible custom fields via JSONB
- File attachments support
- Real-time status tracking

### 4. NFC and IoT System

#### `nfc_tags`
Physical NFC tag management with location and association tracking.

```sql
CREATE TABLE public.nfc_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag_uid TEXT NOT NULL UNIQUE,
    tag_type tag_type DEFAULT 'vehicle',
    name TEXT NOT NULL,
    description TEXT,
    dealer_id BIGINT NOT NULL,
    
    -- Associated Entities
    vehicle_vin TEXT,
    order_id UUID,
    location_name TEXT,
    location_coordinates POINT,  -- PostGIS for GPS
    
    -- Configuration
    tag_data JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    is_permanent BOOLEAN DEFAULT FALSE,
    
    -- Tracking
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_scanned_at TIMESTAMPTZ,
    scan_count INTEGER DEFAULT 0
);
```

#### `nfc_scans`
Comprehensive NFC interaction logging with geolocation and analytics.

```sql
CREATE TABLE public.nfc_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag_id UUID NOT NULL REFERENCES public.nfc_tags(id) ON DELETE CASCADE,
    scanned_by UUID NOT NULL,
    scan_location POINT,
    scan_address TEXT,
    device_info JSONB DEFAULT '{}',
    user_agent TEXT,
    action_type action_type DEFAULT 'read',
    action_data JSONB DEFAULT '{}',
    order_id UUID,
    context_data JSONB DEFAULT '{}',
    scanned_at TIMESTAMPTZ DEFAULT NOW(),
    session_id TEXT,
    is_unique_scan BOOLEAN DEFAULT FALSE
);
```

### 5. Communication System

#### `messages`
Internal messaging system for order communication and team collaboration.

```sql
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dealer_id BIGINT NOT NULL,
    sender_id UUID NOT NULL,
    order_id UUID,
    message_type message_type DEFAULT 'info',
    subject TEXT,
    content TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    is_read BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);
```

#### `notifications`
Real-time notification system for user alerts and updates.

```sql
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    dealer_id BIGINT NOT NULL,
    notification_type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);
```

## Row Level Security (RLS)

All tables implement comprehensive RLS policies:

### User Access Patterns:
- **System Admins**: Full access to all data
- **Dealer Admins**: Access to their dealership's data
- **Users**: Access based on dealership membership and role

### Example RLS Policy:
```sql
-- Users can see profiles in their dealership
CREATE POLICY "profiles_select_same_dealership" ON profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM dealer_memberships dm1, dealer_memberships dm2
    WHERE dm1.user_id = auth.uid()
    AND dm2.user_id = profiles.id
    AND dm1.dealer_id = dm2.dealer_id
    AND dm1.is_active = true
    AND dm2.is_active = true
  )
);
```

## Performance Indexes

Strategic indexing for optimal query performance:

```sql
-- Dealership indexes
CREATE INDEX idx_dealerships_status ON public.dealerships(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_dealerships_plan ON public.dealerships(subscription_plan) WHERE deleted_at IS NULL;

-- Contact indexes
CREATE INDEX idx_dealership_contacts_dealership ON public.dealership_contacts(dealership_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_dealership_contacts_primary ON public.dealership_contacts(dealership_id, is_primary) WHERE deleted_at IS NULL;

-- User management indexes
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_dealer_memberships_user ON public.dealer_memberships(user_id);
CREATE INDEX idx_dealer_memberships_dealer ON public.dealer_memberships(dealer_id);

-- Order indexes
CREATE INDEX idx_orders_dealer ON public.orders(dealer_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_type ON public.orders(order_type);
CREATE INDEX idx_orders_vehicle_vin ON public.orders(vehicle_vin);
CREATE INDEX idx_orders_customer_email ON public.orders(customer_email);

-- NFC system indexes
CREATE INDEX idx_nfc_tags_dealer_id ON public.nfc_tags(dealer_id);
CREATE INDEX idx_nfc_tags_tag_uid ON public.nfc_tags(tag_uid);
CREATE INDEX idx_nfc_tags_vehicle_vin ON public.nfc_tags(vehicle_vin);
CREATE INDEX idx_nfc_scans_tag_id ON public.nfc_scans(tag_id);
CREATE INDEX idx_nfc_scans_scanned_at ON public.nfc_scans(scanned_at);

-- Geographic indexes (PostGIS)
CREATE INDEX idx_nfc_tags_location ON public.nfc_tags USING GIST(location_coordinates);
CREATE INDEX idx_nfc_scans_location ON public.nfc_scans USING GIST(scan_location);
```

## Database Functions

### User Management Functions:
```sql
-- Get user permissions across all dealerships
CREATE FUNCTION get_user_permissions(user_id UUID) RETURNS JSONB;

-- Validate user limits based on subscription
CREATE FUNCTION validate_user_limit() RETURNS TRIGGER;
```

### Order Management Functions:
```sql
-- Create order with automatic QR generation
CREATE FUNCTION create_order_with_qr(
  dealer_id BIGINT,
  order_type order_type,
  order_data JSONB
) RETURNS UUID;

-- Update order status with audit trail
CREATE FUNCTION update_order_status(
  order_id UUID,
  new_status order_status,
  notes TEXT DEFAULT NULL
) RETURNS BOOLEAN;
```

### Utility Functions:
```sql
-- Update timestamp trigger function
CREATE FUNCTION update_updated_at_column() RETURNS TRIGGER;

-- Ensure single primary contact per dealership
CREATE FUNCTION ensure_single_primary_contact() RETURNS TRIGGER;
```

## Relationships Summary

```
dealerships (1) ←→ (N) dealership_contacts
dealerships (1) ←→ (N) dealer_memberships
dealerships (1) ←→ (N) orders
dealerships (1) ←→ (N) nfc_tags

profiles (1) ←→ (N) dealer_memberships
profiles (1) ←→ (N) orders (created_by, assigned_to)
profiles (1) ←→ (N) messages (sender_id)
profiles (1) ←→ (N) notifications (user_id)

orders (1) ←→ (N) nfc_tags (order_id)
orders (1) ←→ (N) messages (order_id)
orders (1) ←→ (N) nfc_scans (order_id)

nfc_tags (1) ←→ (N) nfc_scans
```

## Migration Status

The database is currently in a migration phase:
- ✅ **New System**: `profiles` + `dealer_memberships` (Supabase Auth integration)
- 🔄 **Legacy System**: `detail_users` (being phased out)
- 🎯 **Target**: Complete migration to profiles-based system

## Security Considerations

1. **RLS Policies**: All sensitive tables protected with multi-level RLS
2. **Audit Trails**: Complete audit history with soft deletion
3. **Permission System**: Hierarchical role-based access control
4. **Data Isolation**: Multi-tenant architecture with dealership-scoped data
5. **API Security**: Service role keys for admin operations, anon keys for client access

## Next Steps

1. Complete Docker installation for full Supabase CLI functionality
2. Implement database utility functions for common operations
3. Set up real-time subscriptions for order status updates
4. Configure backup and disaster recovery procedures
5. Complete migration from `detail_users` to `profiles` system