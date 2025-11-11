/**
 * Dealer Notification Channel Defaults Types
 *
 * Enterprise multi-channel notification configuration system.
 * Allows dealerships to customize which notification channels
 * (SMS, Email, Push, In-App) are enabled for each event type.
 *
 * @module DealerChannelDefaults
 */

// =====================================================
// Core Types
// =====================================================

export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'push' | 'slack';

export type NotificationModule =
  | 'sales_orders'
  | 'service_orders'
  | 'recon_orders'
  | 'car_wash'
  | 'get_ready';

export type OrderSMSEvent =
  | 'order_created'
  | 'order_assigned'
  | 'status_changed'
  | 'field_updated'
  | 'comment_added'
  | 'attachment_added'
  | 'follower_added'
  | 'due_date_approaching'
  | 'overdue'
  | 'priority_changed';

// =====================================================
// Channel Configuration
// =====================================================

/**
 * Configuration for which channels are enabled for a specific event
 */
export interface EventChannelConfig {
  in_app?: boolean;
  email?: boolean;
  sms?: boolean;
  push?: boolean;
  slack?: boolean;
}

/**
 * Matrix of all events to their channel configuration
 * Example: { "order_created": { "in_app": true, "email": false, ... }, ... }
 */
export type EventChannelMatrix = Record<string, EventChannelConfig>;

// =====================================================
// Database Table Type
// =====================================================

/**
 * Dealer notification channel defaults table
 */
export interface DealerNotificationChannelDefaults {
  id: string;
  dealer_id: number;
  module: NotificationModule;
  event_channel_config: EventChannelMatrix;

  // Global defaults for unconfigured events
  default_in_app: boolean;
  default_email: boolean;
  default_sms: boolean;
  default_push: boolean;
  default_slack: boolean;

  // Metadata
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

// =====================================================
// Event Metadata
// =====================================================

/**
 * Metadata for UI display of each event option
 */
export interface NotificationEventOption {
  event: OrderSMSEvent;
  label: string;
  description: string;
  category: 'orders' | 'team' | 'deadlines' | 'system';
  defaultChannels: {
    in_app: boolean;
    email: boolean;
    sms: boolean;
    push: boolean;
    slack: boolean;
  };
}

// =====================================================
// Default Configurations
// =====================================================

/**
 * Enterprise defaults for notification channels
 * Conservative approach: In-App always ON, others OFF unless explicitly needed
 */
export const DEFAULT_CHANNEL_CONFIG: EventChannelMatrix = {
  // Critical events → Multiple channels
  order_assigned: {
    in_app: true,
    email: false,
    sms: false,   // User can enable if needed
    push: true,
    slack: false
  },
  status_changed: {
    in_app: true,
    email: false,
    sms: false,   // Currently enabled in code, but allowing opt-in
    push: true,
    slack: false
  },
  due_date_approaching: {
    in_app: true,
    email: true,   // Email reminder useful
    sms: false,
    push: true,
    slack: false
  },
  overdue: {
    in_app: true,
    email: true,
    sms: false,    // Can enable for urgent alerts
    push: true,
    slack: false
  },
  priority_changed: {
    in_app: true,
    email: false,
    sms: false,
    push: true,
    slack: false
  },

  // Informative events → In-App only (reduce noise)
  order_created: {
    in_app: true,
    email: false,
    sms: false,
    push: false,
    slack: false
  },
  comment_added: {
    in_app: true,
    email: false,
    sms: false,
    push: false,
    slack: false
  },
  attachment_added: {
    in_app: true,
    email: false,
    sms: false,
    push: false,
    slack: false
  },
  follower_added: {
    in_app: true,
    email: false,
    sms: false,
    push: false,
    slack: false
  },
  field_updated: {
    in_app: false,  // Too noisy even for in-app
    email: false,
    sms: false,
    push: false,
    slack: false
  }
};

/**
 * Event metadata for UI rendering
 */
export const NOTIFICATION_EVENT_OPTIONS: NotificationEventOption[] = [
  // Critical/Action Required
  {
    event: 'order_assigned',
    label: 'Order Assigned',
    description: 'When an order is assigned to you or a team member',
    category: 'orders',
    defaultChannels: { in_app: true, email: false, sms: false, push: true, slack: false }
  },
  {
    event: 'status_changed',
    label: 'Status Changed',
    description: 'Order status updated (e.g., Pending → In Progress → Completed)',
    category: 'orders',
    defaultChannels: { in_app: true, email: false, sms: false, push: true, slack: false }
  },
  {
    event: 'due_date_approaching',
    label: 'Due Date Reminder',
    description: 'Reminder sent 30 minutes before order due time',
    category: 'deadlines',
    defaultChannels: { in_app: true, email: true, sms: false, push: true, slack: false }
  },
  {
    event: 'overdue',
    label: 'Overdue Alert',
    description: 'Critical alert when order becomes overdue',
    category: 'deadlines',
    defaultChannels: { in_app: true, email: true, sms: false, push: true, slack: false }
  },
  {
    event: 'priority_changed',
    label: 'Priority Changed',
    description: 'Order priority escalated or changed',
    category: 'orders',
    defaultChannels: { in_app: true, email: false, sms: false, push: true, slack: false }
  },

  // Informational
  {
    event: 'order_created',
    label: 'Order Created',
    description: 'New order created notification',
    category: 'orders',
    defaultChannels: { in_app: true, email: false, sms: false, push: false, slack: false }
  },
  {
    event: 'comment_added',
    label: 'Comment Added',
    description: 'Someone commented on an order you follow',
    category: 'team',
    defaultChannels: { in_app: true, email: false, sms: false, push: false, slack: false }
  },
  {
    event: 'attachment_added',
    label: 'Attachment Added',
    description: 'File uploaded to an order',
    category: 'team',
    defaultChannels: { in_app: true, email: false, sms: false, push: false, slack: false }
  },
  {
    event: 'follower_added',
    label: 'Follower Added',
    description: 'Someone started following an order',
    category: 'team',
    defaultChannels: { in_app: true, email: false, sms: false, push: false, slack: false }
  },
  {
    event: 'field_updated',
    label: 'Field Updated',
    description: 'Order field modified (low priority)',
    category: 'system',
    defaultChannels: { in_app: false, email: false, sms: false, push: false, slack: false }
  }
];

// =====================================================
// Helper Functions
// =====================================================

/**
 * Get default channel config for a module
 */
export function getDefaultChannelConfig(module: NotificationModule): EventChannelMatrix {
  // Return defaults based on module
  // All modules share same defaults for now (can be customized per module later)
  return DEFAULT_CHANNEL_CONFIG;
}

/**
 * Check if a specific channel is enabled for an event
 */
export function isChannelEnabledForEvent(
  config: EventChannelMatrix,
  eventType: string,
  channel: NotificationChannel,
  defaults: Pick<DealerNotificationChannelDefaults, 'default_in_app' | 'default_email' | 'default_sms' | 'default_push'>
): boolean {
  // Check event-specific configuration
  const eventConfig = config[eventType];
  if (eventConfig && channel in eventConfig) {
    return eventConfig[channel] === true;
  }

  // Fallback to global defaults
  switch (channel) {
    case 'in_app':
      return defaults.default_in_app;
    case 'email':
      return defaults.default_email;
    case 'sms':
      return defaults.default_sms;
    case 'push':
      return defaults.default_push;
    case 'slack':
      return (defaults as any).default_slack || false;
    default:
      return true; // Unknown channel, allow by default
  }
}

/**
 * Calculate cost impact of SMS configuration
 * Estimates monthly cost based on enabled events and average frequency
 */
export function calculateSMSCostImpact(config: EventChannelMatrix): {
  eventsWithSMS: number;
  estimatedMonthlyCost: number;
  highRiskEvents: string[];
} {
  const SMS_COST_PER_MESSAGE = 0.0075; // $0.0075 per SMS
  const AVERAGE_USERS_PER_DEALER = 10;

  // Event frequency estimates (per month)
  const EVENT_FREQUENCY: Record<string, number> = {
    order_created: 200,        // ~200 orders/month
    status_changed: 600,       // ~3 changes per order
    comment_added: 400,        // ~2 comments per order
    order_assigned: 150,
    due_date_approaching: 100,
    overdue: 20,
    priority_changed: 30,
    attachment_added: 100,
    follower_added: 80,
    field_updated: 1000        // High frequency
  };

  let eventsWithSMS = 0;
  let totalEstimatedMessages = 0;
  const highRiskEvents: string[] = [];

  Object.entries(config).forEach(([eventType, channels]) => {
    if (channels.sms === true) {
      eventsWithSMS++;
      const frequency = EVENT_FREQUENCY[eventType] || 50;
      const messagesPerMonth = frequency * AVERAGE_USERS_PER_DEALER * 0.3; // 30% delivery rate
      totalEstimatedMessages += messagesPerMonth;

      // Flag high-frequency events as high risk
      if (frequency > 500) {
        highRiskEvents.push(eventType);
      }
    }
  });

  return {
    eventsWithSMS,
    estimatedMonthlyCost: totalEstimatedMessages * SMS_COST_PER_MESSAGE,
    highRiskEvents
  };
}

/**
 * Validate channel configuration
 * Returns validation errors if any
 */
export function validateChannelConfig(config: EventChannelMatrix): string[] {
  const errors: string[] = [];

  // Validation 1: At least one event should have at least one channel enabled
  const hasAnyChannelEnabled = Object.values(config).some(channels =>
    Object.values(channels).some(enabled => enabled === true)
  );

  if (!hasAnyChannelEnabled) {
    errors.push('At least one channel must be enabled for at least one event');
  }

  // Validation 2: SMS should not be enabled for ALL events (cost concern)
  const smsEnabledCount = Object.values(config).filter(c => c.sms === true).length;
  if (smsEnabledCount > 7) {
    errors.push(`Warning: SMS enabled for ${smsEnabledCount} events. This may result in high costs.`);
  }

  // Validation 3: High-frequency events with SMS
  const highFreqWithSMS = Object.entries(config).filter(([event, channels]) =>
    channels.sms === true && ['field_updated', 'comment_added'].includes(event)
  );

  if (highFreqWithSMS.length > 0) {
    errors.push(`Warning: High-frequency events (${highFreqWithSMS.map(([e]) => e).join(', ')}) have SMS enabled. This will be expensive.`);
  }

  return errors;
}
