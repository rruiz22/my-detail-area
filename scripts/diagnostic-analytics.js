#!/usr/bin/env node

/**
 * Get Ready Analytics - Automated Diagnostic Script
 * Connects to Supabase and runs diagnostic queries
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = 'https://swfnnrpzpkdypbrzmgnr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm5ucnB6cGtkeXBicnptZ25yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxODY5NjAsImV4cCI6MjA3Mjc2Mjk2MH0.HA7ujjknDa-97z-vC-vOZJm5rQ7PYXqn--rdiZoPXcY';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runDiagnostic() {
  console.log('🔍 Iniciando diagnóstico de Get Ready Analytics...\n');

  try {
    // Paso 1: Verificar funciones RPC
    console.log('📋 PASO 1: Verificando funciones RPC...');
    const functionsToCheck = [
      'get_historical_kpis',
      'get_dealer_step_analytics',
      'get_vehicle_step_times',
      'get_accumulated_hours_in_step',
      'get_step_visit_breakdown'
    ];

    // Intentar llamar a cada función para ver si existe
    const functionChecks = [];
    for (const funcName of functionsToCheck) {
      try {
        // Intentamos con parámetros mínimos para ver si la función responde
        const { error } = await supabase.rpc(funcName, {});
        if (error) {
          // Si el error NO es "missing required parameter", la función existe
          if (error.code === '42883') {
            functionChecks.push({ name: funcName, exists: false, error: 'Function does not exist' });
          } else {
            functionChecks.push({ name: funcName, exists: true, note: 'Exists (param error expected)' });
          }
        } else {
          functionChecks.push({ name: funcName, exists: true, note: 'Exists and callable' });
        }
      } catch (err) {
        functionChecks.push({ name: funcName, exists: false, error: err.message });
      }
    }

    console.log('Funciones encontradas:');
    functionChecks.forEach(check => {
      const icon = check.exists ? '✅' : '❌';
      console.log(`  ${icon} ${check.name}: ${check.exists ? check.note : check.error}`);
    });

    const functionsExist = functionChecks.filter(c => c.exists).length;
    console.log(`\n📊 Resultado: ${functionsExist}/5 funciones encontradas\n`);

    // Paso 2: Verificar tabla vehicle_step_history
    console.log('📋 PASO 2: Verificando tabla vehicle_step_history...');
    const { data: historyData, error: historyError } = await supabase
      .from('vehicle_step_history')
      .select('id', { count: 'exact', head: true });

    if (historyError) {
      if (historyError.code === '42P01') {
        console.log('❌ Tabla vehicle_step_history NO existe\n');
      } else {
        console.log(`⚠️ Error verificando tabla: ${historyError.message}\n`);
      }
    } else {
      console.log('✅ Tabla vehicle_step_history existe\n');
    }

    // Paso 3: Contar registros
    if (!historyError) {
      console.log('📋 PASO 3: Contando registros en historia...');
      const { count, error: countError } = await supabase
        .from('vehicle_step_history')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.log(`⚠️ Error contando registros: ${countError.message}\n`);
      } else {
        const icon = count === 0 ? '⚠️' : '✅';
        console.log(`${icon} Total de registros: ${count}`);
        if (count === 0) {
          console.log('   Nota: Tabla vacía (normal si no se han movido vehículos)\n');
        } else {
          console.log('   Nota: Tiene datos históricos\n');
        }
      }
    }

    // Paso 4: Obtener dealer_id para testing
    console.log('📋 PASO 4: Obteniendo dealer IDs disponibles...');
    const { data: dealers, error: dealersError } = await supabase
      .from('dealerships')
      .select('id, name')
      .limit(3);

    if (dealersError) {
      console.log(`⚠️ Error obteniendo dealers: ${dealersError.message}\n`);
    } else if (dealers && dealers.length > 0) {
      console.log('Dealers disponibles para testing:');
      dealers.forEach((d, i) => {
        console.log(`  ${i + 1}. ID: ${d.id}, Name: ${d.name}`);
      });
      console.log('');
    }

    // Paso 5: Test de función si existe
    if (functionsExist > 0 && dealers && dealers.length > 0) {
      console.log('📋 PASO 5: Testeando función get_historical_kpis...');
      const testDealerId = dealers[0].id;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const { data: testData, error: testError } = await supabase.rpc('get_historical_kpis', {
        p_dealer_id: testDealerId,
        p_start_date: startDate.toISOString(),
        p_end_date: new Date().toISOString()
      });

      if (testError) {
        console.log(`❌ Error en test: ${testError.message}`);
        console.log(`   Code: ${testError.code}`);
        console.log(`   Details: ${testError.details || 'N/A'}`);
        console.log(`   Hint: ${testError.hint || 'N/A'}\n`);
      } else {
        console.log(`✅ Función ejecutada correctamente`);
        console.log(`   Registros retornados: ${testData?.length || 0}\n`);
      }
    }

    // Resumen final
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RESUMEN DEL DIAGNÓSTICO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (functionsExist === 5 && !historyError) {
      console.log('✅ ESTADO: TODO CONFIGURADO CORRECTAMENTE');
      console.log('   - 5/5 funciones RPC existen');
      console.log('   - Tabla vehicle_step_history existe');
      console.log('   - Sistema listo para uso\n');
      console.log('📋 PRÓXIMO PASO:');
      console.log('   Verificar errores 400 en browser console');
      console.log('   Si persisten, el problema está en el frontend\n');
    } else if (functionsExist === 0 || historyError) {
      console.log('❌ ESTADO: FALTA APLICAR MIGRACIÓN');
      console.log(`   - ${functionsExist}/5 funciones encontradas`);
      console.log(`   - Tabla: ${historyError ? 'NO existe' : 'Existe'}\n`);
      console.log('📋 PRÓXIMO PASO:');
      console.log('   Aplicar migración: supabase/migrations/20251025000000_create_vehicle_step_history.sql\n');
    } else {
      console.log('⚠️ ESTADO: CONFIGURACIÓN PARCIAL');
      console.log(`   - ${functionsExist}/5 funciones encontradas`);
      console.log(`   - Tabla: ${historyError ? 'NO existe' : 'Existe'}\n`);
      console.log('📋 PRÓXIMO PASO:');
      console.log('   Re-aplicar migración completa\n');
    }

  } catch (error) {
    console.error('❌ Error ejecutando diagnóstico:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Ejecutar
runDiagnostic().then(() => {
  console.log('✅ Diagnóstico completado');
  process.exit(0);
}).catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
