#!/usr/bin/env node
/**
 * Translation Batch Fix Tool for My Detail Area
 * Automated tool to convert hardcoded strings to translation keys
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const BATCH_FIX_CONFIG = {
  // Common string to translation key mappings
  commonMappings: {
    'Create': 'common.create',
    'Edit': 'common.edit',
    'Delete': 'common.delete',
    'Save': 'common.save',
    'Cancel': 'common.cancel',
    'Close': 'common.close',
    'Submit': 'common.submit',
    'Loading...': 'common.loading',
    'Search...': 'common.search',
    'No data available': 'common.no_data',
    'Error': 'common.error',
    'Success': 'common.success',
    'Warning': 'common.warning',
    'Info': 'common.info',
    'Confirm': 'common.confirm',
    'Yes': 'common.yes',
    'No': 'common.no',
    'Active': 'common.active',
    'Inactive': 'common.inactive',
    'Status': 'common.status',
    'Name': 'common.name',
    'Description': 'common.description',
    'Actions': 'common.actions',
    'Settings': 'common.settings',
    'Dashboard': 'dashboard.title',
    'Orders': 'common.orders',
    'Users': 'users.title',
    'Dealerships': 'dealerships.title',
    'Reports': 'reports.title',
    'Management': 'management.title',
    'Vehicle': 'common.vehicle',
    'Customer': 'common.customer',
    'Date': 'common.date',
    'Time': 'common.time',
    'Priority': 'common.priority',
    'Notes': 'common.notes'
  },

  // Pattern-based mappings for different contexts
  contextualMappings: {
    // NFC-related strings
    nfc: {
      'NFC Tag': 'nfc.tag',
      'NFC Reader': 'nfc.reader.title',
      'NFC Writer': 'nfc.writer.title',
      'Tag Manager': 'nfc_tracking.tag_manager.title',
      'Workflow Manager': 'nfc_tracking.workflows.title',
      'Scan Tag': 'nfc.reader.start_scanning',
      'Write Tag': 'nfc.writer.write_tag',
      'Tag ID': 'nfc.tag_info.id',
      'Location': 'nfc.tag_info.location',
      'Active Tag': 'nfc_tracking.tag_manager.active_tag',
      'Vehicle Tag': 'nfc_tracking.tag_manager.vehicle_tag'
    },

    // Recon-related strings
    recon: {
      'Recon Order': 'recon.new_recon_order',
      'Stock Number': 'recon.stock_number',
      'Condition': 'recon.condition',
      'Ready for Sale': 'recon.ready_for_sale',
      'Needs Approval': 'recon.needs_approval',
      'Vehicle Display': 'recon.vehicle_display',
      'Recon Details': 'recon.recon_details'
    },

    // Order-related strings
    orders: {
      'Service Order': 'service.service_order',
      'Sales Order': 'sales_orders.title',
      'Car Wash': 'car_wash_orders.title',
      'Order Details': 'orders.order_details',
      'Customer Information': 'orders.customer_information',
      'Vehicle Information': 'orders.vehicle_information',
      'Due Date': 'orders.due_date',
      'Assigned To': 'orders.assigned_to',
      'Order Status': 'orders.status'
    },

    // UI components
    ui: {
      'Select...': 'common.select',
      'Choose...': 'common.choose',
      'Browse...': 'common.browse',
      'Upload': 'common.upload',
      'Download': 'common.download',
      'Export': 'common.export',
      'Import': 'common.import',
      'Filter': 'common.filter',
      'Sort': 'common.sort',
      'View': 'common.view',
      'Show': 'common.show',
      'Hide': 'common.hide'
    }
  },

  // Auto-generation patterns for new keys
  autoKeyPatterns: [
    {
      pattern: /^Create (.+)$/,
      template: 'create_$1',
      transform: (match) => match.toLowerCase().replace(/\s+/g, '_')
    },
    {
      pattern: /^Edit (.+)$/,
      template: 'edit_$1',
      transform: (match) => match.toLowerCase().replace(/\s+/g, '_')
    },
    {
      pattern: /^Delete (.+)$/,
      template: 'delete_$1',
      transform: (match) => match.toLowerCase().replace(/\s+/g, '_')
    },
    {
      pattern: /^(.+) Manager$/,
      template: '$1_manager.title',
      transform: (match) => match.toLowerCase().replace(/\s+/g, '_')
    },
    {
      pattern: /^(.+) Settings$/,
      template: '$1.settings',
      transform: (match) => match.toLowerCase().replace(/\s+/g, '_')
    }
  ]
};

class TranslationBatchFixer {
  constructor() {
    this.translations = this.loadTranslations();
    this.fixes = [];
    this.newKeys = new Map();
    this.stats = {
      filesProcessed: 0,
      stringsFixed: 0,
      keysGenerated: 0,
      backupsCreated: 0
    };
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

  processFiles(filePatterns = ['src/**/*.{tsx,ts,jsx,js}']) {
    const files = glob.sync(filePatterns, {
      ignore: ['**/*.d.ts', '**/*.test.*', '**/*.stories.*']
    });

    console.log(`🔧 Processing ${files.length} files for batch fixes...\n`);

    files.forEach(file => this.processFile(file));
    
    this.generateNewTranslationKeys();
    this.generateReport();

    return this.stats;
  }

  processFile(filePath) {
    try {
      const relativePath = path.relative(process.cwd(), filePath);
      const originalContent = fs.readFileSync(filePath, 'utf8');
      let content = originalContent;
      let hasChanges = false;
      const fileFixes = [];

      // Ensure file has useTranslation import
      if (!content.includes('useTranslation') && this.needsTranslation(content)) {
        content = this.addTranslationImport(content);
        hasChanges = true;
      }

      // Apply common mappings
      Object.entries(BATCH_FIX_CONFIG.commonMappings).forEach(([text, key]) => {
        const patterns = this.generateReplacementPatterns(text);
        patterns.forEach(({ pattern, replacement }) => {
          if (pattern.test(content)) {
            content = content.replace(pattern, replacement(key));
            hasChanges = true;
            fileFixes.push({ original: text, key, type: 'common' });
          }
        });
      });

      // Apply contextual mappings based on file path/content
      const context = this.detectContext(relativePath, content);
      if (context && BATCH_FIX_CONFIG.contextualMappings[context]) {
        Object.entries(BATCH_FIX_CONFIG.contextualMappings[context]).forEach(([text, key]) => {
          const patterns = this.generateReplacementPatterns(text);
          patterns.forEach(({ pattern, replacement }) => {
            if (pattern.test(content)) {
              content = content.replace(pattern, replacement(key));
              hasChanges = true;
              fileFixes.push({ original: text, key, type: context });
            }
          });
        });
      }

      // Auto-generate keys for pattern matches
      BATCH_FIX_CONFIG.autoKeyPatterns.forEach(({ pattern, template, transform }) => {
        const matches = content.match(new RegExp(`["'>]\\s*(${pattern.source})\\s*[<"']`, 'g'));
        if (matches) {
          matches.forEach(match => {
            const text = match.match(pattern)?.[0];
            if (text) {
              const generatedKey = this.generateKeyFromPattern(text, template, transform, context);
              if (generatedKey) {
                const replacePatterns = this.generateReplacementPatterns(text);
                replacePatterns.forEach(({ pattern: replacePattern, replacement }) => {
                  if (replacePattern.test(content)) {
                    content = content.replace(replacePattern, replacement(generatedKey));
                    hasChanges = true;
                    fileFixes.push({ original: text, key: generatedKey, type: 'auto-generated' });
                    this.newKeys.set(generatedKey, text);
                  }
                });
              }
            }
          });
        }
      });

      // Save changes if any were made
      if (hasChanges) {
        this.createBackup(filePath);
        fs.writeFileSync(filePath, content);
        this.stats.filesProcessed++;
        this.stats.stringsFixed += fileFixes.length;

        this.fixes.push({
          file: relativePath,
          fixes: fileFixes,
          context
        });

        console.log(`✅ ${relativePath}: Fixed ${fileFixes.length} strings`);
      }

    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error.message);
    }
  }

  needsTranslation(content) {
    // Check if file contains hardcoded strings that would benefit from translation
    const hardcodedStrings = content.match(/>[A-Z][a-zA-Z\s]+</g) || [];
    return hardcodedStrings.length > 2;
  }

  addTranslationImport(content) {
    // Add useTranslation import if it doesn't exist
    if (content.includes('react-i18next')) {
      return content;
    }

    const importRegex = /import.*from\s+['"]react['"];?\n/;
    const match = content.match(importRegex);
    
    if (match) {
      const insertPoint = match.index + match[0].length;
      const translationImport = `import { useTranslation } from 'react-i18next';\n`;
      return content.slice(0, insertPoint) + translationImport + content.slice(insertPoint);
    }

    return content;
  }

  detectContext(filePath, content) {
    if (filePath.includes('nfc') || filePath.includes('NFC')) return 'nfc';
    if (filePath.includes('recon') || filePath.includes('Recon')) return 'recon';
    if (filePath.includes('order') || filePath.includes('Order')) return 'orders';
    if (content.includes('Dialog') || content.includes('Modal')) return 'ui';
    return null;
  }

  generateReplacementPatterns(text) {
    const escapedText = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    return [
      // JSX text content: >Text<
      {
        pattern: new RegExp(`>\\s*${escapedText}\\s*<`, 'g'),
        replacement: (key) => `>{t('${key}')}<`
      },
      // Attribute values: title="Text"
      {
        pattern: new RegExp(`((?:title|placeholder|aria-label|alt)=["'])${escapedText}(["'])`, 'g'),
        replacement: (key) => `$1{t('${key}')}$2`
      },
      // String literals: "Text"
      {
        pattern: new RegExp(`(["'])${escapedText}\\1`, 'g'),
        replacement: (key) => `t('${key}')`
      }
    ];
  }

  generateKeyFromPattern(text, template, transform, context) {
    const match = text.match(new RegExp(template.replace('$1', '(.+)')));
    if (match && match[1]) {
      const transformed = transform(match[1]);
      return context ? `${context}.${transformed}` : transformed;
    }
    return null;
  }

  createBackup(filePath) {
    const backupPath = filePath + '.backup';
    fs.copyFileSync(filePath, backupPath);
    this.stats.backupsCreated++;
  }

  generateNewTranslationKeys() {
    if (this.newKeys.size === 0) return;

    const newKeysObject = {};
    Array.from(this.newKeys.entries()).forEach(([key, value]) => {
      this.setNestedKey(newKeysObject, key, value);
    });

    console.log('\n📝 Generated Translation Keys:');
    console.log(JSON.stringify(newKeysObject, null, 2));
    
    // Save to a separate file for manual review
    const newKeysPath = path.join(process.cwd(), 'new-translation-keys.json');
    fs.writeFileSync(newKeysPath, JSON.stringify(newKeysObject, null, 2));
    
    this.stats.keysGenerated = this.newKeys.size;
    console.log(`\n💾 New keys saved to: ${newKeysPath}`);
  }

  setNestedKey(obj, key, value) {
    const parts = key.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current)) {
        current[parts[i]] = {};
      }
      current = current[parts[i]];
    }
    
    current[parts[parts.length - 1]] = value;
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('🏢 TRANSLATION BATCH FIX REPORT');
    console.log('='.repeat(60));
    
    console.log('\n📊 STATISTICS');
    console.log(`Files Processed: ${this.stats.filesProcessed}`);
    console.log(`Strings Fixed: ${this.stats.stringsFixed}`);
    console.log(`New Keys Generated: ${this.stats.keysGenerated}`);
    console.log(`Backup Files Created: ${this.stats.backupsCreated}`);

    if (this.fixes.length > 0) {
      console.log('\n📋 FILES MODIFIED');
      this.fixes.forEach(({ file, fixes, context }) => {
        console.log(`\n📁 ${file} (${context || 'generic'})`);
        fixes.forEach(fix => {
          console.log(`   "${fix.original}" → ${fix.key} (${fix.type})`);
        });
      });
    }

    console.log('\n🎯 NEXT STEPS');
    console.log('1. Review and test the modified files');
    console.log('2. Add new translation keys to all language files');
    console.log('3. Remove backup files after verification');
    console.log('4. Run translation scanner to verify coverage');
  }

  restoreBackups() {
    const backupFiles = glob.sync('src/**/*.backup');
    console.log(`🔄 Restoring ${backupFiles.length} backup files...`);
    
    backupFiles.forEach(backupFile => {
      const originalFile = backupFile.replace('.backup', '');
      fs.copyFileSync(backupFile, originalFile);
      fs.unlinkSync(backupFile);
      console.log(`✅ Restored: ${originalFile}`);
    });
  }

  cleanupBackups() {
    const backupFiles = glob.sync('src/**/*.backup');
    console.log(`🧹 Cleaning up ${backupFiles.length} backup files...`);
    
    backupFiles.forEach(backupFile => {
      fs.unlinkSync(backupFile);
    });
    
    console.log('✅ Backup files cleaned up');
  }
}

// CLI Commands
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  const fixer = new TranslationBatchFixer();

  switch (command) {
    case 'restore':
      fixer.restoreBackups();
      break;
    case 'cleanup':
      fixer.cleanupBackups();
      break;
    case 'fix':
    default:
      const patterns = args.slice(1);
      fixer.processFiles(patterns.length > 0 ? patterns : undefined);
      break;
  }
}

module.exports = TranslationBatchFixer;