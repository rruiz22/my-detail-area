#!/usr/bin/env node

/**
 * Bundle Size Analysis Script
 *
 * Analyzes Vite build output to report bundle sizes and code splitting effectiveness.
 * Run after: npm run build or npm run build:dev
 *
 * Usage: node scripts/analyze-bundle-size.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, '..', 'dist', 'assets');
const KB = 1024;
const MB = 1024 * 1024;

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  if (bytes < KB) return `${bytes} B`;
  if (bytes < MB) return `${(bytes / KB).toFixed(2)} KB`;
  return `${(bytes / MB).toFixed(2)} MB`;
}

function analyzeBundle() {
  if (!fs.existsSync(DIST_DIR)) {
    console.error('❌ Error: dist/assets directory not found. Run build first.');
    console.error('   Run: npm run build or npm run build:dev');
    process.exit(1);
  }

  const files = fs.readdirSync(DIST_DIR);
  const jsFiles = files.filter(f => f.endsWith('.js') && !f.includes('.map'));

  const fileStats = jsFiles.map(file => {
    const filePath = path.join(DIST_DIR, file);
    const stats = fs.statSync(filePath);
    return {
      name: file,
      size: stats.size,
      isVendor: file.includes('vendor'),
      isChunk: !file.includes('index-') && !file.includes('vendor')
    };
  }).sort((a, b) => b.size - a.size);

  const totalSize = fileStats.reduce((sum, f) => sum + f.size, 0);
  const mainBundle = fileStats.find(f => f.name.includes('index-'));
  const vendorBundles = fileStats.filter(f => f.isVendor);
  const chunks = fileStats.filter(f => f.isChunk);

  console.log('\n' + '='.repeat(80));
  console.log('📦 BUNDLE SIZE ANALYSIS');
  console.log('='.repeat(80) + '\n');

  // Main Bundle
  console.log('🎯 MAIN BUNDLE');
  console.log('-'.repeat(80));
  if (mainBundle) {
    console.log(`   ${mainBundle.name}`);
    console.log(`   Size: ${formatBytes(mainBundle.size)}`);
    console.log(`   Percentage: ${((mainBundle.size / totalSize) * 100).toFixed(1)}%`);
  }
  console.log();

  // Vendor Bundles
  console.log('📚 VENDOR BUNDLES');
  console.log('-'.repeat(80));
  let vendorTotal = 0;
  vendorBundles.forEach(bundle => {
    vendorTotal += bundle.size;
    console.log(`   ${bundle.name}`);
    console.log(`   Size: ${formatBytes(bundle.size)}`);
  });
  console.log(`   Total: ${formatBytes(vendorTotal)}`);
  console.log();

  // Code-Split Chunks
  console.log('✂️  CODE-SPLIT CHUNKS');
  console.log('-'.repeat(80));
  const relevantChunks = chunks.filter(c =>
    c.name.includes('OrderDataTable') ||
    c.name.includes('OrderKanbanBoard') ||
    c.name.includes('SmartDashboard') ||
    c.name.includes('OrderCalendarView') ||
    c.size > 10 * KB
  );

  if (relevantChunks.length === 0) {
    console.log('   ℹ️  No separate chunks detected. Components may be in main bundle.');
    console.log('   This is normal if other pages also import these components.');
  } else {
    relevantChunks.forEach(chunk => {
      console.log(`   ${chunk.name}`);
      console.log(`   Size: ${formatBytes(chunk.size)}`);
    });
  }
  console.log();

  // Summary Statistics
  console.log('📊 SUMMARY');
  console.log('-'.repeat(80));
  console.log(`   Total JS Size:     ${formatBytes(totalSize)}`);
  console.log(`   Main Bundle:       ${formatBytes(mainBundle?.size || 0)}`);
  console.log(`   Vendor Bundles:    ${formatBytes(vendorTotal)}`);
  console.log(`   Code-Split Chunks: ${chunks.length} files`);
  console.log();

  // Performance Recommendations
  console.log('💡 RECOMMENDATIONS');
  console.log('-'.repeat(80));

  if (mainBundle && mainBundle.size > 1 * MB) {
    console.log('   ⚠️  Main bundle is large (>1 MB). Consider:');
    console.log('      - More aggressive code splitting');
    console.log('      - Route-based lazy loading');
    console.log('      - Tree-shaking unused dependencies');
  } else {
    console.log('   ✅ Main bundle size is acceptable');
  }

  console.log();

  if (chunks.length < 5) {
    console.log('   ℹ️  Limited code splitting detected. Consider:');
    console.log('      - Lazy loading heavy components');
    console.log('      - Dynamic imports for routes');
    console.log('      - Splitting large vendor packages');
  } else {
    console.log('   ✅ Good code splitting strategy in place');
  }

  console.log();
  console.log('='.repeat(80) + '\n');

  // Export report to JSON
  const report = {
    timestamp: new Date().toISOString(),
    totalSize,
    mainBundle: mainBundle ? { name: mainBundle.name, size: mainBundle.size } : null,
    vendorTotal,
    chunks: chunks.length,
    files: fileStats.map(f => ({ name: f.name, size: f.size }))
  };

  const reportPath = path.join(__dirname, '..', 'bundle-analysis.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Detailed report saved to: bundle-analysis.json\n`);
}

try {
  analyzeBundle();
} catch (error) {
  console.error('❌ Error analyzing bundle:', error.message);
  process.exit(1);
}
