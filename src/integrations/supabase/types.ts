/**
 * Re-export all Supabase types from the centralized types file
 * This file exists for backwards compatibility with imports using @/integrations/supabase/types
 */
export * from '@/types/supabase';
export { type Database } from '@/types/supabase';
