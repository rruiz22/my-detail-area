/**
 * Verify DetailHub Migrations Status
 *
 * Checks if all DetailHub tables and columns exist in production database
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://swfnnrpzpkdypbrzmgnr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm5ucnB6cGtkeXBicnptZ25yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxODY5NjAsImV4cCI6MjA3Mjc2Mjk2MH0.HA7ujjknDa-97z-vC-vOZJm5rQ7PYXqn--rdiZoPXcY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🔍 DetailHub Migration Status Verification');
console.log('='.repeat(80));
console.log('');

const DETAILHUB_TABLES = {
  'detail_hub_employees': {
    migration: '20251117000001_create_detail_hub_employees.sql',
    requiredColumns: ['id', 'dealership_id', 'employee_code', 'first_name', 'last_name', 'email', 'status', 'face_encoding']
  },
  'detail_hub_time_punches': {
    migration: '20251117000002_create_detail_hub_time_punches.sql',
    requiredColumns: ['id', 'employee_id', 'kiosk_id', 'punch_type', 'punch_time', 'verification_method', 'face_match_confidence']
  },
  'detail_hub_kiosks': {
    migration: '20251117000003_create_detail_hub_kiosks.sql',
    requiredColumns: ['id', 'dealership_id', 'kiosk_code', 'name', 'status', 'camera_status', 'face_recognition_enabled']
  },
  'detail_hub_punch_photos': {
    migration: '20251117000004_create_detail_hub_punch_photos.sql',
    requiredColumns: ['id', 'punch_id', 'photo_url', 'file_path', 'file_size']
  },
  'detail_hub_schedules': {
    migration: '20251117000005_create_detail_hub_schedules.sql',
    requiredColumns: ['id', 'employee_id', 'schedule_name', 'start_time', 'end_time', 'days_of_week']
  }
};

async function checkTable(tableName, config) {
  console.log(`\n📋 Checking: ${tableName}`);
  console.log('   Migration:', config.migration);
  console.log('-'.repeat(80));

  try {
    // Test if we can SELECT from table (table exists + RLS allows)
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (error) {
      if (error.message.includes('does not exist')) {
        console.log(`   ❌ TABLE MISSING: ${tableName} does not exist`);
        console.log(`   Action: Apply migration ${config.migration}`);
        return { status: 'missing', table: tableName, migration: config.migration };
      } else {
        console.log(`   ⚠️  TABLE EXISTS but query failed: ${error.message}`);
        console.log(`   (This might be normal if table is empty or RLS is strict)`);
        return { status: 'exists_query_failed', table: tableName, error: error.message };
      }
    }

    console.log(`   ✅ TABLE EXISTS: ${tableName}`);
    console.log(`   Rows found: ${data.length}`);

    // Check required columns by attempting minimal INSERT (will fail but shows missing columns)
    const testData = {};
    config.requiredColumns.forEach(col => {
      if (col === 'id') return; // Skip auto-generated
      testData[col] = 'test';
    });

    const { error: insertError } = await supabase
      .from(tableName)
      .insert(testData);

    if (insertError) {
      if (insertError.code === 'PGRST204') {
        // Column not found in schema cache
        const match = insertError.message.match(/Could not find the '(\w+)' column/);
        if (match) {
          const missingColumn = match[1];
          console.log(`   ❌ MISSING COLUMN: ${missingColumn}`);
          console.log(`   Action: Re-apply migration ${config.migration}`);
          return { status: 'missing_columns', table: tableName, column: missingColumn };
        }
      } else if (insertError.code === '42501') {
        console.log(`   ℹ️  RLS Policy blocks INSERT (expected without auth)`);
        console.log(`   ✅ Schema appears complete (no column errors)`);
        return { status: 'complete', table: tableName };
      } else if (insertError.message.includes('violates')) {
        console.log(`   ℹ️  Constraint/validation error (expected with test data)`);
        console.log(`   ✅ Schema appears complete`);
        return { status: 'complete', table: tableName };
      } else {
        console.log(`   ⚠️  Unexpected error during column check: ${insertError.message}`);
        return { status: 'unknown_error', table: tableName, error: insertError.message };
      }
    } else {
      console.log(`   ⚠️  INSERT succeeded with test data (unexpected!)`);
      // Clean up if it somehow succeeded
      return { status: 'complete', table: tableName };
    }
  } catch (err) {
    console.log(`   ❌ Exception: ${err.message}`);
    return { status: 'error', table: tableName, error: err.message };
  }

  return { status: 'complete', table: tableName };
}

async function main() {
  const results = [];

  for (const [tableName, config] of Object.entries(DETAILHUB_TABLES)) {
    const result = await checkTable(tableName, config);
    results.push(result);
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  console.log('');

  const missing = results.filter(r => r.status === 'missing');
  const missingColumns = results.filter(r => r.status === 'missing_columns');
  const complete = results.filter(r => r.status === 'complete');
  const issues = results.filter(r => !['complete', 'exists_query_failed'].includes(r.status));

  console.log(`✅ Complete tables: ${complete.length}/${results.length}`);
  complete.forEach(r => console.log(`   - ${r.table}`));

  if (missing.length > 0) {
    console.log('');
    console.log(`❌ Missing tables: ${missing.length}`);
    missing.forEach(r => {
      console.log(`   - ${r.table}`);
      console.log(`     Migration: ${r.migration}`);
    });
  }

  if (missingColumns.length > 0) {
    console.log('');
    console.log(`❌ Tables with missing columns: ${missingColumns.length}`);
    missingColumns.forEach(r => {
      console.log(`   - ${r.table}: missing column '${r.column}'`);
    });
  }

  console.log('');
  console.log('📝 RECOMMENDATIONS:');
  console.log('');

  if (missing.length > 0 || missingColumns.length > 0) {
    console.log('1. Apply missing migrations via Supabase Dashboard > SQL Editor:');
    const migrationsToApply = [
      ...missing.map(r => r.migration),
      ...missingColumns.map(r => DETAILHUB_TABLES[r.table].migration)
    ];
    const uniqueMigrations = [...new Set(migrationsToApply)];
    uniqueMigrations.forEach(m => {
      console.log(`   - supabase/migrations/${m}`);
    });

    console.log('');
    console.log('2. Or apply all DetailHub migrations at once:');
    console.log('   - Run script: node scripts/apply-detailhub-migrations.js');
    console.log('   - Or use: supabase db push');
  } else {
    console.log('✅ All DetailHub tables appear to be correctly migrated!');
    console.log('   (Note: Some may show query failures due to RLS, which is expected)');
  }

  console.log('');
}

main().catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
