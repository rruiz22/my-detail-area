-- =====================================================================================
-- Enable Supabase Realtime for Chat Tables
-- Description: Ensures all chat tables have Realtime replication enabled
-- =====================================================================================

-- This script should be run in Supabase Dashboard → Database → SQL Editor

BEGIN;

-- ============================================================================
-- STEP 1: Verify Current Realtime Status
-- ============================================================================

-- Query to check if tables have realtime enabled:
-- SELECT schemaname, tablename,
--        pg_catalog.obj_description(c.oid) as table_description
-- FROM pg_tables pt
-- JOIN pg_class c ON c.relname = pt.tablename
-- WHERE schemaname = 'public'
--   AND tablename IN ('chat_conversations', 'chat_messages', 'chat_participants');

-- ============================================================================
-- STEP 2: Enable Realtime Publication for Chat Tables
-- ============================================================================

-- Drop existing publication if it exists (to recreate with correct tables)
DROP PUBLICATION IF EXISTS supabase_realtime CASCADE;

-- Create publication with all necessary tables
CREATE PUBLICATION supabase_realtime FOR TABLE
    chat_conversations,
    chat_messages,
    chat_participants,
    chat_message_reactions,
    profiles;

-- Alternative: If you want to publish ALL tables (use with caution):
-- CREATE PUBLICATION supabase_realtime FOR ALL TABLES;

-- ============================================================================
-- STEP 3: Verify Publication Created
-- ============================================================================

-- Verify the publication exists and includes our tables
-- Run this separately AFTER the above:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

COMMIT;

-- ============================================================================
-- NOTES
-- ============================================================================

-- 1. After running this script, you may need to refresh your Supabase Dashboard
-- 2. Check Dashboard → Database → Replication to verify tables are listed
-- 3. Each table should show a green "Realtime" status
-- 4. Changes take effect immediately - no app restart needed

-- ============================================================================
-- VERIFICATION QUERIES (Run these separately to check status)
-- ============================================================================

-- Check which tables are in the publication:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- Check publication settings:
-- SELECT * FROM pg_publication WHERE pubname = 'supabase_realtime';

-- List all publications:
-- SELECT pubname, puballtables, pubinsert, pubupdate, pubdelete
-- FROM pg_publication;
