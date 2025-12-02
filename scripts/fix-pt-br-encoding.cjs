/**
 * Fix PT-BR Encoding Script
 *
 * Fixes double-encoded UTF-8 characters in Portuguese translation files
 * Converts mojibake (Ã§, Ã£, etc.) back to correct Portuguese characters (ç, ã, etc.)
 */

const fs = require('fs');
const path = require('path');

const PT_BR_DIR = path.join(__dirname, '../public/translations/pt-BR');

// Array of [corrupted, correct] pairs
// Process in order - longer patterns first
const ENCODING_FIXES = [
  // Common compound patterns (FIRST)
  ['Ã§Ã£o', 'ção'],
  ['Ã§Ãµes', 'ções'],
  ['Ã§Ã£', 'çã'],
  ['nÃ£o', 'não'],

  // Uppercase accented characters
  ['Ãš', 'Ú'],  // U-acute
  ['Ã', 'Á'],   // A-acute (single char)
  ['Ã‰', 'É'],   // E-acute
  ['Ã', 'Í'],   // I-acute (single char)
  ['Ã"', 'Ó'],   // O-acute
  ['Ã€', 'À'],   // A-grave
  ['Ã‡', 'Ç'],   // C-cedilha
  ['Ã‚', 'Â'],   // A-circumflex
  ['ÃŠ', 'Ê'],   // E-circumflex
  ['Ã"', 'Ô'],   // O-circumflex
  ['Ã•', 'Õ'],   // O-tilde
  ['Ãƒ', 'Ã'],   // A-tilde

  // Lowercase accented characters
  ['Ã§', 'ç'],   // c-cedilha
  ['Ã£', 'ã'],   // a-tilde
  ['Ãµ', 'õ'],   // o-tilde
  ['Ã¡', 'á'],   // a-acute
  ['Ã©', 'é'],   // e-acute
  ['Ã­', 'í'],   // i-acute
  ['Ã³', 'ó'],   // o-acute
  ['Ãº', 'ú'],   // u-acute
  ['Ã ', 'à'],   // a-grave
  ['Ã¨', 'è'],   // e-grave
  ['Ã¬', 'ì'],   // i-grave
  ['Ã²', 'ò'],   // o-grave
  ['Ã¹', 'ù'],   // u-grave
  ['Ã¢', 'â'],   // a-circumflex
  ['Ãª', 'ê'],   // e-circumflex
  ['Ã®', 'î'],   // i-circumflex
  ['Ã´', 'ô'],   // o-circumflex
  ['Ã»', 'û'],   // u-circumflex
  ['Ã¼', 'ü'],   // u-umlaut
];

function fixEncoding(text) {
  let fixed = text;

  // Apply each fix in order
  for (const [corrupted, correct] of ENCODING_FIXES) {
    fixed = fixed.split(corrupted).join(correct);
  }

  return fixed;
}

function hasEncodingIssues(text) {
  // Check if text contains any corrupted pattern
  return ENCODING_FIXES.some(([corrupted]) => text.includes(corrupted));
}

function processFile(filePath) {
  try {
    // Read file
    const content = fs.readFileSync(filePath, 'utf8');

    // Check if file has encoding issues
    if (!hasEncodingIssues(content)) {
      console.log(`✓ SKIP: ${path.basename(filePath)} - No encoding issues`);
      return { skipped: true, fixed: false };
    }

    // Fix encoding
    const fixed = fixEncoding(content);

    // Validate JSON structure
    try {
      JSON.parse(fixed);
    } catch (jsonError) {
      console.error(`✗ ERROR: ${path.basename(filePath)} - Invalid JSON after fix`);
      console.error(`  ${jsonError.message}`);
      return { skipped: false, fixed: false, error: jsonError.message };
    }

    // Write fixed content (backup already exists from first run)
    fs.writeFileSync(filePath, fixed, 'utf8');

    console.log(`✓ FIXED: ${path.basename(filePath)}`);
    return { skipped: false, fixed: true };

  } catch (error) {
    console.error(`✗ ERROR: ${path.basename(filePath)} - ${error.message}`);
    return { skipped: false, fixed: false, error: error.message };
  }
}

function main() {
  console.log('🔧 PT-BR Encoding Fix Tool (Round 2 - Uppercase)\n');
  console.log(`📁 Directory: ${PT_BR_DIR}\n`);

  // Get all JSON files (exclude backups)
  const files = fs.readdirSync(PT_BR_DIR)
    .filter(file => file.endsWith('.json') && !file.endsWith('.bak'))
    .map(file => path.join(PT_BR_DIR, file));

  console.log(`📊 Found ${files.length} files to check\n`);

  // Process each file
  const results = {
    total: files.length,
    fixed: 0,
    skipped: 0,
    errors: 0
  };

  files.forEach(file => {
    const result = processFile(file);
    if (result.skipped) results.skipped++;
    else if (result.fixed) results.fixed++;
    else if (result.error) results.errors++;
  });

  // Summary
  console.log('\n📊 Summary:');
  console.log(`   Total files: ${results.total}`);
  console.log(`   ✓ Fixed: ${results.fixed}`);
  console.log(`   → Skipped: ${results.skipped}`);
  console.log(`   ✗ Errors: ${results.errors}`);

  if (results.fixed > 0) {
    console.log('\n✅ Encoding fixes applied successfully!');
  }

  if (results.errors > 0) {
    console.log('\n⚠️  Some files had errors - check output above');
    process.exit(1);
  }
}

main();
