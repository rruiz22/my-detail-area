/**
 * EngagementFunnel Component
 * Visualization of notification engagement funnel
 */

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { calculateFunnelData, formatPercentage } from '@/lib/notification-analytics';
import { cn } from '@/lib/utils';
import type { AnalyticsOverview } from '@/types/notification-analytics';

interface EngagementFunnelProps {
  overview: AnalyticsOverview;
  loading?: boolean;
}

export const EngagementFunnel: React.FC<EngagementFunnelProps> = ({ overview, loading }) => {
  const { t } = useTranslation();

  const funnelData = useMemo(
    () =>
      calculateFunnelData(
        overview.totalSent,
        overview.totalDelivered,
        overview.totalOpened,
        overview.totalClicked
      ),
    [overview]
  );

  if (loading) {
    return (
      <Card className="card-enhanced">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-64 animate-pulse mt-2"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const stageLabels = {
    sent: t('notifications.analytics.funnel.sent'),
    delivered: t('notifications.analytics.funnel.delivered'),
    opened: t('notifications.analytics.funnel.opened'),
    clicked: t('notifications.analytics.funnel.clicked'),
  };

  const stageColors = {
    sent: 'bg-gray-500',
    delivered: 'bg-emerald-500',
    opened: 'bg-indigo-500',
    clicked: 'bg-amber-500',
  };

  return (
    <Card className="card-enhanced">
      <CardHeader>
        <CardTitle>{t('notifications.analytics.charts.engagement_funnel')}</CardTitle>
        <CardDescription>
          {t('notifications.analytics.charts.engagement_funnel_description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {funnelData.map((stage, index) => {
            const widthPercent = stage.percentage;
            const isLast = index === funnelData.length - 1;

            return (
              <div key={stage.stage} className="space-y-2">
                {/* Stage bar */}
                <div className="relative">
                  <div
                    className={cn(
                      'h-16 rounded-lg flex items-center justify-between px-6 transition-all',
                      stageColors[stage.stage]
                    )}
                    style={{
                      width: `${Math.max(widthPercent, 20)}%`,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-white/20 rounded-full w-8 h-8 flex items-center justify-center text-white font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-white font-medium">
                          {stageLabels[stage.stage]}
                        </div>
                        <div className="text-white/80 text-sm">
                          {stage.value.toLocaleString()} {t('notifications.analytics.funnel.notifications')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="bg-white/20 text-white border-none"
                      >
                        {formatPercentage(stage.percentage)}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Drop-off indicator */}
                {!isLast && stage.dropOff > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 ml-4">
                    <svg
                      className="h-4 w-4 text-red-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 14l-7 7m0 0l-7-7m7 7V3"
                      />
                    </svg>
                    <span>
                      {stage.dropOff.toLocaleString()} {t('notifications.analytics.funnel.dropped_off')} (
                      {formatPercentage((stage.dropOff / stage.value) * 100)})
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Conversion summary */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-semibold text-gray-900">
                {formatPercentage(overview.deliveryRate)}
              </div>
              <div className="text-sm text-gray-600">
                {t('notifications.analytics.funnel.delivery_rate')}
              </div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-gray-900">
                {formatPercentage(overview.openRate)}
              </div>
              <div className="text-sm text-gray-600">
                {t('notifications.analytics.funnel.open_rate')}
              </div>
            </div>
            <div>
              <div className="text-2xl font-semibold text-gray-900">
                {formatPercentage(overview.clickRate)}
              </div>
              <div className="text-sm text-gray-600">
                {t('notifications.analytics.funnel.click_rate')}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
