-- =====================================================
-- Add Vehicle and Plate fields to dealership_contacts
-- =====================================================
-- Migration: 20251103000003
-- Description: Add vehicle and license plate fields to contact information
-- Author: System
-- Date: 2025-11-03
-- =====================================================

-- Add vehicle and plate columns to dealership_contacts
ALTER TABLE public.dealership_contacts
ADD COLUMN IF NOT EXISTS vehicle TEXT,
ADD COLUMN IF NOT EXISTS plate TEXT;

-- Add index for searching by plate
CREATE INDEX IF NOT EXISTS idx_dealership_contacts_plate
ON public.dealership_contacts(plate)
WHERE deleted_at IS NULL AND plate IS NOT NULL;

-- Add index for searching by vehicle
CREATE INDEX IF NOT EXISTS idx_dealership_contacts_vehicle
ON public.dealership_contacts(vehicle)
WHERE deleted_at IS NULL AND vehicle IS NOT NULL;

-- Add comment explaining the fields
COMMENT ON COLUMN public.dealership_contacts.vehicle IS 'Vehicle information associated with this contact (e.g., 2024 BMW X5)';
COMMENT ON COLUMN public.dealership_contacts.plate IS 'License plate number of the contact''s vehicle';

-- Log the migration
DO $$
BEGIN
    RAISE NOTICE 'Migration 20251103000003: Added vehicle and plate fields to dealership_contacts table';
END $$;
