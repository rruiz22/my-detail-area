#!/usr/bin/env node
/**
 * Apply invoice item paid status migration - Simplified version
 * Created: 2024-11-24
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🔧 Applying migration: add_invoice_item_paid_status\n');

// Read migration file
const sqlPath = join(__dirname, '..', 'supabase', 'migrations', '20251124000000_add_invoice_item_paid_status.sql');
const sql = readFileSync(sqlPath, 'utf-8');

console.log('📄 SQL to execute:');
console.log('='.repeat(60));
console.log(sql);
console.log('='.repeat(60));

console.log('\n✅ Migration SQL loaded successfully!');
console.log('\n📋 Next steps:');
console.log('1. Open Supabase SQL Editor:');
console.log('   https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/sql/new');
console.log('2. Copy the SQL above');
console.log('3. Paste and execute in SQL Editor');
console.log('4. Verify the column was added: SELECT * FROM invoice_items LIMIT 1;');
