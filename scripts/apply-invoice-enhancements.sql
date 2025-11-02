-- =====================================================
-- APPLY INVOICE ENHANCEMENTS
-- Created: 2025-11-03
-- Description: Apply email history and comments for invoices
-- =====================================================

-- Apply email system migration (if not already applied)
\i supabase/migrations/20251103000000_create_invoice_email_system.sql

-- Apply comments system migration
\i supabase/migrations/20251103000001_create_invoice_comments.sql

-- Verify tables were created
SELECT 'invoice_email_contacts' as table_name, COUNT(*) as record_count FROM invoice_email_contacts
UNION ALL
SELECT 'invoice_email_history', COUNT(*) FROM invoice_email_history
UNION ALL
SELECT 'invoice_comments', COUNT(*) FROM invoice_comments;

-- Verify RLS policies
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('invoice_email_contacts', 'invoice_email_history', 'invoice_comments')
ORDER BY tablename, policyname;

-- Show helper functions
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name IN (
  'get_default_contact',
  'get_dealership_contacts',
  'get_invoice_comments_with_users',
  'update_invoice_email_contacts_updated_at',
  'update_invoice_comments_updated_at',
  'ensure_single_default_contact'
)
ORDER BY routine_name;
