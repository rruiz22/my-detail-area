#!/usr/bin/env node

/**
 * Translate Portuguese to Spanish using mapping
 *
 * Usage: node scripts/translate-pt-to-es.mjs <file-path>
 */

import { readFileSync, writeFileSync } from 'fs';

// Load the mapping
const mapping = JSON.parse(readFileSync('scripts/portuguese-to-spanish-map.json', 'utf8'));

// Flatten all mappings into a single object
const allMappings = {
  ...mapping.mappings.common_words,
  ...mapping.mappings.verbs,
  ...mapping.mappings.phrases,
  ...mapping.mappings.ui_elements,
  ...mapping.mappings.date_time,
  ...mapping.mappings.dealership_specific
};

function translateText(text) {
  let translated = text;

  // Sort keys by length (longest first) to avoid partial replacements
  const sortedKeys = Object.keys(allMappings).sort((a, b) => b.length - a.length);

  for (const ptWord of sortedKeys) {
    const esWord = allMappings[ptWord];

    // Create regex to match whole words (with word boundaries)
    const regex = new RegExp(`\\b${ptWord}\\b`, 'gi');
    translated = translated.replace(regex, esWord);
  }

  return translated;
}

function processJSON(obj) {
  if (typeof obj === 'string') {
    return translateText(obj);
  } else if (Array.isArray(obj)) {
    return obj.map(item => processJSON(item));
  } else if (typeof obj === 'object' && obj !== null) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = processJSON(value);
    }
    return result;
  }
  return obj;
}

// Main
const filePath = process.argv[2];

if (!filePath) {
  console.error('Usage: node translate-pt-to-es.mjs <file-path>');
  process.exit(1);
}

try {
  console.log(`Reading: ${filePath}`);
  const content = readFileSync(filePath, 'utf8');
  const json = JSON.parse(content);

  console.log('Translating Portuguese → Spanish...');
  const translated = processJSON(json);

  console.log('Writing translated content...');
  writeFileSync(filePath, JSON.stringify(translated, null, 2), 'utf8');

  console.log('✅ Translation complete!');
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
