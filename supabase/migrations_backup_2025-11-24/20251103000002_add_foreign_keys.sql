-- =====================================================
-- ADD FOREIGN KEYS FOR INVOICE ENHANCEMENTS
-- Created: 2025-11-03
-- Description: Add missing foreign keys for user relationships
-- =====================================================

-- =====================================================
-- ADD FOREIGN KEY: invoice_comments -> users
-- =====================================================
DO $$
BEGIN
  -- Check if foreign key doesn't exist before adding
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'invoice_comments_user_id_fkey'
  ) THEN
    ALTER TABLE public.invoice_comments
      ADD CONSTRAINT invoice_comments_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES auth.users(id)
      ON DELETE CASCADE;

    RAISE NOTICE 'Foreign key invoice_comments_user_id_fkey created';
  ELSE
    RAISE NOTICE 'Foreign key invoice_comments_user_id_fkey already exists';
  END IF;
END $$;

-- =====================================================
-- ADD FOREIGN KEY: invoice_email_history -> users
-- =====================================================
DO $$
BEGIN
  -- Check if foreign key doesn't exist before adding
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'invoice_email_history_sent_by_fkey'
  ) THEN
    ALTER TABLE public.invoice_email_history
      ADD CONSTRAINT invoice_email_history_sent_by_fkey
      FOREIGN KEY (sent_by)
      REFERENCES auth.users(id)
      ON DELETE SET NULL;

    RAISE NOTICE 'Foreign key invoice_email_history_sent_by_fkey created';
  ELSE
    RAISE NOTICE 'Foreign key invoice_email_history_sent_by_fkey already exists';
  END IF;
END $$;

-- =====================================================
-- VERIFY FOREIGN KEYS
-- =====================================================
SELECT
  conname as constraint_name,
  conrelid::regclass as table_name,
  confrelid::regclass as referenced_table
FROM pg_constraint
WHERE conname IN (
  'invoice_comments_user_id_fkey',
  'invoice_email_history_sent_by_fkey'
)
ORDER BY conname;
