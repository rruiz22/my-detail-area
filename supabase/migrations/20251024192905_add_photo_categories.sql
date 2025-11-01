-- Add category column to dealer_vehicle_photos
ALTER TABLE dealer_vehicle_photos
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'exterior';

-- Add category constraint
ALTER TABLE dealer_vehicle_photos
ADD CONSTRAINT valid_photo_category 
CHECK (category IN ('exterior', 'interior', 'engine', 'other'));

-- Add metadata column for image dimensions and other data
ALTER TABLE dealer_vehicle_photos
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create index for efficient category-based queries
CREATE INDEX IF NOT EXISTS idx_vehicle_photos_category 
ON dealer_vehicle_photos(vehicle_id, category, display_order);

-- Comments
COMMENT ON COLUMN dealer_vehicle_photos.category IS 'Photo category: exterior (priority 1), interior (priority 2), engine (priority 3), other (priority 4)';
COMMENT ON COLUMN dealer_vehicle_photos.metadata IS 'Image metadata: width, height, aspectRatio, orientation, originalSize, compressedSize';
