#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const supabaseUrl = 'https://swfnnrpzpkdypbrzmgnr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm5ucnB6cGtkeXBicnptZ25yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzE4Njk2MCwiZXhwIjoyMDcyNzYyOTYwfQ.ud57lvk528bfk8lb-D5CGn2UeN6_fLuEXXwd-CKaYrE';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔧 Updating RPC function to include is_paid field...\n');

const sql = readFileSync(
  join(__dirname, '..', 'supabase', 'migrations', '20251124000001_update_rpc_add_is_paid.sql'),
  'utf-8'
);

// Execute the entire SQL as one statement
try {
  // Use raw SQL execution
  const { data, error } = await supabase.rpc('exec_sql', { sql });

  if (error) {
    console.log('⚠️  exec_sql not available, executing via REST API...\n');

    // Alternative: Execute via REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    console.log('✅ RPC function updated successfully!');
  } else {
    console.log('✅ RPC function updated successfully!');
  }
} catch (err) {
  console.error('❌ Error:', err.message);
  console.log('\n📋 Manual execution required:');
  console.log('Copy this SQL to Supabase SQL Editor:');
  console.log('https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/sql/new\n');
  console.log('='.repeat(60));
  console.log(sql);
  console.log('='.repeat(60));
  process.exit(1);
}

console.log('\n🔍 Verifying RPC now includes is_paid...');

const { data: testInvoice } = await supabase
  .from('invoices')
  .select('id')
  .limit(1)
  .single();

if (testInvoice) {
  const { data: testData, error: testError } = await supabase.rpc('get_invoice_items_with_order_info', { p_invoice_id: testInvoice.id });

  if (testError) {
    console.error('❌ Test failed:', testError.message);
  } else if (testData && testData.length > 0) {
    if ('is_paid' in testData[0]) {
      console.log('✅ is_paid field is now included!');
      console.log('Sample:', { id: testData[0].id, is_paid: testData[0].is_paid });
    } else {
      console.log('⚠️  is_paid field still missing.');
    }
  }
}

console.log('\n🎉 Done!');
