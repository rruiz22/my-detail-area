import type { Order } from '@/hooks/useOrderManagement';

/**
 * Comprehensive order search across all relevant fields
 *
 * Searches in 21+ fields including:
 * - Identifiers: order number, custom order number, ID
 * - Customer: name, email, phone
 * - Vehicle: VIN, stock number, year/make/model, trim, tag
 * - Assignment: assigned user, group, salesperson
 * - Notes: public notes, internal notes
 * - Metadata: dealership name, priority, status
 *
 * @param orders - Array of orders to search
 * @param searchTerm - Search term (case-insensitive, partial matching)
 * @returns Filtered orders matching the search term
 *
 * @example
 * const results = searchOrders(allOrders, 'honda');
 * // Returns orders with "honda" in make, model, notes, etc.
 */
export function searchOrders(orders: Order[], searchTerm: string): Order[] {
  if (!searchTerm || !searchTerm.trim()) return orders;

  const searchLower = searchTerm.toLowerCase().trim();

  return orders.filter((order) => {
    // 1. Core identifiers (order numbers)
    if (order.id?.toLowerCase().includes(searchLower)) return true;
    if (order.orderNumber?.toLowerCase().includes(searchLower)) return true;
    if (order.order_number?.toLowerCase().includes(searchLower)) return true;
    if (order.custom_order_number?.toLowerCase().includes(searchLower)) return true;

    // 2. Customer information
    if (order.customerName?.toLowerCase().includes(searchLower)) return true;
    if (order.customerEmail?.toLowerCase().includes(searchLower)) return true;
    if (order.customerPhone?.toLowerCase().includes(searchLower)) return true;

    // 3. Vehicle information
    if (order.vehicleVin?.toLowerCase().includes(searchLower)) return true;
    if (order.stockNumber?.toLowerCase().includes(searchLower)) return true;
    if (order.vehicleTrim?.toLowerCase().includes(searchLower)) return true;
    if (order.tag?.toLowerCase().includes(searchLower)) return true;

    // Consolidated vehicle info search (year + make + model)
    const vehicleInfo = `${order.vehicleYear || ''} ${order.vehicleMake || ''} ${order.vehicleModel || ''}`.trim();
    if (vehicleInfo.toLowerCase().includes(searchLower)) return true;

    // 4. Assignment and collaboration
    if (order.assignedTo?.toLowerCase().includes(searchLower)) return true;
    if (order.assignedGroupName?.toLowerCase().includes(searchLower)) return true;
    if (order.salesperson?.toLowerCase().includes(searchLower)) return true;
    if (order.createdByGroupName?.toLowerCase().includes(searchLower)) return true;

    // 5. Notes (public and internal)
    if (order.notes?.toLowerCase().includes(searchLower)) return true;
    if (order.internal_notes?.toLowerCase().includes(searchLower)) return true;

    // 6. Dealership metadata (for multi-dealer users)
    if (order.dealershipName?.toLowerCase().includes(searchLower)) return true;

    // 7. Status and priority (useful for filtering)
    if (order.priority?.toLowerCase().includes(searchLower)) return true;
    if (order.status?.toLowerCase().includes(searchLower)) return true;

    return false;
  });
}

/**
 * Get list of searchable field names for documentation/UI tooltips
 *
 * @returns Array of human-readable field names that can be searched
 */
export function getSearchableFields(): string[] {
  return [
    'Order Number',
    'Custom Order Number',
    'Customer Name',
    'Customer Email',
    'Customer Phone',
    'VIN',
    'Stock Number',
    'Vehicle Year/Make/Model',
    'Vehicle Trim',
    'Tag',
    'Assigned To',
    'Group Name',
    'Salesperson',
    'Public Notes',
    'Internal Notes',
    'Dealership Name',
    'Priority',
    'Status'
  ];
}

/**
 * Get count of searchable fields
 * Useful for displaying "Searching in X fields" messages
 *
 * @returns Number of fields being searched
 */
export function getSearchableFieldCount(): number {
  return getSearchableFields().length;
}
