/**
 * Diagnostic Script for Kiosk 400 Error Investigation
 *
 * Executes comprehensive diagnostic queries to identify the root cause
 * of 400 Bad Request errors when creating kiosks.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables manually
const envPath = resolve(__dirname, '../.env.local');
let supabaseUrl, supabaseAnonKey;

try {
  const envContent = readFileSync(envPath, 'utf-8');
  const lines = envContent.split('\n');

  for (const line of lines) {
    const [key, ...valueParts] = line.split('=');
    const value = valueParts.join('=').trim();

    if (key === 'VITE_SUPABASE_URL') {
      supabaseUrl = value;
    } else if (key === 'VITE_SUPABASE_ANON_KEY') {
      supabaseAnonKey = value;
    }
  }
} catch (err) {
  console.error('❌ Could not read .env.local:', err.message);
  process.exit(1);
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('Required: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🔍 KIOSK 400 ERROR DIAGNOSTIC SCRIPT');
console.log('=' .repeat(80));
console.log('');

async function runQuery(name, query, description) {
  console.log(`\n📋 ${name}`);
  console.log(`   ${description}`);
  console.log('-'.repeat(80));

  try {
    const { data, error } = await supabase.rpc('execute_sql', { query_text: query });

    if (error) {
      console.log(`❌ Error:`, error.message);
      console.log(`   Details:`, JSON.stringify(error, null, 2));
    } else {
      console.log(`✅ Success:`);
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.log(`❌ Exception:`, err.message);
  }

  console.log('');
}

async function main() {
  // Query 1: Check dealerships.id data type
  await runQuery(
    'Query 1: Dealerships ID Column Type',
    `
      SELECT column_name, data_type, udt_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'dealerships'
        AND column_name = 'id';
    `,
    'Verify dealerships.id is INTEGER (not BIGINT)'
  );

  // Query 2: Check user memberships
  await runQuery(
    'Query 2: User Memberships for rruiz@lima.llc',
    `
      SELECT
        dm.dealership_id,
        dm.role,
        d.name as dealership_name,
        p.email,
        pg_typeof(dm.dealership_id) as dealership_id_type
      FROM dealer_memberships dm
      JOIN profiles p ON p.id = dm.user_id
      JOIN dealerships d ON d.id = dm.dealership_id
      WHERE p.email = 'rruiz@lima.llc'
      ORDER BY dm.dealership_id;
    `,
    'Check user role and dealership access'
  );

  // Query 3: Check detail_hub_kiosks schema
  await runQuery(
    'Query 3: detail_hub_kiosks Schema',
    `
      SELECT
        column_name,
        data_type,
        udt_name,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'detail_hub_kiosks'
      ORDER BY ordinal_position;
    `,
    'Verify all column types match expected schema'
  );

  // Query 4: Check RLS policies
  await runQuery(
    'Query 4: RLS Policies on detail_hub_kiosks',
    `
      SELECT
        policyname,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'detail_hub_kiosks'
      ORDER BY cmd, policyname;
    `,
    'Verify INSERT policy exists and is correct'
  );

  // Query 5: Check ENUM types
  await runQuery(
    'Query 5: Custom ENUM Types',
    `
      SELECT
        typname,
        enumlabel,
        enumsortorder
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE typname IN ('detail_hub_kiosk_status', 'detail_hub_camera_status')
      ORDER BY typname, enumsortorder;
    `,
    'Verify kiosk ENUM types exist with correct values'
  );

  // Query 6: Check constraints
  await runQuery(
    'Query 6: Table Constraints',
    `
      SELECT
        conname AS constraint_name,
        contype AS constraint_type,
        pg_get_constraintdef(oid) AS constraint_definition
      FROM pg_constraint
      WHERE conrelid = 'public.detail_hub_kiosks'::regclass
      ORDER BY contype, conname;
    `,
    'Verify all CHECK constraints are as expected'
  );

  // Query 7: Verify dealership_id=1 exists
  await runQuery(
    'Query 7: Verify Dealership ID=1 Exists',
    `
      SELECT id, name, code, created_at
      FROM dealerships
      WHERE id = 1;
    `,
    'Ensure foreign key target exists'
  );

  // Query 8: Check existing kiosks
  await runQuery(
    'Query 8: Existing Kiosks',
    `
      SELECT
        id,
        dealership_id,
        kiosk_code,
        name,
        status,
        camera_status,
        created_at
      FROM detail_hub_kiosks
      ORDER BY created_at DESC
      LIMIT 10;
    `,
    'List any existing kiosks in the system'
  );

  // Query 9: Diagnostic Summary
  await runQuery(
    'Query 9: Diagnostic Summary',
    `
      SELECT 'Table Exists' AS check_type,
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'detail_hub_kiosks')
        THEN 'PASS' ELSE 'FAIL' END AS status
      UNION ALL
      SELECT 'RLS Enabled' AS check_type,
        CASE WHEN relrowsecurity = true THEN 'PASS' ELSE 'FAIL' END AS status
      FROM pg_class WHERE relname = 'detail_hub_kiosks'
      UNION ALL
      SELECT 'INSERT Policy Exists' AS check_type,
        CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END AS status
      FROM pg_policies WHERE tablename = 'detail_hub_kiosks' AND cmd = 'INSERT'
      UNION ALL
      SELECT 'User Has Membership' AS check_type,
        CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END AS status
      FROM dealer_memberships dm
      JOIN profiles p ON p.id = dm.user_id
      WHERE p.email = 'rruiz@lima.llc';
    `,
    'Overall health check summary'
  );

  // FINAL TEST: Attempt actual INSERT
  console.log('\n🎯 FINAL TEST: Attempting Actual INSERT');
  console.log('=' .repeat(80));
  console.log('This will attempt to create a test kiosk and should reveal the exact error.');
  console.log('');

  try {
    const { data, error } = await supabase
      .from('detail_hub_kiosks')
      .insert({
        dealership_id: 1,
        kiosk_code: 'TEST-DEBUG-' + Date.now(),
        name: 'Debug Test Kiosk',
        status: 'offline',
        camera_status: 'inactive'
      })
      .select()
      .single();

    if (error) {
      console.log('❌ INSERT FAILED - This is the actual error:');
      console.log('   Error Code:', error.code);
      console.log('   Error Message:', error.message);
      console.log('   Error Details:', error.details);
      console.log('   Error Hint:', error.hint);
      console.log('');
      console.log('   Full Error Object:');
      console.log(JSON.stringify(error, null, 2));
    } else {
      console.log('✅ INSERT SUCCEEDED - Test kiosk created:');
      console.log(JSON.stringify(data, null, 2));

      // Clean up test data
      const { error: deleteError } = await supabase
        .from('detail_hub_kiosks')
        .delete()
        .eq('id', data.id);

      if (deleteError) {
        console.log('⚠️  Warning: Could not delete test kiosk:', deleteError.message);
      } else {
        console.log('🗑️  Test kiosk cleaned up successfully');
      }
    }
  } catch (err) {
    console.log('❌ EXCEPTION during INSERT test:', err.message);
    console.log('   Stack:', err.stack);
  }

  console.log('');
  console.log('=' .repeat(80));
  console.log('✅ DIAGNOSTIC COMPLETE');
  console.log('');
}

main().catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
