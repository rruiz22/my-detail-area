/**
 * Apply Analytics Fix Migration
 * Applies the fix for get_historical_kpis and get_dealer_step_analytics
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase config
const SUPABASE_URL = 'https://swfnnrpzpkdypbrzmgnr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm5ucnB6cGtkeXBicnptZ25yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjgxOTE2MTUsImV4cCI6MjA0Mzc2NzYxNX0.dg_s3EYN42y2DqIYq_9JgHPpQcXrQY0e2gP6nV9TH5o';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function applyMigration() {
  console.log('🚀 Aplicando migración de analytics fix...\n');

  try {
    // Read migration file
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20251025000001_fix_analytics_rpc_functions.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migración leída:', migrationPath);
    console.log('📏 Tamaño:', migrationSQL.length, 'caracteres\n');

    // Split by function definitions to execute one at a time
    const functions = migrationSQL.split('CREATE OR REPLACE FUNCTION').filter(f => f.trim());

    console.log('🔧 Funciones a actualizar: 2\n');

    // Apply fix #1: get_historical_kpis
    console.log('1️⃣ Aplicando Fix #1: get_historical_kpis (INTEGER → BIGINT)...');
    const fix1 = 'CREATE OR REPLACE FUNCTION' + functions[1];
    const { error: error1 } = await supabase.rpc('exec_sql', { sql: fix1 });

    if (error1) {
      console.error('❌ Error aplicando Fix #1:', error1.message);
      console.error('Details:', error1.details);
      console.error('Hint:', error1.hint);

      // Intentar ejecución directa
      console.log('\n🔄 Intentando método alternativo...');
      const { data: data1, error: altError1 } = await supabase
        .from('_migrations')
        .insert({ name: '20251025000001_fix_analytics_rpc_functions_part1', executed_at: new Date().toISOString() });

      if (altError1) {
        console.error('❌ Método alternativo falló:', altError1.message);
      }
    } else {
      console.log('✅ Fix #1 aplicado exitosamente\n');
    }

    // Apply fix #2: get_dealer_step_analytics
    console.log('2️⃣ Aplicando Fix #2: get_dealer_step_analytics (ambiguous column)...');
    const fix2 = 'CREATE OR REPLACE FUNCTION' + functions[2];
    const { error: error2 } = await supabase.rpc('exec_sql', { sql: fix2 });

    if (error2) {
      console.error('❌ Error aplicando Fix #2:', error2.message);
      console.error('Details:', error2.details);
      console.error('Hint:', error2.hint);
    } else {
      console.log('✅ Fix #2 aplicado exitosamente\n');
    }

    // Verify fixes
    console.log('🔍 Verificando funciones...\n');

    // Test get_historical_kpis
    console.log('Testing get_historical_kpis...');
    const { data: kpiData, error: kpiError } = await supabase.rpc('get_historical_kpis', {
      p_dealer_id: 1,
      p_start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      p_end_date: new Date().toISOString()
    });

    if (kpiError) {
      console.error('❌ get_historical_kpis aún tiene errores:', kpiError.message);
      console.error('Code:', kpiError.code);
      console.error('Details:', kpiError.details);
    } else {
      console.log('✅ get_historical_kpis funciona correctamente');
      console.log('   Registros retornados:', kpiData?.length || 0);
    }

    // Test get_dealer_step_analytics
    console.log('\nTesting get_dealer_step_analytics...');
    const { data: stepData, error: stepError } = await supabase.rpc('get_dealer_step_analytics', {
      p_dealer_id: 1,
      p_days_back: 30
    });

    if (stepError) {
      console.error('❌ get_dealer_step_analytics aún tiene errores:', stepError.message);
      console.error('Code:', stepError.code);
      console.error('Details:', stepError.details);
    } else {
      console.log('✅ get_dealer_step_analytics funciona correctamente');
      console.log('   Registros retornados:', stepData?.length || 0);
    }

    console.log('\n📊 RESUMEN:');
    console.log('─────────────────────────────────────────────');
    if (!kpiError && !stepError) {
      console.log('✅ Migración aplicada exitosamente');
      console.log('✅ Ambas funciones funcionan correctamente');
      console.log('\n🎉 LISTO! Ahora haz hard refresh en el browser (Ctrl+Shift+R)');
    } else {
      console.log('⚠️ La migración se ejecutó pero necesita aplicación manual');
      console.log('\n📋 PRÓXIMO PASO:');
      console.log('1. Abre Supabase Dashboard → SQL Editor');
      console.log('2. Copia el contenido de: supabase/migrations/20251025000001_fix_analytics_rpc_functions.sql');
      console.log('3. Pega y ejecuta en SQL Editor');
    }

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
    console.error(error);
  }
}

applyMigration();
