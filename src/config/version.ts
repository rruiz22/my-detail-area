/**
 * Application Version Configuration
 *
 * This file centralizes version information for the entire application.
 * Now integrated with the dynamic versioning system that includes:
 * - Version from package.json
 * - Build timestamp and number
 * - Git commit hash and branch
 *
 * Version is generated automatically on each build by scripts/generate-version.js
 * The version.json file is created during the build process.
 */

// Import version from package.json (fallback)
import packageJson from '../../package.json';

// Try to import generated version info (available after build)
// This will be dynamically loaded from version.json at runtime
let versionInfo: {
  version: string;
  buildTime: string;
  buildTimestamp: number;
  gitCommit: string;
  gitBranch: string;
  buildNumber: string;
  environment: string;
} | null = null;

// Load version info dynamically from public/version.json
// This is loaded at runtime to ensure latest version info
if (typeof window !== 'undefined') {
  try {
    // Fetch is async, but we'll use APP_VERSION as sync fallback
    fetch('/version.json?t=' + Date.now())
      .then(res => res.json())
      .then(data => {
        versionInfo = data;
      })
      .catch(err => {
        console.warn('⚠️ Could not load version.json, using package.json fallback', err);
      });
  } catch (error) {
    console.warn('⚠️ Version fetch not available', error);
  }
}

/**
 * Current application version (from package.json)
 * This is the synchronous fallback version
 */
export const APP_VERSION = packageJson.version;

/**
 * Get runtime version information
 * Returns the dynamically loaded version info or fallback to package.json
 */
export const getVersionInfo = () => {
  return versionInfo || {
    version: packageJson.version,
    buildTime: new Date().toISOString(),
    buildTimestamp: Date.now(),
    gitCommit: 'unknown',
    gitBranch: 'unknown',
    buildNumber: 'dev',
    environment: import.meta.env.MODE
  };
};

/**
 * Version display format for UI
 * @param showPrefix - Whether to show 'v' prefix (default: true)
 * @returns Formatted version string (e.g., "v1.0.0" or "1.0.0")
 */
export const getFormattedVersion = (showPrefix: boolean = true): string => {
  const version = versionInfo?.version || APP_VERSION;
  return showPrefix ? `v${version}` : version;
};

/**
 * Get full version string with build info
 * Example: "v1.0.0-beta (Build 1730324400000)"
 */
export const getFullVersionString = (): string => {
  const info = getVersionInfo();
  return `v${info.version} (Build ${info.buildNumber})`;
};

/**
 * Get version with git commit
 * Example: "v1.0.0-beta (a3f2c1d)"
 */
export const getVersionWithCommit = (): string => {
  const info = getVersionInfo();
  return `v${info.version} (${info.gitCommit})`;
};

/**
 * Build information (extended with dynamic data)
 */
export const BUILD_INFO = {
  version: APP_VERSION,
  buildDate: new Date().toISOString(),
  environment: import.meta.env.MODE,
  // Runtime info will be populated from version.json
  getRuntimeInfo: getVersionInfo
} as const;
