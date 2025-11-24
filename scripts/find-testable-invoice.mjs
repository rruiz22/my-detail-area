#!/usr/bin/env node
/**
 * Find an invoice suitable for re-invoice testing
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://swfnnrpzpkdypbrzmgnr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm5ucnB6cGtkeXBicnptZ25yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxODY5NjAsImV4cCI6MjA3Mjc2Mjk2MH0.HA7ujjknDa-97z-vC-vOZJm5rQ7PYXqn--rdiZoPXcY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🔍 FINDING TESTABLE INVOICES\n');
console.log('='.repeat(80));

// Get all invoices
console.log('\n📝 Fetching invoices...');
const { data: invoices, error: invoicesError } = await supabase
  .from('invoices')
  .select('id, invoice_number, is_reinvoice, parent_invoice_id')
  .order('created_at', { ascending: false })
  .limit(20);

if (invoicesError) {
  console.log('❌ Error fetching invoices:', invoicesError.message);
  process.exit(1);
}

console.log(`✅ Found ${invoices.length} recent invoices\n`);

// Check each invoice for unpaid items
console.log('🔍 Checking each invoice for unpaid items...\n');

let foundTestable = false;

for (const invoice of invoices) {
  // Get invoice items
  const { data: items, error: itemsError } = await supabase
    .from('invoice_items')
    .select('id, is_paid, total_amount')
    .eq('invoice_id', invoice.id);

  if (itemsError) {
    console.log(`⚠️  ${invoice.invoice_number}: Error fetching items`);
    continue;
  }

  if (!items || items.length === 0) {
    console.log(`⚠️  ${invoice.invoice_number}: No items found`);
    continue;
  }

  const unpaidItems = items.filter(item => !item.is_paid);
  const unpaidCount = unpaidItems.length;
  const totalItems = items.length;

  // Check if this invoice is suitable for re-invoicing
  const isReinvoice = invoice.is_reinvoice || false;
  const isSuitable = !isReinvoice && unpaidCount > 0;

  const status = isSuitable ? '✅ TESTABLE' : '⚠️  Not suitable';
  const reasons = [];

  if (isReinvoice) reasons.push('is a re-invoice');
  if (unpaidCount === 0) reasons.push('all items paid');
  if (totalItems === 0) reasons.push('no items');

  console.log(`${status} ${invoice.invoice_number}`);
  console.log(`   Items: ${unpaidCount} unpaid / ${totalItems} total`);
  if (reasons.length > 0) {
    console.log(`   Reason: ${reasons.join(', ')}`);
  }

  if (isSuitable && !foundTestable) {
    foundTestable = true;
    const unpaidTotal = unpaidItems.reduce((sum, item) => sum + (item.total_amount || 0), 0);
    console.log(`\n✅ USE THIS INVOICE FOR TESTING:`);
    console.log(`   Invoice Number: ${invoice.invoice_number}`);
    console.log(`   Invoice ID: ${invoice.id}`);
    console.log(`   Unpaid Items: ${unpaidCount}`);
    console.log(`   Unpaid Amount: $${unpaidTotal.toFixed(2)}\n`);
  }

  console.log('');
}

if (!foundTestable) {
  console.log('\n❌ No testable invoices found!');
  console.log('   All invoices either:');
  console.log('   - Have all items marked as paid');
  console.log('   - Are already re-invoices');
  console.log('   - Have no items');
  console.log('\n💡 Solution: Uncheck some items in an invoice to create unpaid items\n');
}

console.log('='.repeat(80));
console.log('✅ SEARCH COMPLETE\n');
