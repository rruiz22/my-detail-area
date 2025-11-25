#!/usr/bin/env node
/**
 * Test script to prove Claude can apply migrations programmatically
 * Created: 2025-11-24
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Hardcoded credentials (from .env)
const supabaseUrl = 'https://swfnnrpzpkdypbrzmgnr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm5ucnB6cGtkeXBicnptZ25yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzE4Njk2MCwiZXhwIjoyMDcyNzYyOTYwfQ.ud57lvk528bfk8lb-D5CGn2UeN6_fLuEXXwd-CKaYrE';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🤖 Claude Migration Test - Applying migration programmatically\n');

// Read the migration file
const sqlPath = join(__dirname, '..', 'supabase', 'migrations', '20251125013919_test_claude_can_apply_migrations.sql');
const fullSql = readFileSync(sqlPath, 'utf-8');

// Split into individual statements (simple split on semicolon, filter out comments)
const statements = fullSql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log(`📋 Executing ${statements.length} SQL statements...\n`);

let successCount = 0;
let errorCount = 0;

for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i];
  const preview = stmt.substring(0, 80).replace(/\n/g, ' ');

  console.log(`[${i + 1}/${statements.length}] ${preview}...`);

  try {
    // Execute using Supabase client
    const { data, error } = await supabase.rpc('exec_sql', { sql: stmt });

    if (error) {
      console.error(`   ❌ Error: ${error.message}`);
      errorCount++;
    } else {
      console.log(`   ✅ Success`);
      successCount++;
    }
  } catch (err) {
    console.error(`   ❌ Exception: ${err.message}`);
    errorCount++;
  }
}

console.log('\n' + '='.repeat(60));
console.log(`📊 Results: ${successCount} successful, ${errorCount} errors`);
console.log('='.repeat(60));

if (errorCount === 0) {
  console.log('\n🎉 SUCCESS! Claude applied the migration programmatically!');
  console.log('✅ No need for manual SQL Editor copy-paste');
} else {
  console.log('\n⚠️  Some errors occurred, but Claude attempted programmatic execution');
}
