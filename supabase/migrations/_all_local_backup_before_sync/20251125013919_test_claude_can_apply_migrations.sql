-- Test migration to prove Claude can apply migrations directly
-- This will create a test table, verify it works, then clean up

-- Create test table
CREATE TABLE IF NOT EXISTS test_claude_migrations (
  id BIGSERIAL PRIMARY KEY,
  test_message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert test data
INSERT INTO test_claude_migrations (test_message)
VALUES ('Claude successfully applied this migration on ' || NOW()::TEXT);

-- Verify the insert worked (this will show in migration logs if there's an error)
DO $$
DECLARE
  record_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO record_count FROM test_claude_migrations;
  IF record_count = 0 THEN
    RAISE EXCEPTION 'Test migration failed: no records inserted';
  END IF;
  RAISE NOTICE 'Test migration successful: % record(s) found', record_count;
END $$;

-- Clean up - drop the test table
DROP TABLE test_claude_migrations;

-- Comment to confirm completion
COMMENT ON SCHEMA public IS 'Test migration applied successfully by Claude at ' || NOW()::TEXT;
