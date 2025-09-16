#!/usr/bin/env node

/**
 * Simple Hardcoded String Finder
 * Uses only Node.js built-in modules to find hardcoded strings
 */

const fs = require('fs');
const path = require('path');

class SimpleStringFinder {
  constructor() {
    this.srcDir = path.join(__dirname, '../src');
    this.results = [];
  }

  /**
   * Main execution function
   */
  async execute() {
    console.log('🔍 Analyzing codebase for hardcoded strings...\n');

    const files = this.findTsxFiles(this.srcDir);
    console.log(`📁 Scanning ${files.length} files...\n`);

    for (const file of files) {
      const analysis = this.analyzeFile(file);
      if (analysis.hardcodedStrings.length > 0) {
        this.results.push(analysis);
      }
    }

    // Sort by number of hardcoded strings (descending)
    this.results.sort((a, b) => b.hardcodedStrings.length - a.hardcodedStrings.length);

    this.printResults();
    this.createBatchFixScript();
  }

  /**
   * Recursively find all TSX/TS files
   */
  findTsxFiles(dir) {
    const files = [];

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Skip certain directories
          if (!['node_modules', 'dist', 'build', '.git'].includes(entry.name)) {
            files.push(...this.findTsxFiles(fullPath));
          }
        } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
          // Skip type definition files
          if (!entry.name.endsWith('.d.ts')) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not read directory ${dir}`);
    }

    return files;
  }

  /**
   * Analyze a single file for hardcoded strings
   */
  analyzeFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(this.srcDir, filePath);

    const hardcodedStrings = [];
    const hasTranslation = content.includes('useTranslation') || content.includes('t(');

    // Find hardcoded strings using simple patterns
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Skip lines that already use translation
      if (line.includes('t(') || line.includes('useTranslation')) {
        continue;
      }

      // Find toast messages
      const toastMatches = line.match(/toast\.(success|error|info|warning)\(['"`]([^'"`]+)['"`]\)/g);
      if (toastMatches) {
        for (const match of toastMatches) {
          const text = match.match(/['"`]([^'"`]+)['"`]/)[1];
          hardcodedStrings.push({
            text,
            lineNumber,
            type: 'toast',
            context: line.trim()
          });
        }
      }

      // Find JSX text content
      const jsxMatches = line.match(/>([A-Z][a-zA-Z\s]{3,40})</g);
      if (jsxMatches) {
        for (const match of jsxMatches) {
          const text = match.slice(1, -1).trim();
          if (!text.includes('{') && text.split(' ').length >= 2) {
            hardcodedStrings.push({
              text,
              lineNumber,
              type: 'jsx_text',
              context: line.trim()
            });
          }
        }
      }

      // Find quoted strings that look like UI text
      const quotedMatches = line.match(/(['"`])([A-Z][a-zA-Z\s]{3,40})\1/g);
      if (quotedMatches) {
        for (const match of quotedMatches) {
          const text = match.slice(1, -1);
          if (!text.includes('/') && !text.includes('@') && text.split(' ').length >= 2) {
            hardcodedStrings.push({
              text,
              lineNumber,
              type: 'quoted_string',
              context: line.trim()
            });
          }
        }
      }

      // Find placeholder text
      const placeholderMatches = line.match(/placeholder=['"`]([A-Z][^'"`]{3,40})['"`]/g);
      if (placeholderMatches) {
        for (const match of placeholderMatches) {
          const text = match.match(/['"`]([^'"`]+)['"`]/)[1];
          hardcodedStrings.push({
            text,
            lineNumber,
            type: 'placeholder',
            context: line.trim()
          });
        }
      }

      // Find button text
      const buttonMatches = line.match(/<Button[^>]*>([A-Z][a-zA-Z\s]+)<\/Button>/g);
      if (buttonMatches) {
        for (const match of buttonMatches) {
          const text = match.match(/>([^<]+)</)[1].trim();
          if (!text.includes('{')) {
            hardcodedStrings.push({
              text,
              lineNumber,
              type: 'button_text',
              context: line.trim()
            });
          }
        }
      }
    }

    // Remove duplicates based on text
    const uniqueStrings = [];
    const seen = new Set();

    for (const str of hardcodedStrings) {
      if (!seen.has(str.text)) {
        seen.add(str.text);
        uniqueStrings.push(str);
      }
    }

    return {
      filePath,
      relativePath,
      hasTranslation,
      hardcodedStrings: uniqueStrings,
      totalLines: lines.length
    };
  }

  /**
   * Print analysis results
   */
  printResults() {
    console.log('📊 HARDCODED STRINGS ANALYSIS RESULTS');
    console.log('=' .repeat(60));

    if (this.results.length === 0) {
      console.log('✅ No obvious hardcoded strings found!');
      return;
    }

    console.log(`\n🎯 TOP ${Math.min(15, this.results.length)} FILES WITH MOST HARDCODED STRINGS:\n`);

    for (let i = 0; i < Math.min(15, this.results.length); i++) {
      const result = this.results[i];
      const coverage = result.hasTranslation ? '🔄 Partial' : '❌ None';

      console.log(`${i + 1}. ${result.relativePath}`);
      console.log(`   📍 ${result.hardcodedStrings.length} hardcoded strings | i18n: ${coverage}`);

      // Show top strings
      const topStrings = result.hardcodedStrings.slice(0, 4);
      for (const str of topStrings) {
        console.log(`   ├─ "${str.text}" (${str.type}:${str.lineNumber})`);
      }

      if (result.hardcodedStrings.length > 4) {
        console.log(`   └─ ... and ${result.hardcodedStrings.length - 4} more`);
      }
      console.log();
    }

    // Summary statistics
    const totalStrings = this.results.reduce((sum, r) => sum + r.hardcodedStrings.length, 0);
    const filesWithTranslation = this.results.filter(r => r.hasTranslation).length;

    console.log('\n📈 SUMMARY STATISTICS:');
    console.log(`├─ Total files with hardcoded strings: ${this.results.length}`);
    console.log(`├─ Total hardcoded strings found: ${totalStrings}`);
    console.log(`├─ Files with partial i18n setup: ${filesWithTranslation}`);
    console.log(`├─ Files needing complete i18n setup: ${this.results.length - filesWithTranslation}`);

    const averageStrings = Math.round(totalStrings / this.results.length);
    console.log(`└─ Average hardcoded strings per file: ${averageStrings}`);

    // String type breakdown
    console.log('\n🏷️  STRING TYPE BREAKDOWN:');
    const typeBreakdown = {};
    for (const result of this.results) {
      for (const str of result.hardcodedStrings) {
        typeBreakdown[str.type] = (typeBreakdown[str.type] || 0) + 1;
      }
    }

    Object.entries(typeBreakdown)
      .sort(([,a], [,b]) => b - a)
      .forEach(([type, count]) => {
        console.log(`├─ ${type}: ${count} strings`);
      });
  }

  /**
   * Create a batch fix script for the top files
   */
  createBatchFixScript() {
    if (this.results.length === 0) return;

    const topFiles = this.results.slice(0, 5); // Top 5 files
    let scriptContent = `#!/usr/bin/env node

/**
 * Batch Fix Script for Hardcoded Strings
 * Auto-generated on: ${new Date().toISOString()}
 *
 * This script will fix the top ${topFiles.length} files with the most hardcoded strings.
 */

const fs = require('fs');
const path = require('path');

// Target files to process
const targetFiles = [
${topFiles.map(f => `  '${f.relativePath}'`).join(',\n')}
];

// Common string mappings
const stringMappings = {
`;

    // Collect all unique strings from top files
    const allStrings = new Set();
    for (const result of topFiles) {
      for (const str of result.hardcodedStrings) {
        allStrings.add(str.text);
      }
    }

    // Generate mappings for common strings
    const commonStrings = [...allStrings].slice(0, 30); // Top 30 most common
    for (const str of commonStrings) {
      const key = this.generateTranslationKey(str);
      scriptContent += `  '${str.replace(/'/g, "\\'")}': '${key}',\n`;
    }

    scriptContent += `};

console.log('🚀 Starting batch processing of hardcoded strings...');
console.log(\`📋 Processing \${targetFiles.length} files with \${Object.keys(stringMappings).length} string mappings\`);

let totalReplacements = 0;

for (const relativePath of targetFiles) {
  const filePath = path.join(__dirname, '../src', relativePath);

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let fileReplacements = 0;

    // Add translation import if needed
    if (!content.includes('useTranslation')) {
      if (content.includes("import { useTranslation }")) {
        // Already has import but not using it
      } else {
        // Add import after React import or at top
        const reactImportMatch = content.match(/import.*?from\\s+['"]react['"];?\\s*\\n/);
        if (reactImportMatch) {
          content = content.replace(reactImportMatch[0],
            reactImportMatch[0] + "import { useTranslation } from 'react-i18next';\\n");
        } else {
          content = "import { useTranslation } from 'react-i18next';\\n" + content;
        }
      }
    }

    // Add translation hook if needed
    if (!content.includes('const { t }') && !content.includes('const {t}')) {
      const funcMatch = content.match(/(export\\s+function\\s+\\w+.*?\\{[\\s\\n]*|const\\s+\\w+.*?=.*?\\{[\\s\\n]*)/);
      if (funcMatch) {
        content = content.replace(funcMatch[0], funcMatch[0] + "  const { t } = useTranslation();\\n");
      }
    }

    // Replace hardcoded strings
    for (const [original, translationKey] of Object.entries(stringMappings)) {
      // Escape special regex characters
      const escapedOriginal = original.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&');

      // Replace in JSX content: >Text< becomes >{t('key')}<
      const jsxPattern = new RegExp(\`(>\\\\s*)\${escapedOriginal}(\\\\s*<)\`, 'g');
      const jsxMatches = content.match(jsxPattern);
      if (jsxMatches && !content.includes(\`t('\${translationKey}')\`)) {
        content = content.replace(jsxPattern, \`$1{t('\${translationKey}')}$2\`);
        fileReplacements += jsxMatches.length;
      }

      // Replace in quoted strings: 'Text' becomes t('key')
      const quotedPattern = new RegExp(\`(['"\\\`])\${escapedOriginal}\\\\1\`, 'g');
      const quotedMatches = content.match(quotedPattern);
      if (quotedMatches && !content.includes(\`t('\${translationKey}')\`)) {
        content = content.replace(quotedPattern, \`t('\${translationKey}')\`);
        fileReplacements += quotedMatches.length;
      }

      // Replace in toast messages
      const toastPattern = new RegExp(\`(toast\\\\.(success|error|info|warning)\\\\(['"\\\`])\${escapedOriginal}(['"\\\`]\\\\))\`, 'g');
      const toastMatches = content.match(toastPattern);
      if (toastMatches) {
        content = content.replace(toastPattern, \`$1\${t('\${translationKey}')}$4\`);
        fileReplacements += toastMatches.length;
      }
    }

    if (fileReplacements > 0) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(\`✅ \${relativePath}: \${fileReplacements} replacements\`);
      totalReplacements += fileReplacements;
    } else {
      console.log(\`⚪ \${relativePath}: no changes needed\`);
    }

  } catch (error) {
    console.error(\`❌ Error processing \${relativePath}:\`, error.message);
  }
}

console.log(\`\\n✨ Batch processing complete! Made \${totalReplacements} total replacements.\`);
console.log('📝 Next steps:');
console.log('1. Review the changes in your files');
console.log('2. Add the corresponding translation keys to your translation files');
console.log('3. Test the application to ensure everything works correctly');
`;

    const outputFile = path.join(__dirname, 'auto-fix-top-files.js');
    fs.writeFileSync(outputFile, scriptContent, 'utf8');
    console.log(`\n🛠️  Generated batch fix script: ${path.relative(__dirname, outputFile)}`);
    console.log('💡 Run this script to automatically fix the most critical files.');
  }

  /**
   * Generate translation key from text
   */
  generateTranslationKey(text) {
    const cleanText = text.toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 40);

    // Determine category based on content
    if (text.includes('successfully') || text.includes('completed') || text.includes('saved')) {
      return `messages.success.${cleanText}`;
    } else if (text.includes('error') || text.includes('failed') || text.includes('wrong')) {
      return `messages.error.${cleanText}`;
    } else if (['Save', 'Edit', 'Delete', 'Cancel', 'Create', 'Update', 'Add', 'Remove'].some(action => text.includes(action))) {
      return `common.actions.${cleanText}`;
    } else if (['Online', 'Offline', 'Active', 'Inactive', 'Pending', 'Complete'].includes(text)) {
      return `common.status.${cleanText}`;
    } else if (text.includes('Settings') || text.includes('Dashboard') || text.includes('Profile')) {
      return `navigation.${cleanText}`;
    } else {
      return `ui.${cleanText}`;
    }
  }
}

// Execute if run directly
if (require.main === module) {
  const finder = new SimpleStringFinder();
  finder.execute().catch(console.error);
}

module.exports = SimpleStringFinder;