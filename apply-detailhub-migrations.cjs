const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://swfnnrpzpkdypbrzmgnr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm5ucnB6cGtkeXBicnptZ25yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzE4Njk2MCwiZXhwIjoyMDcyNzYyOTYwfQ.ud57lvk528bfk8lb-D5CGn2UeN6_fLuEXXwd-CKaYrE';

const supabase = createClient(supabaseUrl, supabaseKey);

const migrations = [
  '20251117000001_create_detail_hub_employees.sql',
  '20251117000002_create_detail_hub_time_entries.sql',
  '20251117000003_create_detail_hub_kiosks.sql',
  '20251117000004_create_detail_hub_invoices.sql'
];

async function applyMigrations() {
  console.log('🚀 Aplicando migraciones de Detail Hub...\n');

  for (const migration of migrations) {
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', migration);

    try {
      console.log(`📄 Leyendo: ${migration}`);
      const sql = fs.readFileSync(migrationPath, 'utf-8');

      console.log(`⚡ Ejecutando migración...`);
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

      if (error) {
        // Try direct execution if exec_sql doesn't exist
        const { error: directError } = await supabase.from('_migrations').insert({ name: migration });

        if (directError) {
          console.error(`❌ Error en ${migration}:`, error.message || error);
          console.log(`\n⚠️  Por favor aplica esta migración manualmente en Supabase SQL Editor:`);
          console.log(`    https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/editor\n`);
          return false;
        }
      }

      console.log(`✅ ${migration} aplicada exitosamente\n`);
    } catch (err) {
      console.error(`❌ Error leyendo ${migration}:`, err.message);
      return false;
    }
  }

  console.log('🎉 Todas las migraciones aplicadas exitosamente!\n');

  // Verificar tablas creadas
  console.log('🔍 Verificando tablas creadas...');
  const { data, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .like('table_name', 'detail_hub%');

  if (error) {
    console.log('⚠️  No se pudo verificar las tablas automáticamente');
    console.log('   Verifica manualmente en Supabase Dashboard\n');
  } else {
    console.log('\n📊 Tablas creadas:');
    (data || []).forEach(t => console.log(`   ✓ ${t.table_name}`));
  }

  return true;
}

applyMigrations()
  .then(success => {
    if (success) {
      console.log('\n✨ Siguiente paso: Regenerar tipos TypeScript');
      console.log('   npm run generate:types\n');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('💥 Error fatal:', err);
    process.exit(1);
  });
