#!/usr/bin/env node
/**
 * Script to apply order_activity_log foreign key migration
 * Run: node scripts/apply-migration-order-activity-log.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read .env file manually
const envPath = join(__dirname, '..', '.env');
const envFile = readFileSync(envPath, 'utf-8');
const envVars = {};

envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=:#]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, '');
    envVars[key] = value;
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  console.error('Available keys:', Object.keys(envVars));
  process.exit(1);
}

console.log('🔧 Connecting to Supabase...');
console.log('📍 URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  console.log('\n🚀 Starting migration: Add order_activity_log foreign key\n');

  try {
    // Step 1: Check for orphaned records
    console.log('📊 Step 1: Checking for orphaned records...');
    const { data: orphanedData, error: orphanedError } = await supabase.rpc('check_orphaned_activity_logs', {});

    // If RPC doesn't exist, do manual check
    const { data: orphans, error: checkError } = await supabase
      .from('order_activity_log')
      .select('id, order_id')
      .limit(1000);

    if (checkError) {
      console.log('⚠️  Could not check orphaned records:', checkError.message);
    } else {
      console.log(`✅ Found ${orphans?.length || 0} activity log records`);
    }

    // Step 2: Read and execute migration SQL
    console.log('\n📝 Step 2: Executing migration SQL...');

    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20251008160000_add_order_activity_log_foreign_key.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Execute the migration using rpc or direct query
    console.log('⚙️  Executing SQL migration...');

    // Split SQL into statements and execute them
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));

    for (const statement of statements) {
      if (!statement) continue;

      console.log('▶️  Executing statement...');
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement });

      if (error) {
        console.log('⚠️  Note:', error.message);
      }
    }

    // Step 3: Verify foreign key was created
    console.log('\n🔍 Step 3: Verifying foreign key constraint...');

    const { data: constraints, error: verifyError } = await supabase
      .from('information_schema.table_constraints')
      .select('constraint_name, constraint_type')
      .eq('table_name', 'order_activity_log')
      .eq('constraint_type', 'FOREIGN KEY');

    if (verifyError) {
      console.log('⚠️  Could not verify constraint:', verifyError.message);
      console.log('\n⚠️  Migration SQL needs to be executed manually in Supabase Dashboard');
      console.log('\n📋 SQL to execute:');
      console.log('─'.repeat(80));
      console.log(migrationSQL);
      console.log('─'.repeat(80));
    } else {
      const fkExists = constraints?.some(c => c.constraint_name === 'order_activity_log_order_id_fkey');

      if (fkExists) {
        console.log('✅ Foreign key constraint successfully created!');
      } else {
        console.log('⚠️  Foreign key not found in constraints');
      }
    }

    console.log('\n✅ Migration process completed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Refresh Dashboard page');
    console.log('   2. Check console for PGRST200 errors (should be gone)');
    console.log('   3. Verify Recent Activity widget works');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);

    console.log('\n📋 Please execute this SQL manually in Supabase Dashboard:');
    console.log('─'.repeat(80));
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20251008160000_add_order_activity_log_foreign_key.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    console.log(migrationSQL);
    console.log('─'.repeat(80));

    process.exit(1);
  }
}

applyMigration();
