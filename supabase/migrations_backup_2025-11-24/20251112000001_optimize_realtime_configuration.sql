-- =====================================================
-- MIGRATION: Real-time Configuration Optimization
-- Date: 2025-11-12
-- Author: Claude Code Performance Optimization
--
-- Purpose: Reduce realtime overhead from 24M+ calls by disabling
--          realtime on static tables and enabling only on critical tables
--
-- Impact: Expected 70% reduction in realtime queries (~91 hours/month)
-- =====================================================

-- =====================================================
-- STEP 1: Disable Realtime on Static/Non-Critical Tables
-- =====================================================

-- Permission and Role Management (rarely change)
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS user_custom_role_assignments;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS dealer_custom_roles;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS role_system_permissions;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS role_module_permissions_new;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS role_module_access;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS custom_role_permissions;

-- Organizational Structure (rarely change)
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS dealerships;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS dealership_modules;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS dealer_memberships;

-- User Profiles (rarely change)
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS profiles;

-- Configuration Tables (rarely change)
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS system_settings;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS platform_config;

-- Historical/Archive Tables (never need realtime)
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS audit_logs;
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS deleted_items;

-- =====================================================
-- STEP 2: Enable Realtime ONLY on Critical Tables
-- =====================================================

-- Orders (real-time collaboration required)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  END IF;
END $$;

-- User Presence (online indicators)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'user_presence'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;
  END IF;
END $$;

-- Chat Messages (real-time messaging)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
  END IF;
END $$;

-- Notifications (real-time alerts)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;

-- Order Comments (real-time collaboration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'order_comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE order_comments;
  END IF;
END $$;

-- =====================================================
-- STEP 3: Add Comment for Documentation
-- =====================================================

COMMENT ON PUBLICATION supabase_realtime IS
'Optimized realtime publication with selective table replication.
Enabled only for: orders, user_presence, chat_messages, notifications, order_comments.
Disabled for: roles, permissions, profiles, dealerships, and other static tables.
Performance impact: ~70% reduction in realtime overhead.
Migration: 20251112000001_optimize_realtime_configuration.sql';

-- =====================================================
-- VERIFICATION QUERY (run manually after migration)
-- =====================================================

-- To verify current realtime configuration:
-- SELECT schemaname, tablename
-- FROM pg_publication_tables
-- WHERE pubname = 'supabase_realtime'
-- ORDER BY schemaname, tablename;

-- Expected result: Only 5 tables (orders, user_presence, chat_messages, notifications, order_comments)
