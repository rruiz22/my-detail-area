#!/usr/bin/env node
/**
 * Translation Coverage Scanner for My Detail Area
 * Enterprise-grade automated detection of hardcoded strings and translation issues
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const SCAN_CONFIG = {
  // Patterns to scan
  includePatterns: [
    'src/**/*.{tsx,ts,jsx,js}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx,js,jsx}',
    '!src/**/*.stories.{ts,tsx,js,jsx}'
  ],
  
  // Hardcoded string detection patterns
  hardcodedPatterns: [
    // JSX text content
    />\s*([A-Z][a-zA-Z\s]+[a-zA-Z])\s*</g,
    // String literals in attributes
    /(?:placeholder|title|aria-label|alt)\s*=\s*["']([A-Za-z][^"']*?)["']/g,
    // Button/label text
    /(?:Button|Label)[^>]*>\s*([A-Z][a-zA-Z\s]+)\s*</g,
    // Toast/alert messages
    /(?:toast|alert|confirm)\s*\(\s*["']([^"']+?)["']/g,
    // Error/success messages
    /(?:error|success|warning|info):\s*["']([^"']+?)["']/g,
    // Dialog/modal titles
    /(?:DialogTitle|ModalTitle)[^>]*>\s*([A-Z][a-zA-Z\s]+)\s*</g,
  ],

  // Patterns that should be ignored (likely not translatable)
  ignorePatterns: [
    /^[a-z_\-]+$/,           // kebab-case or snake_case (likely keys)
    /^[A-Z_]+$/,             // CONSTANT_CASE
    /^\d+$/,                 // Numbers only
    /^[A-Z]{2,5}$/,          // Short abbreviations
    /^[a-zA-Z]{1,3}$/,       // Very short strings
    /^[\w\-\.]+@[\w\-\.]+$/, // Email addresses
    /^https?:\/\//,          // URLs
    /^\/[\/\w\-]+$/,         // Paths
    /^#[a-fA-F0-9]{3,6}$/,   // Hex colors
    /^\{.*\}$/,              // JSON-like objects
    /^className$/,           // React props
    /^onClick$/,             // Event handlers
    /^on[A-Z]/,              // Other event handlers
  ],

  // Translation function patterns
  translationPatterns: [
    /\bt\s*\(\s*['"`]([^'"`]+?)['"`]/g,
    /useTranslation\s*\(\s*\)/g,
    /\{\s*t\s*\}/g,
  ]
};

class TranslationScanner {
  constructor() {
    this.results = {
      scannedFiles: 0,
      totalStrings: 0,
      hardcodedStrings: 0,
      translatedStrings: 0,
      issues: [],
      recommendations: [],
      coverage: 0
    };
    this.translations = this.loadTranslations();
  }

  loadTranslations() {
    try {
      const enPath = path.join(process.cwd(), 'public/translations/en.json');
      return JSON.parse(fs.readFileSync(enPath, 'utf8'));
    } catch (error) {
      console.warn('Warning: Could not load translations file');
      return {};
    }
  }

  scanFiles() {
    const files = glob.sync(SCAN_CONFIG.includePatterns, {
      ignore: SCAN_CONFIG.includePatterns.filter(p => p.startsWith('!'))
    });

    console.log(`🔍 Scanning ${files.length} files for translation issues...\n`);

    const fileResults = files.map(file => this.scanFile(file)).filter(Boolean);
    
    this.generateSummary(fileResults);
    this.generateRecommendations(fileResults);
    
    return {
      ...this.results,
      fileResults
    };
  }

  scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(process.cwd(), filePath);
      
      this.results.scannedFiles++;
      
      const fileResult = {
        file: relativePath,
        hardcodedStrings: [],
        translationCalls: [],
        missingKeys: [],
        coverage: 0,
        severity: 'low'
      };

      // Find hardcoded strings
      SCAN_CONFIG.hardcodedPatterns.forEach(pattern => {
        let match;
        const globalPattern = new RegExp(pattern.source, pattern.flags);
        while ((match = globalPattern.exec(content)) !== null) {
          const string = match[1];
          if (this.shouldIgnoreString(string)) continue;
          
          const lineNumber = this.getLineNumber(content, match.index);
          fileResult.hardcodedStrings.push({
            text: string,
            line: lineNumber,
            context: this.getContext(content, match.index)
          });
        }
      });

      // Find translation calls
      SCAN_CONFIG.translationPatterns.forEach(pattern => {
        let match;
        const globalPattern = new RegExp(pattern.source, pattern.flags);
        while ((match = globalPattern.exec(content)) !== null) {
          if (match[1]) { // Translation key found
            const key = match[1];
            const lineNumber = this.getLineNumber(content, match.index);
            fileResult.translationCalls.push({
              key,
              line: lineNumber,
              exists: this.keyExists(key)
            });
            
            if (!this.keyExists(key)) {
              fileResult.missingKeys.push({
                key,
                line: lineNumber,
                context: this.getContext(content, match.index)
              });
            }
          }
        }
      });

      // Calculate coverage
      const totalStrings = fileResult.hardcodedStrings.length + fileResult.translationCalls.length;
      fileResult.coverage = totalStrings > 0 
        ? Math.round((fileResult.translationCalls.length / totalStrings) * 100)
        : 100;

      // Determine severity
      if (fileResult.hardcodedStrings.length > 20) fileResult.severity = 'critical';
      else if (fileResult.hardcodedStrings.length > 10) fileResult.severity = 'high';
      else if (fileResult.hardcodedStrings.length > 5) fileResult.severity = 'medium';

      // Only include files with issues
      if (fileResult.hardcodedStrings.length > 0 || fileResult.missingKeys.length > 0) {
        return fileResult;
      }

      return null;
    } catch (error) {
      console.error(`Error scanning ${filePath}:`, error.message);
      return null;
    }
  }

  shouldIgnoreString(string) {
    return SCAN_CONFIG.ignorePatterns.some(pattern => pattern.test(string));
  }

  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  getContext(content, index) {
    const lines = content.split('\n');
    const lineIndex = this.getLineNumber(content, index) - 1;
    const start = Math.max(0, lineIndex - 1);
    const end = Math.min(lines.length, lineIndex + 2);
    
    return lines.slice(start, end)
      .map((line, i) => `${start + i + 1}: ${line.trim()}`)
      .join('\n');
  }

  keyExists(key) {
    return key.split('.').reduce((obj, part) => obj && obj[part], this.translations) !== undefined;
  }

  generateSummary(fileResults) {
    this.results.totalStrings = fileResults.reduce((sum, result) => 
      sum + result.hardcodedStrings.length + result.translationCalls.length, 0);
    
    this.results.hardcodedStrings = fileResults.reduce((sum, result) => 
      sum + result.hardcodedStrings.length, 0);
    
    this.results.translatedStrings = fileResults.reduce((sum, result) => 
      sum + result.translationCalls.length, 0);
    
    this.results.coverage = this.results.totalStrings > 0 
      ? Math.round((this.results.translatedStrings / this.results.totalStrings) * 100)
      : 100;

    // Group issues by severity
    this.results.issues = {
      critical: fileResults.filter(f => f.severity === 'critical'),
      high: fileResults.filter(f => f.severity === 'high'),
      medium: fileResults.filter(f => f.severity === 'medium'),
      low: fileResults.filter(f => f.severity === 'low')
    };
  }

  generateRecommendations(fileResults) {
    const recommendations = [];

    // Priority files to fix first
    const criticalFiles = fileResults.filter(f => f.severity === 'critical');
    if (criticalFiles.length > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        title: 'Fix Critical Files First',
        description: `${criticalFiles.length} files have 20+ hardcoded strings`,
        files: criticalFiles.map(f => f.file),
        estimatedEffort: criticalFiles.length * 2 + ' hours'
      });
    }

    // Batch processing recommendation
    const topFiles = fileResults
      .sort((a, b) => b.hardcodedStrings.length - a.hardcodedStrings.length)
      .slice(0, 5);
    
    recommendations.push({
      priority: 'HIGH',
      title: 'Batch Process Top 5 Files',
      description: 'Focus on files with most hardcoded strings for maximum impact',
      files: topFiles.map(f => `${f.file} (${f.hardcodedStrings.length} strings)`),
      estimatedEffort: Math.ceil(topFiles.reduce((sum, f) => sum + f.hardcodedStrings.length, 0) / 10) + ' hours'
    });

    // Component-specific recommendations
    const componentTypes = this.categorizeFiles(fileResults);
    Object.entries(componentTypes).forEach(([type, files]) => {
      if (files.length > 0) {
        recommendations.push({
          priority: 'MEDIUM',
          title: `Fix ${type} Components`,
          description: `${files.length} ${type} components need translation`,
          files: files.map(f => f.file),
          estimatedEffort: Math.ceil(files.length * 0.5) + ' hours'
        });
      }
    });

    // Missing translation keys
    const missingKeysCount = fileResults.reduce((sum, f) => sum + f.missingKeys.length, 0);
    if (missingKeysCount > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        title: 'Add Missing Translation Keys',
        description: `${missingKeysCount} translation keys are referenced but missing`,
        action: 'Add these keys to translation files',
        estimatedEffort: Math.ceil(missingKeysCount / 20) + ' hours'
      });
    }

    this.results.recommendations = recommendations;
  }

  categorizeFiles(fileResults) {
    const categories = {
      'Modal': [],
      'Manager': [],
      'Form': [],
      'Page': [],
      'Component': []
    };

    fileResults.forEach(result => {
      const filename = path.basename(result.file);
      if (filename.includes('Modal')) categories.Modal.push(result);
      else if (filename.includes('Manager')) categories.Manager.push(result);
      else if (filename.includes('Form')) categories.Form.push(result);
      else if (result.file.includes('pages/')) categories.Page.push(result);
      else categories.Component.push(result);
    });

    return categories;
  }

  printReport() {
    const { results } = this;
    
    console.log('🏢 MY DETAIL AREA - Translation Coverage Analysis\n');
    console.log('=' .repeat(60));
    
    // Summary Statistics
    console.log('\n📊 SUMMARY STATISTICS');
    console.log('-' .repeat(30));
    console.log(`Files Scanned: ${results.scannedFiles}`);
    console.log(`Total Strings: ${results.totalStrings}`);
    console.log(`Hardcoded: ${results.hardcodedStrings} (${Math.round((results.hardcodedStrings/results.totalStrings)*100)}%)`);
    console.log(`Translated: ${results.translatedStrings} (${results.coverage}%)`);
    console.log(`Overall Coverage: ${results.coverage}%`);

    // Coverage Status
    const status = results.coverage >= 90 ? '✅ EXCELLENT' 
                 : results.coverage >= 70 ? '⚠️  GOOD' 
                 : results.coverage >= 50 ? '❌ NEEDS WORK'
                 : '🚨 CRITICAL';
    console.log(`Status: ${status}\n`);

    // Issues by Severity
    console.log('🚨 ISSUES BY SEVERITY');
    console.log('-' .repeat(30));
    Object.entries(results.issues).forEach(([severity, files]) => {
      if (files.length > 0) {
        const icon = severity === 'critical' ? '🔴' 
                   : severity === 'high' ? '🟡' 
                   : severity === 'medium' ? '🟠' : '🔵';
        console.log(`${icon} ${severity.toUpperCase()}: ${files.length} files`);
        files.slice(0, 3).forEach(file => {
          console.log(`   • ${file.file} (${file.hardcodedStrings.length} strings)`);
        });
        if (files.length > 3) {
          console.log(`   ... and ${files.length - 3} more files`);
        }
      }
    });

    // Top Recommendations
    console.log('\n💡 TOP RECOMMENDATIONS');
    console.log('-' .repeat(30));
    results.recommendations.slice(0, 3).forEach((rec, index) => {
      const priorityIcon = rec.priority === 'CRITICAL' ? '🔴'
                         : rec.priority === 'HIGH' ? '🟡' : '🟠';
      console.log(`${index + 1}. ${priorityIcon} ${rec.title}`);
      console.log(`   ${rec.description}`);
      console.log(`   Estimated effort: ${rec.estimatedEffort}\n`);
    });

    // Next Steps
    console.log('🎯 IMMEDIATE NEXT STEPS');
    console.log('-' .repeat(30));
    console.log('1. Run automated batch-fix script on critical files');
    console.log('2. Create translation keys for most common patterns');
    console.log('3. Set up pre-commit hooks to prevent new hardcoded strings');
    console.log('4. Implement developer guidelines and templates');
    console.log('5. Schedule regular translation audits\n');

    console.log('📁 Detailed JSON report saved to: translation-audit-report.json');
  }

  saveReport() {
    const reportPath = path.join(process.cwd(), 'translation-audit-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    return reportPath;
  }
}

// CLI Execution
if (require.main === module) {
  const scanner = new TranslationScanner();
  const results = scanner.scanFiles();
  scanner.printReport();
  scanner.saveReport();
  
  // Exit with error code if coverage is too low
  process.exit(results.coverage < 50 ? 1 : 0);
}

module.exports = TranslationScanner;