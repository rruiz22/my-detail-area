import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://swfnnrpzpkdypbrzmgnr.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm5ucnB6cGtkeXBicnptZ25yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjI4MjExMiwiZXhwIjoyMDQxODU4MTEyfQ.Pk9mMZFUJ4XMvNgVyN8NeAsvCjZCXoqd6eZNFMdVMM8';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function verifyRLSPolicy() {
  console.log('🔍 Verificando configuración de RLS para role_notification_events...\n');

  try {
    // Query to check RLS policies
    const { data: policies, error: policyError } = await supabase
      .rpc('exec_sql', {
        sql_query: `
          SELECT
            polname as policy_name,
            pg_get_expr(polqual, polrelid) as using_expression,
            pg_get_expr(polwithcheck, polrelid) as with_check_expression
          FROM pg_policy
          WHERE polrelid = 'role_notification_events'::regclass
          ORDER BY polname;
        `
      });

    if (policyError) {
      console.error('❌ Error querying policies:', policyError);
    } else {
      console.log('📋 Políticas RLS encontradas:\n');
      console.table(policies);
    }

    // Check if function has SECURITY DEFINER
    const { data: funcInfo, error: funcError } = await supabase
      .rpc('exec_sql', {
        sql_query: `
          SELECT
            proname as function_name,
            prosecdef as is_security_definer,
            provolatile as volatility,
            pg_get_function_result(oid) as return_type
          FROM pg_proc
          WHERE proname = 'create_default_notification_events_for_role';
        `
      });

    if (funcError) {
      console.error('❌ Error querying function:', funcError);
    } else {
      console.log('\n📊 Información de la función:\n');
      console.table(funcInfo);

      if (funcInfo && funcInfo.length > 0) {
        const func = funcInfo[0];
        if (func.is_security_definer) {
          console.log('\n✅ La función YA tiene SECURITY DEFINER - Fix aplicado correctamente');
        } else {
          console.log('\n⚠️  La función NO tiene SECURITY DEFINER - Necesitas aplicar la migración');
        }
      }
    }

    // Check current user type
    const { data: userData, error: userError } = await supabase.auth.getUser();

    console.log('\n👤 Usuario actual:', userData?.user?.email || 'No autenticado');

    // Try to check user type from profiles
    if (userData?.user?.id) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', userData.user.id)
        .single();

      if (!profileError && profile) {
        console.log('🎭 Tipo de usuario:', profile.user_type);

        if (profile.user_type === 'system_admin') {
          console.log('✅ Eres SYSTEM ADMIN - Deberías poder crear custom roles');
        } else {
          console.log('⚠️  No eres system_admin - Necesitas permisos de dealer admin');
        }
      }
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

verifyRLSPolicy();
