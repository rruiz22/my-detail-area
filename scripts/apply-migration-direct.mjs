#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

// Hardcoded credentials (from .env)
const supabaseUrl = 'https://swfnnrpzpkdypbrzmgnr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm5ucnB6cGtkeXBicnptZ25yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzE4Njk2MCwiZXhwIjoyMDcyNzYyOTYwfQ.ud57lvk528bfk8lb-D5CGn2UeN6_fLuEXXwd-CKaYrE';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔧 Applying migration...\n');

const statements = [
  `ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE`,
  `CREATE INDEX IF NOT EXISTS idx_invoice_items_is_paid ON public.invoice_items(invoice_id, is_paid)`,
  `CREATE INDEX IF NOT EXISTS idx_invoice_items_unpaid ON public.invoice_items(is_paid) WHERE is_paid = FALSE`
];

for (let i = 0; i < statements.length; i++) {
  console.log(`[${i + 1}/${statements.length}] ${statements[i].substring(0, 60)}...`);

  try {
    const { error } = await supabase.rpc('exec_sql', { sql: statements[i] });

    if (error) {
      console.error(`   ❌ Error: ${error.message}`);
    } else {
      console.log(`   ✅ Success`);
    }
  } catch (err) {
    console.error(`   ❌ Exception: ${err.message}`);
  }
}

console.log('\n✅ Migration completed!');
console.log('Verifying...\n');

// Verify
try {
  const { data, error } = await supabase
    .from('invoice_items')
    .select('id, is_paid')
    .limit(1);

  if (error) {
    console.error('❌ Verification failed:', error.message);
  } else {
    console.log('✅ Verification successful!');
    console.log('Sample data:', data);
  }
} catch (err) {
  console.error('❌ Verification exception:', err.message);
}
