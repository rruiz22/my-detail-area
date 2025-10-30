import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    console.log('📝 Reading migration file...');
    const sql = readFileSync('./supabase/migrations/20251030000000_fix_is_system_admin_function.sql', 'utf8');

    console.log('🚀 Applying migration...');
    console.log('SQL to execute:');
    console.log(sql);
    console.log('\n---\n');

    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }

    console.log('✅ Migration applied successfully!');
    console.log('Result:', data);

  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

applyMigration();
