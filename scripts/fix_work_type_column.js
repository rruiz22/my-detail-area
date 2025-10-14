const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase credentials not found in environment variables');
  console.error('Required: VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('🔧 Fixing work_type column issue in get_ready_vehicles table...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20251014000000_remove_work_type_from_vehicles.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded');
    console.log('⚙️  Applying migration to Supabase...\n');

    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (error) {
      // If exec_sql doesn't exist, try direct execution
      console.log('⚠️  exec_sql function not available, attempting direct execution...');

      // Split by statement and execute
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement) {
          console.log(`\n🔹 Executing: ${statement.substring(0, 100)}...`);
          const { error: execError } = await supabase.rpc('exec', {
            query: statement
          });

          if (execError) {
            console.error(`❌ Error executing statement: ${execError.message}`);
            throw execError;
          }
        }
      }
    }

    console.log('\n✅ Migration applied successfully!');
    console.log('\n📋 Summary:');
    console.log('   - Removed erroneous work_type column from get_ready_vehicles');
    console.log('   - work_type should only exist in get_ready_work_items table');
    console.log('\n🎯 Next steps:');
    console.log('   1. Test moving vehicles between steps');
    console.log('   2. Verify no more "work_type" errors appear');
    console.log('   3. Check that work items still function correctly');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\n📌 Manual fix option:');
    console.error('   1. Go to Supabase Dashboard > SQL Editor');
    console.error('   2. Run this command:');
    console.error('      ALTER TABLE public.get_ready_vehicles DROP COLUMN IF EXISTS work_type;');
    process.exit(1);
  }
}

// Run the migration
applyMigration();
