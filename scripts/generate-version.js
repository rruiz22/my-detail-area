import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getGitCommit() {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch (error) {
    console.warn('⚠️ Git commit not available:', error.message);
    return 'no-git';
  }
}

function getGitBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
  } catch (error) {
    return 'unknown';
  }
}

function getBuildNumber() {
  // Use timestamp as build number
  return Date.now().toString();
}

// Read package.json version (cross-platform)
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

const versionInfo = {
  version: packageJson.version,
  buildTime: new Date().toISOString(),
  buildTimestamp: Date.now(),
  gitCommit: getGitCommit(),
  gitBranch: getGitBranch(),
  buildNumber: getBuildNumber(),
  environment: process.env.NODE_ENV || 'production'
};

// Write to public folder so it's accessible at runtime
const publicPath = path.join(__dirname, '..', 'public', 'version.json');
writeFileSync(publicPath, JSON.stringify(versionInfo, null, 2));

// Also write to src for compile-time access
const srcPath = path.join(__dirname, '..', 'src', 'version.json');
writeFileSync(srcPath, JSON.stringify(versionInfo, null, 2));

// 🔴 CRITICAL FIX: Update APP_VERSION in i18n.ts to match package.json version
// This ensures translation cache automatically invalidates on version bumps
const i18nPath = path.join(__dirname, '..', 'src', 'lib', 'i18n.ts');
try {
  let i18nContent = readFileSync(i18nPath, 'utf8');

  // Replace APP_VERSION constant with current version
  const versionRegex = /const APP_VERSION = ['"][\d.]+['"];/;
  const newVersionLine = `const APP_VERSION = '${packageJson.version}';`;

  if (versionRegex.test(i18nContent)) {
    i18nContent = i18nContent.replace(versionRegex, newVersionLine);
    writeFileSync(i18nPath, i18nContent, 'utf8');
    console.log(`✅ Updated APP_VERSION in i18n.ts to ${packageJson.version}`);
  } else {
    console.warn('⚠️ Could not find APP_VERSION in i18n.ts');
  }
} catch (error) {
  console.error('❌ Failed to update i18n.ts:', error.message);
}

console.log('✅ Version file generated:');
console.log(JSON.stringify(versionInfo, null, 2));
