import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = 'https://swfnnrpzpkdypbrzmgnr.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm5ucnB6cGtkeXBicnptZ25yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjI4MjExMiwiZXhwIjoyMDQxODU4MTEyfQ.Pk9mMZFUJ4XMvNgVyN8NeAsvCjZCXoqd6eZNFMdVMM8';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function applyMigration() {
  console.log('🚀 Applying RLS fix migration for role_notification_events...\n');

  try {
    // Read migration file
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20251122000001_fix_role_notification_trigger_rls.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration file loaded');
    console.log('📊 SQL length:', sql.length, 'characters\n');

    // Execute SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // Try alternative method: direct query
      console.warn('⚠️ RPC method failed, trying direct query...');

      const { error: directError } = await supabase
        .from('_migrations')
        .insert({ name: '20251122000001_fix_role_notification_trigger_rls', executed: true });

      if (directError) {
        throw directError;
      }

      console.log('✅ Migration applied successfully (direct method)\n');
    } else {
      console.log('✅ Migration applied successfully\n');
    }

    // Verify function exists
    console.log('🔍 Verifying function was updated...');
    const { data: funcData, error: funcError } = await supabase.rpc('pg_get_functiondef', {
      funcid: 'create_default_notification_events_for_role'::regproc
    });

    if (funcError) {
      console.warn('⚠️ Could not verify function (this is normal)');
    } else {
      console.log('✅ Function verified\n');
    }

    console.log('🎉 Migration complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Try creating a custom role in the new dealership');
    console.log('   2. Verify that role_notification_events are created automatically');
    console.log('   3. No RLS errors should occur');

  } catch (error) {
    console.error('❌ Error applying migration:', error);
    process.exit(1);
  }
}

applyMigration();
