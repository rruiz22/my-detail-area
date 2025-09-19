import { safeFormatDate, safeParseDate } from './dateUtils';
import type { OrderData } from '@/types/order';

/**
 * Enhanced date access utility for order objects
 * Handles both snake_case (database) and camelCase (frontend) formats
 */

interface DateAccessResult {
  value: string;
  rawValue: string | null | undefined;
  source: string;
  isValid: boolean;
}

/**
 * Safely access created_at date with fallbacks
 */
export const getOrderCreatedDate = (order: OrderData): DateAccessResult => {
  // Try multiple possible field names
  const possibleFields = [
    { key: 'created_at', value: order.created_at },
    { key: 'createdAt', value: (order as any).createdAt },
    { key: 'date_created', value: (order as any).date_created },
    { key: 'dateCreated', value: (order as any).dateCreated }
  ];

  console.log('🔍 [DATE DEBUG] Looking for created date in:', possibleFields);

  for (const field of possibleFields) {
    if (field.value) {
      const parsed = safeParseDate(field.value);
      if (parsed) {
        console.log(`✅ [DATE DEBUG] Found valid created date: ${field.key} = ${field.value}`);
        return {
          value: safeFormatDate(field.value),
          rawValue: field.value,
          source: field.key,
          isValid: true
        };
      }
    }
  }

  console.log('❌ [DATE DEBUG] No valid created date found');
  return {
    value: 'Not available',
    rawValue: null,
    source: 'none',
    isValid: false
  };
};

/**
 * Safely access updated_at date with fallbacks
 */
export const getOrderUpdatedDate = (order: OrderData): DateAccessResult => {
  const possibleFields = [
    { key: 'updated_at', value: order.updated_at },
    { key: 'updatedAt', value: (order as any).updatedAt },
    { key: 'date_updated', value: (order as any).date_updated },
    { key: 'dateUpdated', value: (order as any).dateUpdated },
    { key: 'last_modified', value: (order as any).last_modified },
    { key: 'lastModified', value: (order as any).lastModified }
  ];

  console.log('🔍 [DATE DEBUG] Looking for updated date in:', possibleFields);

  for (const field of possibleFields) {
    if (field.value) {
      const parsed = safeParseDate(field.value);
      if (parsed) {
        console.log(`✅ [DATE DEBUG] Found valid updated date: ${field.key} = ${field.value}`);
        return {
          value: safeFormatDate(field.value),
          rawValue: field.value,
          source: field.key,
          isValid: true
        };
      }
    }
  }

  console.log('❌ [DATE DEBUG] No valid updated date found');
  return {
    value: 'Not available',
    rawValue: null,
    source: 'none',
    isValid: false
  };
};

/**
 * Safely access due_date with fallbacks
 */
export const getOrderDueDate = (order: OrderData): DateAccessResult => {
  const possibleFields = [
    { key: 'due_date', value: order.due_date },
    { key: 'dueDate', value: (order as any).dueDate },
    { key: 'estimated_completion', value: order.estimated_completion },
    { key: 'estimatedCompletion', value: (order as any).estimatedCompletion },
    { key: 'completion_date', value: (order as any).completion_date },
    { key: 'completionDate', value: (order as any).completionDate }
  ];

  console.log('🔍 [DATE DEBUG] Looking for due date in:', possibleFields);

  for (const field of possibleFields) {
    if (field.value) {
      const parsed = safeParseDate(field.value);
      if (parsed) {
        console.log(`✅ [DATE DEBUG] Found valid due date: ${field.key} = ${field.value}`);
        return {
          value: safeFormatDate(field.value),
          rawValue: field.value,
          source: field.key,
          isValid: true
        };
      }
    }
  }

  console.log('❌ [DATE DEBUG] No valid due date found');
  return {
    value: 'Not set',
    rawValue: null,
    source: 'none',
    isValid: false
  };
};

/**
 * Get comprehensive order date summary for debugging
 */
export const getOrderDateSummary = (order: OrderData) => {
  const created = getOrderCreatedDate(order);
  const updated = getOrderUpdatedDate(order);
  const due = getOrderDueDate(order);

  console.log('📊 [DATE SUMMARY]', {
    orderId: order.id,
    created: { value: created.value, source: created.source, raw: created.rawValue },
    updated: { value: updated.value, source: updated.source, raw: updated.rawValue },
    due: { value: due.value, source: due.source, raw: due.rawValue },
    allFields: Object.keys(order).filter(key => key.includes('date') || key.includes('created') || key.includes('updated'))
  });

  return { created, updated, due };
};

/**
 * Create robust schedule items with enhanced date handling
 */
export const createScheduleItems = (order: OrderData, t: any, orderAge: string) => {
  const { created, updated, due } = getOrderDateSummary(order);

  return [
    {
      icon: 'Calendar',
      label: t('orders.created'),
      value: created.value,
      subtitle: created.isValid ? orderAge : 'Unknown creation date',
      debug: { source: created.source, raw: created.rawValue }
    },
    {
      icon: 'Target',
      label: t('orders.due_date'),
      value: due.value,
      subtitle: due.isValid ? 'Due date set' : t('schedule_view.no_due_date'),
      debug: { source: due.source, raw: due.rawValue }
    },
    {
      icon: 'Clock',
      label: t('orders.updated'),
      value: updated.value,
      subtitle: updated.isValid ? t('schedule_view.most_recent_change') : 'No updates recorded',
      debug: { source: updated.source, raw: updated.rawValue }
    }
  ];
};