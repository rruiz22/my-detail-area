/**
 * Order Modal Optimization Configuration
 *
 * Centralized configuration for the optimized order modal data fetching system.
 * Allows environment-specific tuning and feature toggles.
 */

interface OptimizationConfig {
  // Cache Configuration
  cache: {
    defaultTTL: number;           // Fresh data TTL in milliseconds
    staleTTL: number;            // Stale-while-revalidate TTL in milliseconds
    maxCacheSize: number;        // Maximum number of cached entries
    cleanupInterval: number;     // Cache cleanup interval in milliseconds
  };

  // Database Query Optimization
  queryOptimizer: {
    maxConnections: number;      // Maximum concurrent database connections
    connectionTimeout: number;   // Connection timeout in milliseconds
    idleTimeout: number;        // Idle connection timeout in milliseconds
    retryAttempts: number;      // Maximum retry attempts for failed queries
    retryDelay: number;         // Initial retry delay in milliseconds
    queryTimeout: number;       // Individual query timeout in milliseconds
  };

  // Real-time Subscriptions
  realtime: {
    enabled: boolean;           // Enable/disable real-time features
    reconnectAttempts: number;  // Maximum reconnection attempts
    reconnectDelay: number;     // Initial reconnection delay in milliseconds
    heartbeatInterval: number;  // Connection heartbeat interval in milliseconds
    batchUpdates: boolean;      // Enable update batching
    batchDelay: number;         // Update batch delay in milliseconds
  };

  // Request Deduplication
  deduplication: {
    enabled: boolean;           // Enable/disable request deduplication
    requestTimeout: number;     // Request timeout in milliseconds
    cleanupInterval: number;    // Cleanup interval for expired requests
  };

  // Performance Monitoring
  monitoring: {
    enabled: boolean;           // Enable/disable performance monitoring
    metricsHistory: number;     // Number of metrics to keep in memory
    enableCustomEvents: boolean; // Emit custom performance events
    enableConsoleLogging: boolean; // Log performance data to console
  };

  // Feature Flags
  features: {
    prefetching: boolean;       // Enable prefetching before modal opens
    optimisticUpdates: boolean; // Enable optimistic UI updates
    staleWhileRevalidate: boolean; // Enable stale-while-revalidate pattern
    connectionPooling: boolean; // Enable database connection pooling
    queryBatching: boolean;     // Enable query batching
  };
}

// Development Configuration
const developmentConfig: OptimizationConfig = {
  cache: {
    defaultTTL: 2 * 60 * 1000,      // 2 minutes (shorter for development)
    staleTTL: 10 * 60 * 1000,       // 10 minutes
    maxCacheSize: 50,               // Smaller cache for development
    cleanupInterval: 1 * 60 * 1000  // 1 minute cleanup
  },

  queryOptimizer: {
    maxConnections: 4,              // Conservative for development
    connectionTimeout: 8000,        // 8 seconds
    idleTimeout: 30000,            // 30 seconds
    retryAttempts: 2,              // Fewer retries in development
    retryDelay: 500,               // 500ms initial delay
    queryTimeout: 8000             // 8 second query timeout
  },

  realtime: {
    enabled: true,
    reconnectAttempts: 3,
    reconnectDelay: 1000,          // 1 second
    heartbeatInterval: 15000,      // 15 seconds
    batchUpdates: true,
    batchDelay: 50                 // 50ms for responsive development
  },

  deduplication: {
    enabled: true,
    requestTimeout: 20000,         // 20 seconds
    cleanupInterval: 30000         // 30 seconds
  },

  monitoring: {
    enabled: true,                 // Full monitoring in development
    metricsHistory: 100,
    enableCustomEvents: true,
    enableConsoleLogging: true
  },

  features: {
    prefetching: true,
    optimisticUpdates: true,
    staleWhileRevalidate: true,
    connectionPooling: true,
    queryBatching: true
  }
};

// Production Configuration
const productionConfig: OptimizationConfig = {
  cache: {
    defaultTTL: 5 * 60 * 1000,      // 5 minutes
    staleTTL: 15 * 60 * 1000,       // 15 minutes
    maxCacheSize: 100,              // Larger cache for production
    cleanupInterval: 2 * 60 * 1000  // 2 minute cleanup
  },

  queryOptimizer: {
    maxConnections: 8,              // Higher for production
    connectionTimeout: 10000,       // 10 seconds
    idleTimeout: 60000,            // 1 minute
    retryAttempts: 3,              // More retries in production
    retryDelay: 1000,              // 1 second initial delay
    queryTimeout: 10000            // 10 second query timeout
  },

  realtime: {
    enabled: true,
    reconnectAttempts: 5,          // More attempts in production
    reconnectDelay: 2000,          // 2 seconds
    heartbeatInterval: 30000,      // 30 seconds
    batchUpdates: true,
    batchDelay: 100                // 100ms for optimal UX
  },

  deduplication: {
    enabled: true,
    requestTimeout: 30000,         // 30 seconds
    cleanupInterval: 60000         // 1 minute
  },

  monitoring: {
    enabled: true,
    metricsHistory: 50,            // Fewer metrics in production
    enableCustomEvents: true,      // For external monitoring
    enableConsoleLogging: false    // Disable console logging
  },

  features: {
    prefetching: true,
    optimisticUpdates: true,
    staleWhileRevalidate: true,
    connectionPooling: true,
    queryBatching: true
  }
};

// Test Configuration
const testConfig: OptimizationConfig = {
  cache: {
    defaultTTL: 100,               // Very short for testing
    staleTTL: 200,
    maxCacheSize: 10,
    cleanupInterval: 50
  },

  queryOptimizer: {
    maxConnections: 2,             // Minimal for tests
    connectionTimeout: 5000,       // 5 seconds
    idleTimeout: 10000,           // 10 seconds
    retryAttempts: 1,             // Single attempt for tests
    retryDelay: 100,              // 100ms
    queryTimeout: 5000            // 5 seconds
  },

  realtime: {
    enabled: false,               // Disable real-time in tests
    reconnectAttempts: 1,
    reconnectDelay: 100,
    heartbeatInterval: 5000,
    batchUpdates: false,          // Immediate updates for tests
    batchDelay: 0
  },

  deduplication: {
    enabled: true,
    requestTimeout: 5000,         // 5 seconds
    cleanupInterval: 1000         // 1 second
  },

  monitoring: {
    enabled: false,               // Disable monitoring in tests
    metricsHistory: 10,
    enableCustomEvents: false,
    enableConsoleLogging: false
  },

  features: {
    prefetching: false,           // Disable for predictable tests
    optimisticUpdates: false,     // Disable for deterministic tests
    staleWhileRevalidate: false,  // Disable for consistent tests
    connectionPooling: false,     // Disable for isolated tests
    queryBatching: false          // Disable for predictable tests
  }
};

// Environment-specific configuration selection
const getEnvironmentConfig = (): OptimizationConfig => {
  const env = process.env.NODE_ENV || 'development';

  switch (env) {
    case 'production':
      return productionConfig;
    case 'test':
      return testConfig;
    case 'development':
    default:
      return developmentConfig;
  }
};

// Custom configuration override support
const createCustomConfig = (overrides: Partial<OptimizationConfig>): OptimizationConfig => {
  const baseConfig = getEnvironmentConfig();

  return {
    cache: { ...baseConfig.cache, ...overrides.cache },
    queryOptimizer: { ...baseConfig.queryOptimizer, ...overrides.queryOptimizer },
    realtime: { ...baseConfig.realtime, ...overrides.realtime },
    deduplication: { ...baseConfig.deduplication, ...overrides.deduplication },
    monitoring: { ...baseConfig.monitoring, ...overrides.monitoring },
    features: { ...baseConfig.features, ...overrides.features }
  };
};

// Supabase plan-specific configurations
const supabasePlanConfigs = {
  // Free Plan (Limited connections and resources)
  free: {
    queryOptimizer: {
      maxConnections: 2,
      connectionTimeout: 8000,
      retryAttempts: 2
    },
    cache: {
      maxCacheSize: 25,
      defaultTTL: 3 * 60 * 1000
    }
  },

  // Pro Plan (Standard production usage)
  pro: {
    queryOptimizer: {
      maxConnections: 6,
      connectionTimeout: 10000,
      retryAttempts: 3
    },
    cache: {
      maxCacheSize: 75,
      defaultTTL: 5 * 60 * 1000
    }
  },

  // Team Plan (Higher performance requirements)
  team: {
    queryOptimizer: {
      maxConnections: 10,
      connectionTimeout: 12000,
      retryAttempts: 4
    },
    cache: {
      maxCacheSize: 150,
      defaultTTL: 5 * 60 * 1000
    }
  }
};

// Performance tier configurations
const performanceTierConfigs = {
  // Low performance (mobile, slow connections)
  low: {
    cache: {
      defaultTTL: 10 * 60 * 1000,   // Longer cache for slow connections
      staleTTL: 30 * 60 * 1000
    },
    realtime: {
      batchDelay: 200,              // Longer batching for slower devices
      heartbeatInterval: 60000      // Less frequent heartbeats
    },
    queryOptimizer: {
      maxConnections: 2,
      retryAttempts: 5              // More retries for unreliable connections
    }
  },

  // Standard performance
  standard: {
    cache: {
      defaultTTL: 5 * 60 * 1000,
      staleTTL: 15 * 60 * 1000
    },
    realtime: {
      batchDelay: 100,
      heartbeatInterval: 30000
    },
    queryOptimizer: {
      maxConnections: 6,
      retryAttempts: 3
    }
  },

  // High performance (desktop, fast connections)
  high: {
    cache: {
      defaultTTL: 2 * 60 * 1000,    // Shorter cache for fresh data
      staleTTL: 5 * 60 * 1000
    },
    realtime: {
      batchDelay: 50,               // Faster batching for responsive UI
      heartbeatInterval: 15000      // More frequent heartbeats
    },
    queryOptimizer: {
      maxConnections: 10,
      retryAttempts: 2              // Fewer retries for fast connections
    }
  }
};

// Configuration validation
const validateConfig = (config: OptimizationConfig): string[] => {
  const errors: string[] = [];

  // Cache validation
  if (config.cache.defaultTTL <= 0) {
    errors.push('Cache defaultTTL must be greater than 0');
  }
  if (config.cache.staleTTL <= config.cache.defaultTTL) {
    errors.push('Cache staleTTL must be greater than defaultTTL');
  }
  if (config.cache.maxCacheSize <= 0) {
    errors.push('Cache maxCacheSize must be greater than 0');
  }

  // Query optimizer validation
  if (config.queryOptimizer.maxConnections <= 0) {
    errors.push('Query optimizer maxConnections must be greater than 0');
  }
  if (config.queryOptimizer.connectionTimeout <= 0) {
    errors.push('Query optimizer connectionTimeout must be greater than 0');
  }

  // Real-time validation
  if (config.realtime.reconnectAttempts < 0) {
    errors.push('Real-time reconnectAttempts must be non-negative');
  }
  if (config.realtime.batchDelay < 0) {
    errors.push('Real-time batchDelay must be non-negative');
  }

  return errors;
};

// Export the main configuration and utilities
export const optimizationConfig = getEnvironmentConfig();

export {
  type OptimizationConfig,
  getEnvironmentConfig,
  createCustomConfig,
  supabasePlanConfigs,
  performanceTierConfigs,
  validateConfig,
  developmentConfig,
  productionConfig,
  testConfig
};

// Helper function to get configuration for specific scenarios
export const getConfigForScenario = (scenario: {
  environment?: 'development' | 'production' | 'test';
  supabasePlan?: 'free' | 'pro' | 'team';
  performanceTier?: 'low' | 'standard' | 'high';
  customOverrides?: Partial<OptimizationConfig>;
}): OptimizationConfig => {
  let baseConfig: OptimizationConfig;

  // Start with environment config
  switch (scenario.environment) {
    case 'production':
      baseConfig = productionConfig;
      break;
    case 'test':
      baseConfig = testConfig;
      break;
    case 'development':
    default:
      baseConfig = developmentConfig;
      break;
  }

  // Apply Supabase plan overrides
  if (scenario.supabasePlan && supabasePlanConfigs[scenario.supabasePlan]) {
    baseConfig = createCustomConfig(supabasePlanConfigs[scenario.supabasePlan]);
  }

  // Apply performance tier overrides
  if (scenario.performanceTier && performanceTierConfigs[scenario.performanceTier]) {
    baseConfig = createCustomConfig(performanceTierConfigs[scenario.performanceTier]);
  }

  // Apply custom overrides
  if (scenario.customOverrides) {
    baseConfig = createCustomConfig(scenario.customOverrides);
  }

  // Validate final configuration
  const validationErrors = validateConfig(baseConfig);
  if (validationErrors.length > 0) {
    console.warn('Configuration validation errors:', validationErrors);
  }

  return baseConfig;
};

// Usage examples:
//
// 1. Basic usage (environment auto-detection):
// import { optimizationConfig } from './config/orderModalOptimization';
//
// 2. Custom scenario:
// const config = getConfigForScenario({
//   environment: 'production',
//   supabasePlan: 'pro',
//   performanceTier: 'high',
//   customOverrides: {
//     cache: { defaultTTL: 3 * 60 * 1000 }
//   }
// });
//
// 3. Create optimizer with custom config:
// const optimizer = new SupabaseQueryOptimizer(config.queryOptimizer);