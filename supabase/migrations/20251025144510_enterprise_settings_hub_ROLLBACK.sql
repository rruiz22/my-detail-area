-- ============================================================================
-- ROLLBACK SCRIPT FOR ENTERPRISE SETTINGS HUB MIGRATION
-- ============================================================================
-- Migration: 20251025144510_enterprise_settings_hub.sql
-- Purpose: Safely rollback all changes from Enterprise Settings Hub migration
-- WARNING: This will DELETE all data in these tables!
-- ============================================================================

-- ============================================================================
-- 1. DROP FUNCTIONS
-- ============================================================================

DROP FUNCTION IF EXISTS public.test_dealer_integration(UUID);
DROP FUNCTION IF EXISTS public.log_security_event(VARCHAR, VARCHAR, VARCHAR, UUID, UUID, BIGINT, JSONB, BOOLEAN, TEXT);

-- ============================================================================
-- 2. DROP TABLES (CASCADE to remove dependent objects)
-- ============================================================================

-- Drop notification_templates
DROP TABLE IF EXISTS public.notification_templates CASCADE;

-- Drop platform_settings
DROP TABLE IF EXISTS public.platform_settings CASCADE;

-- Drop security_audit_log
DROP TABLE IF EXISTS public.security_audit_log CASCADE;

-- Drop dealer_integrations
DROP TABLE IF EXISTS public.dealer_integrations CASCADE;

-- ============================================================================
-- ROLLBACK COMPLETE
-- ============================================================================
-- All tables, indexes, policies, and functions have been removed.
-- Note: This does NOT rollback the existing system_settings table
--       as it was created in a previous migration.
-- ============================================================================
