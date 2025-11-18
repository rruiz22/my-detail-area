/**
 * Dealer Notification Rules Evaluator
 * Evaluates business-level notification rules for dealers
 *
 * Purpose: Allows dealers to customize when/how notifications are sent
 * Example: "Only notify managers for high-priority orders"
 */

export interface DealerNotificationRule {
  id: string;
  dealer_id: number;
  module: string;
  event: string;
  rule_name: string;
  description: string;
  recipients: {
    roles?: string[];
    users?: string[];
    include_assigned_user?: boolean;
    include_followers?: boolean;
  };
  conditions: {
    priority?: string[];
    status?: string[];
    custom_fields?: Record<string, any>;
  };
  channels: string[]; // ['in_app', 'email', 'sms', 'push']
  priority: number;
  enabled: boolean;
}

/**
 * Evaluates if event data meets rule conditions
 * @param conditions - Rule conditions (priority, status, custom fields)
 * @param eventData - Event data from notification trigger
 * @returns true if all conditions are met, false otherwise
 */
export function evaluateRuleConditions(
  conditions: DealerNotificationRule['conditions'],
  eventData: any
): boolean {
  // If no conditions defined, rule applies to all events
  if (!conditions || Object.keys(conditions).length === 0) {
    return true;
  }

  // Evaluate priority condition
  if (conditions.priority && conditions.priority.length > 0) {
    const eventPriority = eventData.priority || eventData.newPriority;

    if (!eventPriority || !conditions.priority.includes(eventPriority)) {
      console.log(`❌ Priority condition not met: event=${eventPriority}, allowed=[${conditions.priority.join(', ')}]`);
      return false;
    }

    console.log(`✅ Priority condition met: ${eventPriority}`);
  }

  // Evaluate status condition
  if (conditions.status && conditions.status.length > 0) {
    const eventStatus = eventData.status || eventData.newStatus;

    if (!eventStatus || !conditions.status.includes(eventStatus)) {
      console.log(`❌ Status condition not met: event=${eventStatus}, allowed=[${conditions.status.join(', ')}]`);
      return false;
    }

    console.log(`✅ Status condition met: ${eventStatus}`);
  }

  // Evaluate custom field conditions
  if (conditions.custom_fields) {
    for (const [fieldName, expectedValue] of Object.entries(conditions.custom_fields)) {
      const actualValue = eventData[fieldName];

      // Handle array of allowed values
      if (Array.isArray(expectedValue)) {
        if (!expectedValue.includes(actualValue)) {
          console.log(`❌ Custom field condition not met: ${fieldName}=${actualValue}, allowed=[${expectedValue.join(', ')}]`);
          return false;
        }
      }
      // Handle exact value match
      else if (actualValue !== expectedValue) {
        console.log(`❌ Custom field condition not met: ${fieldName}=${actualValue}, expected=${expectedValue}`);
        return false;
      }

      console.log(`✅ Custom field condition met: ${fieldName}=${actualValue}`);
    }
  }

  // All conditions met
  return true;
}

/**
 * Filters users by dealer rule recipients configuration
 * @param rule - Dealer notification rule
 * @param users - List of potential recipients with role information
 * @returns Filtered list of users who should receive notification
 */
export function filterUsersByRule(
  rule: DealerNotificationRule,
  users: Array<{ id: string; role_name?: string; is_assigned?: boolean }>
): typeof users {
  const { recipients } = rule;

  // If no recipient filter, return all users
  if (!recipients || Object.keys(recipients).length === 0) {
    return users;
  }

  return users.filter(user => {
    // Filter by role
    if (recipients.roles && recipients.roles.length > 0) {
      if (!user.role_name || !recipients.roles.includes(user.role_name)) {
        console.log(`❌ User filtered out by role: ${user.id} (role: ${user.role_name})`);
        return false;
      }
    }

    // Filter by specific user IDs
    if (recipients.users && recipients.users.length > 0) {
      if (!recipients.users.includes(user.id)) {
        console.log(`❌ User filtered out by user list: ${user.id}`);
        return false;
      }
    }

    // Include assigned user
    if (recipients.include_assigned_user === false && user.is_assigned === true) {
      console.log(`❌ User filtered out: assigned user excluded by rule`);
      return false;
    }

    console.log(`✅ User passed rule filters: ${user.id}`);
    return true;
  });
}

/**
 * Checks if a channel is enabled in the rule
 * @param rule - Dealer notification rule
 * @param channel - Channel to check ('sms' | 'email' | 'in_app' | 'push')
 * @returns true if channel is enabled, false otherwise
 */
export function isChannelEnabled(rule: DealerNotificationRule, channel: string): boolean {
  if (!rule.channels || rule.channels.length === 0) {
    // If no channels specified, allow all
    return true;
  }

  return rule.channels.includes(channel);
}

/**
 * Finds the highest priority rule that matches the event
 * @param rules - Array of dealer notification rules
 * @param module - Module name (e.g., 'sales_orders')
 * @param event - Event type (e.g., 'order_created')
 * @param eventData - Event data for condition evaluation
 * @returns Highest priority matching rule, or null if none match
 */
export function findMatchingRule(
  rules: DealerNotificationRule[],
  module: string,
  event: string,
  eventData: any
): DealerNotificationRule | null {
  // Filter rules by module and event
  const applicableRules = rules.filter(rule =>
    rule.enabled &&
    rule.module === module &&
    rule.event === event &&
    evaluateRuleConditions(rule.conditions, eventData)
  );

  if (applicableRules.length === 0) {
    console.log(`ℹ️ No matching dealer rules found for ${module}/${event}`);
    return null;
  }

  // Sort by priority (highest first) and return top rule
  applicableRules.sort((a, b) => b.priority - a.priority);
  const topRule = applicableRules[0];

  console.log(`✅ Found matching dealer rule: "${topRule.rule_name}" (priority: ${topRule.priority})`);
  return topRule;
}

/**
 * Complete evaluation: applies rule to users and checks channel
 * @param rule - Dealer notification rule
 * @param users - List of potential recipients
 * @param channel - Channel to send through
 * @param eventData - Event data for condition evaluation
 * @returns Object with shouldSend (boolean) and filteredUsers (array)
 */
export function evaluateNotificationRule(
  rule: DealerNotificationRule | null,
  users: Array<{ id: string; role_name?: string; is_assigned?: boolean }>,
  channel: string,
  eventData: any
): { shouldSend: boolean; filteredUsers: typeof users; rule: DealerNotificationRule | null } {
  // No rule found - allow notification with all users
  if (!rule) {
    return {
      shouldSend: true,
      filteredUsers: users,
      rule: null
    };
  }

  // Check if channel is enabled
  if (!isChannelEnabled(rule, channel)) {
    console.log(`❌ Channel "${channel}" not enabled in dealer rule "${rule.rule_name}"`);
    return {
      shouldSend: false,
      filteredUsers: [],
      rule
    };
  }

  // Filter users by rule recipients
  const filteredUsers = filterUsersByRule(rule, users);

  console.log(`✅ Dealer rule applied: ${users.length} users → ${filteredUsers.length} after filtering`);

  return {
    shouldSend: filteredUsers.length > 0,
    filteredUsers,
    rule
  };
}
