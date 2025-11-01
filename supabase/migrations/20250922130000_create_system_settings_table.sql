-- Create system_settings table for storing application configuration
CREATE TABLE IF NOT EXISTS system_settings (
    setting_key TEXT PRIMARY KEY,
    setting_value JSONB NOT NULL,
    setting_type TEXT NOT NULL,
    updated_by UUID REFERENCES profiles(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_settings_type ON system_settings(setting_type);
CREATE INDEX IF NOT EXISTS idx_system_settings_updated_at ON system_settings(updated_at);

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only system_admin can read/write system settings
CREATE POLICY "system_admin_full_access" ON system_settings
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'system_admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'system_admin'
        )
    );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON system_settings TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE system_settings IS 'Application-wide configuration settings accessible only to system administrators';
COMMENT ON COLUMN system_settings.setting_key IS 'Unique identifier for the setting (e.g., smtp_config, sms_config)';
COMMENT ON COLUMN system_settings.setting_value IS 'JSON configuration data for the setting';
COMMENT ON COLUMN system_settings.setting_type IS 'Category of setting (e.g., smtp, sms, security, features)';
COMMENT ON COLUMN system_settings.updated_by IS 'ID of the admin user who last updated this setting';

-- Insert default feature flags if they don't exist
INSERT INTO system_settings (setting_key, setting_value, setting_type, updated_by)
VALUES (
    'feature_flags',
    '{
        "chat_enabled": true,
        "nfc_tracking_enabled": true,
        "vin_scanner_enabled": true,
        "qr_generation_enabled": true,
        "realtime_updates_enabled": true,
        "file_uploads_enabled": true
    }'::jsonb,
    'features',
    NULL
) ON CONFLICT (setting_key) DO NOTHING;

-- Insert default security configuration if it doesn't exist
INSERT INTO system_settings (setting_key, setting_value, setting_type, updated_by)
VALUES (
    'security_config',
    '{
        "max_login_attempts": 5,
        "session_timeout_hours": 24,
        "password_min_length": 8,
        "require_mfa": false,
        "allow_password_reset": true
    }'::jsonb,
    'security',
    NULL
) ON CONFLICT (setting_key) DO NOTHING;