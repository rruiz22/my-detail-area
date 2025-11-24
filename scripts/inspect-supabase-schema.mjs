#!/usr/bin/env node
/**
 * Inspect Supabase schema and structure
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://swfnnrpzpkdypbrzmgnr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm5ucnB6cGtkeXBicnptZ25yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzE4Njk2MCwiZXhwIjoyMDcyNzYyOTYwfQ.ud57lvk528bfk8lb-D5CGn2UeN6_fLuEXXwd-CKaYrE';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 SUPABASE SCHEMA INSPECTION\n');
console.log('Project:', 'swfnnrpzpkdypbrzmgnr');
console.log('URL:', supabaseUrl);
console.log('='.repeat(80));

// 1. Check invoices table structure
console.log('\n📋 1. INVOICES TABLE');
console.log('-'.repeat(80));
try {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error:', error.message);
  } else if (data && data.length > 0) {
    console.log('✅ Table exists');
    console.log('Columns:', Object.keys(data[0]).join(', '));
    console.log('\nSample record:');
    console.log(JSON.stringify(data[0], null, 2));
  } else {
    console.log('⚠️  Table is empty');
  }
} catch (err) {
  console.error('❌ Exception:', err.message);
}

// 2. Check invoice_items table structure
console.log('\n📋 2. INVOICE_ITEMS TABLE');
console.log('-'.repeat(80));
try {
  const { data, error } = await supabase
    .from('invoice_items')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error:', error.message);
  } else if (data && data.length > 0) {
    console.log('✅ Table exists');
    console.log('Columns:', Object.keys(data[0]).join(', '));
    console.log('\nSample record:');
    console.log(JSON.stringify(data[0], null, 2));

    // Check if is_paid exists
    if ('is_paid' in data[0]) {
      console.log('\n✅ ✅ ✅ is_paid column EXISTS!');
      console.log('   Value:', data[0].is_paid);
    } else {
      console.log('\n❌ ❌ ❌ is_paid column MISSING!');
    }
  } else {
    console.log('⚠️  Table is empty');
  }
} catch (err) {
  console.error('❌ Exception:', err.message);
}

// 3. Test RPC function
console.log('\n📋 3. RPC FUNCTION: get_invoice_items_with_order_info');
console.log('-'.repeat(80));
try {
  // First get a real invoice ID
  const { data: invoiceData } = await supabase
    .from('invoices')
    .select('id')
    .limit(1)
    .single();

  if (invoiceData) {
    console.log('Testing with invoice ID:', invoiceData.id);

    const { data, error } = await supabase
      .rpc('get_invoice_items_with_order_info', { p_invoice_id: invoiceData.id });

    if (error) {
      console.error('❌ RPC Error:', error.message);
    } else if (data && data.length > 0) {
      console.log('✅ RPC function exists and works');
      console.log('Returns', data.length, 'items');
      console.log('\nColumns returned:', Object.keys(data[0]).join(', '));

      // Check if is_paid is in the result
      if ('is_paid' in data[0]) {
        console.log('\n✅ ✅ ✅ is_paid field IS INCLUDED in RPC result!');
        console.log('   Value:', data[0].is_paid);
      } else {
        console.log('\n❌ ❌ ❌ is_paid field NOT INCLUDED in RPC result!');
        console.log('\n🔧 ACTION REQUIRED: Execute the DROP/CREATE SQL for the RPC function');
      }

      console.log('\nSample RPC result:');
      console.log(JSON.stringify(data[0], null, 2));
    } else {
      console.log('⚠️  RPC returned no items (invoice might be empty)');
    }
  }
} catch (err) {
  console.error('❌ Exception:', err.message);
}

// 4. Check PostgreSQL version and extensions
console.log('\n📋 4. DATABASE INFO');
console.log('-'.repeat(80));
try {
  // Try to get some system info
  const { data: tablesData, error: tablesError } = await supabase
    .from('invoice_items')
    .select('id')
    .limit(1);

  if (!tablesError) {
    console.log('✅ Database connection: OK');
    console.log('✅ Authentication: OK');
    console.log('✅ Service role: Working');
  }
} catch (err) {
  console.error('❌ Database connection issue:', err.message);
}

console.log('\n' + '='.repeat(80));
console.log('🎉 INSPECTION COMPLETE!\n');
