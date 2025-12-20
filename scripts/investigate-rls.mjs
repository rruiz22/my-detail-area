#!/usr/bin/env node
/**
 * Deep RLS Investigation Script for MyDetailArea
 *
 * Purpose: Analyze RLS policies causing 406 errors and timeouts for user boscw@ddsmda.com
 *
 * Issues being investigated:
 * 1. Profile load timeout (15+ seconds)
 * 2. 406 "Not Acceptable" errors on:
 *    - detail_hub_kiosk_devices
 *    - user_push_notification_preferences
 *    - system_settings
 * 3. Circular dependencies in RLS policies
 * 4. Missing indexes causing slow queries
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

// Create Supabase client with service role (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('🔍 DEEP RLS INVESTIGATION - MyDetailArea Database');
console.log('=' .repeat(80));
console.log('');

// Helper function to format JSON
const formatJSON = (obj) => JSON.stringify(obj, null, 2);

// Helper function to execute SQL and handle errors
async function executeQuery(name, query) {
  console.log(`\n📊 Running: ${name}`);
  console.log('-'.repeat(80));

  try {
    const { data, error } = await supabase.rpc('execute_sql_query', { query });

    if (error) {
      console.error(`❌ Error:`, error);
      return null;
    }

    if (!data || data.length === 0) {
      console.log('   (No results)');
      return [];
    }

    console.table(data);
    return data;
  } catch (err) {
    console.error(`❌ Exception:`, err);
    return null;
  }
}

// Main investigation
async function investigate() {
  console.log('🎯 TARGET USER: boscw@ddsmda.com');
  console.log('');

  // =============================================================================
  // 1. USER VERIFICATION
  // =============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('SECTION 1: USER VERIFICATION');
  console.log('='.repeat(80));

  const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) {
    console.error('❌ Failed to fetch users:', userError);
  } else {
    const targetUser = userData.users.find(u => u.email === 'boscw@ddsmda.com');
    if (targetUser) {
      console.log('✅ User found in auth.users:');
      console.log(`   ID: ${targetUser.id}`);
      console.log(`   Email: ${targetUser.email}`);
      console.log(`   Created: ${targetUser.created_at}`);
      console.log(`   Confirmed: ${targetUser.email_confirmed_at ? 'Yes' : 'No'}`);
    } else {
      console.log('❌ User NOT found in auth.users');
    }
  }

  // =============================================================================
  // 2. RLS POLICIES ANALYSIS
  // =============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('SECTION 2: RLS POLICIES FOR CRITICAL TABLES');
  console.log('='.repeat(80));

  const { data: policies } = await supabase
    .from('pg_policies')
    .select('*')
    .in('tablename', [
      'profiles',
      'dealer_memberships',
      'detail_hub_kiosk_devices',
      'user_push_notification_preferences',
      'system_settings'
    ])
    .order('tablename')
    .order('policyname');

  if (policies && policies.length > 0) {
    console.log(`\n📋 Found ${policies.length} RLS policies:\n`);

    policies.forEach(policy => {
      console.log(`\nTable: ${policy.tablename}`);
      console.log(`Policy: ${policy.policyname}`);
      console.log(`Command: ${policy.cmd}`);
      console.log(`Permissive: ${policy.permissive}`);
      console.log(`Roles: ${policy.roles}`);
      console.log(`USING clause: ${policy.qual || '(none)'}`);
      console.log(`WITH CHECK: ${policy.with_check || '(none)'}`);
      console.log('-'.repeat(40));
    });

    // Analyze for circular dependencies
    console.log('\n⚠️ CIRCULAR DEPENDENCY ANALYSIS:');
    const profilesPolicies = policies.filter(p => p.tablename === 'profiles');
    const membershipsPolicies = policies.filter(p => p.tablename === 'dealer_memberships');

    profilesPolicies.forEach(p => {
      if (p.qual && p.qual.includes('dealer_memberships')) {
        console.log(`   🔴 profiles policy "${p.policyname}" references dealer_memberships`);
      }
    });

    membershipsPolicies.forEach(p => {
      if (p.qual && p.qual.includes('profiles')) {
        console.log(`   🔴 dealer_memberships policy "${p.policyname}" references profiles`);
      }
    });
  }

  // =============================================================================
  // 3. INDEX ANALYSIS
  // =============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('SECTION 3: INDEX ANALYSIS');
  console.log('='.repeat(80));

  const { data: indexes } = await supabase
    .from('pg_indexes')
    .select('*')
    .eq('schemaname', 'public')
    .in('tablename', [
      'profiles',
      'dealer_memberships',
      'detail_hub_kiosk_devices',
      'user_push_notification_preferences',
      'system_settings'
    ])
    .order('tablename');

  if (indexes) {
    console.log(`\n📊 Found ${indexes.length} indexes:\n`);

    const groupedIndexes = indexes.reduce((acc, idx) => {
      if (!acc[idx.tablename]) acc[idx.tablename] = [];
      acc[idx.tablename].push(idx);
      return acc;
    }, {});

    Object.entries(groupedIndexes).forEach(([table, idxs]) => {
      console.log(`\nTable: ${table}`);
      idxs.forEach(idx => {
        console.log(`  - ${idx.indexname}`);
      });
    });

    // Check for missing critical indexes
    console.log('\n⚠️ MISSING INDEX ANALYSIS:');

    const hasIndex = (table, column) => {
      return indexes.some(idx =>
        idx.tablename === table &&
        idx.indexdef.toLowerCase().includes(column.toLowerCase())
      );
    };

    const criticalIndexes = [
      { table: 'profiles', column: 'id', desc: 'Primary key index' },
      { table: 'dealer_memberships', column: 'user_id', desc: 'User lookup' },
      { table: 'dealer_memberships', column: 'dealer_id', desc: 'Dealer lookup' },
      { table: 'dealer_memberships', column: 'is_active', desc: 'Active filter' },
      { table: 'user_push_notification_preferences', column: 'user_id', desc: 'User lookup' },
    ];

    criticalIndexes.forEach(({ table, column, desc }) => {
      const exists = hasIndex(table, column);
      console.log(`   ${exists ? '✅' : '❌'} ${table}.${column} - ${desc}`);
    });
  }

  // =============================================================================
  // 4. PROFILE DATA CHECK
  // =============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('SECTION 4: PROFILE DATA CHECK');
  console.log('='.repeat(80));

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'boscw@ddsmda.com')
    .single();

  if (profile) {
    console.log('\n✅ Profile exists:');
    console.log(formatJSON(profile));
  } else {
    console.log('\n❌ Profile NOT found in profiles table');
  }

  // =============================================================================
  // 5. DEALER MEMBERSHIP CHECK
  // =============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('SECTION 5: DEALER MEMBERSHIP CHECK');
  console.log('='.repeat(80));

  const { data: memberships } = await supabase
    .from('dealer_memberships')
    .select('*, dealerships(id, name)')
    .eq('user_id', profile?.id || 'no-id');

  if (memberships && memberships.length > 0) {
    console.log(`\n✅ Found ${memberships.length} dealer membership(s):`);
    memberships.forEach((m, i) => {
      console.log(`\nMembership #${i + 1}:`);
      console.log(formatJSON(m));
    });
  } else {
    console.log('\n❌ NO dealer memberships found');
  }

  // =============================================================================
  // 6. QUERY SIMULATION
  // =============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('SECTION 6: QUERY SIMULATION (as authenticated user)');
  console.log('='.repeat(80));

  if (profile?.id) {
    console.log(`\nSimulating queries as user: ${profile.email} (${profile.id})`);

    // Create a client with user's session (simulated)
    console.log('\n⚠️ Note: Cannot fully simulate auth.uid() without real user session');
    console.log('   Using service role to check table accessibility');

    // Check table RLS status
    const { data: rlsStatus } = await supabase.rpc('check_rls_status', {
      p_schema: 'public',
      p_tables: [
        'profiles',
        'dealer_memberships',
        'detail_hub_kiosk_devices',
        'user_push_notification_preferences',
        'system_settings'
      ]
    }).catch(() => ({ data: null }));

    if (rlsStatus) {
      console.log('\n📊 RLS Status:');
      console.table(rlsStatus);
    }
  }

  // =============================================================================
  // 7. HELPER FUNCTIONS ANALYSIS
  // =============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('SECTION 7: HELPER FUNCTIONS USED IN RLS');
  console.log('='.repeat(80));

  const { data: functions } = await supabase
    .from('pg_proc')
    .select('proname, prosrc')
    .or('proname.ilike.%user%,proname.ilike.%auth%,proname.ilike.%permission%,proname.ilike.%member%')
    .limit(20);

  if (functions && functions.length > 0) {
    console.log(`\n📋 Found ${functions.length} helper functions:`);
    functions.forEach(fn => {
      console.log(`\n  Function: ${fn.proname}`);
    });
  }

  // =============================================================================
  // 8. TRIGGERS ON PROFILES
  // =============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('SECTION 8: TRIGGERS ON CRITICAL TABLES');
  console.log('='.repeat(80));

  const { data: triggers } = await supabase
    .from('pg_trigger')
    .select('tgname, tgenabled, tgtype')
    .in('tgrelid', ['profiles', 'dealer_memberships'].map(t => `${t}::regclass`))
    .catch(() => ({ data: [] }));

  if (triggers && triggers.length > 0) {
    console.log(`\n📋 Found ${triggers.length} triggers:`);
    console.table(triggers);
  } else {
    console.log('\n   (Could not fetch triggers - may need different query)');
  }

  // =============================================================================
  // 9. RECOMMENDATIONS
  // =============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('SECTION 9: PRELIMINARY RECOMMENDATIONS');
  console.log('='.repeat(80));

  console.log('\n🎯 CRITICAL FINDINGS:');

  if (!profile) {
    console.log('   🔴 BLOCKER: User has no profile row (THIS IS THE ROOT CAUSE!)');
    console.log('   → FIX: Create profile row for user');
  }

  if (!memberships || memberships.length === 0) {
    console.log('   🔴 BLOCKER: User has no dealer memberships');
    console.log('   → FIX: Create dealer_membership row');
  }

  if (policies) {
    const profilesSelectPolicies = policies.filter(p =>
      p.tablename === 'profiles' && p.cmd === 'SELECT'
    );

    if (profilesSelectPolicies.length === 0) {
      console.log('   🔴 CRITICAL: No SELECT policies on profiles table');
      console.log('   → FIX: Add policy allowing users to read their own profile');
    }

    profilesSelectPolicies.forEach(p => {
      if (p.qual && p.qual.includes('dealer_memberships')) {
        console.log('   🔴 CIRCULAR DEPENDENCY: profiles SELECT policy requires dealer_memberships');
        console.log(`   → Policy: ${p.policyname}`);
        console.log('   → FIX: Add "OR id = auth.uid()" to allow self-read');
      }
    });
  }

  console.log('\n✅ NEXT STEPS:');
  console.log('   1. Review circular dependencies in RLS policies');
  console.log('   2. Ensure user can read own profile without dealer_membership check');
  console.log('   3. Add missing indexes for dealer_memberships(user_id, is_active)');
  console.log('   4. Test queries with EXPLAIN ANALYZE to find bottlenecks');

  console.log('\n' + '='.repeat(80));
  console.log('INVESTIGATION COMPLETE');
  console.log('='.repeat(80));
}

// Run investigation
investigate()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
