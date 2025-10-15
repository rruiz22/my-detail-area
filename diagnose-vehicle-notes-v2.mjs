import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://swfnnrpzpkdypbrzmgnr.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm5ucnB6cGtkeXBicnptZ25yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzE4Njk2MCwiZXhwIjoyMDcyNzYyOTYwfQ.ud57lvk528bfk8lb-D5CGn2UeN6_fLuEXXwd-CKaYrE";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log('🔍 VEHICLE NOTES DIAGNOSTIC REPORT V2');
console.log('═══════════════════════════════════════════════════════\n');

// Execute raw SQL to check policies
console.log('📋 1. CHECKING RLS POLICIES VIA SQL:');
const { data: policiesRaw, error: policiesRawError } = await supabase.rpc('exec_sql', {
  sql: `
    SELECT
      schemaname,
      tablename,
      policyname,
      permissive,
      roles::text,
      cmd
    FROM pg_policies
    WHERE tablename = 'vehicle_notes'
    ORDER BY cmd, policyname;
  `
});

if (policiesRawError) {
  console.log('  Trying alternative approach...');
  // If RPC doesn't exist, we'll check via database structure
  const { data: tableInfo, error: tableError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'vehicle_notes');

  if (tableError) {
    console.error('  ❌ Error checking table:', tableError.message);
  } else if (tableInfo && tableInfo.length > 0) {
    console.log('  ✅ Table vehicle_notes EXISTS');
  } else {
    console.log('  ❌ Table vehicle_notes NOT FOUND');
  }
} else {
  if (policiesRaw && policiesRaw.length > 0) {
    policiesRaw.forEach((p, i) => {
      console.log(`\n  Policy ${i + 1}: "${p.policyname}"`);
      console.log(`    Command: ${p.cmd}`);
      console.log(`    Permissive: ${p.permissive}`);
      console.log(`    Roles: ${p.roles}`);
    });
    console.log(`\n  Total policies: ${policiesRaw.length}`);
  } else {
    console.log('  ⚠️  NO POLICIES FOUND - THIS IS THE PROBLEM!');
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
  console.error('  ❌ Error fetching user:', userError.message);
} else if (userProfile) {
  console.log(`  ID: ${userProfile.id}`);
  console.log(`  Email: ${userProfile.email}`);
  console.log(`  Role: ${userProfile.role}`);
  console.log(`  Dealership ID: ${userProfile.dealership_id || 'NULL ⚠️'}`);
  console.log(`  Name: ${userProfile.first_name} ${userProfile.last_name}`);

  if (!userProfile.dealership_id) {
    console.log('\n  ⚠️  WARNING: User has NO dealership assigned!');
    console.log('  This may cause RLS policy failures if policies check dealership_id.');
  }
}

// 3. Check recon_vehicles structure and data
console.log('\n\n🚗 3. RECON_VEHICLES TABLE:');
const { data: vehicles, error: vehiclesError } = await supabase
  .from('recon_vehicles')
  .select('*')
  .limit(3);

if (vehiclesError) {
  console.error('  ❌ Error fetching vehicles:', vehiclesError.message);
} else {
  console.log(`  Total vehicles found: ${vehicles?.length || 0}`);
  if (vehicles && vehicles.length > 0) {
    console.log('\n  Sample vehicle structure:');
    console.log(`  Columns: ${Object.keys(vehicles[0]).join(', ')}`);

    vehicles.forEach((v, i) => {
      console.log(`\n  Vehicle ${i + 1}:`);
      console.log(`    ID: ${v.id}`);
      console.log(`    VIN: ${v.vin || 'N/A'}`);
      console.log(`    Dealer ID: ${v.dealer_id || 'N/A'}`);
      console.log(`    Status: ${v.status || 'N/A'}`);
    });
  } else {
    console.log('  ⚠️  NO VEHICLES FOUND!');
  }
}

// 4. Check existing vehicle_notes
console.log('\n\n📝 4. EXISTING VEHICLE_NOTES:');
const { data: notes, error: notesError } = await supabase
  .from('vehicle_notes')
  .select('*')
  .limit(5);

if (notesError) {
  console.error('  ❌ Error fetching notes:', notesError.message);
} else {
  console.log(`  Total existing notes: ${notes?.length || 0}`);
  if (notes && notes.length > 0) {
    notes.forEach((n, i) => {
      console.log(`\n  Note ${i + 1}:`);
      console.log(`    ID: ${n.id}`);
      console.log(`    Vehicle ID: ${n.vehicle_id}`);
      console.log(`    Content: "${n.content.substring(0, 40)}..."`);
      console.log(`    Created by: ${n.created_by}`);
      console.log(`    Type: ${n.note_type}`);
    });
  }
}

// 5. Check if RLS is enabled on vehicle_notes
console.log('\n\n🔒 5. RLS STATUS:');
const { data: rlsStatus, error: rlsError } = await supabase.rpc('exec_sql', {
  sql: `
    SELECT
      tablename,
      rowsecurity as rls_enabled
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'vehicle_notes';
  `
});

if (!rlsError && rlsStatus && rlsStatus.length > 0) {
  console.log(`  RLS Enabled: ${rlsStatus[0].rls_enabled ? 'YES ✅' : 'NO ❌'}`);
} else {
  console.log('  Unable to check RLS status via RPC');
}

// 6. Test INSERT with actual user and vehicle
console.log('\n\n🧪 6. INSERT TEST:');
if (userProfile && vehicles && vehicles.length > 0) {
  const testVehicleId = vehicles[0].id;
  const testNote = {
    vehicle_id: testVehicleId,
    content: 'Test diagnostic note - will be deleted',
    note_type: 'general',
    is_pinned: false,
    created_by: userProfile.id,
  };

  console.log('  Attempting to insert:');
  console.log(`    vehicle_id: ${testNote.vehicle_id}`);
  console.log(`    created_by: ${testNote.created_by} (${userProfile.email}, role: ${userProfile.role})`);
  console.log(`    content: "${testNote.content}"`);

  const { data: insertResult, error: insertError } = await supabase
    .from('vehicle_notes')
    .insert(testNote)
    .select()
    .single();

  if (insertError) {
    console.log('\n  ❌ INSERT FAILED:');
    console.log(`    Code: ${insertError.code}`);
    console.log(`    Message: ${insertError.message}`);
    console.log(`    Details: ${insertError.details || 'N/A'}`);
    console.log(`    Hint: ${insertError.hint || 'N/A'}`);

    // Specific error analysis
    if (insertError.code === '42501') {
      console.log('\n  🔍 DIAGNOSIS: Permission Denied (RLS Policy Violation)');
      console.log('    - RLS policies are BLOCKING the insert');
      console.log('    - Check that INSERT policies exist and allow system_admin');
    } else if (insertError.code === '409' || insertError.message.includes('conflict')) {
      console.log('\n  🔍 DIAGNOSIS: Conflict Error (409)');
      console.log('    - Multiple RLS policies may be conflicting');
      console.log('    - Check for duplicate or contradictory policies');
    }
  } else {
    console.log('\n  ✅ INSERT SUCCESS!');
    console.log(`    Created note ID: ${insertResult.id}`);

    // Clean up test note
    const { error: deleteError } = await supabase
      .from('vehicle_notes')
      .delete()
      .eq('id', insertResult.id);

    if (deleteError) {
      console.log(`    ⚠️  Failed to clean up test note: ${deleteError.message}`);
    } else {
      console.log(`    Test note cleaned up ✓`);
    }
  }
} else {
  console.log('  ⚠️  Skipping INSERT test - missing user or vehicles');
}

console.log('\n\n═══════════════════════════════════════════════════════');
console.log('🏁 DIAGNOSTIC COMPLETE');
console.log('\nKEY FINDINGS:');
console.log('  • Check the policies count above');
console.log('  • Check if user has dealership_id');
console.log('  • Check INSERT error code/message for root cause');
console.log('═══════════════════════════════════════════════════════\n');
