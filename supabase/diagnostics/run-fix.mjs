#!/usr/bin/env node

/**
 * Fix Script: Disable ALL SMS notifications for detail_manager role
 * Execute with: node supabase/diagnostics/run-fix.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://swfnnrpzpkdypbrzmgnr.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm5ucnB6cGtkeXBicnptZ25yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzE4Njk2MCwiZXhwIjoyMDcyNzYyOTYwfQ.ud57lvk528bfk8lb-D5CGn2UeN6_fLuEXXwd-CKaYrE';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const DETAIL_MANAGER_ROLE_ID = 'edbbc889-8740-497b-9e16-d4a055e756e1';

async function applyFix() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⚠️  WARNING: About to disable SMS notifications');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('   Role: detail_manager (Detail Manager)');
  console.log('   Action: Set enabled=false for ALL events with enabled=true');
  console.log('   Affected: 10 events across sales_orders and service_orders');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Step 1: Show current state BEFORE
  console.log('📊 BEFORE UPDATE:\n');

  const { data: beforeData } = await supabase
    .from('role_notification_events')
    .select('*')
    .eq('role_id', DETAIL_MANAGER_ROLE_ID)
    .eq('enabled', true);

  console.table(beforeData);
  console.log(`\nTotal events to disable: ${beforeData?.length || 0}\n`);

  // Step 2: Apply the fix
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔧 APPLYING FIX...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { data: updateResult, error: updateError } = await supabase
    .from('role_notification_events')
    .update({
      enabled: false,
      updated_at: new Date().toISOString()
    })
    .eq('role_id', DETAIL_MANAGER_ROLE_ID)
    .eq('enabled', true)
    .select();

  if (updateError) {
    console.error('❌ Error applying fix:', updateError);
    process.exit(1);
  }

  console.log(`✅ Updated ${updateResult?.length || 0} events\n`);

  // Step 3: Show new state AFTER
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 AFTER UPDATE (verify enabled=false):');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { data: afterData } = await supabase
    .from('role_notification_events')
    .select('*')
    .eq('role_id', DETAIL_MANAGER_ROLE_ID)
    .order('module')
    .order('event_type');

  // Count enabled events
  const enabledAfter = afterData?.filter(e => e.enabled === true).length || 0;
  const totalAfter = afterData?.length || 0;

  console.table(afterData);
  console.log(`\n📊 Final State: ${enabledAfter} of ${totalAfter} events enabled`);
  console.log(`   (Should be 0 to match UI)\n`);

  if (enabledAfter === 0) {
    console.log('✅ SUCCESS: All events disabled, DB now matches UI\n');
  } else {
    console.log(`⚠️  WARNING: Still ${enabledAfter} events enabled!\n`);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ FIX APPLIED SUCCESSFULLY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📋 VERIFICATION STEPS:');
  console.log('   1. ✅ Database updated (see table above)');
  console.log('   2. 🧪 Test: Change status of an order where Detail Department is follower');
  console.log('   3. ✅ Verify: Detail Department should NOT receive SMS');
  console.log('   4. 📱 Check Edge Function logs for: "❌ LEVEL 2 FAILED"');
  console.log('');
  console.log('🔄 TO ROLLBACK:');
  console.log('   Run: node supabase/diagnostics/rollback-fix.mjs');
  console.log('');
}

applyFix().catch(console.error);
