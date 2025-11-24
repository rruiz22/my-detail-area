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

async function checkStepIds() {
  console.log('\n=== CHECKING STEP IDs ===\n');

  // Get all steps
  const { data: steps } = await supabase
    .from('get_ready_steps')
    .select('id, name, order_index')
    .order('order_index');

  console.log('Available Steps:');
  steps.forEach(s => console.log(`  ${s.order_index}. ${s.id.padEnd(15)} → ${s.name}`));

  // Get vehicles by step
  console.log('\n\nVehicles by step_id (active only):');
  const { data: vehicles } = await supabase
    .from('get_ready_vehicles')
    .select('step_id, stock_number')
    .neq('status', 'completed')
    .is('deleted_at', null);

  const counts = {};
  vehicles.forEach(v => {
    if (!counts[v.step_id]) counts[v.step_id] = [];
    counts[v.step_id].push(v.stock_number);
  });

  steps.forEach(step => {
    const vehicleList = counts[step.id] || [];
    console.log(`\n  ${step.name} (${step.id}):`);
    console.log(`    Count: ${vehicleList.length}`);
    if (vehicleList.length > 0) {
      console.log(`    Vehicles: ${vehicleList.join(', ')}`);
    }
  });

  // Check for orphaned vehicles (step_id doesn't match any step)
  const validStepIds = new Set(steps.map(s => s.id));
  const orphaned = vehicles.filter(v => !validStepIds.has(v.step_id));

  if (orphaned.length > 0) {
    console.log('\n\n⚠️  ORPHANED VEHICLES (invalid step_id):');
    orphaned.forEach(v => {
      console.log(`    ${v.stock_number} → step_id: "${v.step_id}"`);
    });
  }
}

checkStepIds();
