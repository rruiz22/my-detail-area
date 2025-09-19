/**
 * Comprehensive Order Type Definitions for My Detail Area
 *
 * This file provides strongly-typed interfaces for order-related data structures,
 * supporting both snake_case (database) and camelCase (frontend transforms) formats
 * for maximum compatibility with the dealership management system.
 */

import type { Database } from './database';

// Base database order type
export type DatabaseOrder = Database['public']['Tables']['orders']['Row'];
export type DatabaseOrderInsert = Database['public']['Tables']['orders']['Insert'];
export type DatabaseOrderUpdate = Database['public']['Tables']['orders']['Update'];

// Order status and type enums for type safety
export type OrderStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
export type OrderType = 'sales' | 'service' | 'recon' | 'carwash';
export type PaymentStatus = 'pending' | 'paid' | 'partial' | 'refunded' | 'cancelled';

/**
 * Enhanced Order interface that supports both database format (snake_case)
 * and frontend transform format (camelCase) for seamless integration
 */
export interface OrderData extends DatabaseOrder {
  // Additional camelCase properties for transform compatibility
  customOrderNumber?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  vehicleYear?: string | number;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleVin?: string;
  vehicleColor?: string;
  vehicleMileage?: number;
  stockNumber?: string;
  dealershipName?: string;
  qrCodeUrl?: string;
  shortLink?: string;
  qrSlug?: string;
  // Support for both formats of notes
  internal_notes?: string;
  internalNotes?: string;
  // QR and tracking fields
  qr_code?: string;
  short_url?: string;
  qr_code_url?: string;
  short_link?: string;
  // Staff assignments
  advisor?: string;
  salesperson?: string;
  assignedTo?: string;
  createdBy?: string;
  // Order metadata
  priority?: string;
  workRequested?: string;
  totalAmount?: number;
  estimatedCompletion?: string;
  actualCompletion?: string;
  // Audit fields
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Order attachment from database with file metadata
 */
export interface OrderAttachment {
  id: string;
  order_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  upload_context: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Order activity tracking for audit trail
 */
export interface OrderActivity {
  id: string;
  order_id: string;
  action: string;
  description: string;
  user_id: string;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

/**
 * Order comments for team communication
 */
export interface OrderComment {
  id: string;
  order_id: string;
  comment: string;
  is_internal: boolean;
  created_by: string;
  created_at: string;
  updated_at?: string;
  user_name?: string;
  user_email?: string;
}

/**
 * Order followers for team collaboration
 */
export interface OrderFollower {
  id: string;
  order_id: string;
  user_id: string;
  created_at: string;
  user_name?: string;
  user_email?: string;
  avatar_url?: string;
}

/**
 * QR Code analytics data from mda.to service
 */
export interface QRAnalytics {
  totalClicks: number;
  uniqueVisitors: number;
  lastClicked?: string;
  clickHistory?: Array<{
    timestamp: string;
    userAgent?: string;
    referrer?: string;
    ipAddress?: string;
  }>;
}

/**
 * Comprehensive modal data for order detail views
 */
export interface OrderModalData {
  attachments: OrderAttachment[];
  activities: OrderActivity[];
  comments: OrderComment[];
  followers: OrderFollower[];
  analytics: QRAnalytics | null;
  userType: 'detail' | 'regular' | null;
}

/**
 * Order form data for creating/editing orders
 */
export interface OrderFormData {
  // Basic order information
  order_type: OrderType;
  status?: OrderStatus;

  // Vehicle information
  vehicle_vin?: string;
  vehicle_year?: number;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_color?: string;
  vehicle_mileage?: number;
  license_plate?: string;

  // Customer information
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;

  // Order details
  description?: string;
  work_requested?: string;
  total_amount?: number;
  payment_status?: PaymentStatus;
  estimated_completion?: string;

  // Staff assignments
  assigned_to?: string;
  notes?: string;
  internal_notes?: string;
  priority?: string;
}

/**
 * Order filters for data table and search functionality
 */
export interface OrderFilters {
  status?: OrderStatus[];
  order_type?: OrderType[];
  payment_status?: PaymentStatus[];
  customer_name?: string;
  vehicle_vin?: string;
  assigned_to?: string;
  created_date_from?: string;
  created_date_to?: string;
  estimated_completion_from?: string;
  estimated_completion_to?: string;
  total_amount_min?: number;
  total_amount_max?: number;
}

/**
 * Order summary for dashboard and reporting
 */
export interface OrderSummary {
  total_orders: number;
  orders_by_status: Record<OrderStatus, number>;
  orders_by_type: Record<OrderType, number>;
  total_revenue: number;
  average_order_value: number;
  completion_rate: number;
  overdue_orders: number;
}

/**
 * Type guard functions for runtime type checking
 */
export const isValidOrderStatus = (status: string): status is OrderStatus => {
  return ['pending', 'in_progress', 'completed', 'cancelled', 'on_hold'].includes(status);
};

export const isValidOrderType = (type: string): type is OrderType => {
  return ['sales', 'service', 'recon', 'carwash'].includes(type);
};

export const isValidPaymentStatus = (status: string): status is PaymentStatus => {
  return ['pending', 'paid', 'partial', 'refunded', 'cancelled'].includes(status);
};

/**
 * Utility function to normalize order data between snake_case and camelCase
 */
export const normalizeOrderData = (order: Partial<OrderData>): OrderData => {
  return {
    ...order,
    // Ensure both formats are available
    customOrderNumber: order.customOrderNumber || order.custom_order_number,
    customerName: order.customerName || order.customer_name,
    customerPhone: order.customerPhone || order.customer_phone,
    customerEmail: order.customerEmail || order.customer_email,
    vehicleYear: order.vehicleYear || order.vehicle_year,
    vehicleMake: order.vehicleMake || order.vehicle_make,
    vehicleModel: order.vehicleModel || order.vehicle_model,
    vehicleVin: order.vehicleVin || order.vehicle_vin,
    vehicleColor: order.vehicleColor || order.vehicle_color,
    vehicleMileage: order.vehicleMileage || order.vehicle_mileage,
    internalNotes: order.internalNotes || order.internal_notes,
    qrCodeUrl: order.qrCodeUrl || order.qr_code_url,
    shortLink: order.shortLink || order.short_link || order.short_url,
  } as OrderData;
};