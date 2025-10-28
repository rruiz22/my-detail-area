/**
 * Script to apply SMS notification migrations to Supabase
 * Run with: npx tsx scripts/apply-sms-migrations.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const migrations = [
  {
    name: '20251028180000_add_phone_to_profiles',
    description: 'Add phone_number column to profiles table'
  },
  {
    name: '20251028180001_create_user_sms_notification_preferences',
    description: 'Create user SMS notification preferences table'
  },
  {
    name: '20251028180002_create_sms_send_history',
    description: 'Create SMS send history table'
  },
  {
    name: '20251028180003_add_sms_notification_permission',
    description: 'Add receive_sms_notifications permission'
  }
];

async function applyMigration(name: string, description: string): Promise<boolean> {
  try {
    console.log(`\n📦 Applying migration: ${name}`);
    console.log(`   ${description}`);

    const migrationPath = join(process.cwd(), 'supabase', 'migrations', `${name}.sql`);
    const sql = readFileSync(migrationPath, 'utf-8');

    // Execute SQL using Supabase client
    const { error } = await supabase.rpc('exec_sql', { sql_string: sql }).single();

    if (error) {
      // Try alternative method: direct SQL execution via REST API
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ sql_string: sql })
      });

      if (!response.ok) {
        throw new Error(`Migration failed: ${await response.text()}`);
      }
    }

    console.log(`   ✅ Migration applied successfully`);
    return true;
  } catch (error: any) {
    console.error(`   ❌ Migration failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting SMS Migrations');
  console.log('=' .repeat(60));

  let successCount = 0;
  let failedCount = 0;

  for (const migration of migrations) {
    const success = await applyMigration(migration.name, migration.description);
    if (success) {
      successCount++;
    } else {
      failedCount++;
      console.log('\n⚠️  Migration failed, but continuing with next one...');
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📊 Summary: ${successCount} successful, ${failedCount} failed`);

  if (failedCount > 0) {
    console.log('\n⚠️  Some migrations failed. Please apply them manually:');
    console.log('   1. Open Supabase Dashboard → SQL Editor');
    console.log('   2. Copy content from supabase/migrations/*.sql');
    console.log('   3. Execute each migration in order');
  } else {
    console.log('\n✅ All migrations applied successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Update phone number in user profile');
    console.log('   2. Configure SMS preferences in Settings');
    console.log('   3. Deploy Edge Function: npx supabase functions deploy send-order-sms-notification');
  }

  process.exit(failedCount > 0 ? 1 : 0);
}

main();
