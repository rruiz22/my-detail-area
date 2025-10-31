/**
 * Notification Analytics Helper Functions
 * Enterprise-grade utility functions for analytics calculations and formatting
 */

import { format, parseISO, startOfDay, endOfDay, subDays, subHours } from 'date-fns';
import type {
  DeliveryMetrics,
  EngagementMetrics,
  TimeSeriesData,
  TrendData,
  AnalyticsFilters,
  TimeRange,
  FunnelStageData,
  HeatmapCell,
  ChannelDistribution,
  NotificationChannel,
} from '@/types/notification-analytics';

/**
 * Calculate trend data by comparing current and previous values
 */
export function calculateTrend(current: number, previous: number): TrendData {
  if (previous === 0) {
    return {
      value: current,
      change: current,
      percentage: 100,
      direction: 'up',
    };
  }

  const change = current - previous;
  const percentage = (change / previous) * 100;

  return {
    value: current,
    change: Math.abs(change),
    percentage: Math.abs(percentage),
    direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
  };
}

/**
 * Format time range to date boundaries
 */
export function getDateRangeFromTimeRange(timeRange: TimeRange): {
  startDate: Date;
  endDate: Date;
} {
  const endDate = new Date();
  let startDate: Date;

  switch (timeRange) {
    case '24h':
      startDate = subHours(endDate, 24);
      break;
    case '7d':
      startDate = subDays(endDate, 7);
      break;
    case '30d':
      startDate = subDays(endDate, 30);
      break;
    case '90d':
      startDate = subDays(endDate, 90);
      break;
    default:
      startDate = subDays(endDate, 7);
  }

  return {
    startDate: startOfDay(startDate),
    endDate: endOfDay(endDate),
  };
}

/**
 * Calculate delivery rate percentage
 */
export function calculateDeliveryRate(delivered: number, sent: number): number {
  if (sent === 0) return 0;
  return (delivered / sent) * 100;
}

/**
 * Calculate open rate percentage
 */
export function calculateOpenRate(opened: number, delivered: number): number {
  if (delivered === 0) return 0;
  return (opened / delivered) * 100;
}

/**
 * Calculate click-through rate percentage
 */
export function calculateClickRate(clicked: number, opened: number): number {
  if (opened === 0) return 0;
  return (clicked / opened) * 100;
}

/**
 * Format duration in seconds to human-readable format
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

/**
 * Calculate funnel data for conversion visualization
 */
export function calculateFunnelData(
  sent: number,
  delivered: number,
  opened: number,
  clicked: number
): FunnelStageData[] {
  const stages: FunnelStageData[] = [
    {
      stage: 'sent',
      value: sent,
      percentage: 100,
      dropOff: 0,
    },
    {
      stage: 'delivered',
      value: delivered,
      percentage: calculateDeliveryRate(delivered, sent),
      dropOff: sent - delivered,
    },
    {
      stage: 'opened',
      value: opened,
      percentage: calculateOpenRate(opened, delivered),
      dropOff: delivered - opened,
    },
    {
      stage: 'clicked',
      value: clicked,
      percentage: calculateClickRate(clicked, opened),
      dropOff: opened - clicked,
    },
  ];

  return stages;
}

/**
 * Get Notion-style color for notification channel
 */
export function getChannelColor(channel: NotificationChannel): string {
  const colors: Record<NotificationChannel, string> = {
    push: '#6366F1', // Indigo-500 (muted)
    email: '#10B981', // Emerald-500
    in_app: '#6B7280', // Gray-500
    sms: '#F59E0B', // Amber-500
  };

  return colors[channel] || '#6B7280';
}

/**
 * Get status color using Notion-style palette
 */
export function getStatusColor(
  status: 'success' | 'warning' | 'error' | 'info'
): string {
  const colors = {
    success: '#10B981', // Emerald-500
    warning: '#F59E0B', // Amber-500
    error: '#EF4444', // Red-500
    info: '#6366F1', // Indigo-500
  };

  return colors[status];
}

/**
 * Calculate channel distribution for pie charts
 */
export function calculateChannelDistribution(
  metrics: DeliveryMetrics[]
): ChannelDistribution[] {
  const total = metrics.reduce((sum, m) => sum + m.total_sent, 0);

  return metrics.map((metric) => ({
    channel: metric.channel,
    value: metric.total_sent,
    percentage: (metric.total_sent / total) * 100,
    color: getChannelColor(metric.channel),
  }));
}

/**
 * Aggregate delivery metrics by time bucket
 */
export function aggregateTimeSeriesData(
  data: Array<{ time_bucket: string; [key: string]: unknown }>
): TimeSeriesData[] {
  return data.map((point) => ({
    date: format(parseISO(point.time_bucket as string), 'MMM dd'),
    sent: Number(point.total_sent || 0),
    delivered: Number(point.total_delivered || 0),
    failed: Number(point.total_failed || 0),
    opened: Number(point.total_opened || 0),
    clicked: Number(point.total_clicked || 0),
  }));
}

/**
 * Create heatmap data for time-to-read analysis
 */
export function createHeatmapData(
  data: Array<{
    hour: number;
    day_of_week: number;
    avg_time_to_read: number;
    count: number;
  }>
): HeatmapCell[] {
  return data.map((cell) => ({
    hour: cell.hour,
    day: cell.day_of_week,
    value: cell.avg_time_to_read,
    count: cell.count,
  }));
}

/**
 * Format percentage with optional decimal places
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format large numbers with K, M, B suffixes
 */
export function formatNumber(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toString();
}

/**
 * Get time interval for timeline queries based on time range
 */
export function getTimeInterval(timeRange: TimeRange): string {
  switch (timeRange) {
    case '24h':
      return '1 hour';
    case '7d':
      return '1 day';
    case '30d':
      return '1 day';
    case '90d':
      return '1 week';
    default:
      return '1 day';
  }
}

/**
 * Validate analytics filters
 */
export function validateFilters(filters: AnalyticsFilters): boolean {
  if (filters.timeRange === 'custom') {
    if (!filters.startDate || !filters.endDate) {
      return false;
    }

    const start = new Date(filters.startDate);
    const end = new Date(filters.endDate);

    if (start > end) {
      return false;
    }
  }

  return true;
}

/**
 * Calculate engagement score (0-100)
 */
export function calculateEngagementScore(
  delivered: number,
  opened: number,
  clicked: number
): number {
  if (delivered === 0) return 0;

  const openWeight = 0.6;
  const clickWeight = 0.4;

  const openScore = (opened / delivered) * 100 * openWeight;
  const clickScore = opened > 0 ? (clicked / opened) * 100 * clickWeight : 0;

  return Math.round(openScore + clickScore);
}

/**
 * Get performance rating based on delivery rate
 */
export function getPerformanceRating(deliveryRate: number): {
  rating: 'excellent' | 'good' | 'fair' | 'poor';
  color: string;
} {
  if (deliveryRate >= 95) {
    return { rating: 'excellent', color: getStatusColor('success') };
  }
  if (deliveryRate >= 85) {
    return { rating: 'good', color: getStatusColor('info') };
  }
  if (deliveryRate >= 70) {
    return { rating: 'fair', color: getStatusColor('warning') };
  }
  return { rating: 'poor', color: getStatusColor('error') };
}

/**
 * Calculate average from array of numbers
 */
export function calculateAverage(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sum = numbers.reduce((acc, num) => acc + num, 0);
  return sum / numbers.length;
}

/**
 * Group data by field
 */
export function groupBy<T>(
  array: T[],
  key: keyof T
): Record<string, T[]> {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<string, T[]>);
}

/**
 * Export data to CSV format
 */
export function exportToCSV(
  data: Array<Record<string, unknown>>,
  filename: string
): void {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers.map((header) => JSON.stringify(row[header] ?? '')).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
