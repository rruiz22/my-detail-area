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

async function debug() {
  console.log('\n=== DEBUGGING RPC FOR DEALER 5 ===\n');

  // Call RPC with dealer 5
  console.log('Calling get_vehicles_by_days_in_step(dealer_id=5, step_id=NULL)...\n');

  const { data, error } = await supabase.rpc('get_vehicles_by_days_in_step', {
    p_dealer_id: 5,
    p_step_id: null
  });

  if (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️  No data returned\n');

    // Let's manually check what should be returned
    console.log('Manual check - what SHOULD be returned:');

    const { data: steps } = await supabase
      .from('get_ready_steps')
      .select('id, name, dealer_id, is_active')
      .eq('dealer_id', 5)
      .eq('is_active', true);

    console.log('\nActive steps for dealer 5:');
    steps?.forEach(s => console.log(`  - ${s.id} (${s.name})`));

    const { data: vehicles } = await supabase
      .from('get_ready_vehicles')
      .select('step_id, dealer_id')
      .eq('dealer_id', 5)
      .neq('status', 'completed')
      .is('deleted_at', null);

    console.log('\nVehicles by step (dealer 5):');
    const counts = {};
    vehicles?.forEach(v => {
      counts[v.step_id] = (counts[v.step_id] || 0) + 1;
    });
    Object.entries(counts).forEach(([step, count]) => {
      console.log(`  - ${step}: ${count}`);
    });

  } else {
    console.log('✅ Data returned:\n');
    data.forEach(step => {
      console.log(`${step.step_name}:`);
      console.log(`  Total: ${step.total_vehicles}`);
      console.log(`  <1d: ${step.vehicles_1_day}`);
      console.log(`  1-3d: ${step.vehicles_2_3_days}`);
      console.log(`  4+d: ${step.vehicles_4_plus_days}\n`);
    });
  }
}

debug();
