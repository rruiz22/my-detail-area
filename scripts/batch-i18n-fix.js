#!/usr/bin/env node

/**
 * Batch Internationalization Fixer
 * Automatically finds and replaces hardcoded strings with translation keys
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

class BatchI18nFixer {
  constructor() {
    this.srcDir = path.join(__dirname, '../src');
    this.translationKeys = new Map();
    this.processedFiles = 0;
    this.totalReplacements = 0;

    // Common hardcoded patterns and their translations
    this.commonPatterns = [
      // Toast messages
      { pattern: /toast\.success\(['"`]([^'"`]+)['"`]\)/g, keyPrefix: 'messages.success' },
      { pattern: /toast\.error\(['"`]([^'"`]+)['"`]\)/g, keyPrefix: 'messages.error' },
      { pattern: /toast\.info\(['"`]([^'"`]+)['"`]\)/g, keyPrefix: 'messages.info' },
      { pattern: /toast\.warning\(['"`]([^'"`]+)['"`]\)/g, keyPrefix: 'messages.warning' },

      // Button texts
      { pattern: />\s*Save\s*<|>\s*Edit\s*<|>\s*Delete\s*<|>\s*Cancel\s*<|>\s*Create\s*</g, keyPrefix: 'common.actions' },

      // Status text
      { pattern: /(['"`])Online(['"`])|(['"`])Offline(['"`])/g, keyPrefix: 'common.status' },
      { pattern: /(['"`])Active(['"`])|(['"`])Inactive(['"`])/g, keyPrefix: 'common.status' },
      { pattern: /(['"`])Pending(['"`])|(['"`])Complete(['"`])/g, keyPrefix: 'common.status' },

      // Form labels
      { pattern: /<Label[^>]*>([A-Z][a-z\s]+)<\/Label>/g, keyPrefix: 'forms.labels' },

      // Card titles and headers
      { pattern: /<CardTitle[^>]*>([A-Z][a-z\s]+)<\/CardTitle>/g, keyPrefix: 'ui.headers' },
      { pattern: /<h[1-6][^>]*>([A-Z][a-z\s]+)<\/h[1-6]>/g, keyPrefix: 'ui.headers' },

      // Alert/error messages
      { pattern: /description:\s*['"`]([^'"`]+)['"`]/g, keyPrefix: 'messages.descriptions' },

      // Placeholder text
      { pattern: /placeholder=['"`]([A-Z][^'"`]+)['"`]/g, keyPrefix: 'forms.placeholders' },
    ];

    // Specific string mappings for better accuracy
    this.stringMappings = {
      // Authentication
      'Sign In': 'auth.sign_in',
      'Sign Up': 'auth.sign_up',
      'Sign Out': 'auth.sign_out',
      'Logout': 'auth.logout',
      'Login': 'auth.login',
      'Register': 'auth.register',

      // Common actions
      'Save': 'common.actions.save',
      'Edit': 'common.actions.edit',
      'Delete': 'common.actions.delete',
      'Cancel': 'common.actions.cancel',
      'Create': 'common.actions.create',
      'Update': 'common.actions.update',
      'Submit': 'common.actions.submit',
      'Continue': 'common.actions.continue',
      'Back': 'common.actions.back',
      'Next': 'common.actions.next',
      'Finish': 'common.actions.finish',
      'Close': 'common.actions.close',
      'Open': 'common.actions.open',
      'Add': 'common.actions.add',
      'Remove': 'common.actions.remove',
      'Clear': 'common.actions.clear',
      'Reset': 'common.actions.reset',
      'Search': 'common.actions.search',
      'Filter': 'common.actions.filter',
      'Sort': 'common.actions.sort',
      'Export': 'common.actions.export',
      'Import': 'common.actions.import',
      'Download': 'common.actions.download',
      'Upload': 'common.actions.upload',
      'Print': 'common.actions.print',
      'Refresh': 'common.actions.refresh',
      'Reload': 'common.actions.reload',
      'Copy': 'common.actions.copy',
      'Paste': 'common.actions.paste',
      'Cut': 'common.actions.cut',
      'Undo': 'common.actions.undo',
      'Redo': 'common.actions.redo',

      // Status
      'Online': 'common.status.online',
      'Offline': 'common.status.offline',
      'Active': 'common.status.active',
      'Inactive': 'common.status.inactive',
      'Enabled': 'common.status.enabled',
      'Disabled': 'common.status.disabled',
      'Available': 'common.status.available',
      'Unavailable': 'common.status.unavailable',
      'Connected': 'common.status.connected',
      'Disconnected': 'common.status.disconnected',
      'Loading': 'common.status.loading',
      'Pending': 'common.status.pending',
      'Complete': 'common.status.complete',
      'Completed': 'common.status.completed',
      'In Progress': 'common.status.in_progress',
      'Failed': 'common.status.failed',
      'Success': 'common.status.success',
      'Error': 'common.status.error',
      'Warning': 'common.status.warning',
      'Info': 'common.status.info',

      // Common UI elements
      'Dashboard': 'navigation.dashboard',
      'Settings': 'navigation.settings',
      'Profile': 'navigation.profile',
      'Account': 'navigation.account',
      'Home': 'navigation.home',
      'About': 'navigation.about',
      'Contact': 'navigation.contact',
      'Help': 'navigation.help',
      'Support': 'navigation.support',
      'Documentation': 'navigation.documentation',
      'FAQ': 'navigation.faq',
      'Terms': 'navigation.terms',
      'Privacy': 'navigation.privacy',
      'Legal': 'navigation.legal',

      // Form elements
      'Name': 'forms.labels.name',
      'Email': 'forms.labels.email',
      'Phone': 'forms.labels.phone',
      'Address': 'forms.labels.address',
      'City': 'forms.labels.city',
      'State': 'forms.labels.state',
      'Country': 'forms.labels.country',
      'Zip Code': 'forms.labels.zip_code',
      'Postal Code': 'forms.labels.postal_code',
      'Date': 'forms.labels.date',
      'Time': 'forms.labels.time',
      'Description': 'forms.labels.description',
      'Notes': 'forms.labels.notes',
      'Comments': 'forms.labels.comments',
      'Message': 'forms.labels.message',
      'Subject': 'forms.labels.subject',
      'Title': 'forms.labels.title',
      'Category': 'forms.labels.category',
      'Type': 'forms.labels.type',
      'Status': 'forms.labels.status',
      'Priority': 'forms.labels.priority',
      'Tags': 'forms.labels.tags',
      'Password': 'forms.labels.password',
      'Confirm Password': 'forms.labels.confirm_password',
      'Username': 'forms.labels.username',
      'First Name': 'forms.labels.first_name',
      'Last Name': 'forms.labels.last_name',
      'Full Name': 'forms.labels.full_name',
      'Company': 'forms.labels.company',
      'Organization': 'forms.labels.organization',
      'Department': 'forms.labels.department',
      'Position': 'forms.labels.position',
      'Role': 'forms.labels.role',

      // Time and dates
      'Today': 'time.today',
      'Yesterday': 'time.yesterday',
      'Tomorrow': 'time.tomorrow',
      'This Week': 'time.this_week',
      'Last Week': 'time.last_week',
      'Next Week': 'time.next_week',
      'This Month': 'time.this_month',
      'Last Month': 'time.last_month',
      'Next Month': 'time.next_month',
      'This Year': 'time.this_year',
      'Last Year': 'time.last_year',
      'Next Year': 'time.next_year',

      // Validation messages
      'This field is required': 'validation.required',
      'Please enter a valid email': 'validation.email_invalid',
      'Please enter a valid phone number': 'validation.phone_invalid',
      'Password is too short': 'validation.password_too_short',
      'Passwords do not match': 'validation.passwords_no_match',
      'Please select an option': 'validation.option_required',
      'File size is too large': 'validation.file_too_large',
      'File type not supported': 'validation.file_type_not_supported',
      'Maximum length exceeded': 'validation.max_length_exceeded',
      'Minimum length not met': 'validation.min_length_not_met',

      // Success messages
      'Successfully saved': 'messages.success.saved',
      'Successfully updated': 'messages.success.updated',
      'Successfully deleted': 'messages.success.deleted',
      'Successfully created': 'messages.success.created',
      'Successfully uploaded': 'messages.success.uploaded',
      'Successfully downloaded': 'messages.success.downloaded',
      'Operation completed successfully': 'messages.success.operation_completed',
      'Changes saved successfully': 'messages.success.changes_saved',

      // Error messages
      'Something went wrong': 'messages.error.something_went_wrong',
      'Please try again': 'messages.error.please_try_again',
      'Operation failed': 'messages.error.operation_failed',
      'Network error': 'messages.error.network_error',
      'Server error': 'messages.error.server_error',
      'Invalid request': 'messages.error.invalid_request',
      'Access denied': 'messages.error.access_denied',
      'Not found': 'messages.error.not_found',
      'Forbidden': 'messages.error.forbidden',
      'Unauthorized': 'messages.error.unauthorized',
      'Session expired': 'messages.error.session_expired',
      'Connection failed': 'messages.error.connection_failed',
      'Timeout error': 'messages.error.timeout',

      // Cloud sync specific
      'All data synced successfully': 'cloud_sync.all_data_synced_successfully',
      'Sync failed': 'cloud_sync.sync_failed',
      'Cache cleared successfully': 'cloud_sync.cache_cleared_successfully',
      'Failed to clear cache': 'cloud_sync.failed_to_clear_cache',
      'Session snapshot created': 'cloud_sync.session_snapshot_created',
      'Failed to create snapshot': 'cloud_sync.failed_to_create_snapshot',
      'Snapshot creation failed': 'cloud_sync.snapshot_creation_failed',
      'Force Sync All': 'cloud_sync.force_sync_all',
      'Total Items': 'cloud_sync.total_items',
      'Synced': 'cloud_sync.synced',
      'Errors': 'cloud_sync.errors',
      'Sync Progress': 'cloud_sync.sync_progress',
      'Overall Sync Status': 'cloud_sync.overall_sync_status',
      'Complete': 'cloud_sync.complete',
      'Session Recovery': 'cloud_sync.session_recovery',
      'Recovery Available': 'cloud_sync.recovery_available',
      'Session backup found in cloud': 'cloud_sync.session_backup_found',
      'No recovery data available': 'cloud_sync.no_recovery_data',
      'None': 'cloud_sync.none',
      'Recovering...': 'cloud_sync.recovering',
      'Restore Session': 'cloud_sync.restore_session',
      'Create Snapshot': 'cloud_sync.create_snapshot',
      'Storage Information': 'cloud_sync.storage_information',
      'Total Keys': 'cloud_sync.total_keys',
      'Storage Size': 'cloud_sync.storage_size',
      'Clear Cache': 'cloud_sync.clear_cache',
      'Sync Settings': 'cloud_sync.sync_settings',
      'Automatic Sync': 'cloud_sync.automatic_sync',
      'Automatically sync changes to cloud': 'cloud_sync.automatic_sync_description',
      'Sync Status Details': 'cloud_sync.sync_status_details',
      'Cloud Sync Dashboard': 'cloud_sync.title',
      'Unknown error': 'common.unknown_error',

      // Contact related
      'Please fix the validation errors': 'messages.error.fix_validation_errors',
    };
  }

  /**
   * Main execution function
   */
  async execute() {
    console.log('🚀 Starting batch i18n processing...\n');

    // Find all TypeScript/TSX files
    const files = await this.findTsxFiles();
    console.log(`📁 Found ${files.length} files to process\n`);

    // Process each file
    for (const file of files) {
      await this.processFile(file);
    }

    console.log('\n✨ Batch processing complete!');
    console.log(`📊 Processed ${this.processedFiles} files`);
    console.log(`🔄 Made ${this.totalReplacements} replacements`);
    console.log(`🔑 Generated ${this.translationKeys.size} unique translation keys`);

    // Generate translation keys for manual review
    this.generateTranslationKeys();
  }

  /**
   * Find all TSX/TS files in src directory
   */
  async findTsxFiles() {
    const pattern = path.join(this.srcDir, '**/*.{tsx,ts}').replace(/\\/g, '/');
    const files = await glob(pattern, {
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/*.d.ts',
        '**/types/**'
      ]
    });
    return files;
  }

  /**
   * Process a single file for i18n replacement
   */
  async processFile(filePath) {
    try {
      const originalContent = fs.readFileSync(filePath, 'utf8');
      let content = originalContent;
      let fileReplacements = 0;

      // Check if file already imports useTranslation
      const hasTranslationImport = content.includes('useTranslation');
      const hasTranslationHook = content.includes('const { t }');

      // Apply string mappings
      for (const [originalString, translationKey] of Object.entries(this.stringMappings)) {
        const patterns = [
          // JSX content: >Text<
          new RegExp(`(>\\s*)${this.escapeRegex(originalString)}(\\s*<)`, 'g'),
          // Quoted strings: 'Text' or "Text"
          new RegExp(`(['"\`])${this.escapeRegex(originalString)}\\1`, 'g'),
          // JSX attributes without quotes: prop={Text}
          new RegExp(`(=\\{)${this.escapeRegex(originalString)}(\\})`, 'g'),
        ];

        for (const pattern of patterns) {
          const matches = content.match(pattern);
          if (matches) {
            // Only replace if not already using t() function
            if (!content.includes(`t('${translationKey}')`)) {
              if (pattern.source.includes('>\\\\s*')) {
                // JSX content replacement
                content = content.replace(pattern, `$1{t('${translationKey}')}$2`);
              } else if (pattern.source.includes('=\\\\{')) {
                // JSX attribute replacement
                content = content.replace(pattern, `={t('${translationKey}')}`);
              } else {
                // Quoted string replacement
                content = content.replace(pattern, `t('${translationKey}')`);
              }

              this.translationKeys.set(translationKey, originalString);
              fileReplacements += matches.length;
            }
          }
        }
      }

      // Add translation imports if needed and replacements were made
      if (fileReplacements > 0 && !hasTranslationImport) {
        content = this.addTranslationImports(content);
      }

      // Add translation hook if needed
      if (fileReplacements > 0 && !hasTranslationHook && hasTranslationImport) {
        content = this.addTranslationHook(content);
      }

      // Write file if changes were made
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        this.processedFiles++;
        this.totalReplacements += fileReplacements;

        const relativePath = path.relative(this.srcDir, filePath);
        console.log(`✅ ${relativePath} - ${fileReplacements} replacements`);
      }

    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error.message);
    }
  }

  /**
   * Add translation imports to file
   */
  addTranslationImports(content) {
    // Check if React import exists
    const reactImportRegex = /import\s+.*?from\s+['"]react['"];?\s*\n/;
    const importRegex = /import\s+.*?;?\s*\n/g;

    const translationImport = "import { useTranslation } from 'react-i18next';\n";

    if (reactImportRegex.test(content)) {
      // Add after React import
      return content.replace(reactImportRegex, match => match + translationImport);
    } else {
      // Add after last import
      const imports = content.match(importRegex);
      if (imports && imports.length > 0) {
        const lastImport = imports[imports.length - 1];
        const lastImportIndex = content.lastIndexOf(lastImport);
        return content.slice(0, lastImportIndex + lastImport.length) +
               translationImport +
               content.slice(lastImportIndex + lastImport.length);
      } else {
        // Add at the beginning if no imports found
        return translationImport + '\n' + content;
      }
    }
  }

  /**
   * Add translation hook to component
   */
  addTranslationHook(content) {
    // Find function component declaration
    const functionRegex = /(export\s+function\s+\w+.*?\{[\s\n]*|const\s+\w+.*?=.*?\{[\s\n]*)/;
    const match = content.match(functionRegex);

    if (match) {
      const hookDeclaration = "  const { t } = useTranslation();\n";
      return content.replace(functionRegex, match[0] + hookDeclaration);
    }

    return content;
  }

  /**
   * Escape special regex characters
   */
  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Generate translation keys file for review
   */
  generateTranslationKeys() {
    const outputFile = path.join(__dirname, '../translation-keys-generated.json');
    const translationObject = {};

    // Convert flat keys to nested object
    for (const [key, value] of this.translationKeys) {
      this.setNestedProperty(translationObject, key, value);
    }

    fs.writeFileSync(outputFile, JSON.stringify(translationObject, null, 2), 'utf8');
    console.log(`\n📝 Generated translation keys saved to: ${outputFile}`);
    console.log('👀 Please review and add these keys to your translation files.');
  }

  /**
   * Set nested object property from dot notation key
   */
  setNestedProperty(obj, key, value) {
    const keys = key.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
  }
}

// Execute if run directly
if (require.main === module) {
  const fixer = new BatchI18nFixer();
  fixer.execute().catch(console.error);
}

module.exports = BatchI18nFixer;