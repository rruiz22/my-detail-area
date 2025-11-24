#!/usr/bin/env node
/**
 * Test re-invoice RPC function
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env
const envPath = join(__dirname, '..', '.env');
const envContent = readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL || 'https://swfnnrpzpkdypbrzmgnr.supabase.co';
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('❌ VITE_SUPABASE_ANON_KEY not found in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 TESTING RE-INVOICE RPC FUNCTION\n');
console.log('='.repeat(80));

// Test 1: Check if RPC exists by calling with invalid UUID
console.log('\n📝 Test 1: Checking if RPC exists...');
const { data: testData, error: testError } = await supabase
  .rpc('create_reinvoice_from_unpaid', {
    p_parent_invoice_id: '00000000-0000-0000-0000-000000000000'
  });

if (testError) {
  if (testError.message.includes('Could not find') || testError.message.includes('does not exist')) {
    console.log('❌ RPC function does NOT exist');
    console.log('   Error:', testError.message);
    console.log('\n💡 Solution: Execute the SQL in Supabase SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/sql/new');
    console.log('   File: EXECUTE_THIS_IN_SUPABASE_SQL_EDITOR.sql\n');
    process.exit(1);
  } else if (testError.message.includes('Parent invoice not found')) {
    console.log('✅ RPC function EXISTS (expected error for invalid UUID)');
  } else {
    console.log('⚠️  Unexpected error:', testError.message);
  }
} else {
  console.log('✅ RPC function executed (unexpected success)');
}

// Test 2: Check if table exists
console.log('\n📝 Test 2: Checking if invoice_reinvoice_history table exists...');
const { data: historyData, error: historyError } = await supabase
  .from('invoice_reinvoice_history')
  .select('id')
  .limit(1);

if (historyError) {
  if (historyError.message.includes('relation') && historyError.message.includes('does not exist')) {
    console.log('❌ Table invoice_reinvoice_history does NOT exist');
  } else {
    console.log('⚠️  Error accessing table:', historyError.message);
  }
} else {
  console.log('✅ Table invoice_reinvoice_history exists');
}

// Test 3: Check if columns exist in invoices table
console.log('\n📝 Test 3: Checking if re-invoice columns exist in invoices table...');
const { data: invoiceData, error: invoiceError } = await supabase
  .from('invoices')
  .select('id, parent_invoice_id, reinvoice_sequence, is_reinvoice, original_invoice_id')
  .limit(1)
  .single();

if (invoiceError) {
  if (invoiceError.message.includes('column') && invoiceError.message.includes('does not exist')) {
    console.log('❌ Re-invoice columns do NOT exist in invoices table');
    console.log('   Error:', invoiceError.message);
  } else {
    console.log('⚠️  Error:', invoiceError.message);
  }
} else {
  console.log('✅ All re-invoice columns exist in invoices table');
  if ('parent_invoice_id' in invoiceData) console.log('   ✓ parent_invoice_id');
  if ('reinvoice_sequence' in invoiceData) console.log('   ✓ reinvoice_sequence');
  if ('is_reinvoice' in invoiceData) console.log('   ✓ is_reinvoice');
  if ('original_invoice_id' in invoiceData) console.log('   ✓ original_invoice_id');
}

// Test 4: Find an invoice with unpaid items
console.log('\n📝 Test 4: Finding an invoice with unpaid items for testing...');
const { data: invoices, error: findError } = await supabase
  .from('invoices')
  .select('id, invoice_number')
  .limit(10);

if (findError) {
  console.log('❌ Error finding invoices:', findError.message);
} else if (!invoices || invoices.length === 0) {
  console.log('⚠️  No invoices found in database');
} else {
  console.log(`✅ Found ${invoices.length} invoices`);

  // Check first invoice for unpaid items
  const testInvoice = invoices[0];
  const { data: items, error: itemsError } = await supabase
    .from('invoice_items')
    .select('id, is_paid, total_amount')
    .eq('invoice_id', testInvoice.id);

  if (!itemsError && items) {
    const unpaidItems = items.filter(item => !item.is_paid);
    console.log(`   Invoice ${testInvoice.invoice_number}: ${unpaidItems.length} unpaid items of ${items.length} total`);

    if (unpaidItems.length > 0) {
      console.log('\n🧪 You can test creating a re-invoice with this invoice ID:');
      console.log(`   ${testInvoice.id}`);
    }
  }
}

console.log('\n' + '='.repeat(80));
console.log('✅ DIAGNOSTIC COMPLETE\n');
