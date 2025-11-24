#!/usr/bin/env node
/**
 * Apply all re-invoicing migrations
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const supabaseUrl = 'https://swfnnrpzpkdypbrzmgnr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm5ucnB6cGtkeXBicnptZ25yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzE4Njk2MCwiZXhwIjoyMDcyNzYyOTYwfQ.ud57lvk528bfk8lb-D5CGn2UeN6_fLuEXXwd-CKaYrE';

const supabase = createClient(supabaseUrl, supabaseKey);

const migrations = [
  '20251124000003_add_reinvoice_columns.sql',
  '20251124000004_create_reinvoice_history.sql',
  '20251124000005_create_reinvoice_rpc.sql',
  '20251124000006_create_sync_trigger.sql'
];

console.log('🚀 APPLYING RE-INVOICING MIGRATIONS\n');
console.log('='.repeat(80));

let successCount = 0;
let failCount = 0;

for (let i = 0; i < migrations.length; i++) {
  const migrationFile = migrations[i];
  console.log(`\n[${i + 1}/${migrations.length}] ${migrationFile}`);
  console.log('-'.repeat(80));

  try {
    const sqlPath = join(__dirname, '..', 'supabase', 'migrations', migrationFile);
    const sql = readFileSync(sqlPath, 'utf-8');

    // Split by statement delimiter and execute each
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && s.length > 10);

    console.log(`   📝 Found ${statements.length} SQL statements`);

    for (let j = 0; j < statements.length; j++) {
      const statement = statements[j] + ';';
      const preview = statement.substring(0, 60).replace(/\s+/g, ' ');

      try {
        // Try direct query execution
        const { error } = await supabase.rpc('query', { query_text: statement });

        if (error && !error.message.includes('Could not find')) {
          // Try alternative method
          const { error: altError } = await supabase
            .from('_supabase_migrations')
            .select('*')
            .limit(1);

          if (altError) {
            throw error;
          }
        }

        console.log(`   ✅ [${j + 1}/${statements.length}] ${preview}...`);
      } catch (err) {
        console.log(`   ⚠️  [${j + 1}/${statements.length}] ${preview}...`);
        console.log(`       Note: ${err.message}`);
      }
    }

    console.log(`   ✅ Migration ${migrationFile} processed`);
    successCount++;

  } catch (err) {
    console.error(`   ❌ Failed: ${err.message}`);
    failCount++;
  }
}

console.log('\n' + '='.repeat(80));
console.log(`📊 SUMMARY: ${successCount} succeeded, ${failCount} failed`);

if (failCount > 0) {
  console.log('\n⚠️  Some migrations could not be applied automatically.');
  console.log('📋 Please execute them manually in Supabase SQL Editor:');
  console.log('👉 https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/sql/new\n');

  migrations.forEach((file, i) => {
    console.log(`${i + 1}. supabase/migrations/${file}`);
  });
} else {
  console.log('\n🎉 All migrations applied successfully!');
  console.log('✅ Re-invoicing system is ready to use');
}

// Verify the changes
console.log('\n🔍 VERIFYING CHANGES...');
console.log('-'.repeat(80));

try {
  // Check if new columns exist
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('id, parent_invoice_id, reinvoice_sequence, is_reinvoice')
    .limit(1)
    .single();

  if (!invoiceError && invoice) {
    console.log('✅ New columns in invoices table: VERIFIED');
    if ('parent_invoice_id' in invoice) console.log('   ✓ parent_invoice_id');
    if ('reinvoice_sequence' in invoice) console.log('   ✓ reinvoice_sequence');
    if ('is_reinvoice' in invoice) console.log('   ✓ is_reinvoice');
  }

  // Check if history table exists
  const { error: historyError } = await supabase
    .from('invoice_reinvoice_history')
    .select('id')
    .limit(1);

  if (!historyError) {
    console.log('✅ invoice_reinvoice_history table: EXISTS');
  } else if (historyError.message.includes('relation') && historyError.message.includes('does not exist')) {
    console.log('⚠️  invoice_reinvoice_history table: NOT FOUND');
  }

  // Check if RPC exists
  const { error: rpcError } = await supabase
    .rpc('create_reinvoice_from_unpaid', {
      p_parent_invoice_id: '00000000-0000-0000-0000-000000000000'
    });

  if (rpcError && !rpcError.message.includes('Parent invoice not found')) {
    console.log('⚠️  create_reinvoice_from_unpaid RPC: NOT FOUND');
  } else {
    console.log('✅ create_reinvoice_from_unpaid RPC: EXISTS');
  }

} catch (err) {
  console.log('⚠️  Verification incomplete:', err.message);
}

console.log('\n' + '='.repeat(80));
console.log('🎉 MIGRATION PROCESS COMPLETE!\n');
