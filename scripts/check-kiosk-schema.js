/**
 * Check actual kiosk schema in database
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://swfnnrpzpkdypbrzmgnr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm5ucnB6cGtkeXBicnptZ25yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxODY5NjAsImV4cCI6MjA3Mjc2Mjk2MH0.HA7ujjknDa-97z-vC-vOZJm5rQ7PYXqn--rdiZoPXcY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('🔍 Checking detail_hub_kiosks schema...');
console.log('');

// Try a minimal INSERT without camera_status
const minimalKiosk = {
  dealership_id: 1,
  kiosk_code: 'TEST-MINIMAL-' + Date.now(),
  name: 'Minimal Test Kiosk'
};

console.log('Attempting minimal INSERT (without camera_status):');
console.log(JSON.stringify(minimalKiosk, null, 2));
console.log('');

const { data, error } = await supabase
  .from('detail_hub_kiosks')
  .insert(minimalKiosk)
  .select()
  .single();

if (error) {
  console.log('❌ Still fails:', error.message);
  console.log('   Code:', error.code);
  console.log('');

  // Try just selecting to see what columns exist
  console.log('Trying SELECT to discover existing columns...');
  const { data: existingData, error: selectError } = await supabase
    .from('detail_hub_kiosks')
    .select('*')
    .limit(1);

  if (selectError) {
    console.log('❌ SELECT also fails:', selectError.message);
  } else {
    if (existingData && existingData.length > 0) {
      console.log('✅ Found existing kiosk with columns:');
      console.log(Object.keys(existingData[0]).join(', '));
    } else {
      console.log('⚠️  Table exists but is empty - cannot determine columns from SELECT');
      console.log('   This means we need to check the schema directly or apply migration');
    }
  }
} else {
  console.log('✅ SUCCESS! Minimal INSERT worked:');
  console.log(JSON.stringify(data, null, 2));
  console.log('');
  console.log('Columns present in created kiosk:');
  console.log(Object.keys(data).join(', '));

  // Clean up
  await supabase.from('detail_hub_kiosks').delete().eq('id', data.id);
  console.log('🗑️  Test kiosk deleted');
}
