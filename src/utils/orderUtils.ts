import { getSystemTimezone } from './dateUtils';

interface Order {
  id: string;
  orderNumber?: string;
  customOrderNumber?: string;
  order_number?: string;
  order_type?: string;
  orderType?: string;
  status?: string;
  dueDate?: string;
  createdAt?: string;
}

/**
 * Format order number for display
 */
export function formatOrderNumber(order: Order): string {
  const orderNumber = order.orderNumber || order.customOrderNumber || order.order_number;

  // If already in new format (XX-XXXXXX), return as-is
  if (orderNumber && /^(SA|SE|CW|RC)-\d{6}$/.test(orderNumber)) {
    return orderNumber;
  }

  // If has any order number, return it (might be old format)
  if (orderNumber) {
    return orderNumber;
  }

  // For orders without order number, generate fallback based on type
  const orderType = order.order_type || 'sales';
  const prefix = orderType === 'sales' ? 'SA' :
                orderType === 'service' ? 'SE' :
                orderType === 'carwash' ? 'CW' : 'RC';

  return `${prefix}-${order.id.slice(0, 6).padStart(6, '0')}`;
}

/**
 * Determine the correct tab for an order based on its properties
 * Prioritizes date-based tabs over status-based tabs
 *
 * @param order - The order object to analyze
 * @returns The tab name where this order should be displayed
 */
export function determineTabForOrder(order: Order): string {
  const timezone = getSystemTimezone();
  const now = new Date();

  // Get current date in system timezone and normalize to start of day
  const todayInTimezone = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  todayInTimezone.setHours(0, 0, 0, 0);

  // Tomorrow in system timezone
  const tomorrowInTimezone = new Date(todayInTimezone);
  tomorrowInTimezone.setDate(tomorrowInTimezone.getDate() + 1);

  // Get order date (prioritize dueDate, fallback to createdAt)
  const orderDateStr = order.dueDate || order.createdAt;

  if (orderDateStr) {
    const orderDate = new Date(orderDateStr);

    // Check if order is today (highest priority for date-based tabs)
    if (orderDate.toDateString() === todayInTimezone.toDateString()) {
      return 'today';
    }

    // Check if order is tomorrow
    if (orderDate.toDateString() === tomorrowInTimezone.toDateString()) {
      return 'tomorrow';
    }
  }

  // Check status-based tabs
  if (order.status === 'pending') {
    return 'pending';
  }

  if (order.status === 'in_progress') {
    return 'in_process';
  }

  if (order.status === 'completed') {
    return 'complete';
  }

  if (order.status === 'cancelled') {
    return 'cancelled';
  }

  // Check if order is a service order
  const orderType = order.orderType || order.order_type;
  if (orderType === 'service') {
    return 'services';
  }

  // Default fallback - show in 'all' tab
  return 'all';
}