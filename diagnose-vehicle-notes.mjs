import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://swfnnrpzpkdypbrzmgnr.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm5ucnB6cGtkeXBicnptZ25yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzE4Njk2MCwiZXhwIjoyMDcyNzYyOTYwfQ.ud57lvk528bfk8lb-D5CGn2UeN6_fLuEXXwd-CKaYrE";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🔍 VEHICLE NOTES DIAGNOSTIC REPORT');
console.log('═══════════════════════════════════════════════════════\n');

// 1. Check RLS Policies
console.log('📋 1. ACTIVE RLS POLICIES ON vehicle_notes:');
const { data: policies, error: policyError } = await supabase
  .from('pg_policies')
  .select('policyname, cmd, permissive, roles, qual, with_check')
  .eq('tablename', 'vehicle_notes')
  .order('cmd');

if (policyError) {
  console.error('❌ Error fetching policies:', policyError);
} else {
  if (policies && policies.length > 0) {
    policies.forEach((p, i) => {
      console.log(`\n  Policy ${i + 1}: ${p.policyname}`);
      console.log(`  Command: ${p.cmd}`);
      console.log(`  Permissive: ${p.permissive}`);
      console.log(`  Roles: ${p.roles}`);
    });
    console.log(`\n  Total policies: ${policies.length}`);
  } else {
    console.log('  ⚠️  No policies found!');
  }
}

// 2. Check user info
console.log('\n\n👤 2. USER INFORMATION (rruiz@lima.llc):');
const { data: userProfile, error: userError } = await supabase
  .from('profiles')
  .select('id, email, role, dealership_id, first_name, last_name')
  .eq('email', 'rruiz@lima.llc')
  .single();

if (userError) {
  console.error('❌ Error fetching user:', userError);
} else if (userProfile) {
  console.log(`  ID: ${userProfile.id}`);
  console.log(`  Email: ${userProfile.email}`);
  console.log(`  Role: ${userProfile.role}`);
  console.log(`  Dealership ID: ${userProfile.dealership_id}`);
  console.log(`  Name: ${userProfile.first_name} ${userProfile.last_name}`);
}

// 3. Check dealership info
if (userProfile?.dealership_id) {
  console.log('\n\n🏢 3. DEALERSHIP INFORMATION:');
  const { data: dealership, error: dealershipError } = await supabase
    .from('dealerships')
    .select('id, name, code')
    .eq('id', userProfile.dealership_id)
    .single();

  if (dealershipError) {
    console.error('❌ Error fetching dealership:', dealershipError);
  } else if (dealership) {
    console.log(`  ID: ${dealership.id}`);
    console.log(`  Name: ${dealership.name}`);
    console.log(`  Code: ${dealership.code}`);
  }
}

// 4. Check recon_vehicles access
console.log('\n\n🚗 4. ACCESSIBLE RECON_VEHICLES:');
const { data: vehicles, error: vehiclesError } = await supabase
  .from('recon_vehicles')
  .select('id, vin, year, make, model, dealer_id')
  .limit(5);

if (vehiclesError) {
  console.error('❌ Error fetching vehicles:', vehiclesError);
} else {
  console.log(`  Total accessible vehicles (first 5): ${vehicles?.length || 0}`);
  if (vehicles && vehicles.length > 0) {
    vehicles.forEach((v, i) => {
      console.log(`\n  Vehicle ${i + 1}:`);
      console.log(`    ID: ${v.id}`);
      console.log(`    VIN: ${v.vin || 'N/A'}`);
      console.log(`    Vehicle: ${v.year} ${v.make} ${v.model}`);
      console.log(`    Dealer ID: ${v.dealer_id}`);
    });
  }
}

// 5. Check existing vehicle_notes
console.log('\n\n📝 5. EXISTING VEHICLE_NOTES:');
const { data: notes, error: notesError } = await supabase
  .from('vehicle_notes')
  .select('id, vehicle_id, content, created_by, created_at')
  .limit(5);

if (notesError) {
  console.error('❌ Error fetching notes:', notesError);
} else {
  console.log(`  Total existing notes (first 5): ${notes?.length || 0}`);
  if (notes && notes.length > 0) {
    notes.forEach((n, i) => {
      console.log(`\n  Note ${i + 1}:`);
      console.log(`    ID: ${n.id}`);
      console.log(`    Vehicle ID: ${n.vehicle_id}`);
      console.log(`    Content: ${n.content.substring(0, 50)}...`);
      console.log(`    Created by: ${n.created_by}`);
    });
  }
}

// 6. Test INSERT with actual user
console.log('\n\n🧪 6. SIMULATED INSERT TEST:');
if (userProfile && vehicles && vehicles.length > 0) {
  const testNote = {
    vehicle_id: vehicles[0].id,
    content: 'Test diagnostic note',
    note_type: 'general',
    is_pinned: false,
    created_by: userProfile.id,
  };

  console.log('  Test note payload:');
  console.log(`    vehicle_id: ${testNote.vehicle_id}`);
  console.log(`    created_by: ${testNote.created_by} (${userProfile.email})`);
  console.log(`    content: ${testNote.content}`);

  // Try insert
  const { data: insertResult, error: insertError } = await supabase
    .from('vehicle_notes')
    .insert(testNote)
    .select()
    .single();

  if (insertError) {
    console.log('\n  ❌ INSERT FAILED:');
    console.log(`    Error code: ${insertError.code}`);
    console.log(`    Error message: ${insertError.message}`);
    console.log(`    Error details: ${insertError.details}`);
    console.log(`    Error hint: ${insertError.hint}`);
  } else {
    console.log('\n  ✅ INSERT SUCCESS!');
    console.log(`    Created note ID: ${insertResult.id}`);

    // Clean up test note
    await supabase.from('vehicle_notes').delete().eq('id', insertResult.id);
    console.log(`    (Test note cleaned up)`);
  }
}

console.log('\n\n═══════════════════════════════════════════════════════');
console.log('🏁 DIAGNOSTIC COMPLETE\n');
