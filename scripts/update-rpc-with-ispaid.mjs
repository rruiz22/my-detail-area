#!/usr/bin/env node
/**
 * Update get_invoice_items_with_order_info RPC to include is_paid
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://swfnnrpzpkdypbrzmgnr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm5ucnB6cGtkeXBicnptZ25yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzE4Njk2MCwiZXhwIjoyMDcyNzYyOTYwfQ.ud57lvk528bfk8lb-D5CGn2UeN6_fLuEXXwd-CKaYrE';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Checking if get_invoice_items_with_order_info RPC exists...\n');

// Test if RPC exists
try {
  const { data, error } = await supabase.rpc('get_invoice_items_with_order_info', { p_invoice_id: '00000000-0000-0000-0000-000000000000' });

  if (error && error.message.includes('Could not find')) {
    console.log('⚠️  RPC does not exist. It might be using direct query instead.');
    console.log('✅ No action needed - the direct query will include is_paid automatically.\n');
  } else {
    console.log('✅ RPC exists. Checking if it includes is_paid field...\n');

    // Get actual invoice to test
    const { data: testInvoice } = await supabase
      .from('invoices')
      .select('id')
      .limit(1)
      .single();

    if (testInvoice) {
      const { data: testData } = await supabase.rpc('get_invoice_items_with_order_info', { p_invoice_id: testInvoice.id });

      if (testData && testData.length > 0) {
        console.log('Sample RPC result:', JSON.stringify(testData[0], null, 2));

        if ('is_paid' in testData[0]) {
          console.log('\n✅ is_paid field is already included!');
        } else {
          console.log('\n⚠️  is_paid field is missing from RPC result.');
          console.log('The RPC function needs to be updated to include is_paid in its SELECT statement.');
        }
      }
    }
  }
} catch (err) {
  console.error('Error:', err.message);
}

console.log('\n📋 Testing direct query with is_paid...');

const { data: directData, error: directError } = await supabase
  .from('invoice_items')
  .select('id, invoice_id, description, is_paid')
  .limit(3);

if (directError) {
  console.error('❌ Error:', directError.message);
} else {
  console.log('✅ Direct query successful!');
  console.log('Sample data:', JSON.stringify(directData, null, 2));
}

console.log('\n✅ Done!');
