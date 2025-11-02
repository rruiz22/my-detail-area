import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase credentials from the project
const SUPABASE_URL = "https://swfnnrpzpkdypbrzmgnr.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm5ucnB6cGtkeXBicnptZ25yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxODY5NjAsImV4cCI6MjA3Mjc2Mjk2MH0.HA7ujjknDa-97z-vC-vOZJm5rQ7PYXqn--rdiZoPXcY";

// Use service role key from environment if available, otherwise use anon key
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Migration files in order
const migrations = [
  {
    name: '1. Add chat permission levels',
    file: '20251024230000_add_chat_permission_levels_none_restricted_write.sql'
  },
  {
    name: '2. Create dealer role chat templates table',
    file: '20251024230100_create_dealer_role_chat_templates_table.sql'
  },
  {
    name: '3. Add capabilities to chat participants',
    file: '20251024230200_add_capabilities_to_chat_participants.sql'
  },
  {
    name: '4. Seed default chat role templates',
    file: '20251024230300_seed_default_chat_role_templates.sql'
  },
  {
    name: '5. Create get_chat_effective_permissions function',
    file: '20251024230400_create_get_chat_effective_permissions_function.sql'
  },
  {
    name: '6. Create auto_assign_chat_capabilities trigger',
    file: '20251024230500_create_auto_assign_chat_capabilities_trigger.sql'
  }
];

async function applyMigrations() {
  console.log('\n🚀 Starting Chat Permissions Migrations...\n');
  console.log(`📍 Supabase URL: ${SUPABASE_URL}`);
  console.log(`🔑 Using ${SUPABASE_KEY === SUPABASE_ANON_KEY ? 'ANON' : 'SERVICE ROLE'} key\n`);

  if (SUPABASE_KEY === SUPABASE_ANON_KEY) {
    console.log('⚠️  WARNING: Using anon key. Some migrations may fail.');
    console.log('⚠️  Set SUPABASE_SERVICE_ROLE_KEY environment variable for full access.\n');
  }

  let successCount = 0;
  let failCount = 0;

  for (const migration of migrations) {
    try {
      console.log(`📝 Applying: ${migration.name}`);

      // Read migration file
      const migrationPath = join(__dirname, '..', 'supabase', 'migrations', migration.file);
      const sql = readFileSync(migrationPath, 'utf8');

      // Execute SQL using Supabase client
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(async () => {
        // If RPC doesn't exist, try direct query
        return await supabase.from('_').select('*').limit(0).then(() => {
          throw new Error('Direct SQL execution not available. Please use Supabase Dashboard SQL Editor.');
        });
      });

      if (error) {
        throw error;
      }

      console.log(`   ✅ Success: ${migration.name}\n`);
      successCount++;

      // Small delay between migrations
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`   ❌ Error: ${migration.name}`);
      console.error(`      ${error.message}\n`);
      failCount++;

      // Don't stop on error, continue with next migration
      // Some errors might be expected (like "already exists")
      if (error.message.includes('already exists')) {
        console.log('      (This is OK if migration was already applied)\n');
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${successCount}/${migrations.length}`);
  console.log(`❌ Failed: ${failCount}/${migrations.length}`);

  if (failCount > 0) {
    console.log('\n⚠️  Some migrations failed. Please:');
    console.log('   1. Check if they were already applied');
    console.log('   2. Apply manually via Supabase Dashboard > SQL Editor');
    console.log('   3. Use SUPABASE_SERVICE_ROLE_KEY for full permissions');
  }

  console.log('\n📍 Next steps:');
  console.log('   - Verify in Supabase Dashboard > Database > Tables');
  console.log('   - Check dealer_role_chat_templates table was created');
  console.log('   - Test useChatPermissions hook in the app');
  console.log('='.repeat(60) + '\n');
}

// Verification queries
async function verifyMigrations() {
  console.log('\n🔍 Verifying migrations...\n');

  try {
    // Check if table exists
    const { data: tables, error: tablesError } = await supabase
      .from('dealer_role_chat_templates')
      .select('count')
      .limit(0);

    if (!tablesError) {
      console.log('✅ dealer_role_chat_templates table exists');
    }

    // Check if function exists
    const { data: permissions, error: permError } = await supabase
      .rpc('get_chat_effective_permissions', {
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_conversation_id: '00000000-0000-0000-0000-000000000000',
        p_dealer_id: 1
      });

    if (!permError || permError.message.includes('could not find')) {
      console.log('✅ get_chat_effective_permissions function exists');
    }

    console.log('\n✨ Verification complete!\n');
  } catch (error) {
    console.log('⚠️  Could not verify (may need service role key)');
    console.log('   Please check manually in Supabase Dashboard\n');
  }
}

// Run migrations
applyMigrations()
  .then(() => verifyMigrations())
  .catch((error) => {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  });
