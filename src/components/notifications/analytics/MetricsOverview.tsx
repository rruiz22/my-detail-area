/**
 * MetricsOverview Component
 * Displays key notification metrics with trends
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { formatPercentage, formatNumber, formatDuration } from '@/lib/notification-analytics';
import type { AnalyticsOverview } from '@/types/notification-analytics';

interface MetricsOverviewProps {
  overview: AnalyticsOverview;
  loading?: boolean;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: {
    value: number;
    percentage: number;
    direction: 'up' | 'down' | 'stable';
  };
  icon?: React.ReactNode;
  format?: 'number' | 'percentage' | 'duration';
  className?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  trend,
  icon,
  format = 'number',
  className,
}) => {
  const { t } = useTranslation();

  const formattedValue =
    format === 'percentage'
      ? formatPercentage(Number(value))
      : format === 'duration'
      ? formatDuration(Number(value))
      : typeof value === 'number'
      ? formatNumber(value)
      : value;

  const TrendIcon =
    trend?.direction === 'up'
      ? TrendingUp
      : trend?.direction === 'down'
      ? TrendingDown
      : Minus;

  const trendColor =
    trend?.direction === 'up'
      ? 'text-emerald-600'
      : trend?.direction === 'down'
      ? 'text-red-600'
      : 'text-gray-500';

  return (
    <Card className={cn('card-enhanced', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        {icon && <div className="text-gray-500">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold text-gray-900">{formattedValue}</div>
        {trend && (
          <div className="flex items-center gap-1 text-xs text-gray-600 mt-2">
            <TrendIcon className={cn('h-3 w-3', trendColor)} />
            <span className={trendColor}>{formatPercentage(trend.percentage)}</span>
            <span>{t('common.from_previous_period')}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({ overview, loading }) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-32"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Sent */}
      <MetricCard
        title={t('notifications.analytics.metrics.total_sent')}
        value={overview.totalSent}
        trend={overview.trend}
        icon={
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 12l-4-4m0 0l-4 4m4-4v12"
            />
          </svg>
        }
      />

      {/* Delivery Rate */}
      <MetricCard
        title={t('notifications.analytics.metrics.delivery_rate')}
        value={overview.deliveryRate}
        format="percentage"
        icon={
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        }
      />

      {/* Open Rate */}
      <MetricCard
        title={t('notifications.analytics.metrics.open_rate')}
        value={overview.openRate}
        format="percentage"
        icon={
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
        }
      />

      {/* Click-Through Rate */}
      <MetricCard
        title={t('notifications.analytics.metrics.click_rate')}
        value={overview.clickRate}
        format="percentage"
        icon={
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
            />
          </svg>
        }
      />

      {/* Average Time to Read */}
      <MetricCard
        title={t('notifications.analytics.metrics.avg_time_to_read')}
        value={overview.avgTimeToRead}
        format="duration"
        icon={
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        }
      />

      {/* Failed Deliveries */}
      <MetricCard
        title={t('notifications.analytics.metrics.failed_deliveries')}
        value={overview.totalFailed}
        icon={
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        }
      />

      {/* Active Users */}
      <MetricCard
        title={t('notifications.analytics.metrics.active_users')}
        value={overview.activeUsers}
        icon={
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        }
      />

      {/* Total Delivered */}
      <MetricCard
        title={t('notifications.analytics.metrics.total_delivered')}
        value={overview.totalDelivered}
        icon={
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        }
      />
    </div>
  );
};
