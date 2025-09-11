interface Order {
  id: string;
  orderNumber?: string;
  customOrderNumber?: string;
  order_number?: string;
  order_type?: string;
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