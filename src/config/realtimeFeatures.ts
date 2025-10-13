/**
 * Real-Time Feature Configuration
 *
 * Controls which features use real-time subscriptions vs. polling/optimistic updates.
 * Philosophy: "Real-Time Where It Matters" - Only enable real-time for truly collaborative
 * or time-critical features in dealership operations.
 */

export interface RealtimeFeatureConfig {
  // Critical real-time features (high business value)
  chat: boolean;                    // Team chat and messaging
  orderStatus: boolean;             // Critical workflow state changes
  orderAssignments: boolean;        // Work reassignments between team members

  // Non-critical features (convert to polling/optimistic)
  orderCreation: boolean;           // New order notifications
  orderDetails: boolean;            // Order data changes
  attachments: boolean;             // File uploads and management
  followers: boolean;               // Order followers/watchers
  activities: boolean;              // Activity logs and history
  systemStats: boolean;             // Dashboard statistics
  userPresence: boolean;            // User online/offline status
  notifications: boolean;           // General notifications
}

// Default configuration optimized for dealership workflows
export const realtimeConfig: RealtimeFeatureConfig = {
  // Keep real-time for collaboration-critical features
  chat: true,                       // ✅ Essential for team coordination
  orderStatus: true,                // ✅ Critical workflow changes
  orderAssignments: true,           // ✅ Important for work distribution

  // Convert to polling/optimistic for better performance
  orderCreation: false,             // ❌ Not time-critical, polling sufficient
  orderDetails: false,              // ❌ CRUD operations, optimistic updates better
  attachments: false,               // ❌ File operations, optimistic updates better
  followers: false,                 // ❌ Eventual consistency sufficient
  activities: false,                // ❌ Historical data, refresh on demand
  systemStats: false,               // ❌ Dashboard data, polling sufficient
  userPresence: false,              // ❌ Not critical for dealership operations
  notifications: false              // ❌ Can use periodic checks
};

// Environment-specific overrides
export const getRealtimeConfig = (environment?: string): RealtimeFeatureConfig => {
  const config = { ...realtimeConfig };

  if (environment === 'development') {
    // Enable more features in development for testing
    return {
      ...config,
      systemStats: true,
      notifications: true
    };
  }

  if (environment === 'production') {
    // Most conservative settings for production
    return {
      ...config,
      chat: true,           // Only absolutely essential features
      orderStatus: true,
      orderAssignments: true,
      // Everything else disabled
      systemStats: false,
      notifications: false
    };
  }

  return config;
};

// Subscription limits configuration
export const subscriptionLimits = {
  maxConcurrent: 3,                 // Maximum concurrent real-time subscriptions
  heartbeatInterval: 30000,         // Connection health check interval
  reconnectAttempts: 3,             // Maximum reconnection attempts
  reconnectDelay: 1000,             // Initial reconnection delay (ms)
  maxReconnectDelay: 10000,         // Maximum reconnection delay (ms)
  subscriptionTimeout: 5000         // Subscription creation timeout
};

// Polling intervals configuration
export const pollingConfig = {
  orders: 180000,                   // Order list refresh every 3 minutes
  orderDetails: 30000,              // Individual order details every 30 seconds
  systemStats: 120000,              // System statistics every 2 minutes
  activities: 300000,               // Activity feeds every 5 minutes
  notifications: 180000             // Notifications check every 3 minutes
};

// Helper function to check if a feature should use real-time
export const shouldUseRealtime = (feature: keyof RealtimeFeatureConfig): boolean => {
  const config = getRealtimeConfig(process.env.NODE_ENV);
  return config[feature];
};

// Helper function to get polling interval for a feature
export const getPollingInterval = (feature: keyof typeof pollingConfig): number => {
  return pollingConfig[feature];
};