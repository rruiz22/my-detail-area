/**
 * Development configuration for My Detail Area
 * Provides environment-specific settings and feature flags
 */

export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;

export const developmentConfig = {
  // Cloud sync settings - DISABLED for stability
  cloudSync: {
    enabled: false, // Disabled globally - external API not available
    fallbackToLocal: true,
    showWarnings: false, // Reduce console noise
    retryAttempts: 0, // Don't retry
    timeout: 2000
  },
  
  // API endpoints
  api: {
    baseUrl: isDevelopment 
      ? 'http://localhost:3000'
      : 'https://claude-memory-sync-api-production.up.railway.app',
    timeout: isDevelopment ? 2000 : 10000
  },
  
  // Storage settings - LOCAL ONLY
  storage: {
    namespace: isDevelopment ? 'mda-dev' : 'mda-enterprise',
    enableCloudSync: false, // Disabled - use localStorage only
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