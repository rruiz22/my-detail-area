/**
 * Merge Detail Hub Translations
 *
 * Safely merges detail_hub translation keys into main translation files.
 * Creates backups before modifying.
 *
 * Usage: node scripts/merge-detail-hub-translations.js
 */

const fs = require('fs');
const path = require('path');

const TRANSLATIONS_DIR = path.join(__dirname, '..', 'public', 'translations');

const FILES = [
  { main: 'en.json', detailHub: 'detail_hub_EN.json', lang: 'EN' },
  { main: 'es.json', detailHub: 'detail_hub_ES.json', lang: 'ES' },
  { main: 'pt-BR.json', detailHub: 'detail_hub_PT-BR.json', lang: 'PT-BR' },
];

console.log('🔄 Starting Detail Hub translation merge...\n');

FILES.forEach(({ main, detailHub, lang }) => {
  console.log(`📝 Processing ${lang}...`);

  const mainPath = path.join(TRANSLATIONS_DIR, main);
  const detailHubPath = path.join(TRANSLATIONS_DIR, detailHub);
  const backupPath = path.join(TRANSLATIONS_DIR, `${main}.backup`);

  try {
    // Read files
    const mainContent = JSON.parse(fs.readFileSync(mainPath, 'utf8'));
    const detailHubContent = JSON.parse(fs.readFileSync(detailHubPath, 'utf8'));

    // Create backup
    fs.writeFileSync(backupPath, JSON.stringify(mainContent, null, 2), 'utf8');
    console.log(`   ✅ Backup created: ${main}.backup`);

    // Merge detail_hub keys (this will replace existing detail_hub section if any)
    const merged = {
      ...mainContent,
      detail_hub: detailHubContent.detail_hub
    };

    // Write merged content
    fs.writeFileSync(mainPath, JSON.stringify(merged, null, 2), 'utf8');
    console.log(`   ✅ Merged detail_hub keys into ${main}`);
    console.log(`   📊 Keys added: ${JSON.stringify(merged.detail_hub).length} characters\n`);

  } catch (error) {
    console.error(`   ❌ Error processing ${lang}:`, error.message);
  }
});

console.log('✅ Translation merge complete!');
console.log('\nNext steps:');
console.log('1. Review the updated translation files');
console.log('2. If something went wrong, restore from .backup files');
console.log('3. Update components to use t("detail_hub.xxx") keys');
console.log('4. Run: npm run translation:audit');
