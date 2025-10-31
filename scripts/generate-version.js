import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
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

// Read package.json version
const packageJson = JSON.parse(
  execSync('type package.json', { encoding: 'utf8', shell: 'powershell.exe' })
);

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

console.log('✅ Version file generated:');
console.log(JSON.stringify(versionInfo, null, 2));
