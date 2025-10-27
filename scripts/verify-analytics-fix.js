/**
 * Verify Analytics Fix Applied Successfully
 * Tests both RPC functions to confirm they work without errors
 */

import { createClient } from '@supabase/supabase-js';

// Supabase config
const SUPABASE_URL = 'https://swfnnrpzpkdypbrzmgnr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm5ucnB6cGtkeXBicnptZ25yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxODY5NjAsImV4cCI6MjA3Mjc2Mjk2MH0.HA7ujjknDa-97z-vC-vOZJm5rQ7PYXqn--rdiZoPXcY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifyFix() {
  console.log('🔍 Verificando que el fix de analytics se aplicó correctamente...\n');

  let allPassed = true;

  // Test 1: get_historical_kpis
  console.log('1️⃣ Testing get_historical_kpis...');
  console.log('   Params: dealer_id=1, last 7 days');

  const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const endDate = new Date();

  const { data: kpiData, error: kpiError } = await supabase.rpc('get_historical_kpis', {
    p_dealer_id: 1,
    p_start_date: startDate.toISOString(),
    p_end_date: endDate.toISOString()
  });

  if (kpiError) {
    console.log('   ❌ FAILED - Aún hay errores:');
    console.log('      Message:', kpiError.message);
    console.log('      Code:', kpiError.code);
    console.log('      Details:', kpiError.details);
    console.log('      Hint:', kpiError.hint);
    allPassed = false;
  } else {
    console.log('   ✅ PASSED - Función ejecuta sin errores');
    console.log('      Records returned:', kpiData?.length || 0);
    if (kpiData && kpiData.length > 0) {
      console.log('      Sample data:', JSON.stringify(kpiData[0], null, 2));
    } else {
      console.log('      (No data yet - tabla vehicle_step_history vacía)');
    }
  }

  console.log('');

  // Test 2: get_dealer_step_analytics
  console.log('2️⃣ Testing get_dealer_step_analytics...');
  console.log('   Params: dealer_id=1, days_back=30');

  const { data: stepData, error: stepError } = await supabase.rpc('get_dealer_step_analytics', {
    p_dealer_id: 1,
    p_days_back: 30
  });

  if (stepError) {
    console.log('   ❌ FAILED - Aún hay errores:');
    console.log('      Message:', stepError.message);
    console.log('      Code:', stepError.code);
    console.log('      Details:', stepError.details);
    console.log('      Hint:', stepError.hint);
    allPassed = false;
  } else {
    console.log('   ✅ PASSED - Función ejecuta sin errores');
    console.log('      Records returned:', stepData?.length || 0);
    if (stepData && stepData.length > 0) {
      console.log('      Sample data:', JSON.stringify(stepData[0], null, 2));
    } else {
      console.log('      (No data yet - tabla vehicle_step_history vacía)');
    }
  }

  console.log('\n' + '='.repeat(60));

  if (allPassed) {
    console.log('✅ VERIFICACIÓN EXITOSA');
    console.log('');
    console.log('Ambas funciones RPC funcionan correctamente.');
    console.log('');
    console.log('📋 PRÓXIMOS PASOS:');
    console.log('1. Vuelve a tu app: http://localhost:8080/get-ready');
    console.log('2. Hard refresh: Ctrl + Shift + R');
    console.log('3. Abre Console (F12)');
    console.log('4. Verifica que NO hay errores 400');
    console.log('5. Busca logs: ✅ [function_name] Success');
    console.log('');
    console.log('💡 NOTA: "records_returned: 0" es normal porque');
    console.log('   vehicle_step_history está vacía todavía.');
  } else {
    console.log('❌ VERIFICACIÓN FALLIDA');
    console.log('');
    console.log('Algunas funciones aún tienen errores.');
    console.log('');
    console.log('🔧 TROUBLESHOOTING:');
    console.log('1. Verifica que ejecutaste el SQL completo en Supabase');
    console.log('2. Revisa que NO hubo errores en SQL Editor');
    console.log('3. Intenta ejecutar las funciones una por una');
    console.log('4. Consulta: APPLY_FIX_MANUAL.md sección "Si Algo Sale Mal"');
  }

  console.log('='.repeat(60));
}

verifyFix().catch(console.error);
