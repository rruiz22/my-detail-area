import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase Management API requires a personal access token
// For now, we'll use direct database connection

const DB_URL = 'postgresql://postgres:Y6u7aXMvNgXkbf4D@db.swfnnrpzpkdypbrzmgnr.supabase.co:5432/postgres';

async function executeSqlViaPooler(sql) {
  // Use pg library to connect directly
  const { default: pg } = await import('pg');
  const { Client } = pg;

  const client = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to Supabase database');

    const result = await client.query(sql);
    console.log('✅ SQL executed successfully');

    return result;
  } catch (error) {
    console.error('❌ SQL execution failed:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

async function applyMigration() {
  console.log('📦 Reading migration SQL...');

  const migrationPath = join(__dirname, '..', 'supabase', 'temp_apply_kiosks_migration.sql');
  const sql = readFileSync(migrationPath, 'utf-8');

  console.log('🚀 Applying migration to Supabase...\n');

  try {
    await executeSqlViaPooler(sql);

    console.log('\n✅ Migration completed successfully!');
    console.log('\n🔍 Verifying table creation...');

    // Verify with a simple SELECT
    const verifyResult = await executeSqlViaPooler(`
      SELECT
        column_name,
        data_type
      FROM information_schema.columns
      WHERE table_name = 'detail_hub_kiosks'
      ORDER BY ordinal_position;
    `);

    console.log(`\n📋 Table columns (${verifyResult.rows.length}):`);
    verifyResult.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
      if (col.column_name === 'camera_status') {
        console.log('      ✅ camera_status column found!');
      }
    });

    // Check if camera_status exists
    const hasCameraStatus = verifyResult.rows.some(col => col.column_name === 'camera_status');
    if (!hasCameraStatus) {
      console.error('\n❌ CRITICAL: camera_status column was not created!');
      return false;
    }

    console.log('\n✅ All columns created successfully');
    return true;

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.error('\nFull error:', err);
    return false;
  }
}

applyMigration()
  .then(success => {
    if (success) {
      console.log('\n✅ Migration completed successfully!');
      console.log('\n📋 Next steps:');
      console.log('   1. Delete temp_apply_kiosks_migration.sql');
      console.log('   2. Test kiosk creation via API');
      console.log('   3. Verify camera_status updates work');
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
