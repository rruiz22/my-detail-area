#!/usr/bin/env node

/**
 * Script para copiar archivos de traducción de portugués a español
 * Portugués y español son similares, facilitando la revisión posterior
 *
 * Uso: node scripts/copy-from-portuguese.cjs
 */

const fs = require('fs');
const path = require('path');

// Configuración de rutas
const PT_DIR = path.join(__dirname, '../public/translations/pt-BR');
const ES_DIR = path.join(__dirname, '../public/translations/es');

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function ensureOutputDirectory() {
  if (!fs.existsSync(ES_DIR)) {
    log(`\n📁 Creando directorio de salida: ${ES_DIR}`, 'yellow');
    fs.mkdirSync(ES_DIR, { recursive: true });
  }
}

function getPortugueseFiles() {
  log('\n📋 Obteniendo archivos de portugués...', 'blue');

  if (!fs.existsSync(PT_DIR)) {
    log(`❌ Error: No se encontró el directorio ${PT_DIR}`, 'red');
    process.exit(1);
  }

  const files = fs.readdirSync(PT_DIR).filter(file => file.endsWith('.json'));
  log(`✅ ${files.length} archivos encontrados en portugués`, 'green');
  return files;
}

function copyFiles(files) {
  log('\n🔧 Copiando archivos...', 'blue');

  const stats = {
    copied: 0,
    skipped: 0,
    errors: 0
  };

  files.forEach(file => {
    const ptPath = path.join(PT_DIR, file);
    const esPath = path.join(ES_DIR, file);
    const exists = fs.existsSync(esPath);

    try {
      if (!exists) {
        // Copiar archivo
        const content = fs.readFileSync(ptPath, 'utf8');
        fs.writeFileSync(esPath, content, 'utf8');
        log(`  ✅ ${file} copiado`, 'green');
        stats.copied++;
      } else {
        log(`  ⏭️  ${file} ya existe, omitiendo`, 'yellow');
        stats.skipped++;
      }
    } catch (error) {
      log(`  ❌ Error al copiar ${file}: ${error.message}`, 'red');
      stats.errors++;
    }
  });

  return stats;
}

function generateReport(stats, totalFiles) {
  log('\n' + '='.repeat(60), 'cyan');
  log('📊 REPORTE FINAL', 'cyan');
  log('='.repeat(60), 'cyan');

  log(`\n✅ Archivos copiados: ${stats.copied}`, 'green');
  log(`⏭️  Archivos omitidos:  ${stats.skipped}`, 'yellow');
  log(`❌ Errores:           ${stats.errors}`, 'red');

  const totalInES = fs.readdirSync(ES_DIR).filter(f => f.endsWith('.json')).length;
  const coverage = ((totalInES / totalFiles) * 100).toFixed(1);

  log(`\n📈 Cobertura total: ${totalInES}/${totalFiles} (${coverage}%)`, 'blue');

  log('\n' + '='.repeat(60) + '\n', 'cyan');

  if (coverage >= 95) {
    log('🎉 ¡Cobertura completa! Todos los archivos están disponibles.', 'green');
  } else {
    log('⚠️  Algunos archivos todavía faltan.', 'yellow');
  }
}

// Función principal
function main() {
  log('\n' + '='.repeat(60), 'cyan');
  log('🚀 COPIANDO TRADUCCIONES DE PORTUGUÉS A ESPAÑOL', 'cyan');
  log('='.repeat(60), 'cyan');

  // 1. Asegurar que existe el directorio de salida
  ensureOutputDirectory();

  // 2. Obtener archivos de portugués
  const files = getPortugueseFiles();

  // 3. Copiar archivos
  const stats = copyFiles(files);

  // 4. Generar reporte
  generateReport(stats, files.length);

  // 5. Siguiente paso
  log('📋 PRÓXIMOS PASOS:', 'blue');
  log('   1. Los archivos copiados están en portugués', 'reset');
  log('   2. Necesitan traducción manual o automatizada de portugués → español', 'reset');
  log('   3. Ejecutar: node scripts/audit-translations.cjs --language=es', 'reset');
  log('   4. Probar la aplicación cambiando el idioma a español\n', 'reset');

  log('💡 NOTA:', 'yellow');
  log('   Portugués y español son similares, muchos textos serán comprensibles', 'reset');
  log('   Puedes usar herramientas de traducción automática para convertir:', 'reset');
  log('   - DeepL API', 'reset');
  log('   - Google Translate API', 'reset');
  log('   - ChatGPT para traducciones en batch\n', 'reset');
}

// Ejecutar script
if (require.main === module) {
  main();
}

module.exports = { main };
