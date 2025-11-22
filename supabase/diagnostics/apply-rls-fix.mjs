#!/usr/bin/env node

/**
 * Apply RLS Fix: Update role_notification_events policy
 * This script applies the migration to fix obsolete RLS policy
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://swfnnrpzpkdypbrzmgnr.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm5ucnB6cGtkeXBicnptZ25yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzE4Njk2MCwiZXhwIjoyMDcyNzYyOTYwfQ.ud57lvk528bfk8lb-D5CGn2UeN6_fLuEXXwd-CKaYrE';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

async function applyMigration() {
  console.log('\n' + '='.repeat(60));
  console.log('[*] APPLYING RLS FIX MIGRATION');
  console.log('='.repeat(60) + '\n');

  console.log('[*] Reading migration file...');
  const migrationSQL = readFileSync(
    'supabase/migrations/20251121000001_fix_role_notification_events_rls.sql',
    'utf-8'
  );

  console.log('[*] Executing SQL migration...\n');

  try {
    // Split SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && !s.startsWith('COMMENT'));

    console.log(`[*] Executing ${statements.length} SQL statements...\n`);

    // Execute via REST API (DDL operations)
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ query: migrationSQL })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[ERROR] Migration failed:', error);
      console.error('\n[!] MANUAL APPLICATION REQUIRED');
      console.error('[!] Go to: https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/sql/new');
      console.error('[!] Copy contents of: supabase/migrations/20251121000001_fix_role_notification_events_rls.sql');
      console.error('[!] Paste and execute\n');
      process.exit(1);
    }

    console.log('[+] Migration executed successfully!\n');

    // Verify the new policy exists
    console.log('[*] Verifying new policy...');

    const { data: policies, error: policyError } = await supabase
      .from('pg_policies')
      .select('policyname, tablename')
      .eq('tablename', 'role_notification_events');

    if (policyError) {
      console.warn('[!] Could not verify policies:', policyError.message);
    } else if (policies) {
      console.log('\n[+] Current policies on role_notification_events:');
      policies.forEach(p => console.log(`    - ${p.policyname}`));
    }

    console.log('\n' + '='.repeat(60));
    console.log('[SUCCESS] RLS FIX APPLIED');
    console.log('='.repeat(60));

    console.log('\n[*] NEXT STEPS:');
    console.log('    1. Refresh the browser (Ctrl + Shift + R)');
    console.log('    2. Open Detail Manager notification settings again');
    console.log('    3. Check console for: "[useRoleNotificationEvents] Fetched 39 events"');
    console.log('    4. Modal should now show all events\n');

  } catch (error) {
    console.error('[ERROR] Exception during migration:', error);
    process.exit(1);
  }
}

applyMigration().catch(console.error);
