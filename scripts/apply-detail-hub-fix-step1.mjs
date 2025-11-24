#!/usr/bin/env node

/**
 * Apply Detail Hub Fix - STEP 1
 * Adds 'auto_close' value to detail_hub_punch_method enum
 *
 * IMPORTANT: This script opens the Supabase SQL Editor with the SQL copied to clipboard
 * You need to paste and run it manually because ALTER TYPE ADD VALUE cannot be in a transaction
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const SQL_STEP1 = `-- =====================================================
-- PASO 1: AGREGAR AUTO_CLOSE AL ENUM (SIN TRANSACCIÓN)
-- =====================================================
-- Este comando NO puede estar dentro de BEGIN/COMMIT
-- =====================================================

ALTER TYPE detail_hub_punch_method ADD VALUE IF NOT EXISTS 'auto_close';

-- Verificar
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'detail_hub_punch_method'::regtype
ORDER BY enumsortorder;`;

async function main() {
  console.log('');
  console.log('═'.repeat(60));
  console.log('DETAIL HUB FIX - STEP 1 (MANUAL)');
  console.log('Add "auto_close" to detail_hub_punch_method enum');
  console.log('═'.repeat(60));
  console.log('');

  try {
    // Copy SQL to clipboard
    console.log('📋 Copying SQL to clipboard...');

    // Windows clipboard command
    const clipboardProcess = await execAsync(
      `echo ${SQL_STEP1.replace(/\n/g, '\r\n')} | clip`,
      { shell: 'powershell.exe' }
    );

    console.log('✅ SQL copied to clipboard');
    console.log('');

    // Open SQL Editor
    console.log('🌐 Opening Supabase SQL Editor...');
    const url = 'https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/sql/new';
    await execAsync(`start ${url}`);

    console.log('✅ SQL Editor opened in browser');
    console.log('');
    console.log('═'.repeat(60));
    console.log('NEXT STEPS (MANUAL):');
    console.log('═'.repeat(60));
    console.log('1. Paste the SQL (Ctrl+V) in the SQL Editor');
    console.log('2. Click "RUN" button (or press F5)');
    console.log('3. Verify you see 5 enum values including "auto_close"');
    console.log('4. Run: node scripts/apply-detail-hub-fix-step2.mjs');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('═'.repeat(60));
    console.error('❌ STEP 1 PREPARATION FAILED');
    console.error('═'.repeat(60));
    console.error('');
    console.error('Error:', error.message);
    console.error('');
    console.error('MANUAL INSTRUCTIONS:');
    console.error('1. Open: https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/sql/new');
    console.error('2. Copy and paste this SQL:');
    console.error('');
    console.error(SQL_STEP1);
    console.error('');
    process.exit(1);
  }
}

main();
