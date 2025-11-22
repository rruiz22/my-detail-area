#!/usr/bin/env node

/**
 * Diagnostic Script: Detail Manager SMS Notifications Issue
 * Execute with: node supabase/diagnostics/run-diagnostic.mjs
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

async function runDiagnostics() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 DIAGNOSTIC 1: Role Notification Configuration');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Query 1.1: Get detail_manager role ID first
  const { data: detailRoles, error: rolesErr } = await supabase
    .from('dealer_custom_roles')
    .select('id, role_name, display_name, dealer_id')
    .or('role_name.ilike.%detail%manager%,display_name.ilike.%detail%manager%,display_name.ilike.%detail%department%');

  if (rolesErr) {
    console.error('❌ Error fetching roles:', rolesErr);
    return;
  }

  console.log('📋 Detail Manager Roles Found:');
  console.table(detailRoles);

  if (!detailRoles || detailRoles.length === 0) {
    console.log('⚠️  No detail_manager roles found!');
    return;
  }

  const roleIds = detailRoles.map(r => r.id);

  // Query 1.2: Check notification events
  const { data: roleConfig, error: roleConfigError } = await supabase
    .from('role_notification_events')
    .select('*')
    .in('role_id', roleIds)
    .eq('event_type', 'status_changed');

  if (roleConfigError) {
    console.error('❌ Error fetching role config:', roleConfigError);
  } else {
    console.log('\n📊 Status Changed Events for Detail Manager:');
    console.table(roleConfig);

    const enabledEvents = roleConfig?.filter(e => e.enabled === true) || [];
    console.log(`\n⚠️  KEY FINDING: ${enabledEvents.length} events have enabled=TRUE`);

    if (enabledEvents.length > 0) {
      console.log('   🔴 PROBLEM CONFIRMED: DB has enabled=true but UI shows OFF\n');
      console.table(enabledEvents);
    } else {
      console.log('   ✅ All events are disabled (enabled=false)\n');
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧑 DIAGNOSTIC 2: User "Detail Department" Info');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Get user info
  const { data: userInfo, error: userError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, phone_number')
    .eq('id', 'f2875799-7e7b-4622-9923-83d1965d99b0')
    .single();

  if (userError) {
    console.error('❌ Error fetching user:', userError);
  } else {
    console.log('👤 Detail Department User:');
    console.table([userInfo]);
  }

  // Get user's membership and role
  const { data: membership, error: membershipError } = await supabase
    .from('dealer_memberships')
    .select(`
      custom_role_id,
      dealer_id,
      is_active
    `)
    .eq('user_id', 'f2875799-7e7b-4622-9923-83d1965d99b0')
    .eq('is_active', true)
    .single();

  if (membership) {
    const roleInfo = detailRoles.find(r => r.id === membership.custom_role_id);
    console.log('\n👔 Role Assignment:');
    console.table([{
      role_id: membership.custom_role_id,
      role_name: roleInfo?.role_name,
      role_display: roleInfo?.display_name,
      dealer_id: membership.dealer_id
    }]);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 DIAGNOSTIC 3: All Events for Detail Manager');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Get ALL notification events
  const { data: allEvents, error: eventsError } = await supabase
    .from('role_notification_events')
    .select('*')
    .in('role_id', roleIds)
    .order('module')
    .order('event_type');

  if (eventsError) {
    console.error('❌ Error fetching all events:', eventsError);
  } else {
    console.log('📋 All Notification Events (should all be FALSE per UI):');
    console.table(allEvents);

    const enabledCount = allEvents?.filter(e => e.enabled === true).length || 0;
    const totalCount = allEvents?.length || 0;
    console.log(`\n📊 Summary: ${enabledCount} of ${totalCount} events have enabled=TRUE`);
    console.log(`   (UI shows 0 of 10 enabled)\n`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ DIAGNOSTICS COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📋 NEXT STEPS:');
  if ((roleConfig?.filter(e => e.enabled === true).length || 0) > 0) {
    console.log('   🔴 PROBLEM CONFIRMED: enabled=true in DB');
    console.log('   → Run fix: node supabase/diagnostics/run-fix.js');
  } else {
    console.log('   ✅ DB shows enabled=false');
    console.log('   → Investigate Edge Function validation logic');
    console.log('   → Check if there are multiple detail_manager roles');
  }
  console.log('');
}

runDiagnostics().catch(console.error);
