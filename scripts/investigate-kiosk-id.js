import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://swfnnrpzpkdypbrzmgnr.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function investigateKioskId() {
  console.log('🔍 Investigating kiosk_id field issue...\n');

  // 1. Check RLS Policies
  console.log('1️⃣ RLS Policies for detail_hub_time_entries:');
  const { data: policies, error: policiesError } = await supabase.rpc('execute_sql', {
    query: `
      SELECT
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
      FROM pg_policies
      WHERE tablename = 'detail_hub_time_entries'
      ORDER BY cmd, policyname;
    `
  });

  if (policiesError) {
    console.error('Error fetching policies:', policiesError);
  } else {
    console.table(policies);
  }

  // 2. Check Triggers
  console.log('\n2️⃣ Triggers on detail_hub_time_entries:');
  const { data: triggers, error: triggersError } = await supabase.rpc('execute_sql', {
    query: `
      SELECT
        trigger_name,
        event_manipulation,
        event_object_table,
        action_statement,
        action_timing,
        action_orientation
      FROM information_schema.triggers
      WHERE event_object_table = 'detail_hub_time_entries'
      ORDER BY trigger_name;
    `
  });

  if (triggersError) {
    console.error('Error fetching triggers:', triggersError);
  } else {
    console.table(triggers);
  }

  // 3. Check Column Permissions
  console.log('\n3️⃣ Column Permissions:');
  const { data: columns, error: columnsError } = await supabase.rpc('execute_sql', {
    query: `
      SELECT
        column_name,
        is_updatable,
        is_insertable_into
      FROM information_schema.columns
      WHERE table_name = 'detail_hub_time_entries'
        AND column_name IN ('kiosk_id', 'ip_address', 'employee_id');
    `
  });

  if (columnsError) {
    console.error('Error fetching columns:', columnsError);
  } else {
    console.table(columns);
  }

  // 4. Test Direct INSERT
  console.log('\n4️⃣ Testing Direct INSERT with service_role:');
  const { data: testInsert, error: insertError } = await supabase
    .from('detail_hub_time_entries')
    .insert({
      employee_id: '00000000-0000-0000-0000-000000000000', // Placeholder UUID
      dealership_id: 5,
      clock_in: new Date().toISOString(),
      punch_in_method: 'manual',
      kiosk_id: 'KIOSK-TEST',
      ip_address: '127.0.0.1',
      status: 'active'
    })
    .select('id, kiosk_id, ip_address')
    .single();

  if (insertError) {
    console.error('❌ INSERT failed:', insertError);
  } else {
    console.log('✅ INSERT successful:', testInsert);

    // Clean up test data
    if (testInsert?.id) {
      await supabase
        .from('detail_hub_time_entries')
        .delete()
        .eq('id', testInsert.id);
      console.log('🧹 Test data cleaned up');
    }
  }

  // 5. Get actual employee and test with real data
  console.log('\n5️⃣ Testing with real employee data:');
  const { data: employee } = await supabase
    .from('detail_hub_employees')
    .select('id, first_name, last_name')
    .eq('dealership_id', 5)
    .eq('status', 'active')
    .limit(1)
    .single();

  if (employee) {
    console.log(`Testing with employee: ${employee.first_name} ${employee.last_name} (${employee.id})`);

    const { data: realTest, error: realError } = await supabase
      .from('detail_hub_time_entries')
      .insert({
        employee_id: employee.id,
        dealership_id: 5,
        clock_in: new Date().toISOString(),
        punch_in_method: 'manual',
        kiosk_id: 'KIOSK-REAL-TEST',
        ip_address: '192.168.1.100',
        status: 'active'
      })
      .select('id, employee_id, kiosk_id, ip_address, punch_in_method')
      .single();

    if (realError) {
      console.error('❌ Real INSERT failed:', realError);
    } else {
      console.log('✅ Real INSERT successful:', realTest);

      // Clean up
      if (realTest?.id) {
        await supabase
          .from('detail_hub_time_entries')
          .delete()
          .eq('id', realTest.id);
        console.log('🧹 Test data cleaned up');
      }
    }
  }
}

investigateKioskId().catch(console.error);
