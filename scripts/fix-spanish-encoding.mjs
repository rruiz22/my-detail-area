#!/usr/bin/env node

/**
 * Fix Spanish Translation Encoding Issues
 *
 * Automatically fixes UTF-8 encoding corruption in Spanish translation files
 * Example: "Ã" → "á", "â‰¤" → "≤"
 *
 * Usage: node scripts/fix-spanish-encoding.mjs [file-path]
 *        node scripts/fix-spanish-encoding.mjs --all
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Stats tracking
const stats = {
  filesProcessed: 0,
  filesModified: 0,
  totalReplacements: 0
};

/**
 * Fix encoding issues using regex patterns
 */
function fixEncoding(content) {
  let fixed = content;
  let replacements = 0;

  // Define replacement patterns
  const patterns = [
    // Specific corrupt strings found in audit
    { from: 'DiÃ¡rio', to: 'Diario' },
    { from: 'CrÃ­tico', to: 'Crítico' },
    { from: 'â‰¤', to: '<' },  // Use < instead of ≤ for simplicity
    { from: 'â‰¥', to: '>' },  // Use > instead of ≥ for simplicity

    // Common Portuguese words that need translation
    { from: '"Custo/dia"', to: '"Costo/día"' },
    { from: '"Por Dias"', to: '"Por Días"' },
    { from: '"Etapa Atual"', to: '"Etapa Actual"' },

    // More generic patterns can be added here
  ];

  // Apply each pattern
  for (const pattern of patterns) {
    const beforeLength = fixed.length;
    fixed = fixed.split(pattern.from).join(pattern.to);
    const afterLength = fixed.length;

    if (beforeLength !== afterLength || fixed.includes(pattern.to)) {
      const count = (beforeLength - afterLength) / (pattern.from.length - pattern.to.length);
      if (count > 0) {
        replacements += Math.abs(count);
        console.log(`    ✓ Fixed: "${pattern.from}" → "${pattern.to}" (${Math.abs(count)} times)`);
      }
    }
  }

  return { fixed, replacements };
}

/**
 * Process a single file
 */
function processFile(filePath) {
  console.log(`\nProcessing: ${filePath}`);

  try {
    const content = readFileSync(filePath, 'utf8');

    // Validate JSON
    try {
      JSON.parse(content);
    } catch (e) {
      console.log(`  ❌ Invalid JSON: ${e.message}`);
      return;
    }

    stats.filesProcessed++;

    // Fix encoding
    const { fixed, replacements } = fixEncoding(content);

    if (replacements > 0) {
      // Validate fixed JSON
      try {
        JSON.parse(fixed);
      } catch (e) {
        console.log(`  ❌ Fixed content is invalid JSON: ${e.message}`);
        return;
      }

      // Write back
      writeFileSync(filePath, fixed, 'utf8');
      stats.filesModified++;
      stats.totalReplacements += replacements;
      console.log(`  ✅ Fixed ${replacements} encoding issues`);
    } else {
      console.log(`  ℹ️  No encoding issues found`);
    }

  } catch (error) {
    console.error(`  ❌ Error processing file: ${error.message}`);
  }
}

/**
 * Get all Spanish translation files
 */
function getAllSpanishFiles() {
  const translationsDir = 'public/translations/es';
  const files = [];

  try {
    const entries = readdirSync(translationsDir);

    for (const entry of entries) {
      const fullPath = join(translationsDir, entry);
      const stat = statSync(fullPath);

      if (stat.isFile() && entry.endsWith('.json')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory: ${error.message}`);
  }

  return files.sort();
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);

  console.log('🔧 Spanish Translation Encoding Fix');
  console.log('='.repeat(60));

  if (args.length === 0 || args[0] === '--help') {
    console.log('\nUsage:');
    console.log('  node scripts/fix-spanish-encoding.mjs <file-path>');
    console.log('  node scripts/fix-spanish-encoding.mjs --all');
    console.log('\nExamples:');
    console.log('  node scripts/fix-spanish-encoding.mjs public/translations/es/get_ready.json');
    console.log('  node scripts/fix-spanish-encoding.mjs --all');
    process.exit(0);
  }

  let filesToProcess = [];

  if (args[0] === '--all') {
    filesToProcess = getAllSpanishFiles();
    console.log(`\nFound ${filesToProcess.length} Spanish translation files\n`);
  } else {
    filesToProcess = [args[0]];
  }

  // Process each file
  for (const file of filesToProcess) {
    processFile(file);
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`Files processed: ${stats.filesProcessed}`);
  console.log(`Files modified: ${stats.filesModified}`);
  console.log(`Total replacements: ${stats.totalReplacements}`);
  console.log('='.repeat(60));
}

main();
