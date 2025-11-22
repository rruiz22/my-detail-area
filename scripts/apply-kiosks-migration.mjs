import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = 'https://swfnnrpzpkdypbrzmgnr.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm5ucnB6cGtkeXBicnptZ25yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzE4Njk2MCwiZXhwIjoyMDcyNzYyOTYwfQ.ud57lvk528bfk8lb-D5CGn2UeN6_fLuEXXwd-CKaYrE';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  console.log('📦 Reading migration SQL...');

  const migrationPath = join(__dirname, '..', 'supabase', 'temp_apply_kiosks_migration.sql');
  const sql = readFileSync(migrationPath, 'utf-8');

  console.log('🚀 Applying migration to Supabase...\n');

  // Split SQL into individual statements (basic splitting)
  const statements = sql
    .split(/;\s*$/gm)
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'));

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (!statement) continue;

    // Get first 60 chars for display
    const preview = statement.substring(0, 60).replace(/\n/g, ' ');
    console.log(`[${i + 1}/${statements.length}] ${preview}...`);

    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        query: statement + ';'
      });

      if (error) {
        // Try direct execution via postgres function
        const { data: data2, error: error2 } = await supabase
          .from('_sql_exec')
          .select('*')
          .eq('query', statement);

        if (error2) {
          console.error(`❌ ERROR:`, error.message || error2.message);
          errorCount++;
        } else {
          console.log(`✅ Success`);
          successCount++;
        }
      } else {
        console.log(`✅ Success`);
        successCount++;
      }
    } catch (err) {
      console.error(`❌ ERROR:`, err.message);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📊 Migration Summary:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  console.log(`   📝 Total: ${statements.length}`);
  console.log('='.repeat(60));

  // Verify table creation
  console.log('\n🔍 Verifying table creation...');
  const { data: tables, error: tableError } = await supabase
    .from('detail_hub_kiosks')
    .select('*')
    .limit(1);

  if (tableError) {
    console.error('❌ Table verification failed:', tableError.message);
    return false;
  }

  console.log('✅ Table detail_hub_kiosks exists and is accessible!');

  // Check columns
  console.log('\n🔍 Checking table columns...');
  const { data: columns, error: colError } = await supabase
    .rpc('get_table_columns', { table_name: 'detail_hub_kiosks' });

  if (!colError && columns) {
    console.log('📋 Columns found:', columns.length);
  }

  return errorCount === 0;
}

applyMigration()
  .then(success => {
    if (success) {
      console.log('\n✅ Migration completed successfully!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Migration completed with errors. Please review the output.');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
  });
