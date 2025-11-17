#!/usr/bin/env node

/**
 * Script para dividir traducciones monolíticas en namespaces modulares
 *
 * Convierte:
 *   public/translations/en.json (500KB)
 *
 * En:
 *   public/translations/en/common.json (10KB)
 *   public/translations/en/sales.json (40KB)
 *   public/translations/en/contacts.json (30KB)
 *   ...
 *
 * Esto permite lazy loading por ruta/feature y reduce carga inicial de 500KB a ~10KB
 */

const fs = require('fs');
const path = require('path');

// Colores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`)
};

const TRANSLATIONS_DIR = path.join(__dirname, '..', 'public', 'translations');
const BACKUP_DIR = path.join(TRANSLATIONS_DIR, '_backup_monolithic');
const LANGUAGES = ['en', 'es', 'pt-BR'];

/**
 * Crear directorio si no existe
 */
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    log.info(`Created directory: ${dir}`);
  }
}

/**
 * Obtener tamaño de archivo en KB
 */
function getFileSizeKB(filePath) {
  const stats = fs.statSync(filePath);
  return (stats.size / 1024).toFixed(2);
}

/**
 * Dividir traducciones por idioma
 */
function splitLanguageFile(language) {
  const sourceFile = path.join(TRANSLATIONS_DIR, `${language}.json`);

  if (!fs.existsSync(sourceFile)) {
    log.error(`Source file not found: ${sourceFile}`);
    return null;
  }

  log.info(`Processing ${language}.json (${getFileSizeKB(sourceFile)} KB)`);

  try {
    // Leer archivo monolítico y remover BOM si existe
    let content = fs.readFileSync(sourceFile, 'utf8');

    // Remover BOM (Byte Order Mark) si está presente
    if (content.charCodeAt(0) === 0xFEFF) {
      content = content.substring(1);
      log.warn(`  Removed BOM from ${language}.json`);
    }

    const translations = JSON.parse(content);

  // Crear directorio para este idioma
  const langDir = path.join(TRANSLATIONS_DIR, language);
  ensureDir(langDir);

  // Estadísticas
  const stats = {
    namespaces: 0,
    totalSize: 0,
    files: []
  };

  // Dividir por namespace (cada key de primer nivel)
  for (const [namespace, content] of Object.entries(translations)) {
    const namespaceFile = path.join(langDir, `${namespace}.json`);
    const namespaceContent = JSON.stringify(content, null, 2);

    fs.writeFileSync(namespaceFile, namespaceContent, 'utf8');

    const sizeKB = (namespaceContent.length / 1024).toFixed(2);
    stats.namespaces++;
    stats.totalSize += parseFloat(sizeKB);
    stats.files.push({ namespace, size: sizeKB });

    log.success(`  Created ${namespace}.json (${sizeKB} KB)`);
  }

  // Ordenar por tamaño para ver los más grandes
  stats.files.sort((a, b) => parseFloat(b.size) - parseFloat(a.size));

    log.info(`\n${language} Summary:`);
    log.info(`  Total namespaces: ${stats.namespaces}`);
    log.info(`  Total size: ${stats.totalSize.toFixed(2)} KB`);
    log.info(`  Largest namespaces:`);
    stats.files.slice(0, 5).forEach(file => {
      log.info(`    - ${file.namespace}: ${file.size} KB`);
    });

    return stats;
  } catch (error) {
    log.error(`Failed to process ${language}.json: ${error.message}`);
    log.warn(`  Skipping ${language}. You may need to manually fix this file.`);
    log.warn(`  Error details: ${error.message}`);
    return null;
  }
}

/**
 * Hacer backup de archivos monolíticos
 */
function backupMonolithicFiles() {
  log.info('\n📦 Creating backup of monolithic files...');
  ensureDir(BACKUP_DIR);

  LANGUAGES.forEach(lang => {
    const sourceFile = path.join(TRANSLATIONS_DIR, `${lang}.json`);
    if (fs.existsSync(sourceFile)) {
      const backupFile = path.join(BACKUP_DIR, `${lang}.json`);
      fs.copyFileSync(sourceFile, backupFile);
      log.success(`  Backed up ${lang}.json → _backup_monolithic/${lang}.json`);
    }
  });
}

/**
 * Validar que todas las keys existen en todos los idiomas
 */
function validateConsistency() {
  log.info('\n🔍 Validating consistency across languages...');

  const namespacesByLang = {};

  LANGUAGES.forEach(lang => {
    const langDir = path.join(TRANSLATIONS_DIR, lang);
    if (fs.existsSync(langDir)) {
      const files = fs.readdirSync(langDir).filter(f => f.endsWith('.json'));
      namespacesByLang[lang] = files.map(f => f.replace('.json', ''));
    }
  });

  // Verificar que todos los idiomas tienen los mismos namespaces
  const baseNamespaces = namespacesByLang['en'] || [];
  let allConsistent = true;

  LANGUAGES.forEach(lang => {
    if (lang === 'en') return;

    const langNamespaces = namespacesByLang[lang] || [];
    const missing = baseNamespaces.filter(ns => !langNamespaces.includes(ns));
    const extra = langNamespaces.filter(ns => !baseNamespaces.includes(ns));

    if (missing.length > 0) {
      log.warn(`  ${lang} missing namespaces: ${missing.join(', ')}`);
      allConsistent = false;
    }

    if (extra.length > 0) {
      log.warn(`  ${lang} has extra namespaces: ${extra.join(', ')}`);
      allConsistent = false;
    }
  });

  if (allConsistent) {
    log.success('  All languages have consistent namespaces ✓');
  } else {
    log.error('  Inconsistencies found! Review warnings above.');
  }

  return allConsistent;
}

/**
 * Main execution
 */
function main() {
  console.log('\n' + '='.repeat(60));
  log.info('Translation Splitting Script - Code Splitting Implementation');
  console.log('='.repeat(60) + '\n');

  try {
    // Paso 1: Backup
    backupMonolithicFiles();

    // Paso 2: Split por idioma
    log.info('\n📂 Splitting translations into namespaces...\n');
    const allStats = {};
    LANGUAGES.forEach(lang => {
      allStats[lang] = splitLanguageFile(lang);
      console.log(''); // Separador
    });

    // Paso 3: Validación
    const isConsistent = validateConsistency();

    // Resumen final
    console.log('\n' + '='.repeat(60));
    log.success('Translation splitting completed!');
    console.log('='.repeat(60));

    log.info('\n📊 Final Statistics:');
    LANGUAGES.forEach(lang => {
      if (allStats[lang]) {
        log.info(`  ${lang}: ${allStats[lang].namespaces} namespaces, ${allStats[lang].totalSize.toFixed(2)} KB total`);
      }
    });

    log.info('\n📁 Directory structure created:');
    log.info('  public/translations/');
    log.info('    ├── _backup_monolithic/  (original files)');
    LANGUAGES.forEach(lang => {
      log.info(`    ├── ${lang}/`);
      log.info(`    │   ├── common.json`);
      log.info(`    │   ├── sales.json`);
      log.info(`    │   └── ... (${allStats[lang]?.namespaces || 0} files)`);
    });

    if (isConsistent) {
      log.success('\n✅ All validations passed!');
      log.info('\nNext steps:');
      log.info('  1. Update src/lib/i18n.ts to use i18next-http-backend');
      log.info('  2. Update pages to specify namespaces');
      log.info('  3. Test thoroughly');
    } else {
      log.error('\n⚠️  Validation failed. Fix inconsistencies before proceeding.');
      process.exit(1);
    }

  } catch (error) {
    log.error(`\nFatal error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run script
main();
