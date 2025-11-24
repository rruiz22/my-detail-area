-- Auth Page Branding System
-- Allows system_admin to customize login page logo, title, and tagline

-- ============================================================================
-- STORAGE BUCKET: auth-branding
-- ============================================================================

-- Create public storage bucket for authentication page branding assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'auth-branding',
  'auth-branding',
  true, -- Public so Auth.tsx can load logo without authentication
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- RLS POLICIES: Only system_admin can upload/delete
-- ============================================================================

-- Policy: System admins can upload auth branding assets
CREATE POLICY "System admins can upload auth branding"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'auth-branding'
  AND auth.uid() IN (
    SELECT id
    FROM profiles
    WHERE role = 'system_admin'
  )
);

-- Policy: System admins can update auth branding assets
CREATE POLICY "System admins can update auth branding"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'auth-branding'
  AND auth.uid() IN (
    SELECT id
    FROM profiles
    WHERE role = 'system_admin'
  )
);

-- Policy: System admins can delete auth branding assets
CREATE POLICY "System admins can delete auth branding"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'auth-branding'
  AND auth.uid() IN (
    SELECT id
    FROM profiles
    WHERE role = 'system_admin'
  )
);

-- Policy: Anyone can read auth branding assets (public bucket)
CREATE POLICY "Anyone can read auth branding"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'auth-branding');

-- ============================================================================
-- SYSTEM SETTINGS: Initial branding configuration
-- ============================================================================

-- Insert default auth page branding settings
INSERT INTO system_settings (
  setting_key,
  setting_value,
  setting_type,
  description,
  is_encrypted,
  is_public,
  created_at,
  updated_at
)
VALUES (
  'auth_page_branding',
  jsonb_build_object(
    'logo_url', null,
    'title', 'My Detail Area',
    'tagline', 'Dealership Operations Platform',
    'enabled', true
  ),
  'branding',
  'Authentication page branding configuration - customizable logo, title, and tagline for the login/signup page',
  false, -- Not encrypted (just display text)
  true,  -- Public (Auth.tsx needs to read without authentication)
  NOW(),
  NOW()
)
ON CONFLICT (setting_key) DO UPDATE
SET
  description = EXCLUDED.description,
  is_public = EXCLUDED.is_public,
  updated_at = NOW();

-- ============================================================================
-- RLS POLICY: Allow public read of auth branding settings
-- ============================================================================

-- Policy: Anyone can read public system settings (including auth_page_branding)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'system_settings'
    AND policyname = 'Public can read public system settings'
  ) THEN
    CREATE POLICY "Public can read public system settings"
    ON system_settings FOR SELECT
    TO public
    USING (is_public = true);
  END IF;
END $$;

-- Policy: Only system admins can update system settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'system_settings'
    AND policyname = 'System admins can update system settings'
  ) THEN
    CREATE POLICY "System admins can update system settings"
    ON system_settings FOR UPDATE
    TO authenticated
    USING (
      auth.uid() IN (
        SELECT id
        FROM profiles
        WHERE role = 'system_admin'
      )
    )
    WITH CHECK (
      auth.uid() IN (
        SELECT id
        FROM profiles
        WHERE role = 'system_admin'
      )
    );
  END IF;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN system_settings.is_public IS
  'If true, this setting can be read by unauthenticated users (e.g., auth_page_branding for login page)';
