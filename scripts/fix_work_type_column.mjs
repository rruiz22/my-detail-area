import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20251014000000_remove_work_type_from_vehicles.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded');
    console.log('⚙️  Applying migration to Supabase...\n');

    // Since we can't execute raw SQL directly via Supabase JS client easily,
    // we'll use a workaround: execute the ALTER TABLE via the REST API

    console.log('🔹 Attempting to remove work_type column...\n');

    // We'll need to do this via the Supabase Dashboard or use a direct PostgreSQL connection
    // For now, let's provide clear instructions
    console.log('⚠️  Direct SQL execution requires Supabase Dashboard access.');
    console.log('\n📋 Please follow these steps:\n');
    console.log('1. Go to: https://app.supabase.com');
    console.log('2. Select your project');
    console.log('3. Navigate to SQL Editor');
    console.log('4. Execute the following command:\n');
    console.log('   ALTER TABLE public.get_ready_vehicles DROP COLUMN IF EXISTS work_type;');
    console.log('\n5. Click "Run" to apply the fix');
    console.log('\n✅ After running, test moving a vehicle between steps');
    console.log('\n💡 Alternative: The migration file has been created at:');
    console.log(`   ${migrationPath}`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the migration
applyMigration();
