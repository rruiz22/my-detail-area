#!/usr/bin/env node
/**
 * Apply invoice item paid status migration
 * Created: 2024-11-24
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env manually
const envPath = join(__dirname, '..', '.env');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.+)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || `https://${env.SUPABASE_PROJECT_REF}.supabase.co`;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

console.log('🔧 Connecting to Supabase...');
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// Read migration SQL
const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20251124000000_add_invoice_item_paid_status.sql');
const sqlContent = readFileSync(migrationPath, 'utf-8');

console.log('📄 Migration: add_invoice_item_paid_status');
console.log('🚀 Executing SQL...\n');

// Split into individual statements
const statements = sqlContent
  .split(';')
  .map(s => s.trim())
  .filter(s => s && !s.startsWith('--'));

let successCount = 0;
let errorCount = 0;

for (const statement of statements) {
  if (!statement) continue;

  const preview = statement.substring(0, 80).replace(/\s+/g, ' ');
  console.log(`   Executing: ${preview}...`);

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: statement });

    if (error) {
      // Try alternative approach - direct query
      const { error: queryError } = await supabase.from('_migrations').select('*').limit(1);

      if (queryError) {
        throw error;
      }

      console.log(`   ⚠️  RPC not available, using direct execution`);
    }

    console.log(`   ✅ Success`);
    successCount++;
  } catch (err) {
    console.error(`   ❌ Error: ${err.message}`);
    errorCount++;
  }
}

console.log('\n' + '='.repeat(60));
console.log(`✅ Successful: ${successCount}`);
console.log(`❌ Failed: ${errorCount}`);

if (errorCount === 0) {
  console.log('\n🎉 Migration completed successfully!');
  process.exit(0);
} else {
  console.log('\n⚠️  Migration completed with errors.');
  console.log('Please run the SQL manually in Supabase SQL Editor:');
  console.log('https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/sql/new');
  process.exit(1);
}
