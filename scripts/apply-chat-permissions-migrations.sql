-- ============================================================================
-- ⚠️  ESTE ARCHIVO ES PARA USO CON PSQL ÚNICAMENTE
-- ============================================================================
-- Si estás usando Supabase Dashboard SQL Editor, usa este archivo en su lugar:
--     scripts/chat-permissions-all-in-one.sql
--
-- Este archivo usa comandos \i (include) y \echo que solo funcionan con psql
-- ============================================================================

-- Para usar este archivo con psql:
-- psql -h db.swfnnrpzpkdypbrzmgnr.supabase.co -U postgres -d postgres -f scripts/apply-chat-permissions-migrations.sql

-- ❌ NO USAR EN SUPABASE DASHBOARD - Usa chat-permissions-all-in-one.sql

-- MIGRATION 1: Add chat permission levels
-- \i supabase/migrations/20251024230000_add_chat_permission_levels_none_restricted_write.sql

-- MIGRATION 2: Create dealer role chat templates table
-- \i supabase/migrations/20251024230100_create_dealer_role_chat_templates_table.sql

-- MIGRATION 3: Add capabilities to chat participants
-- \i supabase/migrations/20251024230200_add_capabilities_to_chat_participants.sql

-- MIGRATION 4: Seed default chat role templates
-- \i supabase/migrations/20251024230300_seed_default_chat_role_templates.sql

-- MIGRATION 5: Create get_chat_effective_permissions function
-- \i supabase/migrations/20251024230400_create_get_chat_effective_permissions_function.sql

-- MIGRATION 6: Create auto_assign_chat_capabilities trigger
-- \i supabase/migrations/20251024230500_create_auto_assign_chat_capabilities_trigger.sql

-- ============================================================================
-- ⚠️  ARCHIVO DESHABILITADO
-- ============================================================================
-- Este archivo no está completo. Usa chat-permissions-all-in-one.sql en su lugar
-- ============================================================================
