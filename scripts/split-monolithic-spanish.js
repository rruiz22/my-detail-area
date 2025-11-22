#!/usr/bin/env node

/**
 * Script para dividir el archivo monolítico de traducciones español
 * en 80 archivos namespace individuales
 *
 * Uso: node scripts/split-monolithic-spanish.js
 */

const fs = require('fs');
const path = require('path');

// Configuración de rutas
const MONOLITHIC_FILE = path.join(__dirname, '../public/translations/_backup_monolithic/es.json');
const OUTPUT_DIR = path.join(__dirname, '../public/translations/es');
const EN_DIR = path.join(__dirname, '../public/translations/en');

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

function readMonolithicFile() {
  log('\n📖 Leyendo archivo monolítico...', 'blue');

  if (!fs.existsSync(MONOLITHIC_FILE)) {
    log(`❌ Error: No se encontró el archivo ${MONOLITHIC_FILE}`, 'red');
    process.exit(1);
  }

  try {
    const content = fs.readFileSync(MONOLITHIC_FILE, 'utf8');
    // Remover BOM si existe
    const cleanContent = content.replace(/^\uFEFF/, '');
    const data = JSON.parse(cleanContent);
    log(`✅ Archivo leído correctamente (${Object.keys(data).length} namespaces encontrados)`, 'green');
    return data;
  } catch (error) {
    log(`❌ Error al leer el archivo: ${error.message}`, 'red');
    process.exit(1);
  }
}

function getEnglishNamespaces() {
  log('\n📋 Obteniendo lista de namespaces de inglés...', 'blue');

  if (!fs.existsSync(EN_DIR)) {
    log(`❌ Error: No se encontró el directorio ${EN_DIR}`, 'red');
    process.exit(1);
  }

  const files = fs.readdirSync(EN_DIR)
    .filter(file => file.endsWith('.json'))
    .map(file => file.replace('.json', ''));

  log(`✅ ${files.length} namespaces encontrados en inglés`, 'green');
  return files;
}

function ensureOutputDirectory() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    log(`\n📁 Creando directorio de salida: ${OUTPUT_DIR}`, 'yellow');
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

function splitNamespaces(monolithicData, namespaces) {
  log('\n🔧 Dividiendo namespaces...', 'blue');

  const stats = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0
  };

  namespaces.forEach(namespace => {
    const outputPath = path.join(OUTPUT_DIR, `${namespace}.json`);
    const exists = fs.existsSync(outputPath);

    // Si el namespace existe en el archivo monolítico
    if (monolithicData[namespace]) {
      try {
        const content = JSON.stringify(monolithicData[namespace], null, 2);

        // Si el archivo ya existe, comparar contenido
        if (exists) {
          const existingContent = fs.readFileSync(outputPath, 'utf8');
          const existingData = JSON.parse(existingContent);

          // Si el monolítico tiene más keys, actualizar
          const monolithicKeys = Object.keys(flattenObject(monolithicData[namespace])).length;
          const existingKeys = Object.keys(flattenObject(existingData)).length;

          if (monolithicKeys > existingKeys) {
            fs.writeFileSync(outputPath, content, 'utf8');
            log(`  ✅ ${namespace}.json actualizado (${existingKeys} → ${monolithicKeys} keys)`, 'cyan');
            stats.updated++;
          } else {
            log(`  ⏭️  ${namespace}.json ya existe y está completo (${existingKeys} keys)`, 'yellow');
            stats.skipped++;
          }
        } else {
          fs.writeFileSync(outputPath, content, 'utf8');
          const keyCount = Object.keys(flattenObject(monolithicData[namespace])).length;
          log(`  ✅ ${namespace}.json creado (${keyCount} keys)`, 'green');
          stats.created++;
        }
      } catch (error) {
        log(`  ❌ Error al procesar ${namespace}: ${error.message}`, 'red');
        stats.errors++;
      }
    } else {
      // Si no existe en el monolítico pero existe en inglés
      if (!exists) {
        log(`  ⚠️  ${namespace}.json no encontrado en monolítico - requiere traducción manual`, 'yellow');
        stats.skipped++;
      }
    }
  });

  return stats;
}

// Función auxiliar para aplanar objeto (contar keys totales)
function flattenObject(obj, prefix = '') {
  let result = {};

  for (const key in obj) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      Object.assign(result, flattenObject(obj[key], newKey));
    } else {
      result[newKey] = obj[key];
    }
  }

  return result;
}

function generateReport(stats, namespaces) {
  log('\n' + '='.repeat(60), 'cyan');
  log('📊 REPORTE FINAL', 'cyan');
  log('='.repeat(60), 'cyan');

  log(`\n✅ Archivos creados:    ${stats.created}`, 'green');
  log(`🔄 Archivos actualizados: ${stats.updated}`, 'cyan');
  log(`⏭️  Archivos omitidos:    ${stats.skipped}`, 'yellow');
  log(`❌ Errores:              ${stats.errors}`, 'red');

  const totalProcessed = stats.created + stats.updated;
  const coverage = ((totalProcessed / namespaces.length) * 100).toFixed(1);

  log(`\n📈 Cobertura total: ${totalProcessed}/${namespaces.length} (${coverage}%)`, 'blue');

  // Verificar archivos faltantes
  const existingFiles = fs.readdirSync(OUTPUT_DIR)
    .filter(file => file.endsWith('.json'))
    .map(file => file.replace('.json', ''));

  const missingNamespaces = namespaces.filter(ns => !existingFiles.includes(ns));

  if (missingNamespaces.length > 0) {
    log(`\n⚠️  Namespaces faltantes (${missingNamespaces.length}):`, 'yellow');
    missingNamespaces.slice(0, 10).forEach(ns => {
      log(`   - ${ns}.json`, 'yellow');
    });
    if (missingNamespaces.length > 10) {
      log(`   ... y ${missingNamespaces.length - 10} más`, 'yellow');
    }
  } else {
    log('\n🎉 ¡Todos los namespaces están completos!', 'green');
  }

  log('\n' + '='.repeat(60) + '\n', 'cyan');
}

// Función principal
function main() {
  log('\n' + '='.repeat(60), 'cyan');
  log('🚀 INICIANDO DIVISIÓN DE TRADUCCIONES EN ESPAÑOL', 'cyan');
  log('='.repeat(60), 'cyan');

  // 1. Leer archivo monolítico
  const monolithicData = readMonolithicFile();

  // 2. Obtener lista de namespaces de inglés
  const namespaces = getEnglishNamespaces();

  // 3. Asegurar que existe el directorio de salida
  ensureOutputDirectory();

  // 4. Dividir namespaces
  const stats = splitNamespaces(monolithicData, namespaces);

  // 5. Generar reporte
  generateReport(stats, namespaces);

  // 6. Siguiente paso
  log('📋 PRÓXIMOS PASOS:', 'blue');
  log('   1. Revisar los archivos generados en public/translations/es/', 'reset');
  log('   2. Ejecutar: node scripts/audit-translations.cjs --language=es', 'reset');
  log('   3. Probar la aplicación cambiando el idioma a español\n', 'reset');
}

// Ejecutar script
if (require.main === module) {
  main();
}

module.exports = { main };
