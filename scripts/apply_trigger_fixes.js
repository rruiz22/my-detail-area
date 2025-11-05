/**
 * Script to apply trigger fix migrations
 *
 * Applies:
 *   - 20251105000000_fix_vendor_id_column_name.sql
 *   - 20251105000001_fix_work_item_field_triggers.sql
 *   - 20251105000002_fix_completed_at_field_name.sql
 *
 * Usage:
 *   $env:SUPABASE_SERVICE_ROLE_KEY="your-service-key"
 *   node scripts/apply_trigger_fixes.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase credentials
const supabaseUrl = "https://swfnnrpzpkdypbrzmgnr.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ Missing Supabase Service Role Key!\n');
  console.error('📝 To get your service role key:');
  console.error('   1. Go to: https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/settings/api');
  console.error('   2. Copy the "service_role" key (NOT the "anon" key)');
  console.error('   3. Set it as an environment variable\n');
  console.error('💻 PowerShell:');
  console.error('   $env:SUPABASE_SERVICE_ROLE_KEY="your-key-here"');
  console.error('   node scripts/apply_trigger_fixes.js\n');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const migrations = [
  '20251105000000_fix_vendor_id_column_name.sql',
  '20251105000001_fix_work_item_field_triggers.sql',
  '20251105000002_fix_completed_at_field_name.sql'
];

async function executeSQLDirect(sql) {
  try {
    // Use the REST API directly to execute SQL via the Postgres connection
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      return { error: { message: `HTTP ${response.status}: ${response.statusText}` } };
    }

    return { data: await response.json(), error: null };
  } catch (err) {
    return { error: { message: err.message } };
  }
}

async function applyMigration(migrationFile) {
  console.log(`\n📖 Reading migration: ${migrationFile}`);

  try {
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', migrationFile);
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    console.log(`   SQL size: ${(migrationSQL.length / 1024).toFixed(2)} KB`);

    // Execute the full migration as a single transaction
    console.log(`   ⚙️  Executing migration...`);

    // Try using Supabase SQL editor endpoint
    const { error } = await executeSQLDirect(migrationSQL);

    if (error) {
      console.log(`   ⚠️  Direct execution failed: ${error.message}`);
      console.log(`   💡 Please apply this migration manually via Supabase Dashboard`);
      console.log(`   📋 Go to: https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/sql/new`);
      return false;
    }

    console.log(`   ✅ Migration applied successfully`);
    return true;
  } catch (err) {
    console.error(`   ❌ Error: ${err.message}`);
    return false;
  }
}

async function applyAllMigrations() {
  console.log('🚀 Starting trigger fix migrations...\n');
  console.log('📋 Migrations to apply:');
  migrations.forEach((m, i) => console.log(`   ${i + 1}. ${m}`));

  let successCount = 0;
  let failedMigrations = [];

  for (const migration of migrations) {
    const success = await applyMigration(migration);
    if (success) {
      successCount++;
    } else {
      failedMigrations.push(migration);
    }
  }

  console.log(`\n📊 Results: ${successCount}/${migrations.length} migrations applied\n`);

  if (failedMigrations.length > 0) {
    console.log('⚠️  Failed migrations (apply manually):');
    failedMigrations.forEach(m => console.log(`   - ${m}`));
    console.log('\n📝 Manual application steps:');
    console.log('   1. Go to: https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/sql/new');
    console.log('   2. Copy the SQL from: supabase/migrations/[migration-file]');
    console.log('   3. Paste and click RUN\n');
    process.exit(1);
  }

  console.log('🎉 All migrations completed successfully!\n');
  console.log('✅ Fixed issues:');
  console.log('   ✅ vendor_id → assigned_vendor_id');
  console.log('   ✅ due_date → scheduled_end');
  console.log('   ✅ cost_estimate → estimated_cost');
  console.log('   ✅ completed_at → actual_end');
  console.log('\n🚀 You can now test the Get Ready module - errors should be resolved!\n');
}

// Run the migrations
applyAllMigrations().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
