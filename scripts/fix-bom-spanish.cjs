#!/usr/bin/env node

/**
 * Script para eliminar BOM (Byte Order Mark) de archivos JSON de español
 *
 * Uso: node scripts/fix-bom-spanish.cjs
 */

const fs = require('fs');
const path = require('path');

const ES_DIR = path.join(__dirname, '../public/translations/es');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function fixBOM() {
  log('\n🔧 Eliminando BOM de archivos JSON...', 'blue');

  const files = fs.readdirSync(ES_DIR).filter(f => f.endsWith('.json'));
  let fixed = 0;
  let skipped = 0;

  files.forEach(file => {
    const filePath = path.join(ES_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');

    // Verificar si tiene BOM
    if (content.charCodeAt(0) === 0xFEFF) {
      // Remover BOM y reescribir
      const cleanContent = content.slice(1);
      fs.writeFileSync(filePath, cleanContent, 'utf8');
      log(`  ✅ ${file} - BOM eliminado`, 'green');
      fixed++;
    } else {
      skipped++;
    }
  });

  log(`\n📊 Resultado:`, 'cyan');
  log(`   ✅ Archivos corregidos: ${fixed}`, 'green');
  log(`   ⏭️  Sin BOM: ${skipped}`, 'yellow');
  log(`   📁 Total procesados: ${files.length}\n`, 'blue');
}

function main() {
  log('\n' + '='.repeat(60), 'cyan');
  log('🚀 ELIMINANDO BOM DE ARCHIVOS DE TRADUCCIÓN', 'cyan');
  log('='.repeat(60), 'cyan');

  fixBOM();

  log('✅ Proceso completado. Los archivos ahora son JSON válido.\n', 'green');
}

if (require.main === module) {
  main();
}

module.exports = { main };
