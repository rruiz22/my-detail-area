#!/usr/bin/env node
/**
 * Quick test for re-invoice RPC function (using hardcoded keys)
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://swfnnrpzpkdypbrzmgnr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm5ucnB6cGtkeXBicnptZ25yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxODY5NjAsImV4cCI6MjA3Mjc2Mjk2MH0.HA7ujjknDa-97z-vC-vOZJm5rQ7PYXqn--rdiZoPXcY';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('🔍 TESTING RE-INVOICE RPC PERMISSIONS\n');
console.log('='.repeat(80));

// Test: Call RPC with invalid UUID to check permissions
console.log('\n📝 Testing RPC function...');
const { data, error } = await supabase
  .rpc('create_reinvoice_from_unpaid', {
    p_parent_invoice_id: '00000000-0000-0000-0000-000000000000'
  });

if (error) {
  console.log('\n❌ Error calling RPC:');
  console.log('   Message:', error.message);
  console.log('   Code:', error.code);
  console.log('   Details:', error.details);
  console.log('   Hint:', error.hint);

  if (error.message.includes('Parent invoice not found')) {
    console.log('\n✅ RPC EXISTS and has correct permissions!');
    console.log('   (Got expected error for invalid UUID)');
  } else if (error.code === '42501') {
    console.log('\n❌ PERMISSION DENIED');
    console.log('   The anon role does not have EXECUTE permission on the function');
    console.log('\n💡 Solution: Execute this in Supabase SQL Editor:');
    console.log('   GRANT EXECUTE ON FUNCTION public.create_reinvoice_from_unpaid(UUID, UUID) TO anon;');
    console.log('   GRANT EXECUTE ON FUNCTION public.create_reinvoice_from_unpaid(UUID, UUID) TO authenticated;');
  } else {
    console.log('\n⚠️  Unexpected error - may need to check function exists');
  }
} else {
  console.log('✅ RPC executed successfully (unexpected - UUID should fail)');
}

console.log('\n' + '='.repeat(80));
console.log('✅ TEST COMPLETE\n');
