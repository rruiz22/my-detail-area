/**
 * Development configuration for My Detail Area
 * Provides environment-specific settings and feature flags
 */

export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;

export const developmentConfig = {
  // Cloud sync settings for development
  cloudSync: {
    enabled: false, // Disable cloud sync in development to reduce console noise
    fallbackToLocal: true,
    showWarnings: false, // Reduce CORS error noise in console
    retryAttempts: 0, // Don't retry in development
    timeout: 2000 // Shorter timeout for faster fallback
  },
  
  // API endpoints
  api: {
    baseUrl: isDevelopment 
      ? 'http://localhost:3000' // Use local API in development if available
      : 'https://claude-memory-sync-api-production.up.railway.app',
    timeout: isDevelopment ? 2000 : 10000
  },
  
  // Storage settings
  storage: {
    namespace: isDevelopment ? 'mda-dev' : 'mda-enterprise',
    enableCloudSync: !isDevelopment, // Only sync in production
    verboseLogging: isDevelopment
  },
  
  // Feature flags
  features: {
    enableCloudDashboard: isDevelopment, // Show cloud sync dashboard in dev
    enableStorageDebug: isDevelopment,
    enableOfflineMode: true
  }
};

export const getApiUrl = (): string => {
  return developmentConfig.api.baseUrl;
};

export const shouldEnableCloudSync = (): boolean => {
  return developmentConfig.storage.enableCloudSync;
};

export const getStorageNamespace = (): string => {
  return developmentConfig.storage.namespace;
};