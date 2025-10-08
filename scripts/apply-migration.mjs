import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read Supabase credentials from .env or environment
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://swfnnrpzpkdypbrzmgnr.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment variables');
  console.log('Please set it in your .env file or pass it as an environment variable');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('📌 Reading migration file...');

    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20251006220000_add_created_by_to_orders.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('📌 Applying migration to Supabase...');
    console.log('SQL to execute:');
    console.log(migrationSQL);
    console.log('\n---\n');

    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: migrationSQL });

    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }

    console.log('✅ Migration applied successfully!');
    console.log('Data:', data);

  } catch (error) {
    console.error('❌ Error applying migration:', error);
    process.exit(1);
  }
}

applyMigration();
