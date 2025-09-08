-- Phase 1: Consolidation and Cleanup - Remove detail_users table and related references
BEGIN;

-- Drop the detail_users table as it's legacy and not being used
-- First check if there are any foreign key constraints or triggers we need to handle
DROP TABLE IF EXISTS public.detail_users CASCADE;

-- Drop the sequence for detail_users if it exists
DROP SEQUENCE IF EXISTS public.detail_users_id_seq CASCADE;

-- Clean up any remaining references or constraints
-- Note: This is a cleanup migration as part of Phase 1 consolidation

COMMIT;