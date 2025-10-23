// =====================================================
// CHART TYPES - Type-safe definitions for Recharts
// Created: 2025-10-23
// Description: Precise TypeScript types for chart components
// =====================================================

/**
 * Recharts Tooltip Payload Entry
 * Used in CustomTooltip components across all charts
 */
export interface TooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
  dataKey?: string;
  payload?: Record<string, unknown>;
  unit?: string;
  fill?: string;
  stroke?: string;
}

/**
 * Standard Tooltip Props for Recharts
 * Covers LineChart, BarChart, AreaChart tooltips
 */
export interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

/**
 * Custom Label Props for PieChart
 * Used in StatusDistributionChart
 */
export interface PieChartLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
  index?: number;
}

/**
 * Enhanced Tooltip Payload with total
 * Used when we need to calculate percentages
 */
export interface TooltipPayloadWithTotal extends TooltipPayloadEntry {
  total: number;
}

/**
 * Chart Data Point - Generic daily data
 */
export interface DailyChartDataPoint {
  date: string;
  orders: number;
  revenue: number;
}

/**
 * Formatted Chart Data Point
 * After date formatting for display
 */
export interface FormattedChartDataPoint {
  date: string; // Formatted (e.g., "Jan 15")
  orders: number;
  revenue: number;
}

/**
 * Revenue Chart Data Point
 * Includes calculated average order value
 */
export interface RevenueChartDataPoint {
  period: string;
  revenue: number;
  orders: number;
  avgOrderValue: number;
}

/**
 * Status Distribution Data
 * For pie charts showing order status breakdown
 */
export interface StatusDistributionDataPoint {
  name: string;
  value: number;
  color: string;
  total?: number;
}

/**
 * Chart Colors Configuration
 */
export const CHART_COLORS = {
  primary: 'hsl(var(--primary))',
  secondary: 'hsl(var(--secondary))',
  muted: 'hsl(var(--muted))',
  // Status colors - Notion-approved muted palette
  pending: 'hsl(var(--chart-1))',    // Muted gray
  in_progress: 'hsl(var(--chart-2))', // Muted indigo
  completed: 'hsl(var(--chart-3))',   // Muted emerald
  cancelled: 'hsl(var(--chart-4))',   // Muted red
} as const;

/**
 * Chart Status Keys
 */
export type ChartStatusKey = keyof typeof CHART_COLORS;
