/**
 * Translation Audit System - Comprehensive Missing Keys Detection
 * Scans entire codebase for translation usage and validates coverage
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

export interface TranslationUsage {
  key: string;
  file: string;
  line: number;
  context: string;
}

export interface AuditResult {
  summary: {
    totalFiles: number;
    totalKeys: number;
    usedKeys: number;
    missingKeys: number;
    coveragePercent: number;
  };
  
  byLanguage: {
    en: { total: number; missing: string[]; coverage: number };
    es: { total: number; missing: string[]; coverage: number };
    pt: { total: number; missing: string[]; coverage: number };
  };
  
  byPage: Record<string, {
    file: string;
    keysUsed: string[];
    missingKeys: string[];
    status: 'complete' | 'partial' | 'missing';
  }>;
  
  usageDetails: TranslationUsage[];
  recommendations: string[];
}

export class TranslationAuditService {
  private readonly translationPatterns = [
    // Standard t('key') usage
    /t\(['"`]([^'"`]+)['"`]\)/g,
    // t('key', {variables}) usage
    /t\(['"`]([^'"`]+)['"`]\s*,\s*{[^}]*}\)/g,
    // JSX {t('key')} usage
    /\{t\(['"`]([^'"`]+)['"`]\)\}/g,
    // JSX {t('key', {vars})} usage
    /\{t\(['"`]([^'"`]+)['"`]\s*,\s*{[^}]*}\)\}/g,
  ];

  private readonly sourceDirectories = [
    'src/pages',
    'src/components', 
    'src/hooks',
    'src/contexts',
    'src/layouts',
    'src/utils'
  ];

  private readonly translationFiles = {
    en: 'public/translations/en.json',
    es: 'public/translations/es.json',
    pt: 'public/translations/pt-BR.json'
  };

  /**
   * Main audit function - scans entire codebase
   */
  async runCompleteAudit(): Promise<AuditResult> {
    console.log('🔍 Starting comprehensive translation audit...');
    
    // 1. Scan all TypeScript files for translation usage
    const allFiles = this.getAllTsxFiles();
    const usageDetails = this.extractAllTranslationUsage(allFiles);
    const usedKeys = [...new Set(usageDetails.map(usage => usage.key))];
    
    console.log(`📁 Scanned ${allFiles.length} files, found ${usedKeys.length} unique translation keys`);
    
    // 2. Load translation files
    const translations = this.loadAllTranslations();
    
    // 3. Check coverage for each language
    const missingByLanguage = this.findMissingKeys(usedKeys, translations);
    
    // 4. Generate page-by-page breakdown
    const pageBreakdown = this.generatePageBreakdown(usageDetails, missingByLanguage);
    
    // 5. Calculate coverage statistics
    const summary = this.calculateCoverage(usedKeys, translations, missingByLanguage);
    
    // 6. Generate recommendations
    const recommendations = this.generateRecommendations(missingByLanguage, pageBreakdown);

    return {
      summary,
      byLanguage: {
        en: {
          total: this.getTotalKeys(translations.en),
          missing: missingByLanguage.en,
          coverage: ((usedKeys.length - missingByLanguage.en.length) / usedKeys.length) * 100
        },
        es: {
          total: this.getTotalKeys(translations.es),
          missing: missingByLanguage.es,
          coverage: ((usedKeys.length - missingByLanguage.es.length) / usedKeys.length) * 100
        },
        pt: {
          total: this.getTotalKeys(translations.pt),
          missing: missingByLanguage.pt,
          coverage: ((usedKeys.length - missingByLanguage.pt.length) / usedKeys.length) * 100
        }
      },
      byPage: pageBreakdown,
      usageDetails,
      recommendations
    };
  }

  /**
   * Get all TypeScript/TSX files to scan
   */
  private getAllTsxFiles(): string[] {
    const files: string[] = [];
    
    for (const dir of this.sourceDirectories) {
      try {
        const dirFiles = this.scanDirectory(dir, ['.tsx', '.ts']);
        files.push(...dirFiles);
      } catch (error) {
        console.warn(`⚠️ Could not scan directory: ${dir}`);
      }
    }
    
    return files;
  }

  /**
   * Recursively scan directory for specific file types
   */
  private scanDirectory(dirPath: string, extensions: string[]): string[] {
    const files: string[] = [];
    
    try {
      const items = readdirSync(dirPath);
      
      for (const item of items) {
        const fullPath = join(dirPath, item);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Skip node_modules and other build directories
          if (!item.startsWith('.') && !['node_modules', 'dist', 'build'].includes(item)) {
            files.push(...this.scanDirectory(fullPath, extensions));
          }
        } else if (extensions.some(ext => item.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.warn(`⚠️ Error scanning ${dirPath}:`, error);
    }
    
    return files;
  }

  /**
   * Extract all translation usage from files
   */
  private extractAllTranslationUsage(files: string[]): TranslationUsage[] {
    const allUsage: TranslationUsage[] = [];
    
    for (const file of files) {
      try {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
          const line = lines[lineIndex];
          
          for (const pattern of this.translationPatterns) {
            let match;
            while ((match = pattern.exec(line)) !== null) {
              allUsage.push({
                key: match[1],
                file: file.replace(process.cwd() + '/', ''),
                line: lineIndex + 1,
                context: line.trim()
              });
            }
            // Reset regex lastIndex
            pattern.lastIndex = 0;
          }
        }
      } catch (error) {
        console.warn(`⚠️ Could not read file: ${file}`);
      }
    }
    
    return allUsage;
  }

  /**
   * Load all translation files
   */
  private loadAllTranslations() {
    try {
      return {
        en: JSON.parse(readFileSync(this.translationFiles.en, 'utf-8')),
        es: JSON.parse(readFileSync(this.translationFiles.es, 'utf-8')),
        pt: JSON.parse(readFileSync(this.translationFiles.pt, 'utf-8'))
      };
    } catch (error) {
      console.error('❌ Error loading translation files:', error);
      return { en: {}, es: {}, pt: {} };
    }
  }

  /**
   * Check if translation key exists (supports nested keys like 'user.profile.name')
   */
  private hasTranslationKey(obj: any, keyPath: string): boolean {
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
   * Find missing keys in each language
   */
  private findMissingKeys(usedKeys: string[], translations: any) {
    return {
      en: usedKeys.filter(key => !this.hasTranslationKey(translations.en, key)),
      es: usedKeys.filter(key => !this.hasTranslationKey(translations.es, key)),
      pt: usedKeys.filter(key => !this.hasTranslationKey(translations.pt, key))
    };
  }

  /**
   * Generate page-by-page breakdown
   */
  private generatePageBreakdown(usageDetails: TranslationUsage[], missingByLanguage: any) {
    const pageMap: Record<string, {
      file: string;
      keysUsed: string[];
      missingKeys: string[];
      status: 'complete' | 'partial' | 'missing';
    }> = {};

    // Group by file
    const fileGroups = usageDetails.reduce((acc, usage) => {
      if (!acc[usage.file]) acc[usage.file] = [];
      acc[usage.file].push(usage.key);
      return acc;
    }, {} as Record<string, string[]>);

    // Analyze each file
    for (const [file, keys] of Object.entries(fileGroups)) {
      const uniqueKeys = [...new Set(keys)];
      const missing = [...new Set([
        ...missingByLanguage.en,
        ...missingByLanguage.es, 
        ...missingByLanguage.pt
      ])];
      
      const fileMissingKeys = uniqueKeys.filter(key => missing.includes(key));
      
      let status: 'complete' | 'partial' | 'missing';
      if (fileMissingKeys.length === 0) {
        status = 'complete';
      } else if (fileMissingKeys.length < uniqueKeys.length / 2) {
        status = 'partial';
      } else {
        status = 'missing';
      }

      pageMap[file] = {
        file,
        keysUsed: uniqueKeys,
        missingKeys: fileMissingKeys,
        status
      };
    }

    return pageMap;
  }

  /**
   * Calculate overall coverage statistics
   */
  private calculateCoverage(usedKeys: string[], translations: any, missingByLanguage: any) {
    const totalMissing = new Set([
      ...missingByLanguage.en,
      ...missingByLanguage.es,
      ...missingByLanguage.pt
    ]).size;

    return {
      totalFiles: this.getAllTsxFiles().length,
      totalKeys: this.getTotalKeys(translations.en),
      usedKeys: usedKeys.length,
      missingKeys: totalMissing,
      coveragePercent: Math.round(((usedKeys.length - totalMissing) / usedKeys.length) * 100)
    };
  }

  /**
   * Count total translation keys in object (nested)
   */
  private getTotalKeys(obj: any, depth = 0): number {
    if (depth > 10) return 0; // Prevent infinite recursion
    
    let count = 0;
    for (const value of Object.values(obj)) {
      if (typeof value === 'object' && value !== null) {
        count += this.getTotalKeys(value, depth + 1);
      } else {
        count += 1;
      }
    }
    return count;
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(missingByLanguage: any, pageBreakdown: any): string[] {
    const recommendations: string[] = [];
    
    // Language-specific recommendations
    if (missingByLanguage.es.length > 0) {
      recommendations.push(`Add ${missingByLanguage.es.length} missing Spanish translations`);
    }
    if (missingByLanguage.pt.length > 0) {
      recommendations.push(`Add ${missingByLanguage.pt.length} missing Portuguese translations`);
    }
    if (missingByLanguage.en.length > 0) {
      recommendations.push(`Add ${missingByLanguage.en.length} missing English translations`);
    }

    // Page-specific recommendations
    const problematicPages = Object.entries(pageBreakdown)
      .filter(([_, data]: [string, any]) => data.status !== 'complete')
      .sort(([_, a]: [string, any], [__, b]: [string, any]) => b.missingKeys.length - a.missingKeys.length)
      .slice(0, 5);

    for (const [file, data] of problematicPages) {
      recommendations.push(`Fix ${data.missingKeys.length} missing keys in ${file}`);
    }

    return recommendations;
  }

  /**
   * Print formatted audit report to console
   */
  printAuditReport(result: AuditResult): void {
    console.log('\n🔍 TRANSLATION AUDIT RESULTS');
    console.log('========================================');
    console.log(`📁 Files Scanned: ${result.summary.totalFiles}`);
    console.log(`🔑 Translation Keys Found: ${result.summary.usedKeys}`);
    console.log(`📊 Overall Coverage: ${result.summary.coveragePercent}%`);
    
    console.log('\n📊 Coverage by Language:');
    console.log(`├── 🇺🇸 English: ${result.byLanguage.en.total} keys (${Math.round(result.byLanguage.en.coverage)}%) ${result.byLanguage.en.missing.length === 0 ? '✅' : '⚠️'}`);
    console.log(`├── 🇪🇸 Spanish: ${result.byLanguage.es.total} keys (${Math.round(result.byLanguage.es.coverage)}%) ${result.byLanguage.es.missing.length === 0 ? '✅' : '⚠️'}`);
    console.log(`└── 🇧🇷 Portuguese: ${result.byLanguage.pt.total} keys (${Math.round(result.byLanguage.pt.coverage)}%) ${result.byLanguage.pt.missing.length === 0 ? '✅' : '⚠️'}`);

    if (result.byLanguage.es.missing.length > 0 || result.byLanguage.pt.missing.length > 0) {
      console.log('\n❌ Missing Keys (Priority):');
      const allMissing = [...new Set([...result.byLanguage.es.missing, ...result.byLanguage.pt.missing])];
      allMissing.slice(0, 10).forEach(key => {
        const languages = [];
        if (result.byLanguage.es.missing.includes(key)) languages.push('ES');
        if (result.byLanguage.pt.missing.includes(key)) languages.push('PT');
        console.log(`├── ${key} (${languages.join(', ')})`);
      });
      if (allMissing.length > 10) {
        console.log(`└── ... and ${allMissing.length - 10} more`);
      }
    }

    console.log('\n📋 By Page Status:');
    const sortedPages = Object.entries(result.byPage)
      .sort(([_, a], [__, b]) => b.missingKeys.length - a.missingKeys.length)
      .slice(0, 10);
    
    for (const [file, data] of sortedPages) {
      const statusIcon = data.status === 'complete' ? '✅' : data.status === 'partial' ? '⚠️' : '❌';
      const fileName = file.split('/').pop() || file;
      console.log(`├── ${statusIcon} ${fileName}: ${data.status} (${data.keysUsed.length - data.missingKeys.length}/${data.keysUsed.length})`);
    }

    if (result.recommendations.length > 0) {
      console.log('\n🎯 Recommendations:');
      result.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }
    
    console.log('\n✨ Audit Complete!');
  }

  /**
   * Export missing keys to JSON for easy translation
   */
  exportMissingKeys(result: AuditResult): void {
    const missingKeys = {
      spanish: result.byLanguage.es.missing.reduce((acc, key) => {
        acc[key] = `[TODO: Translate '${key}']`;
        return acc;
      }, {} as Record<string, string>),
      
      portuguese: result.byLanguage.pt.missing.reduce((acc, key) => {
        acc[key] = `[TODO: Translate '${key}']`;
        return acc;
      }, {} as Record<string, string>)
    };

    console.log('\n📄 Missing Keys JSON:');
    console.log('Spanish missing keys:', JSON.stringify(missingKeys.spanish, null, 2));
    console.log('Portuguese missing keys:', JSON.stringify(missingKeys.portuguese, null, 2));
  }
}

// Export singleton instance
export const translationAudit = new TranslationAuditService();