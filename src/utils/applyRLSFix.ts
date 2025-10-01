import { supabase } from '@/integrations/supabase/client';

/**
 * Apply RLS fix for is_admin function
 * This fixes the issue where system_admin role is not recognized
 */
export async function applyRLSFix() {
  const fixSQL = `
    CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID DEFAULT auth.uid())
    RETURNS BOOLEAN
    LANGUAGE SQL
    SECURITY DEFINER
    STABLE
    SET search_path = public
    AS $$
      SELECT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = user_id AND role IN ('admin', 'system_admin')
      );
    $$;
  `;

  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: fixSQL });

    if (error) {
      console.error('❌ Failed to apply RLS fix:', error);
      return false;
    }

    console.log('✅ RLS fix applied successfully');
    return true;
  } catch (err) {
    console.error('❌ Error applying RLS fix:', err);
    return false;
  }
}
