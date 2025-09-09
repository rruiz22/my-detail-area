#!/usr/bin/env node

/**
 * Translation Audit Script - Comprehensive Analysis
 * Run with: node scripts/audit-translations.js
 */

const fs = require('fs');
const path = require('path');

// Translation patterns to search for
const translationPatterns = [
  /t\(['"`]([^'"`]+)['"`]\)/g,
  /t\(['"`]([^'"`]+)['"`]\s*,\s*{[^}]*}\)/g,
  /\{t\(['"`]([^'"`]+)['"`]\)\}/g,
  /\{t\(['"`]([^'"`]+)['"`]\s*,\s*{[^}]*}\)\}/g,
];

// Directories to scan
const sourceDirectories = [
  'src/pages',
  'src/components', 
  'src/hooks',
  'src/contexts'
];

// Translation files
const translationFiles = {
  en: 'public/translations/en.json',
  es: 'public/translations/es.json',
  pt: 'public/translations/pt-BR.json'
};

/**
 * Get all TypeScript/TSX files recursively
 */
function getAllTsxFiles(dir) {
  const files = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip hidden directories and node_modules
        if (!item.startsWith('.') && !['node_modules', 'dist', 'build'].includes(item)) {
          files.push(...getAllTsxFiles(fullPath));
        }
      } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.warn(`⚠️ Could not scan ${dir}`);
  }
  
  return files;
}

/**
 * Extract translation keys from file content
 */
function extractTranslationKeys(content) {
  const keys = new Set();
  
  for (const pattern of translationPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      keys.add(match[1]);
    }
    pattern.lastIndex = 0; // Reset regex
  }
  
  return Array.from(keys);
}

/**
 * Check if nested key exists in object
 */
function hasNestedKey(obj, keyPath) {
  const keys = keyPath.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (typeof current !== 'object' || current === null || current[key] === undefined) {
      return false;
    }
    current = current[key];
  }
  
  return true;
}

/**
 * Count total keys in nested object
 */
function countTotalKeys(obj, depth = 0) {
  if (depth > 10) return 0; // Prevent infinite recursion
  
  let count = 0;
  for (const value of Object.values(obj)) {
    if (typeof value === 'object' && value !== null) {
      count += countTotalKeys(value, depth + 1);
    } else {
      count += 1;
    }
  }
  return count;
}

/**
 * Main audit function
 */
async function runTranslationAudit() {
  console.log('🔍 STARTING COMPREHENSIVE TRANSLATION AUDIT');
  console.log('==========================================');
  
  try {
    // 1. Scan all files for translation usage
    console.log('📁 Scanning source files...');
    const allFiles = [];
    for (const dir of sourceDirectories) {
      if (fs.existsSync(dir)) {
        allFiles.push(...getAllTsxFiles(dir));
      }
    }
    
    console.log(`📂 Found ${allFiles.length} TypeScript files`);
    
    // 2. Extract all translation keys
    console.log('🔑 Extracting translation keys...');
    const usedKeys = new Set();
    const fileMap = {};
    
    for (const file of allFiles) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        const keys = extractTranslationKeys(content);
        
        if (keys.length > 0) {
          fileMap[file] = keys;
          keys.forEach(key => usedKeys.add(key));
        }
      } catch (error) {
        console.warn(`⚠️ Could not process ${file}`);
      }
    }
    
    const usedKeysArray = Array.from(usedKeys);
    console.log(`🎯 Found ${usedKeysArray.length} unique translation keys`);
    
    // 3. Load translation files
    console.log('📚 Loading translation files...');
    const translations = {};
    
    for (const [lang, filePath] of Object.entries(translationFiles)) {
      try {
        if (fs.existsSync(filePath)) {
          translations[lang] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          console.log(`✅ ${lang.toUpperCase()}: ${countTotalKeys(translations[lang])} keys loaded`);
        } else {
          console.log(`❌ ${lang.toUpperCase()}: File not found at ${filePath}`);
          translations[lang] = {};
        }
      } catch (error) {
        console.log(`❌ ${lang.toUpperCase()}: Parse error - ${error.message}`);
        translations[lang] = {};
      }
    }
    
    // 4. Find missing keys
    console.log('\n🔍 ANALYZING COVERAGE...');
    const missingKeys = {
      en: usedKeysArray.filter(key => !hasNestedKey(translations.en, key)),
      es: usedKeysArray.filter(key => !hasNestedKey(translations.es, key)),
      pt: usedKeysArray.filter(key => !hasNestedKey(translations.pt, key))
    };
    
    // 5. Generate report
    console.log('\n📊 COVERAGE REPORT');
    console.log('==================');
    
    for (const [lang, missing] of Object.entries(missingKeys)) {
      const coverage = ((usedKeysArray.length - missing.length) / usedKeysArray.length * 100).toFixed(1);
      const status = missing.length === 0 ? '✅' : '⚠️';
      
      console.log(`${status} ${lang.toUpperCase()}: ${coverage}% coverage (${missing.length} missing)`);
      
      if (missing.length > 0 && missing.length <= 10) {
        missing.forEach(key => console.log(`   - ${key}`));
      } else if (missing.length > 10) {
        missing.slice(0, 5).forEach(key => console.log(`   - ${key}`));
        console.log(`   ... and ${missing.length - 5} more`);
      }
    }
    
    // 6. Show most problematic files
    console.log('\n📄 FILES WITH MOST MISSING KEYS:');
    const fileIssues = Object.entries(fileMap)
      .map(([file, keys]) => {
        const missing = keys.filter(key => 
          missingKeys.en.includes(key) || 
          missingKeys.es.includes(key) || 
          missingKeys.pt.includes(key)
        );
        return { file: file.replace(process.cwd() + '/', ''), keys: keys.length, missing: missing.length };
      })
      .filter(item => item.missing > 0)
      .sort((a, b) => b.missing - a.missing)
      .slice(0, 10);
    
    fileIssues.forEach(item => {
      const fileName = item.file.split('/').pop();
      console.log(`⚠️  ${fileName}: ${item.missing}/${item.keys} keys missing`);
    });
    
    // 7. Summary
    const totalMissing = new Set([...missingKeys.en, ...missingKeys.es, ...missingKeys.pt]).size;
    const overallCoverage = ((usedKeysArray.length - totalMissing) / usedKeysArray.length * 100).toFixed(1);
    
    console.log('\n🎯 SUMMARY');
    console.log('==========');
    console.log(`Overall Translation Coverage: ${overallCoverage}%`);
    console.log(`Total Missing Keys: ${totalMissing}`);
    console.log(`Recommendation: ${totalMissing === 0 ? 'Translation system is complete! ✅' : 'Add missing translations to achieve 100% coverage'}`);
    
  } catch (error) {
    console.error('❌ Audit failed:', error);
  }
}

// Run the audit
runTranslationAudit();