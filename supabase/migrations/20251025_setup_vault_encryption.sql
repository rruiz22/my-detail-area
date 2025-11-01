-- Supabase Vault Encryption Setup
-- MyDetailArea Settings Hub
-- Date: 2025-10-25

-- =====================================================
-- SUPABASE VAULT CONFIGURATION
-- =====================================================

-- Note: This must be run AFTER Supabase Vault extension is enabled
-- Enable Vault extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

-- =====================================================
-- CREATE ENCRYPTION KEY
-- =====================================================

-- Create the main encryption key for settings
-- This key will be used to encrypt OAuth tokens, API keys, etc.
DO $$
BEGIN
  -- Check if key already exists
  IF NOT EXISTS (
    SELECT 1 FROM vault.secrets WHERE name = 'settings-encryption-key'
  ) THEN
    -- Generate a secure random key
    PERFORM vault.create_secret(
      gen_random_bytes(32)::text,
      'settings-encryption-key',
      'Encryption key for Settings Hub integrations (OAuth tokens, API keys)'
    );
    RAISE NOTICE 'Encryption key "settings-encryption-key" created successfully';
  ELSE
    RAISE NOTICE 'Encryption key "settings-encryption-key" already exists';
  END IF;
END $$;

-- =====================================================
-- ENCRYPTION/DECRYPTION FUNCTIONS
-- =====================================================

-- Encrypt function wrapper
CREATE OR REPLACE FUNCTION encrypt_secret(
  plaintext TEXT,
  key_name TEXT DEFAULT 'settings-encryption-key'
)
RETURNS TEXT AS $$
DECLARE
  encrypted_value TEXT;
  key_id UUID;
BEGIN
  -- Get key ID
  SELECT id INTO key_id
  FROM vault.secrets
  WHERE name = key_name;

  IF key_id IS NULL THEN
    RAISE EXCEPTION 'Encryption key "%" not found', key_name;
  END IF;

  -- Encrypt using Supabase Vault
  SELECT vault.encrypt(plaintext::bytea, key_id) INTO encrypted_value;

  RETURN encrypted_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrypt function wrapper
CREATE OR REPLACE FUNCTION decrypt_secret(
  ciphertext TEXT,
  key_name TEXT DEFAULT 'settings-encryption-key'
)
RETURNS TEXT AS $$
DECLARE
  decrypted_value TEXT;
  key_id UUID;
BEGIN
  -- Get key ID
  SELECT id INTO key_id
  FROM vault.secrets
  WHERE name = key_name;

  IF key_id IS NULL THEN
    RAISE EXCEPTION 'Encryption key "%" not found', key_name;
  END IF;

  -- Decrypt using Supabase Vault
  SELECT convert_from(
    vault.decrypt(ciphertext::bytea, key_id),
    'UTF8'
  ) INTO decrypted_value;

  RETURN decrypted_value;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Decryption failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION encrypt_secret(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION decrypt_secret(TEXT, TEXT) TO authenticated;

-- =====================================================
-- UTILITY FUNCTION: MIGRATE EXISTING TOKENS
-- =====================================================

-- Function to encrypt existing unencrypted tokens
CREATE OR REPLACE FUNCTION migrate_encrypt_integration_tokens()
RETURNS TABLE (
  integration_id UUID,
  integration_type VARCHAR(50),
  encrypted BOOLEAN
) AS $$
DECLARE
  integration RECORD;
  encrypted_token TEXT;
BEGIN
  FOR integration IN
    SELECT id, integration_type, oauth_access_token
    FROM dealer_integrations
    WHERE oauth_access_token IS NOT NULL
      AND credentials_encrypted = false
  LOOP
    -- Encrypt the token
    encrypted_token := encrypt_secret(integration.oauth_access_token);

    -- Update the record
    UPDATE dealer_integrations
    SET
      oauth_access_token = encrypted_token,
      credentials_encrypted = true,
      encryption_key_id = 'settings-encryption-key',
      updated_at = NOW()
    WHERE id = integration.id;

    -- Return result
    RETURN QUERY SELECT
      integration.id,
      integration.integration_type,
      true::BOOLEAN;

    RAISE NOTICE 'Encrypted tokens for integration %', integration.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TEST ENCRYPTION (Optional - for verification)
-- =====================================================

-- Test encryption/decryption
DO $$
DECLARE
  test_plaintext TEXT := 'test-secret-token-12345';
  encrypted TEXT;
  decrypted TEXT;
BEGIN
  -- Encrypt
  encrypted := encrypt_secret(test_plaintext);
  RAISE NOTICE 'Encrypted: %', encrypted;

  -- Decrypt
  decrypted := decrypt_secret(encrypted);
  RAISE NOTICE 'Decrypted: %', decrypted;

  -- Verify
  IF decrypted = test_plaintext THEN
    RAISE NOTICE '✓ Encryption/Decryption test PASSED';
  ELSE
    RAISE EXCEPTION '✗ Encryption/Decryption test FAILED';
  END IF;
END $$;

-- =====================================================
-- SECURITY AUDIT VIEW
-- =====================================================

-- View to see which integrations have encrypted credentials
CREATE OR REPLACE VIEW integration_encryption_status AS
SELECT
  id,
  dealer_id,
  integration_type,
  integration_name,
  credentials_encrypted,
  encryption_key_id,
  CASE
    WHEN oauth_access_token IS NOT NULL AND credentials_encrypted THEN 'ENCRYPTED'
    WHEN oauth_access_token IS NOT NULL AND NOT credentials_encrypted THEN 'UNENCRYPTED'
    ELSE 'NO_CREDENTIALS'
  END as security_status,
  created_at,
  updated_at
FROM dealer_integrations;

GRANT SELECT ON integration_encryption_status TO authenticated;

COMMENT ON VIEW integration_encryption_status IS 'Security audit view for integration credential encryption status';

-- =====================================================
-- VAULT SETUP COMPLETE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Supabase Vault setup completed!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Encryption key: settings-encryption-key';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '  - encrypt_secret(plaintext, key_name)';
  RAISE NOTICE '  - decrypt_secret(ciphertext, key_name)';
  RAISE NOTICE '  - migrate_encrypt_integration_tokens()';
  RAISE NOTICE '';
  RAISE NOTICE 'To encrypt existing tokens, run:';
  RAISE NOTICE '  SELECT * FROM migrate_encrypt_integration_tokens();';
  RAISE NOTICE '';
  RAISE NOTICE 'To check encryption status, query:';
  RAISE NOTICE '  SELECT * FROM integration_encryption_status;';
  RAISE NOTICE '========================================';
END $$;
