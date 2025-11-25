#!/usr/bin/env node
/**
 * Check invoices table using service role
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://swfnnrpzpkdypbrzmgnr.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm5ucnB6cGtkeXBicnptZ25yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzE4Njk2MCwiZXhwIjoyMDcyNzYyOTYwfQ.ud57lvk528bfk8lb-D5CGn2UeN6_fLuEXXwd-CKaYrE';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('🔍 CHECKING INVOICES TABLE (SERVICE ROLE)\n');
console.log('='.repeat(80));

// Check table exists and count rows
console.log('\n📊 Checking invoices table...');
const { count, error: countError } = await supabase
  .from('invoices')
  .select('*', { count: 'exact', head: true });

if (countError) {
  console.log('❌ Error accessing invoices table:', countError.message);
  process.exit(1);
}

console.log(`✅ Invoices table exists`);
console.log(`   Total invoices: ${count}`);

if (count === 0) {
  console.log('\n⚠️  Table is empty - no invoices exist yet');
  console.log('\n💡 Options:');
  console.log('   1. Create test invoice via UI: /reports → Create Invoice');
  console.log('   2. Import sample data if available');
  console.log('   3. Create invoice via API for testing\n');
} else {
  // Get first 5 invoices
  console.log('\n📋 Fetching first 5 invoices...');
  const { data: invoices, error: fetchError } = await supabase
    .from('invoices')
    .select('id, invoice_number, status, is_reinvoice, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (fetchError) {
    console.log('❌ Error fetching invoices:', fetchError.message);
  } else {
    console.log('\n');
    for (const inv of invoices) {
      console.log(`   ${inv.invoice_number}`);
      console.log(`   - ID: ${inv.id}`);
      console.log(`   - Status: ${inv.status}`);
      console.log(`   - Is Re-invoice: ${inv.is_reinvoice || false}`);
      console.log(`   - Created: ${new Date(inv.created_at).toLocaleString()}`);
      console.log('');
    }

    // Check invoice_items for first invoice
    const firstInvoice = invoices[0];
    console.log(`🔍 Checking items for: ${firstInvoice.invoice_number}`);
    const { data: items, error: itemsError } = await supabase
      .from('invoice_items')
      .select('id, description, is_paid, total_amount')
      .eq('invoice_id', firstInvoice.id);

    if (itemsError) {
      console.log('   ❌ Error fetching items:', itemsError.message);
    } else if (!items || items.length === 0) {
      console.log('   ⚠️  No items found');
    } else {
      console.log(`   ✅ Found ${items.length} items`);
      const unpaidItems = items.filter(item => !item.is_paid);
      console.log(`   📌 Unpaid items: ${unpaidItems.length}`);

      if (unpaidItems.length > 0) {
        console.log('\n✅ THIS INVOICE IS TESTABLE!');
        console.log(`   Invoice: ${firstInvoice.invoice_number}`);
        console.log(`   ID: ${firstInvoice.id}`);
        console.log(`   Unpaid Items: ${unpaidItems.length}`);
      } else {
        console.log('\n⚠️  All items are marked as paid');
        console.log('   💡 Uncheck some items in UI to test re-invoice');
      }
    }
  }
}

console.log('\n' + '='.repeat(80));
console.log('✅ CHECK COMPLETE\n');
