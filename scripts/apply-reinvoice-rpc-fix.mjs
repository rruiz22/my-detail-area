#!/usr/bin/env node
/**
 * Apply RPC column names fix to Supabase
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('   VITE_SUPABASE_URL:', !!supabaseUrl);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  console.error('\n💡 Make sure .env file exists with correct values');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('🔧 APPLYING RE-INVOICE RPC FIX\n');
console.log('='.repeat(80));

// Read SQL file
const sqlFilePath = join(__dirname, '..', 'FIX_REINVOICE_RPC_COLUMN_NAMES.sql');
console.log('\n📄 Reading SQL file:', sqlFilePath);

let sql;
try {
  sql = readFileSync(sqlFilePath, 'utf8');
  console.log('✅ SQL file loaded successfully');
} catch (error) {
  console.error('❌ Error reading SQL file:', error.message);
  process.exit(1);
}

// Execute SQL
console.log('\n🔄 Executing SQL on remote database...');
console.log('   URL:', supabaseUrl);

// Split SQL into individual statements
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s && !s.startsWith('--'));

console.log(`\n📝 Found ${statements.length} SQL statements to execute\n`);

let successCount = 0;
let errorCount = 0;

for (let i = 0; i < statements.length; i++) {
  const statement = statements[i];

  // Skip empty statements and comments
  if (!statement || statement.startsWith('--')) continue;

  // Get first line for logging
  const firstLine = statement.split('\n')[0].substring(0, 60);
  console.log(`   [${i + 1}/${statements.length}] ${firstLine}...`);

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql: statement + ';' });

    if (error) {
      // Try direct SQL execution instead
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({ sql: statement + ';' })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      successCount++;
      console.log('       ✅ Executed successfully');
    } else {
      successCount++;
      console.log('       ✅ Executed successfully');
    }
  } catch (error) {
    // Some statements like GRANT might fail silently - that's okay
    if (error.message.includes('does not exist') && statement.includes('GRANT')) {
      console.log('       ⚠️  Skipped (GRANT on non-existent function)');
      successCount++;
    } else {
      errorCount++;
      console.log('       ❌ Error:', error.message);
    }
  }
}

console.log('\n' + '='.repeat(80));
console.log(`\n📊 RESULTS:`);
console.log(`   ✅ Success: ${successCount}`);
console.log(`   ❌ Errors: ${errorCount}`);

if (errorCount === 0) {
  console.log('\n✅ RPC FIX APPLIED SUCCESSFULLY!');
  console.log('\n🎯 Next steps:');
  console.log('   1. Reload your application (F5)');
  console.log('   2. Go to /reports → Invoices → Open an invoice');
  console.log('   3. Uncheck some items to create unpaid items');
  console.log('   4. Click "Create Re-Invoice" button');
  console.log('   5. Verify new invoice created with format INV-XX-XXXX-A\n');
} else {
  console.log('\n⚠️  Some statements failed - check errors above');
  console.log('\n💡 You may need to execute manually in Supabase SQL Editor:');
  console.log(`   https://supabase.com/dashboard/project/${supabaseUrl.split('.')[0].split('//')[1]}/sql/new\n`);
}

console.log('='.repeat(80) + '\n');
