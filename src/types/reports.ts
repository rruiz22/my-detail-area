/**
 * Comprehensive Type Definitions for Reports Module
 *
 * This file provides strongly-typed interfaces for all report-related data structures
 * in the MyDetailArea dealership management system. All types are properly defined
 * to eliminate `any` type usage and provide full type safety.
 */

import type { OrderType, OrderStatus } from './order';

/**
 * Service category for grouping services
 */
export interface ServiceCategory {
  id: string;
  name: string;
  color: string | null;
  dealer_id: number;
  created_at: string;
  updated_at: string;
}

/**
 * Dealer service with complete metadata
 * Used in service filters and service selection across reports
 */
export interface DealerService {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration: number | null;
  category_id: string | null;
  category_name?: string | null;
  category_color?: string | null;
  color: string | null;
  dealer_id?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Transformed dealer service for UI display
 * Includes nested category information from join
 */
export interface TransformedDealerService {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration: number | null;
  category_id: string | null;
  category_name: string | null;
  category_color: string | null;
  color: string | null;
}

/**
 * Service stored in order's services JSON field
 * Can be in string format (Sales/Service/Recon) or object format (CarWash)
 */
export type OrderServiceItem = string | {
  id?: string;
  type?: string;
  name?: string;
  price?: number;
  duration?: number;
};

/**
 * Report-specific order interface with all necessary fields for analytics
 * Extends the base order type with calculated and formatted fields
 */
export interface ReportOrder {
  id: string;
  order_number: string;
  order_type: OrderType;
  status: OrderStatus;
  dealer_id: number;

  // Date fields used for filtering and display
  created_at: string;
  updated_at: string;
  due_date: string | null;
  completed_at: string | null;
  scheduled_date: string | null;

  // Vehicle information
  vehicle_vin: string | null;
  vehicle_year: number | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_color: string | null;
  vehicle_mileage: number | null;

  // Customer information
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;

  // Financial information
  total_amount: number | null;
  payment_status: string | null;

  // Services - can be array of strings or objects
  services: OrderServiceItem[] | null;

  // Staff assignments
  assigned_to: string | null;

  // Additional order details
  description: string | null;
  work_requested: string | null;
  internal_notes: string | null;
  priority: string | null;

  // Calculated fields for reports
  report_date?: Date; // The date used for filtering (due_date/completed_at/created_at)
  processing_time_hours?: number;
  is_overdue?: boolean;
}

/**
 * Filters for reports data queries
 */
export interface ReportsFilters {
  startDate: Date;
  endDate: Date;
  orderType: 'all' | OrderType;
  status: 'all' | OrderStatus;
  serviceIds?: string[];
  dealerId?: number;
}

/**
 * Daily data point for charts and trends
 */
export interface DailyDataPoint {
  date: string;
  orders: number;
  revenue: number;
}

/**
 * Distribution data for status/type pie charts
 */
export interface DistributionItem {
  name: string;
  value: number;
  color?: string;
}

/**
 * Order analytics aggregated data
 */
export interface OrderAnalytics {
  total_orders: number;
  total_volume: number;
  pending_orders: number;
  in_progress_orders: number;
  completed_orders: number;
  cancelled_orders: number;
  total_revenue: number;
  avg_order_value: number;
  completion_rate: number;
  avg_processing_time_hours: number;
  sla_compliance_rate: number;
  daily_data: DailyDataPoint[];
  status_distribution: DistributionItem[];
  type_distribution: DistributionItem[];
}

/**
 * Period data for revenue analytics (daily/weekly/monthly)
 */
export interface PeriodDataPoint {
  period: string;
  revenue: number;
  orders: number;
}

/**
 * Top service by revenue
 */
export interface TopService {
  name: string;
  revenue: number;
  orders?: number;
}

/**
 * Revenue analytics aggregated data
 */
export interface RevenueAnalytics {
  period_data: PeriodDataPoint[];
  total_revenue: number;
  total_orders: number;
  avg_revenue_per_period: number;
  growth_rate: number;
  top_services: TopService[];
}

/**
 * Department performance metrics
 */
export interface DepartmentPerformance {
  department: string;
  total_orders: number;
  completion_rate: number;
  avg_processing_time: number;
  total_revenue?: number;
  avg_order_value?: number;
}

/**
 * Trend data point for efficiency/SLA/volume charts
 */
export interface TrendDataPoint {
  week: string;
  value: number;
}

/**
 * Performance trends over time
 */
export interface PerformanceTrends {
  efficiency_trends: Array<{
    week: string;
    efficiency: number;
  }>;
  sla_trends: Array<{
    week: string;
    sla_rate: number;
  }>;
  volume_trends: Array<{
    week: string;
    volume: number;
  }>;
  department_performance: DepartmentPerformance[];
}

/**
 * Department revenue comparison
 */
export interface DepartmentRevenue {
  name: string;
  revenue: number;
  orders: number;
  avg_order_value: number;
  color?: string;
}

/**
 * Weekly comparison data for financial reports
 */
export interface WeeklyComparisonData {
  department: string;
  week1_revenue: number;
  week1_orders: number;
  week2_revenue: number;
  week2_orders: number;
  week3_revenue: number;
  week3_orders: number;
  week4_revenue: number;
  week4_orders: number;
  total_revenue: number;
  total_orders: number;
}

/**
 * Date range preset type
 */
export type DateRangeType =
  | 'today'
  | 'this_week'
  | 'last_week'
  | 'last_30_days'
  | 'last_90_days'
  | 'this_year'
  | 'custom';

/**
 * Revenue grouping options for analytics
 */
export type RevenueGrouping = 'daily' | 'weekly' | 'monthly';

/**
 * Excel export data structure
 */
export interface ExcelExportData {
  orders: ReportOrder[];
  summary: OrderAnalytics;
  revenue: RevenueAnalytics;
  filename: string;
}

/**
 * PDF export configuration
 */
export interface PDFExportConfig {
  title: string;
  dateRange: string;
  orderType: string;
  status: string;
  data: ReportOrder[];
  summary: Partial<OrderAnalytics>;
  includeCharts?: boolean;
}

/**
 * Chart data for order volume
 */
export interface OrderVolumeChartData {
  date: string;
  orders: number;
  label?: string;
}

/**
 * Chart data for status distribution
 */
export interface StatusDistributionChartData {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

/**
 * Department map for consistent naming
 */
export const DEPARTMENT_MAP: Record<OrderType, string> = {
  sales: 'Sales Dept',
  service: 'Service Dept',
  recon: 'Recon Dept',
  carwash: 'CarWash Dept'
} as const;

/**
 * Department display names for UI
 */
export const DEPARTMENT_DISPLAY_NAMES: Record<OrderType, string> = {
  sales: 'Sales',
  service: 'Service',
  recon: 'Recon',
  carwash: 'CarWash'
} as const;

/**
 * Type guard to check if a value is a valid department
 */
export const isValidDepartment = (dept: string): dept is OrderType => {
  return ['sales', 'service', 'recon', 'carwash'].includes(dept.toLowerCase());
};

/**
 * Normalize department name to standard format
 */
export const normalizeDepartmentName = (name: string): OrderType | null => {
  const normalized = name.toLowerCase().replace(/\s+/g, '');

  if (normalized.includes('sale')) return 'sales';
  if (normalized.includes('service')) return 'service';
  if (normalized.includes('recon')) return 'recon';
  if (normalized.includes('carwash') || normalized.includes('car') && normalized.includes('wash')) {
    return 'carwash';
  }

  return null;
};
