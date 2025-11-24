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

async function testJoin() {
  console.log('\n=== TESTING RPC JOIN LOGIC ===\n');

  // Manually execute the first part of the RPC (vehicle_total_time CTE)
  const query = `
    SELECT
      v.id as vehicle_id,
      v.stock_number,
      v.step_id,
      vst.vehicle_id as vst_vehicle_id,
      vst.current_visit_hours,
      vst.previous_visits_hours,
      COALESCE(
        (vst.current_visit_hours + COALESCE(vst.previous_visits_hours, 0)) / 24.0,
        EXTRACT(EPOCH FROM (NOW() - v.intake_date)) / 86400
      ) as total_days_in_step
    FROM get_ready_vehicles v
    LEFT JOIN vehicle_step_times_current vst
      ON vst.vehicle_id = v.id
    WHERE v.dealer_id = 5
      AND v.status != 'completed'
      AND v.step_id = 'detailing'
      AND v.deleted_at IS NULL
    ORDER BY v.stock_number
  `;

  console.log('Executing manual query for Detailing vehicles...\n');

  const { data, error } = await supabase.rpc('exec_sql', { query });

  if (error) {
    console.error('❌ Error:', error.message);

    // Fallback: try direct queries
    console.log('\nFallback: checking data separately...\n');

    const { data: vehicles } = await supabase
      .from('get_ready_vehicles')
      .select('id, stock_number, step_id, intake_date')
      .eq('dealer_id', 5)
      .eq('step_id', 'detailing')
      .neq('status', 'completed')
      .is('deleted_at', null);

    console.log('Vehicles in Detailing:');
    for (const v of vehicles || []) {
      const { data: vst } = await supabase
        .from('vehicle_step_times_current')
        .select('*')
        .eq('vehicle_id', v.id)
        .single();

      const daysFromIntake = (Date.now() - new Date(v.intake_date).getTime()) / (1000 * 60 * 60 * 24);

      console.log(`\n  ${v.stock_number}:`);
      console.log(`    vehicle_id: ${v.id}`);
      console.log(`    In vst view: ${vst ? 'YES' : 'NO'}`);
      if (vst) {
        console.log(`    current_visit_hours: ${vst.current_visit_hours}`);
        console.log(`    previous_visits_hours: ${vst.previous_visits_hours}`);
        console.log(`    Calculated days: ${((vst.current_visit_hours + (vst.previous_visits_hours || 0)) / 24).toFixed(2)}`);
      } else {
        console.log(`    Fallback to intake_date: ${daysFromIntake.toFixed(2)} days`);
      }
    }
  } else if (!data || data.length === 0) {
    console.log('⚠️  No results from manual query');
  } else {
    console.log('Results:');
    data.forEach(row => {
      console.log(`\n  ${row.stock_number}:`);
      console.log(`    vehicle_id: ${row.vehicle_id}`);
      console.log(`    vst_vehicle_id: ${row.vst_vehicle_id || 'NULL (NOT JOINED!)'}`);
      console.log(`    current_visit_hours: ${row.current_visit_hours || 'NULL'}`);
      console.log(`    total_days_in_step: ${row.total_days_in_step?.toFixed(2)}`);
    });
  }
}

testJoin();
