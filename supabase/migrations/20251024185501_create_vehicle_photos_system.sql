-- Create dealer_vehicle_photos table for multiple vehicle photos
CREATE TABLE IF NOT EXISTS dealer_vehicle_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES dealer_vehicle_inventory(id) ON DELETE CASCADE,
  dealer_id BIGINT NOT NULL,
  photo_url TEXT NOT NULL,
  storage_path TEXT,
  is_key_photo BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_vehicle_photos_vehicle_id ON dealer_vehicle_photos(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_photos_dealer_id ON dealer_vehicle_photos(dealer_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_photos_key ON dealer_vehicle_photos(vehicle_id, is_key_photo) WHERE is_key_photo = true;

-- Enable RLS
ALTER TABLE dealer_vehicle_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view photos from their dealership"
  ON dealer_vehicle_photos FOR SELECT
  USING (
    dealer_id IN (
      SELECT dealer_id
      FROM dealer_memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert photos to their dealership vehicles"
  ON dealer_vehicle_photos FOR INSERT
  WITH CHECK (
    dealer_id IN (
      SELECT dealer_id
      FROM dealer_memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update photos from their dealership vehicles"
  ON dealer_vehicle_photos FOR UPDATE
  USING (
    dealer_id IN (
      SELECT dealer_id
      FROM dealer_memberships
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    dealer_id IN (
      SELECT dealer_id
      FROM dealer_memberships
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete photos from their dealership vehicles"
  ON dealer_vehicle_photos FOR DELETE
  USING (
    dealer_id IN (
      SELECT dealer_id
      FROM dealer_memberships
      WHERE user_id = auth.uid()
    )
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_vehicle_photos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vehicle_photos_updated_at
  BEFORE UPDATE ON dealer_vehicle_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicle_photos_updated_at();

-- Trigger to update photo_count in dealer_vehicle_inventory when photos change
CREATE OR REPLACE FUNCTION update_vehicle_photo_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update photo_count in dealer_vehicle_inventory
  UPDATE dealer_vehicle_inventory
  SET
    photo_count = (
      SELECT COUNT(*)
      FROM dealer_vehicle_photos
      WHERE vehicle_id = COALESCE(NEW.vehicle_id, OLD.vehicle_id)
    ),
    key_photo_url = (
      SELECT photo_url
      FROM dealer_vehicle_photos
      WHERE vehicle_id = COALESCE(NEW.vehicle_id, OLD.vehicle_id)
      AND is_key_photo = true
      LIMIT 1
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.vehicle_id, OLD.vehicle_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vehicle_photo_count_insert
  AFTER INSERT ON dealer_vehicle_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicle_photo_count();

CREATE TRIGGER vehicle_photo_count_update
  AFTER UPDATE ON dealer_vehicle_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicle_photo_count();

CREATE TRIGGER vehicle_photo_count_delete
  AFTER DELETE ON dealer_vehicle_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicle_photo_count();

-- Comments
COMMENT ON TABLE dealer_vehicle_photos IS 'Stores multiple photos for each vehicle in inventory';
COMMENT ON COLUMN dealer_vehicle_photos.is_key_photo IS 'Indicates if this is the primary/featured photo displayed in listings';
COMMENT ON COLUMN dealer_vehicle_photos.display_order IS 'Order for displaying photos in gallery (0 = first)';
COMMENT ON COLUMN dealer_vehicle_photos.storage_path IS 'Path to photo in Supabase Storage bucket';
