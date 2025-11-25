#!/usr/bin/env node
/**
 * Create exec_sql helper function for programmatic SQL execution
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://swfnnrpzpkdypbrzmgnr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm5ucnB6cGtkeXBicnptZ25yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzE4Njk2MCwiZXhwIjoyMDcyNzYyOTYwfQ.ud57lvk528bfk8lb-D5CGn2UeN6_fLuEXXwd-CKaYrE';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔧 Creating exec_sql function...\n');

// Create the exec_sql function using direct SQL via REST API
const createFunctionSQL = `
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;
`;

try {
  // Use fetch to call the Supabase REST API directly
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ sql: createFunctionSQL })
  });

  if (!response.ok) {
    // If exec_sql doesn't exist yet, we need another way
    console.log('⚠️  exec_sql function does not exist yet');
    console.log('📝 SQL to create it:');
    console.log('='.repeat(60));
    console.log(createFunctionSQL);
    console.log('='.repeat(60));
    console.log('\n❌ Cannot proceed - need to bootstrap exec_sql function first');
    console.log('\n💡 SOLUTION: Use Supabase SQL Editor to create this function');
    console.log('   https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/sql/new');
  } else {
    console.log('✅ exec_sql function created successfully!');
  }
} catch (err) {
  console.error('❌ Error:', err.message);
}
