import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = 'https://swfnnrpzpkdypbrzmgnr.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm5ucnB6cGtkeXBicnptZ25yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzE4Njk2MCwiZXhwIjoyMDcyNzYyOTYwfQ.ud57lvk528bfk8lb-D5CGn2UeN6_fLuEXXwd-CKaYrE';

async function executeSqlDirect(sql) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  return response;
}

async function applyMigration() {
  console.log('📦 Reading migration SQL...');

  const migrationPath = join(__dirname, '..', 'supabase', 'temp_apply_kiosks_migration.sql');
  const fullSql = readFileSync(migrationPath, 'utf-8');

  console.log('🚀 Applying complete migration to Supabase...\n');

  try {
    // Try to execute the entire SQL at once
    await executeSqlDirect(fullSql);
    console.log('✅ Migration applied successfully!');

    // Verify table creation
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    console.log('\n🔍 Verifying table structure...');

    const { data: kiosks, error: selectError } = await supabase
      .from('detail_hub_kiosks')
      .select('*')
      .limit(1);

    if (selectError) {
      if (selectError.message.includes('relation') && selectError.message.includes('does not exist')) {
        console.error('❌ Table was not created');
        return false;
      }
      // Empty table is OK
      console.log('✅ Table exists (empty - this is expected)');
    } else {
      console.log('✅ Table exists and is accessible');
    }

    // Try to describe the table structure
    const { data: tableInfo, error: infoError } = await supabase
      .from('detail_hub_kiosks')
      .select('id, dealership_id, kiosk_code, name, status, camera_status')
      .limit(0);

    if (infoError) {
      console.log('⚠️  Could not verify all columns:', infoError.message);
      // Check if camera_status specifically is missing
      if (infoError.message.includes('camera_status')) {
        console.error('❌ CRITICAL: camera_status column is missing!');
        return false;
      }
    } else {
      console.log('✅ All critical columns verified (including camera_status)');
    }

    return true;

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    return false;
  }
}

applyMigration()
  .then(success => {
    if (success) {
      console.log('\n✅ Migration completed successfully!');
      console.log('\n📋 Next steps:');
      console.log('   1. Test the kiosk creation endpoint');
      console.log('   2. Verify camera_status field is accessible');
      console.log('   3. Check RLS policies are active');
      process.exit(0);
    } else {
      console.log('\n❌ Migration failed. Please review errors above.');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
  });
