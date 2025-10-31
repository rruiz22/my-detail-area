/**
 * ProviderComparisonChart Component
 * Horizontal bar chart comparing provider performance
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { formatPercentage, formatDuration, getPerformanceRating } from '@/lib/notification-analytics';
import { cn } from '@/lib/utils';
import type { ProviderPerformance } from '@/types/notification-analytics';

interface ProviderComparisonChartProps {
  data: ProviderPerformance[];
  loading?: boolean;
}

export const ProviderComparisonChart: React.FC<ProviderComparisonChartProps> = ({
  data,
  loading,
}) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <Card className="card-enhanced">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-64 animate-pulse mt-2"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="card-enhanced">
        <CardHeader>
          <CardTitle>{t('notifications.analytics.charts.provider_comparison')}</CardTitle>
          <CardDescription>
            {t('notifications.analytics.charts.provider_comparison_description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-500">
            <svg
              className="h-12 w-12 mx-auto mb-4 opacity-50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p>{t('notifications.analytics.no_data')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-enhanced">
      <CardHeader>
        <CardTitle>{t('notifications.analytics.charts.provider_comparison')}</CardTitle>
        <CardDescription>
          {t('notifications.analytics.charts.provider_comparison_description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {data.map((provider, index) => {
            const performance = getPerformanceRating(provider.delivery_rate);

            return (
              <div key={`${provider.provider}-${provider.channel}`} className="space-y-2">
                {/* Provider header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{provider.provider}</div>
                      <div className="text-sm text-gray-600">
                        {t(`notifications.channels.${provider.channel}`)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="text-xs"
                      style={{
                        backgroundColor: `${performance.color}20`,
                        color: performance.color,
                        borderColor: performance.color,
                      }}
                    >
                      {t(`notifications.analytics.performance.${performance.rating}`)}
                    </Badge>
                  </div>
                </div>

                {/* Delivery rate bar */}
                <div className="relative">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${provider.delivery_rate}%`,
                        backgroundColor: performance.color,
                      }}
                    />
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600 text-xs">
                      {t('notifications.analytics.metrics.delivery_rate')}
                    </div>
                    <div className="font-medium text-gray-900">
                      {formatPercentage(provider.delivery_rate)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600 text-xs">
                      {t('notifications.analytics.metrics.sent')}
                    </div>
                    <div className="font-medium text-gray-900">
                      {provider.total_sent.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600 text-xs">
                      {t('notifications.analytics.metrics.avg_latency')}
                    </div>
                    <div className="font-medium text-gray-900">
                      {formatDuration(provider.avg_delivery_time)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600 text-xs">
                      {t('notifications.analytics.metrics.avg_cost')}
                    </div>
                    <div className="font-medium text-gray-900">
                      ${provider.avg_cost.toFixed(4)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
