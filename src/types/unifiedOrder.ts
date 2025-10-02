/**
 * Unified Order Data Types - Phase 2 Consolidation
 *
 * This file provides a single source of truth for order-related types,
 * consolidating all previous type definitions and supporting both
 * snake_case (database) and camelCase (frontend) formats.
 *
 * @author My Detail Area Team
 * @version 2.0.0
 * @since Phase 2 - Consolidation
 */

// ============================================================================
// ENUMS AND CONSTANTS
// ============================================================================

/**
 * Order status types
 * All possible states an order can be in
 */
export type OrderStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'on_hold';

/**
 * Order types for different departments
 */
export type OrderType =
  | 'sales'
  | 'service'
  | 'recon'
  | 'carwash';

/**
 * Payment status types
 */
export type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'partial'
  | 'refunded'
  | 'cancelled';

/**
 * Priority levels
 */
export type PriorityLevel =
  | 'low'
  | 'medium'
  | 'high'
  | 'urgent';

/**
 * QR generation status
 */
export type QRGenerationStatus =
  | 'pending'
  | 'generating'
  | 'completed'
  | 'failed';

// ============================================================================
// SERVICE ITEM INTERFACE
// ============================================================================

/**
 * Service item that can be attached to an order
 */
export interface ServiceItem {
  id: string;
  name: string;
  price?: number;
  description?: string;
  category?: string;
  duration?: number;
}

// ============================================================================
// MAIN UNIFIED ORDER DATA INTERFACE
// ============================================================================

/**
 * Unified Order Data Interface
 *
 * This interface consolidates all order-related fields and supports both
 * database format (snake_case) and frontend format (camelCase) for
 * maximum compatibility.
 *
 * Key Features:
 * - Supports all 4 order types (sales, service, recon, carwash)
 * - Dual format support (snake_case and camelCase)
 * - Type-safe with strict TypeScript checking
 * - Extensible for future needs
 */
export interface UnifiedOrderData {
  // -------------------------------------------------------------------------
  // CORE FIELDS (Required)
  // -------------------------------------------------------------------------

  /** Unique order identifier */
  id: string;

  /** Dealership ID - standardized to number */
  dealer_id: number;

  /** Order status */
  status: OrderStatus;

  // -------------------------------------------------------------------------
  // ORDER IDENTIFICATION (Support both formats)
  // -------------------------------------------------------------------------

  /** Order number - database format */
  order_number?: string;
  /** Order number - frontend format */
  orderNumber?: string;

  /** Custom order number - database format */
  custom_order_number?: string;
  /** Custom order number - frontend format */
  customOrderNumber?: string;

  // -------------------------------------------------------------------------
  // CUSTOMER INFORMATION (Support both formats)
  // -------------------------------------------------------------------------

  /** Customer name - database format */
  customer_name?: string;
  /** Customer name - frontend format */
  customerName?: string;

  /** Customer phone - database format */
  customer_phone?: string;
  /** Customer phone - frontend format */
  customerPhone?: string;

  /** Customer email - database format */
  customer_email?: string;
  /** Customer email - frontend format */
  customerEmail?: string;

  // -------------------------------------------------------------------------
  // VEHICLE INFORMATION (Support both formats)
  // -------------------------------------------------------------------------

  /** Vehicle year - database format */
  vehicle_year?: string | number;
  /** Vehicle year - frontend format */
  vehicleYear?: string | number;

  /** Vehicle make - database format */
  vehicle_make?: string;
  /** Vehicle make - frontend format */
  vehicleMake?: string;

  /** Vehicle model - database format */
  vehicle_model?: string;
  /** Vehicle model - frontend format */
  vehicleModel?: string;

  /** Vehicle VIN - database format */
  vehicle_vin?: string;
  /** Vehicle VIN - frontend format */
  vehicleVin?: string;

  /** Vehicle info (unified display from VIN decoder) - database format */
  vehicle_info?: string;
  /** Vehicle info - frontend format */
  vehicleInfo?: string;

  /** Vehicle color - database format */
  vehicle_color?: string;
  /** Vehicle color - frontend format */
  vehicleColor?: string;

  /** Vehicle mileage - database format */
  vehicle_mileage?: number;
  /** Vehicle mileage - frontend format */
  vehicleMileage?: number;

  /** Vehicle trim - database format */
  vehicle_trim?: string;
  /** Vehicle trim - frontend format */
  vehicleTrim?: string;

  /** Stock number - database format */
  stock_number?: string;
  /** Stock number - frontend format */
  stockNumber?: string;

  // -------------------------------------------------------------------------
  // SERVICE-SPECIFIC FIELDS (Service & Recon)
  // -------------------------------------------------------------------------

  /** Purchase Order number */
  po?: string;
  purchase_order?: string;

  /** Repair Order number */
  ro?: string;
  repair_order?: string;

  /** TAG number */
  tag?: string;

  /** Services attached to order */
  services?: ServiceItem[] | string[];

  /** Total amount */
  total_amount?: number;
  totalAmount?: number;

  // -------------------------------------------------------------------------
  // ASSIGNMENT FIELDS (Support both formats)
  // -------------------------------------------------------------------------

  /** Assigned to - database format */
  assigned_to?: string;
  /** Assigned to - frontend format */
  assignedTo?: string;

  /** Assigned group ID (user ID) - database format */
  assigned_group_id?: string;
  /** Assigned group ID - frontend format */
  assignedGroupId?: string;

  /** Advisor name */
  advisor?: string;

  /** Salesperson name */
  salesperson?: string;

  /** Service performer (Recon & Car Wash) - database format */
  service_performer?: string;
  /** Service performer - frontend format */
  servicePerformer?: string;

  // -------------------------------------------------------------------------
  // DEALERSHIP INFORMATION
  // -------------------------------------------------------------------------

  /** Dealership name - database format */
  dealership_name?: string;
  /** Dealership name - frontend format */
  dealershipName?: string;

  // -------------------------------------------------------------------------
  // NOTES AND DESCRIPTIONS
  // -------------------------------------------------------------------------

  /** General notes visible to everyone */
  notes?: string;

  /** Internal notes (staff only) - database format */
  internal_notes?: string;
  /** Internal notes - frontend format */
  internalNotes?: string;

  /** Work description */
  description?: string;

  /** Work requested */
  work_requested?: string;
  workRequested?: string;

  // -------------------------------------------------------------------------
  // PRIORITY AND METADATA
  // -------------------------------------------------------------------------

  /** Priority level */
  priority?: PriorityLevel | string;

  /** Order type */
  order_type?: OrderType;
  orderType?: OrderType;

  /** Payment status */
  payment_status?: PaymentStatus;
  paymentStatus?: PaymentStatus;

  // -------------------------------------------------------------------------
  // DATES (Support both formats)
  // -------------------------------------------------------------------------

  /** Created timestamp - database format */
  created_at?: string;
  /** Created timestamp - frontend format */
  createdAt?: string;

  /** Updated timestamp - database format */
  updated_at?: string;
  /** Updated timestamp - frontend format */
  updatedAt?: string;

  /** Estimated completion date - database format */
  estimated_completion?: string;
  /** Estimated completion date - frontend format */
  estimatedCompletion?: string;

  /** Actual completion date - database format */
  actual_completion?: string;
  /** Actual completion date - frontend format */
  actualCompletion?: string;

  /** Due date (Sales/Service) - database format */
  due_date?: string;
  /** Due date - frontend format */
  dueDate?: string;

  /** Service complete date (Recon/CarWash) - database format */
  date_service_complete?: string;
  /** Service complete date - frontend format */
  dateServiceComplete?: string;

  /** Scheduled date */
  scheduled_date?: string;
  scheduledDate?: string;

  /** Scheduled time */
  scheduled_time?: string;
  scheduledTime?: string;

  // -------------------------------------------------------------------------
  // QR CODE AND TRACKING (Support both formats)
  // -------------------------------------------------------------------------

  /** QR code slug - database format */
  qr_slug?: string;
  /** QR code slug - frontend format */
  qrSlug?: string;

  /** QR code URL - database format */
  qr_code_url?: string;
  /** QR code URL - frontend format */
  qrCodeUrl?: string;

  /** QR code data */
  qr_code?: string;
  qrCode?: string;

  /** Short URL - database format */
  short_url?: string;
  /** Short URL - frontend format */
  shortUrl?: string;

  /** Short link - database format */
  short_link?: string;
  /** Short link - frontend format */
  shortLink?: string;

  /** QR generation status - database format */
  qr_generation_status?: QRGenerationStatus;
  /** QR generation status - frontend format */
  qrGenerationStatus?: QRGenerationStatus;

  /** QR scan count */
  qr_scan_count?: number;
  qrScanCount?: number;

  // -------------------------------------------------------------------------
  // AUDIT FIELDS
  // -------------------------------------------------------------------------

  /** Created by user ID - database format */
  created_by?: string;
  /** Created by - frontend format */
  createdBy?: string;

  /** Updated by user ID */
  updated_by?: string;
  updatedBy?: string;

  // -------------------------------------------------------------------------
  // CAR WASH SPECIFIC
  // -------------------------------------------------------------------------

  /** Is waiter (car wash) - database format */
  is_waiter?: boolean;
  /** Is waiter - frontend format */
  isWaiter?: boolean;

  /** Service type */
  service_type?: string;
  serviceType?: string;

  // -------------------------------------------------------------------------
  // RECON SPECIFIC
  // -------------------------------------------------------------------------

  /** Recon type */
  recon_type?: string;
  reconType?: string;

  // -------------------------------------------------------------------------
  // EXTENSIBILITY
  // -------------------------------------------------------------------------

  /** Index signature for additional fields */
  [key: string]: unknown;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalizes order data from database format to frontend format
 *
 * @param data Raw order data from database
 * @returns Normalized order data with both formats
 */
export function normalizeOrderData(data: Record<string, unknown>): Partial<UnifiedOrderData> {
  if (!data) return {};

  return {
    ...data,
    // Ensure core fields are properly typed
    id: data.id as string,
    status: data.status as OrderStatus,
    dealer_id: Number(data.dealer_id),
  } as Partial<UnifiedOrderData>;
}

/**
 * Gets the display order number from order data
 * Prioritizes custom_order_number, then order_number, then ID
 *
 * @param order Order data
 * @returns Display order number
 */
export function getOrderNumber(order: UnifiedOrderData): string {
  return (
    order.custom_order_number ||
    order.customOrderNumber ||
    order.order_number ||
    order.orderNumber ||
    `ORD-${order.id.slice(-8).toUpperCase()}`
  );
}

/**
 * Gets the customer name from order data
 *
 * @param order Order data
 * @returns Customer name or 'Unknown Customer'
 */
export function getCustomerName(order: UnifiedOrderData): string {
  return (
    order.customer_name ||
    order.customerName ||
    'Unknown Customer'
  );
}

/**
 * Gets the assigned person name from order data
 *
 * @param order Order data
 * @returns Assigned person name or 'Unassigned'
 */
export function getAssignedPerson(order: UnifiedOrderData): string {
  return (
    order.assigned_to ||
    order.assignedTo ||
    order.salesperson ||
    order.advisor ||
    order.service_performer ||
    order.servicePerformer ||
    'Unassigned'
  );
}

/**
 * Gets the vehicle display name from order data
 * Prioritizes vehicle_info (from VIN decoder), then constructs from parts
 *
 * @param order Order data
 * @returns Vehicle display name
 */
export function getVehicleDisplayName(order: UnifiedOrderData): string {
  // Priority 1: Use vehicle_info if available (decoded VIN)
  if (order.vehicle_info || order.vehicleInfo) {
    return order.vehicle_info || order.vehicleInfo || '';
  }

  // Fallback: Construct from individual fields
  const year = order.vehicle_year || order.vehicleYear || '';
  const make = order.vehicle_make || order.vehicleMake || '';
  const model = order.vehicle_model || order.vehicleModel || '';
  const trim = order.vehicle_trim || order.vehicleTrim || '';

  const baseVehicle = `${year} ${make} ${model}`.trim();
  const trimInfo = trim ? ` (${trim})` : '';

  return baseVehicle ? `${baseVehicle}${trimInfo}` : 'Unknown Vehicle';
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if order data is valid
 *
 * @param data Data to check
 * @returns True if data is valid UnifiedOrderData
 */
export function isValidOrderData(data: unknown): data is UnifiedOrderData {
  if (!data || typeof data !== 'object') return false;

  const order = data as UnifiedOrderData;
  return !!(order.id && order.dealer_id && order.status);
}

/**
 * Type guard to check if status is valid
 *
 * @param status Status to check
 * @returns True if status is valid OrderStatus
 */
export function isValidStatus(status: unknown): status is OrderStatus {
  return typeof status === 'string' &&
    ['pending', 'in_progress', 'completed', 'cancelled', 'on_hold'].includes(status);
}

/**
 * Type guard to check if order type is valid
 *
 * @param type Type to check
 * @returns True if type is valid OrderType
 */
export function isValidOrderType(type: unknown): type is OrderType {
  return typeof type === 'string' &&
    ['sales', 'service', 'recon', 'carwash'].includes(type);
}

// ============================================================================
// EXPORTS
// ============================================================================

// All types are already exported via 'export interface' and 'export type'
// No need for additional export statements
