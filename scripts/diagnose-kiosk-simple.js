/**
 * Simplified Diagnostic Script for Kiosk 400 Error
 * Uses hardcoded Supabase credentials from project reference
 */

import { createClient } from '@supabase/supabase-js';

// Project: swfnnrpzpkdypbrzmgnr (from src/integrations/supabase/client.ts)
const SUPABASE_URL = 'https://swfnnrpzpkdypbrzmgnr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm5ucnB6cGtkeXBicnptZ25yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxODY5NjAsImV4cCI6MjA3Mjc2Mjk2MH0.HA7ujjknDa-97z-vC-vOZJm5rQ7PYXqn--rdiZoPXcY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🔍 KIOSK 400 ERROR DIAGNOSTIC (SIMPLIFIED)');
console.log('='.repeat(80));
console.log('');

async function main() {
  console.log('📋 Step 1: Check dealerships.id data type');
  console.log('-'.repeat(80));

  const { data: dealerships, error: dealershipsError } = await supabase
    .from('dealerships')
    .select('id, name, code')
    .limit(5);

  if (dealershipsError) {
    console.log('❌ Error:', dealershipsError.message);
  } else {
    console.log('✅ Sample dealerships:');
    console.log(JSON.stringify(dealerships, null, 2));
    console.log('   Type of first ID:', typeof dealerships[0]?.id);
  }

  console.log('');
  console.log('📋 Step 2: Check user authentication');
  console.log('-'.repeat(80));

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.log('❌ Not authenticated - need to sign in first');
    console.log('   This diagnostic requires authentication as rruiz@lima.llc');
    console.log('   Error:', authError?.message);
  } else {
    console.log('✅ Authenticated as:', user.email);
  }

  console.log('');
  console.log('📋 Step 3: Check existing kiosks');
  console.log('-'.repeat(80));

  const { data: kiosks, error: kiosksError } = await supabase
    .from('detail_hub_kiosks')
    .select('*')
    .limit(5);

  if (kiosksError) {
    console.log('❌ Error querying kiosks:', kiosksError.message);
    console.log('   Code:', kiosksError.code);
    console.log('   Details:', kiosksError.details);
  } else {
    console.log(`✅ Found ${kiosks.length} kiosks`);
    if (kiosks.length > 0) {
      console.log('   Sample:');
      console.log(JSON.stringify(kiosks[0], null, 2));
    } else {
      console.log('   (No kiosks exist yet)');
    }
  }

  console.log('');
  console.log('🎯 Step 4: ATTEMPT ACTUAL INSERT (This should fail with the exact error)');
  console.log('-'.repeat(80));

  const testKiosk = {
    dealership_id: 1,
    kiosk_code: 'TEST-DEBUG-' + Date.now(),
    name: 'Debug Test Kiosk',
    status: 'offline',
    camera_status: 'inactive'
  };

  console.log('Attempting to insert:', JSON.stringify(testKiosk, null, 2));
  console.log('');

  const { data: insertedKiosk, error: insertError } = await supabase
    .from('detail_hub_kiosks')
    .insert(testKiosk)
    .select()
    .single();

  if (insertError) {
    console.log('❌ INSERT FAILED - THIS IS THE ACTUAL ERROR:');
    console.log('');
    console.log('   Error Code:', insertError.code);
    console.log('   Error Message:', insertError.message);
    console.log('   Error Details:', insertError.details);
    console.log('   Error Hint:', insertError.hint);
    console.log('');
    console.log('   Full Error Object:');
    console.log(JSON.stringify(insertError, null, 2));
  } else {
    console.log('✅ INSERT SUCCEEDED!');
    console.log('   Created kiosk:', JSON.stringify(insertedKiosk, null, 2));

    // Clean up
    const { error: deleteError } = await supabase
      .from('detail_hub_kiosks')
      .delete()
      .eq('id', insertedKiosk.id);

    if (deleteError) {
      console.log('   ⚠️  Could not clean up test kiosk:', deleteError.message);
    } else {
      console.log('   🗑️  Test kiosk cleaned up');
    }
  }

  console.log('');
  console.log('📋 Step 5: Check RLS policies (requires authentication)');
  console.log('-'.repeat(80));

  // This query requires authentication with proper permissions
  const { data: policies, error: policiesError } = await supabase
    .rpc('get_table_policies', { table_name: 'detail_hub_kiosks' });

  if (policiesError) {
    console.log('❌ Could not query policies:', policiesError.message);
    console.log('   (This is expected if RPC function doesn\'t exist)');
  } else {
    console.log('✅ RLS Policies:');
    console.log(JSON.stringify(policies, null, 2));
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('✅ DIAGNOSTIC COMPLETE');
  console.log('');
  console.log('NEXT STEPS:');
  console.log('1. If authentication error: Sign in to app first, then run this script');
  console.log('2. If INSERT error: The error details above show the exact problem');
  console.log('3. If type mismatch: Check dealership_id type (should be INTEGER not BIGINT)');
  console.log('4. If RLS error: Check RLS policies allow INSERT for your role');
  console.log('');
}

main().catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
