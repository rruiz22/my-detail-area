#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

function loadEnvFile() {
  const envContent = readFileSync('.env', 'utf8');
  const envVars = {};
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
  return envVars;
}

const env = loadEnvFile();
const supabase = createClient(
  env.SUPABASE_URL || env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function testRPC() {
  console.log('\n=== TESTING RPC FOR SPECIFIC STEPS ===\n');

  const { data: dealers } = await supabase
    .from('dealerships')
    .select('id')
    .limit(1);

  const dealerId = dealers[0].id;

  // Test for 'detailing' step (the one with 5 vehicles)
  console.log('1. Testing step_id = "detailing" (has 5 vehicles):\n');

  const { data: detailingData, error: detailingError } = await supabase.rpc('get_vehicles_by_days_in_step', {
    p_dealer_id: dealerId,
    p_step_id: 'detailing'
  });

  if (detailingError) {
    console.error('   ❌ Error:', detailingError.message);
  } else if (!detailingData || detailingData.length === 0) {
    console.log('   ⚠️  No data returned');
  } else {
    console.log('   Results:');
    console.log(JSON.stringify(detailingData[0], null, 4));
  }

  // Test for '5_detail_done' step (the one that works)
  console.log('\n\n2. Testing step_id = "5_detail_done" (has 2 vehicles, WORKS):\n');

  const { data: detailDoneData, error: detailDoneError } = await supabase.rpc('get_vehicles_by_days_in_step', {
    p_dealer_id: dealerId,
    p_step_id: '5_detail_done'
  });

  if (detailDoneError) {
    console.error('   ❌ Error:', detailDoneError.message);
  } else if (!detailDoneData || detailDoneData.length === 0) {
    console.log('   ⚠️  No data returned');
  } else {
    console.log('   Results:');
    console.log(JSON.stringify(detailDoneData[0], null, 4));
  }

  // Now check vehicle_step_history for these vehicles
  console.log('\n\n3. Checking vehicle_step_history for detailing vehicles:\n');

  const detailingVehicles = ['B35686A', 'B35810A', 'B35819A', 'B35880A', 'B35759A'];

  for (const stock of detailingVehicles) {
    const { data: vehicle } = await supabase
      .from('get_ready_vehicles')
      .select('id, stock_number, step_id')
      .eq('stock_number', stock)
      .single();

    if (vehicle) {
      const { data: history } = await supabase
        .from('vehicle_step_history')
        .select('*')
        .eq('vehicle_id', vehicle.id)
        .eq('step_id', 'detailing');

      console.log(`   ${stock}:`);
      console.log(`     - Current step_id: ${vehicle.step_id}`);
      console.log(`     - History entries: ${history?.length || 0}`);
      if (history && history.length > 0) {
        history.forEach((h, i) => {
          console.log(`       ${i+1}. is_current: ${h.is_current_visit}, entry: ${h.entry_date}, exit: ${h.exit_date}`);
        });
      }
    }
  }
}

testRPC();
