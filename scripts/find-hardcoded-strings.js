#!/usr/bin/env node

/**
 * Find Hardcoded Strings Analyzer
 * Identifies files with the most hardcoded strings for targeted batch processing
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

class HardcodedStringFinder {
  constructor() {
    this.srcDir = path.join(__dirname, '../src');
    this.results = [];
  }

  /**
   * Main execution function
   */
  async execute() {
    console.log('🔍 Analyzing codebase for hardcoded strings...\n');

    const files = await this.findTsxFiles();
    console.log(`📁 Scanning ${files.length} files...\n`);

    for (const file of files) {
      const analysis = await this.analyzeFile(file);
      if (analysis.hardcodedStrings.length > 0) {
        this.results.push(analysis);
      }
    }

    // Sort by number of hardcoded strings (descending)
    this.results.sort((a, b) => b.hardcodedStrings.length - a.hardcodedStrings.length);

    this.printResults();
    this.generateBatchScript();
  }

  /**
   * Find all TSX/TS files
   */
  async findTsxFiles() {
    const pattern = path.join(this.srcDir, '**/*.{tsx,ts}').replace(/\\/g, '/');
    return await glob(pattern, {
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/*.d.ts',
        '**/types/**'
      ]
    });
  }

  /**
   * Analyze a single file for hardcoded strings
   */
  async analyzeFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(this.srcDir, filePath);

    const hardcodedStrings = [];
    const hasTranslation = content.includes('useTranslation') || content.includes('t(');

    // Patterns to find hardcoded strings
    const patterns = [
      // Toast messages
      {
        pattern: /toast\.(success|error|info|warning)\(['"`]([^'"`]+)['"`]\)/g,
        type: 'toast',
        context: 'Toast notification'
      },

      // JSX text content (non-t() wrapped)
      {
        pattern: />([A-Z][a-zA-Z\s]{3,50})</g,
        type: 'jsx_text',
        context: 'JSX text content',
        filter: (match) => {
          const text = match[1].trim();
          return !text.includes('{') &&
                 !text.includes('t(') &&
                 !text.match(/^[A-Z][a-z]+$/) && // Skip single words like "Loading"
                 text.split(' ').length >= 2; // At least 2 words
        }
      },

      // String literals in quotes that look like UI text
      {
        pattern: /(['"`])([A-Z][a-zA-Z\s]{3,50})\1/g,
        type: 'quoted_string',
        context: 'Quoted string literal',
        filter: (match) => {
          const text = match[2].trim();
          return !text.includes('t(') &&
                 !text.match(/^[a-z_]+$/) && // Skip variable names
                 !text.includes('/') && // Skip paths
                 !text.includes('@') && // Skip emails
                 text.split(' ').length >= 2;
        }
      },

      // Alert/dialog descriptions
      {
        pattern: /description:\s*(['"`])([^'"`]+)\1/g,
        type: 'description',
        context: 'Alert/dialog description'
      },

      // Placeholder text
      {
        pattern: /placeholder=['"`]([A-Z][^'"`]+)['"`]/g,
        type: 'placeholder',
        context: 'Form placeholder'
      },

      // Button text (direct children)
      {
        pattern: /<Button[^>]*>([A-Z][a-zA-Z\s]+)<\/Button>/g,
        type: 'button_text',
        context: 'Button text'
      },

      // Card/Modal titles
      {
        pattern: /<(CardTitle|DialogTitle|ModalTitle)[^>]*>([A-Z][a-zA-Z\s]+)<\/\1>/g,
        type: 'title',
        context: 'Card/Modal title'
      },

      // Form labels
      {
        pattern: /<Label[^>]*>([A-Z][a-zA-Z\s]+)<\/Label>/g,
        type: 'label',
        context: 'Form label'
      },

      // Status badges
      {
        pattern: /(['"`])(Online|Offline|Active|Inactive|Pending|Complete|Success|Error|Failed)\1/g,
        type: 'status',
        context: 'Status text'
      }
    ];

    let lineNumber = 1;
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      for (const { pattern, type, context, filter } of patterns) {
        let match;
        pattern.lastIndex = 0; // Reset regex state

        while ((match = pattern.exec(line)) !== null) {
          const text = match[2] || match[1];

          // Apply filter if provided
          if (filter && !filter(match)) {
            continue;
          }

          // Skip if already using translation
          if (line.includes('t(') && line.includes(text)) {
            continue;
          }

          hardcodedStrings.push({
            text: text.trim(),
            line: i + 1,
            type,
            context,
            surrounding: line.trim()
          });
        }
      }
    }

    // Remove duplicates
    const uniqueStrings = [];
    const seen = new Set();

    for (const str of hardcodedStrings) {
      const key = `${str.text}-${str.type}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueStrings.push(str);
      }
    }

    return {
      filePath,
      relativePath,
      hasTranslation,
      hardcodedStrings: uniqueStrings,
      totalLines: lines.length,
      internationalizedPercentage: hasTranslation ?
        Math.round(((uniqueStrings.length > 0 ? 1 : 0) / 1) * 100) : 0
    };
  }

  /**
   * Print analysis results
   */
  printResults() {
    console.log('📊 HARDCODED STRINGS ANALYSIS RESULTS');
    console.log('=' .repeat(60));

    if (this.results.length === 0) {
      console.log('✅ No hardcoded strings found! Your project is fully internationalized.');
      return;
    }

    console.log(`\n🎯 TOP ${Math.min(10, this.results.length)} FILES WITH MOST HARDCODED STRINGS:\n`);

    for (let i = 0; i < Math.min(10, this.results.length); i++) {
      const result = this.results[i];
      const coverage = result.hasTranslation ? '🔄 Partial' : '❌ None';

      console.log(`${i + 1}. ${result.relativePath}`);
      console.log(`   📍 ${result.hardcodedStrings.length} hardcoded strings | i18n: ${coverage}`);

      // Show top strings
      const topStrings = result.hardcodedStrings.slice(0, 3);
      for (const str of topStrings) {
        console.log(`   ├─ "${str.text}" (${str.type} - line ${str.line})`);
      }

      if (result.hardcodedStrings.length > 3) {
        console.log(`   └─ ... and ${result.hardcodedStrings.length - 3} more`);
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
   * Generate batch processing script
   */
  generateBatchScript() {
    if (this.results.length === 0) return;

    const scriptContent = this.generateBatchFixScript();
    const outputFile = path.join(__dirname, 'auto-fix-hardcoded-strings.js');

    fs.writeFileSync(outputFile, scriptContent, 'utf8');
    console.log(`\n🛠️  Generated batch fix script: ${outputFile}`);
    console.log('💡 Run this script to automatically fix the most common hardcoded strings.');
  }

  /**
   * Generate the actual batch fix script content
   */
  generateBatchFixScript() {
    // Get most common strings across all files
    const stringCounts = {};
    for (const result of this.results) {
      for (const str of result.hardcodedStrings) {
        stringCounts[str.text] = (stringCounts[str.text] || 0) + 1;
      }
    }

    const commonStrings = Object.entries(stringCounts)
      .filter(([text, count]) => count >= 2) // Strings that appear in 2+ files
      .sort(([,a], [,b]) => b - a)
      .slice(0, 50) // Top 50 most common
      .map(([text]) => text);

    return `#!/usr/bin/env node

/**
 * Auto-generated batch fix script for hardcoded strings
 * Generated on: ${new Date().toISOString()}
 */

const fs = require('fs');
const path = require('path');

// Files with most hardcoded strings (top 10)
const targetFiles = [
${this.results.slice(0, 10).map(r => `  '${r.relativePath}'`).join(',\n')}
];

// Most common hardcoded strings to fix
const stringMappings = {
${commonStrings.map(str => {
  const key = this.generateTranslationKey(str);
  return `  '${str.replace(/'/g, "\\'")}': '${key}'`;
}).join(',\n')}
};

console.log('🚀 Starting automated hardcoded string fixes...');
console.log(\`📋 Will process \${targetFiles.length} files with \${Object.keys(stringMappings).length} string mappings\`);

// Process each target file
for (const relativePath of targetFiles) {
  const filePath = path.join(__dirname, '../src', relativePath);

  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let replacements = 0;

    // Add translation import if needed
    if (!content.includes('useTranslation')) {
      const importMatch = content.match(/import.*?from\\s+['"]react['"];?\\s*\\n/);
      if (importMatch) {
        content = content.replace(importMatch[0], importMatch[0] + "import { useTranslation } from 'react-i18next';\\n");
      }
    }

    // Add translation hook if needed
    if (!content.includes('const { t }')) {
      const funcMatch = content.match(/(export\\s+function\\s+\\w+.*?\\{[\\s\\n]*|const\\s+\\w+.*?=.*?\\{[\\s\\n]*)/);
      if (funcMatch) {
        content = content.replace(funcMatch[0], funcMatch[0] + "  const { t } = useTranslation();\\n");
      }
    }

    // Replace hardcoded strings
    for (const [original, translationKey] of Object.entries(stringMappings)) {
      // Simple escape without problematic regex
      const specialChars = ['\\\\', '.', '*', '+', '?', '^', '$', '{', '}', '(', ')', '|', '[', ']'];
      let escapedOriginal = original;
      for (const char of specialChars) {
        escapedOriginal = escapedOriginal.split(char).join('\\\\' + char);
      }

      // Pattern for JSX content: >Text<
      const jsxPattern = new RegExp(\`(>\\\\s*)\${escapedOriginal}(\\\\s*<)\`, 'g');
      if (jsxPattern.test(content)) {
        content = content.replace(jsxPattern, \`$1{t('\${translationKey}')}$2\`);
        replacements++;
      }

      // Pattern for quoted strings: 'Text' or "Text"
      const quotedPattern = new RegExp(\`(['"\\\`])\${escapedOriginal}\\\\1\`, 'g');
      if (quotedPattern.test(content)) {
        content = content.replace(quotedPattern, \`t('\${translationKey}')\`);
        replacements++;
      }
    }

    if (replacements > 0) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(\`✅ \${relativePath}: \${replacements} replacements\`);
    } else {
      console.log(\`⚪ \${relativePath}: no changes needed\`);
    }

  } catch (error) {
    console.error(\`❌ Error processing \${relativePath}:\`, error.message);
  }
}

console.log('\\n✨ Batch processing complete!');
console.log('📝 Remember to add the corresponding translation keys to your translation files.');
`;
  }

  /**
   * Generate translation key from text
   */
  generateTranslationKey(text) {
    // Convert to snake_case and create logical grouping
    const cleanText = text.toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);

    // Determine category based on content
    if (text.includes('successfully') || text.includes('completed')) {
      return `messages.success.${cleanText}`;
    } else if (text.includes('error') || text.includes('failed') || text.includes('wrong')) {
      return `messages.error.${cleanText}`;
    } else if (['Save', 'Edit', 'Delete', 'Cancel', 'Create', 'Update'].includes(text)) {
      return `common.actions.${cleanText}`;
    } else if (['Online', 'Offline', 'Active', 'Inactive', 'Pending'].includes(text)) {
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
  const finder = new HardcodedStringFinder();
  finder.execute().catch(console.error);
}

module.exports = HardcodedStringFinder;