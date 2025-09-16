const fs = require('fs');

// Read the ESLint report
const reportPath = 'eslint-report.json';

if (!fs.existsSync(reportPath)) {
  console.log('ESLint report not found. Please run: npm run lint -- --format=json > eslint-report.json');
  process.exit(1);
}

const rawData = fs.readFileSync(reportPath, 'utf8');
// Remove the command line output from the beginning
const jsonStart = rawData.indexOf('[');
const jsonData = rawData.substring(jsonStart);

let report;
try {
  report = JSON.parse(jsonData);
} catch (error) {
  console.error('Failed to parse JSON report:', error);
  process.exit(1);
}

// Analyze the report
const fileStats = {};
const errorTypes = {};
const criticalFiles = [];

report.forEach(fileReport => {
  const { filePath, messages, errorCount, warningCount } = fileReport;

  if (errorCount > 0 || warningCount > 0) {
    const fileName = filePath.replace(/.*[\\\/]/, '');
    const relativePath = filePath.replace(/.*mydetailarea[\\\/]/, '');

    fileStats[relativePath] = {
      errors: errorCount,
      warnings: warningCount,
      total: errorCount + warningCount,
      messages: messages
    };

    // Categorize by error type
    messages.forEach(msg => {
      const ruleId = msg.ruleId;
      if (!errorTypes[ruleId]) {
        errorTypes[ruleId] = { count: 0, files: new Set() };
      }
      errorTypes[ruleId].count++;
      errorTypes[ruleId].files.add(relativePath);
    });

    // Mark as critical if it's in core business logic paths
    const isCritical = relativePath.includes('/pages/') ||
                      relativePath.includes('/orders/') ||
                      relativePath.includes('/users/') ||
                      relativePath.includes('/contacts/') ||
                      relativePath.includes('/permissions/') ||
                      relativePath.includes('/chat/') ||
                      relativePath.includes('/scanner/');

    if (isCritical && (errorCount > 0)) {
      criticalFiles.push({ path: relativePath, ...fileStats[relativePath] });
    }
  }
});

// Sort files by error count
const sortedFiles = Object.entries(fileStats)
  .sort(([,a], [,b]) => b.total - a.total)
  .slice(0, 20);

// Sort error types by frequency
const sortedErrorTypes = Object.entries(errorTypes)
  .sort(([,a], [,b]) => b.count - a.count);

console.log('=== ESLINT ERROR ANALYSIS ===\n');

console.log('📊 ERROR SUMMARY:');
const totalErrors = report.reduce((sum, file) => sum + file.errorCount, 0);
const totalWarnings = report.reduce((sum, file) => sum + file.warningCount, 0);
console.log(`Total Errors: ${totalErrors}`);
console.log(`Total Warnings: ${totalWarnings}`);
console.log(`Total Files with Issues: ${Object.keys(fileStats).length}`);

console.log('\n🔴 TOP ERROR TYPES:');
sortedErrorTypes.slice(0, 10).forEach(([rule, data]) => {
  console.log(`${rule}: ${data.count} errors across ${data.files.size} files`);
});

console.log('\n📁 FILES WITH MOST ERRORS:');
sortedFiles.forEach(([file, stats]) => {
  console.log(`${file}: ${stats.errors} errors, ${stats.warnings} warnings`);
});

console.log('\n🚨 CRITICAL BUSINESS FILES (Pages, Orders, Users, etc):');
criticalFiles
  .sort((a, b) => b.errors - a.errors)
  .slice(0, 15)
  .forEach(file => {
    console.log(`${file.path}: ${file.errors} errors`);
    // Show first few error types for context
    const errorsByType = {};
    file.messages.filter(m => m.severity === 2).forEach(m => {
      errorsByType[m.ruleId] = (errorsByType[m.ruleId] || 0) + 1;
    });
    Object.entries(errorsByType).slice(0, 3).forEach(([rule, count]) => {
      console.log(`  - ${rule}: ${count} occurrences`);
    });
  });

console.log('\n💡 QUICK WINS (High Impact, Low Effort):');

// Identify regex escape issues
const regexFiles = [];
Object.entries(fileStats).forEach(([file, stats]) => {
  const regexErrors = stats.messages.filter(m => m.ruleId === 'no-useless-escape');
  if (regexErrors.length > 0) {
    regexFiles.push({ file, count: regexErrors.length });
  }
});

if (regexFiles.length > 0) {
  console.log('🔧 Regex Escape Fixes:');
  regexFiles.forEach(({ file, count }) => {
    console.log(`  ${file}: ${count} regex escape issues`);
  });
}

// React refresh issues
const refreshFiles = [];
Object.entries(fileStats).forEach(([file, stats]) => {
  const refreshErrors = stats.messages.filter(m => m.ruleId === 'react-refresh/only-export-components');
  if (refreshErrors.length > 0) {
    refreshFiles.push({ file, count: refreshErrors.length });
  }
});

if (refreshFiles.length > 0) {
  console.log('⚡ React Fast Refresh Fixes:');
  refreshFiles.forEach(({ file, count }) => {
    console.log(`  ${file}: ${count} export issues`);
  });
}

console.log('\n📋 PRIORITIZED CORRECTION PLAN:');
console.log('1. 🔴 CRITICAL: Fix type safety in core business files');
console.log('2. 🟡 MEDIUM: Fix regex escape characters (quick automated fix)');
console.log('3. 🟡 MEDIUM: Resolve React refresh export issues');
console.log('4. 🟢 LOW: Address remaining any types in utility files');