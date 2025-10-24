/**
 * Application Version Configuration
 *
 * This file centralizes version information for the entire application.
 * The version is imported from package.json to maintain a single source of truth.
 *
 * To update the version, run:
 * - npm version patch  (1.0.0 -> 1.0.1) - Bug fixes
 * - npm version minor  (1.0.0 -> 1.1.0) - New features
 * - npm version major  (1.0.0 -> 2.0.0) - Breaking changes
 */

// Import version from package.json
import packageJson from '../../package.json';

/**
 * Current application version
 * Source: package.json
 */
export const APP_VERSION = packageJson.version;

/**
 * Version display format for UI
 * @param showPrefix - Whether to show 'v' prefix (default: true)
 * @returns Formatted version string (e.g., "v1.0.0" or "1.0.0")
 */
export const getFormattedVersion = (showPrefix: boolean = true): string => {
  return showPrefix ? `v${APP_VERSION}` : APP_VERSION;
};

/**
 * Build information (can be extended with environment variables)
 */
export const BUILD_INFO = {
  version: APP_VERSION,
  buildDate: new Date().toISOString(),
  environment: import.meta.env.MODE, // 'development' or 'production'
} as const;
