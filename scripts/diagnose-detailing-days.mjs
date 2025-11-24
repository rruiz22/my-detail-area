#!/usr/bin/env node

/**
 * Diagnose Detailing Step - Day Grouping Issue
 * Checks why day breakdown is not showing for Detailing step
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

function loadEnvFile() {
  try {
    const envContent = readFileSync('.env', 'utf8');
    const envVars = {};
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      }
    });
    return envVars;
  } catch (err) {
    console.error('Failed to load .env file:', err.message);
    return {};
  }
}

const env = loadEnvFile();
const SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ ERROR: Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function diagnose() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 DIAGNÓSTICO: Detailing Step - Day Grouping');
  console.log('='.repeat(70));

  try {
    // Get dealer ID (assuming first dealer for now)
    const { data: dealers } = await supabase
      .from('dealerships')
      .select('id, name')
      .limit(1);

    if (!dealers || dealers.length === 0) {
      console.error('❌ No dealerships found');
      return;
    }

    const dealerId = dealers[0].id;
    console.log(`\n📍 Dealer: ${dealers[0].name} (ID: ${dealerId})`);

    // 1. Test RPC function for ALL steps
    console.log('\n' + '─'.repeat(70));
    console.log('1️⃣  RPC Function: get_vehicles_by_days_in_step (ALL STEPS)');
    console.log('─'.repeat(70));

    const { data: allSteps, error: rpcError } = await supabase.rpc('get_vehicles_by_days_in_step', {
      p_dealer_id: dealerId,
      p_step_id: null
    });

    if (rpcError) {
      console.error('❌ RPC Error:', rpcError.message);
      return;
    }

    if (!allSteps || allSteps.length === 0) {
      console.log('⚠️  No data returned from RPC');
    } else {
      console.log('\nResults:');
      allSteps.forEach(step => {
        console.log(`\n  ${step.step_name}:`);
        console.log(`    Total vehicles: ${step.total_vehicles}`);
        console.log(`    < 1 day:        ${step.vehicles_1_day || 0}`);
        console.log(`    1-3 days:       ${step.vehicles_2_3_days || 0}`);
        console.log(`    4+ days:        ${step.vehicles_4_plus_days || 0}`);
        console.log(`    Avg days:       ${step.avg_days_in_step || 0}`);
      });
    }

    // 2. Test RPC function ONLY for Detailing
    console.log('\n' + '─'.repeat(70));
    console.log('2️⃣  RPC Function: get_vehicles_by_days_in_step (DETAILING ONLY)');
    console.log('─'.repeat(70));

    const { data: detailingStep, error: detailError } = await supabase.rpc('get_vehicles_by_days_in_step', {
      p_dealer_id: dealerId,
      p_step_id: 'detailing'
    });

    if (detailError) {
      console.error('❌ RPC Error:', detailError.message);
    } else if (!detailingStep || detailingStep.length === 0) {
      console.log('⚠️  No data returned for Detailing step');
    } else {
      console.log('\nDetailing Step Data:');
      console.log(JSON.stringify(detailingStep[0], null, 2));
    }

    // 3. Check actual vehicles in Detailing step
    console.log('\n' + '─'.repeat(70));
    console.log('3️⃣  Direct Query: Vehicles in Detailing Step');
    console.log('─'.repeat(70));

    const { data: vehicles, error: vehiclesError } = await supabase
      .from('get_ready_vehicles')
      .select('stock_number, vin, intake_date, deleted_at, status')
      .eq('dealer_id', dealerId)
      .eq('step_id', 'detailing')
      .neq('status', 'completed');

    if (vehiclesError) {
      console.error('❌ Error:', vehiclesError.message);
    } else if (!vehicles || vehicles.length === 0) {
      console.log('\n⚠️  No vehicles found in Detailing step');
    } else {
      console.log(`\nFound ${vehicles.length} vehicles:`);
      vehicles.forEach((v, i) => {
        const daysInSystem = v.intake_date
          ? Math.floor((Date.now() - new Date(v.intake_date).getTime()) / (1000 * 60 * 60 * 24))
          : 'N/A';
        const isDeleted = v.deleted_at ? '❌ DELETED' : '✅ ACTIVE';
        console.log(`  ${i + 1}. ${v.stock_number} | Days: ${daysInSystem} | ${isDeleted}`);
      });

      // Calculate day groupings manually
      const activeVehicles = vehicles.filter(v => !v.deleted_at);
      const day1 = activeVehicles.filter(v => {
        const days = Math.floor((Date.now() - new Date(v.intake_date).getTime()) / (1000 * 60 * 60 * 24));
        return days < 1;
      }).length;
      const days23 = activeVehicles.filter(v => {
        const days = Math.floor((Date.now() - new Date(v.intake_date).getTime()) / (1000 * 60 * 60 * 24));
        return days >= 1 && days < 4;
      }).length;
      const days4plus = activeVehicles.filter(v => {
        const days = Math.floor((Date.now() - new Date(v.intake_date).getTime()) / (1000 * 60 * 60 * 24));
        return days >= 4;
      }).length;

      console.log(`\n  Manual Calculation (based on intake_date):`);
      console.log(`    < 1 day:   ${day1}`);
      console.log(`    1-3 days:  ${days23}`);
      console.log(`    4+ days:   ${days4plus}`);
      console.log(`    Total:     ${activeVehicles.length}`);
    }

    // 4. Check vehicle_step_times_current view
    console.log('\n' + '─'.repeat(70));
    console.log('4️⃣  View: vehicle_step_times_current (Detailing vehicles)');
    console.log('─'.repeat(70));

    const { data: stepTimes, error: timesError } = await supabase
      .from('vehicle_step_times_current')
      .select('*')
      .eq('current_step_name', 'Detailing');

    if (timesError) {
      console.log(`⚠️  View not accessible or doesn't exist: ${timesError.message}`);
    } else if (!stepTimes || stepTimes.length === 0) {
      console.log('\n⚠️  No vehicles found in vehicle_step_times_current view');
    } else {
      console.log(`\nFound ${stepTimes.length} vehicles in view:`);
      stepTimes.forEach((v, i) => {
        console.log(`  ${i + 1}. ${v.stock_number} | Current visit: ${v.current_visit_days?.toFixed(1)} days | Hours: ${v.current_visit_hours?.toFixed(1)}`);
      });
    }

    // 5. Summary and diagnosis
    console.log('\n' + '='.repeat(70));
    console.log('📊 DIAGNÓSTICO SUMMARY');
    console.log('='.repeat(70));

    const rpcDetailingData = detailingStep && detailingStep[0];
    if (rpcDetailingData) {
      const hasBreakdown =
        rpcDetailingData.vehicles_1_day > 0 ||
        rpcDetailingData.vehicles_2_3_days > 0 ||
        rpcDetailingData.vehicles_4_plus_days > 0;

      console.log(`\nRPC Function Status:`);
      console.log(`  Total vehicles:     ${rpcDetailingData.total_vehicles}`);
      console.log(`  Has day breakdown:  ${hasBreakdown ? '✅ YES' : '❌ NO'}`);

      if (!hasBreakdown && rpcDetailingData.total_vehicles > 0) {
        console.log(`\n⚠️  ISSUE IDENTIFIED:`);
        console.log(`  - RPC shows ${rpcDetailingData.total_vehicles} vehicles`);
        console.log(`  - But day breakdown is all zeros`);
        console.log(`  - This is why the sidebar doesn't show the day cards!`);
        console.log(`\n🔧 POSSIBLE CAUSES:`);
        console.log(`  1. vehicle_step_times_current view is not returning data`);
        console.log(`  2. RPC function is not calculating days correctly`);
        console.log(`  3. Vehicles don't have proper intake_date or step history`);
      } else if (hasBreakdown) {
        console.log(`\n✅ Day breakdown looks good - sidebar should show cards`);
      }
    }

    console.log('\n' + '='.repeat(70));

  } catch (err) {
    console.error('\n❌ Fatal error:', err.message);
    console.error(err);
  }
}

diagnose().catch(console.error);
