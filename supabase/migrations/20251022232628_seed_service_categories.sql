-- Seed data for service_categories table
-- Creates the 4 base departments used across the dealership system
-- These categories are global (dealer_id IS NULL) and available to all dealerships

-- Insert base service categories if they don't exist
INSERT INTO service_categories (id, name, description, color, is_system_category, dealer_id, is_active)
VALUES
  (
    'adf6477f-0819-44b0-813f-4869a2cf5a27',
    'Sales Dept',
    'Sales department services for new and used vehicle sales',
    '#10B981',  -- Emerald-500 (muted green)
    true,
    NULL,  -- Global category
    true
  ),
  (
    'bd46fe22-7023-4b84-974d-db35e9fa6a03',
    'Service Dept',
    'Service department for vehicle maintenance and repairs',
    '#6366F1',  -- Indigo-500 (muted blue)
    true,
    NULL,  -- Global category
    true
  ),
  (
    '63837333-c41f-4c18-b4b2-98e1bc1bb85d',
    'Recon Dept',
    'Reconditioning department for vehicle preparation',
    '#F59E0B',  -- Amber-500 (muted orange)
    true,
    NULL,  -- Global category
    true
  ),
  (
    'ae0e020b-7456-4ac5-991b-72d18295d224',
    'CarWash Dept',
    'Car wash and quick detailing services',
    '#06B6D4',  -- Cyan-500 (muted cyan)
    true,
    NULL,  -- Global category
    true
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  color = EXCLUDED.color,
  is_system_category = EXCLUDED.is_system_category,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Add helpful comment
COMMENT ON TABLE service_categories IS
'Service categories/departments for organizing dealer services.
Global categories (dealer_id IS NULL) are available to all dealerships.
Custom categories can be created per dealership.';
