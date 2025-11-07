interface OrderService {
  id: string;
  name: string;
  price: number;
  description?: string;
  category?: string;
  duration?: number;
}

interface Order {
  id: string;
  createdAt: string;
  orderNumber?: string;
  customOrderNumber?: string;
  stockNumber?: string;
  vehicleVin?: string;
  customerName?: string;
  status: string;
  dealer_id?: number;
  dealershipName?: string;
  order_type?: string;
  dueDate?: string;
  vehicleYear?: number;
  vehicleMake?: string;
  vehicleModel?: string;
  services?: OrderService[];
  completionDate?: string;
}

interface DuplicateInfo {
  count: number;
  orders: Order[];
  field: 'stockNumber' | 'vehicleVin';
  value: string;
}

/**
 * Normalize a string value for duplicate comparison
 * - Trims whitespace
 * - Converts to lowercase
 * - Removes special characters for VIN comparison
 */
function normalizeValue(value: string | undefined, field: 'stockNumber' | 'vehicleVin'): string {
  if (!value) return '';
  
  let normalized = value.trim().toLowerCase();
  
  // For VINs, remove any dashes or spaces
  if (field === 'vehicleVin') {
    normalized = normalized.replace(/[-\s]/g, '');
  }
  
  return normalized;
}

/**
 * Check if a value should be considered for duplicate detection
 */
function isValidValue(value: string | undefined): boolean {
  return Boolean(value && value.trim() && value.trim().toLowerCase() !== 'n/a');
}

/**
 * Detect all duplicates in orders for a specific field within the same dealer
 */
export function detectDuplicates(
  orders: Order[], 
  field: 'stockNumber' | 'vehicleVin',
  dealerId?: number
): Map<string, DuplicateInfo> {
  const duplicatesMap = new Map<string, DuplicateInfo>();
  
  // Filter orders by dealer if specified
  const filteredOrders = dealerId 
    ? orders.filter(order => order.dealer_id === dealerId)
    : orders;
  
  // Group orders by normalized field value
  const groupedOrders = new Map<string, Order[]>();
  
  filteredOrders.forEach(order => {
    const value = order[field];
    if (!isValidValue(value)) return;
    
    const normalizedValue = normalizeValue(value, field);
    if (!normalizedValue) return;
    
    if (!groupedOrders.has(normalizedValue)) {
      groupedOrders.set(normalizedValue, []);
    }
    groupedOrders.get(normalizedValue)!.push(order);
  });
  
  // Find groups with duplicates (count > 1)
  groupedOrders.forEach((orderGroup, normalizedValue) => {
    if (orderGroup.length > 1) {
      // Use the original value from the first order as the key
      const originalValue = orderGroup[0][field] || '';
      
      duplicatesMap.set(originalValue, {
        count: orderGroup.length,
        orders: orderGroup.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
        field,
        value: originalValue
      });
    }
  });
  
  return duplicatesMap;
}

/**
 * Get duplicate count for a specific field value within the same dealer
 */
export function getDuplicateCount(
  orders: Order[], 
  field: 'stockNumber' | 'vehicleVin',
  value: string | undefined,
  dealerId?: number
): number {
  console.log('getDuplicateCount called:', { field, value, dealerId, totalOrders: orders.length });
  
  if (!isValidValue(value)) {
    console.log('Invalid value, returning 0');
    return 0;
  }
  
  const normalizedValue = normalizeValue(value, field);
  if (!normalizedValue) {
    console.log('Empty normalized value, returning 0');
    return 0;
  }
  
  const filteredOrders = dealerId 
    ? orders.filter(order => order.dealer_id === dealerId)
    : orders;
  
  console.log('Filtered orders:', filteredOrders.length);
  
  const matchingOrders = filteredOrders.filter(order => {
    const orderValue = order[field];
    if (!isValidValue(orderValue)) return false;
    return normalizeValue(orderValue, field) === normalizedValue;
  });
  
  console.log('Matching orders found:', matchingOrders.length, matchingOrders.map(o => o.id));
  
  return matchingOrders.length;
}

/**
 * Get all orders that have the same field value within the same dealer
 */
export function getDuplicateOrders(
  orders: Order[],
  field: 'stockNumber' | 'vehicleVin',
  value: string | undefined,
  dealerId?: number
): Order[] {
  console.log('getDuplicateOrders called:', { field, value, dealerId, totalOrders: orders.length });
  
  if (!isValidValue(value)) {
    console.log('Invalid value, returning empty array');
    return [];
  }
  
  const normalizedValue = normalizeValue(value, field);
  if (!normalizedValue) {
    console.log('Empty normalized value, returning empty array');
    return [];
  }
  
  const filteredOrders = dealerId 
    ? orders.filter(order => order.dealer_id === dealerId)
    : orders;
  
  console.log('Filtered orders by dealer:', filteredOrders.length);
  
  const duplicateOrders = filteredOrders
    .filter(order => {
      const orderValue = order[field];
      if (!isValidValue(orderValue)) return false;
      const normalized = normalizeValue(orderValue, field);
      const matches = normalized === normalizedValue;
      console.log('Order comparison:', {
        orderId: order.id,
        orderValue,
        normalized,
        target: normalizedValue,
        matches
      });
      return matches;
    })
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  
  console.log('Final duplicate orders:', duplicateOrders.length, duplicateOrders.map(o => o.id));
  
  return duplicateOrders;
}

/**
 * Get badge color based on duplicate count
 */
export function getDuplicateBadgeColor(count: number): {
  bg: string;
  text: string;
  border: string;
} {
  if (count <= 1) {
    return { bg: '', text: '', border: '' }; // No badge for non-duplicates
  } else if (count <= 3) {
    return { 
      bg: 'bg-amber-500', 
      text: 'text-white', 
      border: 'border-amber-600' 
    };
  } else {
    return { 
      bg: 'bg-red-500', 
      text: 'text-white', 
      border: 'border-red-600' 
    };
  }
}

/**
 * Get background color for cells with duplicates
 */
export function getDuplicateCellBackground(count: number): string {
  if (count <= 1) {
    return '';
  } else if (count <= 3) {
    return 'bg-amber-50 border-amber-200';
  } else {
    return 'bg-red-50 border-red-200';
  }
}

export type { Order, DuplicateInfo };