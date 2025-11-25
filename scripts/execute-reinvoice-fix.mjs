#!/usr/bin/env node
/**
 * Execute FIX_REINVOICE_RPC_COLUMN_NAMES.sql on Supabase
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Hardcoded credentials for quick execution
const supabaseUrl = 'https://swfnnrpzpkdypbrzmgnr.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm5ucnB6cGtkeXBicnptZ25yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzE4Njk2MCwiZXhwIjoyMDcyNzYyOTYwfQ.ud57lvk528bfk8lb-D5CGn2UeN6_fLuEXXwd-CKaYrE';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('🔧 EXECUTING RE-INVOICE RPC FIX\n');
console.log('='.repeat(80));

// Read SQL file
const sqlFilePath = join(__dirname, '..', 'FIX_REINVOICE_RPC_COLUMN_NAMES.sql');
console.log('\n📄 Reading SQL file:', sqlFilePath);

let sql;
try {
  sql = readFileSync(sqlFilePath, 'utf8');
  console.log('✅ SQL file loaded successfully');
  console.log(`   File size: ${sql.length} bytes`);
} catch (error) {
  console.error('❌ Error reading SQL file:', error.message);
  process.exit(1);
}

// Execute SQL using Supabase REST API directly
console.log('\n🔄 Executing SQL on remote database...');
console.log('   URL:', supabaseUrl);

// Use fetch to call Supabase's SQL endpoint
const executeSQL = async (sqlContent) => {
  try {
    // Try using the Supabase Management API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        query: sqlContent
      })
    });

    return { response, method: 'exec_sql' };
  } catch (error) {
    // Fallback: try direct execution via pg_net or other method
    console.log('   ⚠️  exec_sql not available, trying alternative...');
    return { error: error.message, method: 'fallback' };
  }
};

try {
  const { response, error, method } = await executeSQL(sql);

  if (error) {
    console.log('\n❌ Execution failed with direct method');
    console.log('   Error:', error);
    console.log('\n💡 Alternative: Execute manually in Supabase SQL Editor');
    console.log('   URL: https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/sql/new');
    console.log('\n📋 Steps:');
    console.log('   1. Copy contents of: FIX_REINVOICE_RPC_COLUMN_NAMES.sql');
    console.log('   2. Paste into SQL Editor');
    console.log('   3. Click "Run"');
    process.exit(1);
  }

  if (response) {
    console.log(`\n   Method used: ${method}`);
    console.log(`   Status: ${response.status} ${response.statusText}`);

    const responseText = await response.text();

    if (response.ok) {
      console.log('\n✅ SQL EXECUTED SUCCESSFULLY!');
      if (responseText) {
        console.log('\n📊 Response:', responseText);
      }
    } else {
      console.log('\n❌ Execution failed');
      console.log('   Response:', responseText);

      // Check if it's just because exec_sql doesn't exist
      if (responseText.includes('function') && responseText.includes('does not exist')) {
        console.log('\n⚠️  The exec_sql RPC function is not available in this Supabase project');
        console.log('   This is normal - not all projects have this utility function');
      }

      console.log('\n💡 SOLUTION: Execute manually in Supabase SQL Editor');
      console.log('   URL: https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/sql/new');
      console.log('\n📋 The SQL has been corrected and is ready to paste');
      process.exit(1);
    }
  }
} catch (error) {
  console.error('\n❌ Unexpected error:', error.message);
  console.log('\n💡 FALLBACK: Execute manually in Supabase SQL Editor');
  console.log('   URL: https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/sql/new');
  process.exit(1);
}

// Verify the function was created
console.log('\n🔍 Verifying RPC function...');

try {
  const { data, error } = await supabase
    .rpc('create_reinvoice_from_unpaid', {
      p_parent_invoice_id: '00000000-0000-0000-0000-000000000000'
    });

  if (error) {
    if (error.message.includes('Parent invoice not found')) {
      console.log('✅ RPC function exists and is callable!');
      console.log('   (Expected error for invalid UUID)');
    } else if (error.code === '42883') {
      console.log('❌ RPC function does not exist yet');
      console.log('   The SQL may not have executed successfully');
    } else {
      console.log('⚠️  Function exists but returned unexpected error:');
      console.log('   ', error.message);
    }
  } else {
    console.log('✅ RPC function executed (unexpected success)');
  }
} catch (verifyError) {
  console.log('⚠️  Could not verify function:', verifyError.message);
}

console.log('\n' + '='.repeat(80));
console.log('\n🎯 NEXT STEPS:\n');
console.log('1. Run: node scripts/test-reinvoice-quick.mjs');
console.log('2. Test in UI: Open invoice → Uncheck items → Create Re-Invoice');
console.log('3. Verify: New invoice has format INV-XX-XXXX-A');
console.log('4. Test sync: Mark items paid in child → Check parent updates\n');
console.log('='.repeat(80) + '\n');
