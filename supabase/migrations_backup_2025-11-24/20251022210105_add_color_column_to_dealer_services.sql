-- =====================================================
-- Migration: Add color column to dealer_services
-- Purpose: Allow custom badge colors per service
-- Date: 2025-10-22
-- =====================================================

-- Add color column (hex code)
ALTER TABLE dealer_services
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#6B7280';

-- Add comment
COMMENT ON COLUMN dealer_services.color IS
  'Custom color for service badge display in orders (hex code format: #RRGGBB)';

-- Set default colors for existing services based on category
UPDATE dealer_services ds
SET color = COALESCE(sc.color, '#6B7280')
FROM service_categories sc
WHERE ds.category_id = sc.id
  AND ds.color IS NULL;

-- Ensure any remaining nulls get default gray
UPDATE dealer_services
SET color = '#6B7280'
WHERE color IS NULL;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
