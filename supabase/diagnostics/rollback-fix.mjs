#!/usr/bin/env node

/**
 * Rollback Script: Re-enable SMS notifications for detail_manager role
 * Execute with: node supabase/diagnostics/rollback-fix.mjs
 *
 * WARNING: This will re-enable the 10 events that were disabled by run-fix.mjs
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

// Events that were disabled by the fix
const EVENTS_TO_RESTORE = [
  { module: 'sales_orders', event_type: 'order_created' },
  { module: 'sales_orders', event_type: 'order_assigned' },
  { module: 'sales_orders', event_type: 'status_changed' },
  { module: 'sales_orders', event_type: 'comment_added' },
  { module: 'service_orders', event_type: 'order_created' },
  { module: 'service_orders', event_type: 'order_assigned' },
  { module: 'service_orders', event_type: 'comment_added' },
  { module: 'service_orders', event_type: 'attachment_added' },
  { module: 'service_orders', event_type: 'follower_added' },
  { module: 'service_orders', event_type: 'field_updated' }
];

async function rollback() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⚠️  ROLLBACK: Re-enabling SMS notifications');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('   This will restore the 10 events that were disabled');
  console.log('   Detail Department WILL start receiving SMS again');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let successCount = 0;
  let errorCount = 0;

  for (const event of EVENTS_TO_RESTORE) {
    const { error } = await supabase
      .from('role_notification_events')
      .update({
        enabled: true,
        updated_at: new Date().toISOString()
      })
      .eq('role_id', DETAIL_MANAGER_ROLE_ID)
      .eq('module', event.module)
      .eq('event_type', event.event_type);

    if (error) {
      console.error(`❌ Failed to restore ${event.module}.${event.event_type}:`, error);
      errorCount++;
    } else {
      console.log(`✅ Restored ${event.module}.${event.event_type}`);
      successCount++;
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 ROLLBACK SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`   ✅ Restored: ${successCount} events`);
  console.log(`   ❌ Failed: ${errorCount} events`);
  console.log('');

  // Verify final state
  const { data: afterData } = await supabase
    .from('role_notification_events')
    .select('*')
    .eq('role_id', DETAIL_MANAGER_ROLE_ID)
    .eq('enabled', true);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 FINAL STATE (events with enabled=true):');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.table(afterData);
  console.log(`\nTotal enabled: ${afterData?.length || 0} events`);

  console.log('\n✅ ROLLBACK COMPLETE');
  console.log('   Detail Department will now receive SMS notifications again\n');
}

rollback().catch(console.error);
