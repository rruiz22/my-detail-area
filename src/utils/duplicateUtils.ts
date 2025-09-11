/**
 * Utility functions for detecting and handling duplicate orders
 */

export interface DuplicateMatch {
  orderId: string;
  matchType: 'vin' | 'customer' | 'stock';
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Check if an order has potential duplicates based on VIN, customer info, or stock number
 */
export const findPotentialDuplicates = (
  currentOrder: any,
  allOrders: any[]
): DuplicateMatch[] => {
  const duplicates: DuplicateMatch[] = [];
  
  for (const order of allOrders) {
    if (order.id === currentOrder.id) continue;
    
    // Check VIN match (high confidence)
    if (currentOrder.vehicle_vin && order.vehicle_vin && 
        currentOrder.vehicle_vin === order.vehicle_vin) {
      duplicates.push({
        orderId: order.id,
        matchType: 'vin',
        confidence: 'high'
      });
    }
    
    // Check stock number match (high confidence)
    if (currentOrder.stock_number && order.stock_number && 
        currentOrder.stock_number === order.stock_number) {
      duplicates.push({
        orderId: order.id,
        matchType: 'stock',
        confidence: 'high'
      });
    }
    
    // Check customer match (medium confidence)
    if (currentOrder.customer_email && order.customer_email && 
        currentOrder.customer_email.toLowerCase() === order.customer_email.toLowerCase()) {
      duplicates.push({
        orderId: order.id,
        matchType: 'customer',
        confidence: 'medium'
      });
    }
  }
  
  return duplicates;
};

/**
 * Get duplicate count for an order
 */
export const getDuplicateCount = (duplicates: DuplicateMatch[]): number => {
  return duplicates.length;
};

/**
 * Check if duplicates are high risk (high confidence matches)
 */
export const hasHighRiskDuplicates = (duplicates: DuplicateMatch[]): boolean => {
  return duplicates.some(d => d.confidence === 'high');
};