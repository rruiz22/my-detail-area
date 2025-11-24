-- Migration: Add feature flag for custom roles system
-- Purpose: Enable/disable new permission system without code deploy
-- Author: Claude Code
-- Date: 2025-09-26
-- Risk Level: ZERO (only adds config, doesn't change behavior)

-- Add feature flag - STARTS DISABLED for safety
INSERT INTO system_settings (
  setting_key,
  setting_value,
  setting_type,
  description,
  is_public,
  is_encrypted
)
VALUES (
  'use_custom_roles_system',
  'false'::jsonb,
  'features',
  'Enable new custom roles permission system. When false, uses legacy profiles.role system. When true, uses dealer_custom_roles for granular permissions.',
  false,
  false
)
ON CONFLICT (setting_key) DO UPDATE
  SET description = EXCLUDED.description,
      setting_type = EXCLUDED.setting_type;

-- Add helpful comment
COMMENT ON TABLE system_settings IS
  'System-wide configuration settings. Key settings: use_custom_roles_system controls permission system.';