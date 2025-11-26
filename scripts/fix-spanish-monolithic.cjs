/**
 * Fix Spanish monolithic translation file:
 * 1. Remove BOM
 * 2. Fix encoding issues
 * 3. Add missing photo_review keys
 */

const fs = require('fs');
const path = require('path');

// Read monolithic file (with BOM and encoding issues)
const monolithicPath = path.join(__dirname, '../public/translations/es.json');
const splitPath = path.join(__dirname, '../public/translations/es/detail_hub.json');

console.log('🔧 Fixing Spanish monolithic translation file...\n');

// Read the split file first (has correct translations)
const splitContent = JSON.parse(fs.readFileSync(splitPath, 'utf8'));
const correctPhotoReview = splitContent.timecard.photo_review;

console.log('✅ Loaded correct translations from es/detail_hub.json');
console.log('   Keys:', Object.keys(correctPhotoReview).join(', '), '\n');

// Read monolithic file, stripping BOM
let rawContent = fs.readFileSync(monolithicPath, 'utf8');

// Remove BOM if present
if (rawContent.charCodeAt(0) === 0xFEFF) {
  rawContent = rawContent.slice(1);
  console.log('✅ Removed BOM from monolithic file\n');
}

// Parse JSON
const monolithicData = JSON.parse(rawContent);

// Update photo_review section with complete translations
if (!monolithicData.detail_hub) {
  monolithicData.detail_hub = {};
}
if (!monolithicData.detail_hub.timecard) {
  monolithicData.detail_hub.timecard = {};
}

// Replace with correct translations from split file
monolithicData.detail_hub.timecard.photo_review = correctPhotoReview;

console.log('✅ Updated photo_review section with complete translations\n');

// Write back WITHOUT BOM, with proper encoding
const outputJSON = JSON.stringify(monolithicData, null, 4);
fs.writeFileSync(monolithicPath, outputJSON, 'utf8');

console.log('✅ Wrote corrected file (no BOM, UTF-8)\n');
console.log('📋 Updated photo_review keys:');
Object.keys(correctPhotoReview).forEach(key => {
  console.log(`   - ${key}: "${correctPhotoReview[key]}"`);
});

console.log('\n✨ Done! Spanish monolithic file fixed.');
