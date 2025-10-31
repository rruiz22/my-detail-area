/**
 * ChannelPerformanceChart Component
 * Grouped bar chart comparing channel metrics
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { getChannelColor } from '@/lib/notification-analytics';
import type { DeliveryMetrics } from '@/types/notification-analytics';

interface ChannelPerformanceChartProps {
  data: DeliveryMetrics[];
  loading?: boolean;
}

export const ChannelPerformanceChart: React.FC<ChannelPerformanceChartProps> = ({
  data,
  loading,
}) => {
  const { t } = useTranslation();

  // Transform data for chart
  const chartData = data.map((metric) => ({
    channel: t(`notifications.channels.${metric.channel}`),
    sent: metric.total_sent,
    delivered: metric.total_delivered,
    failed: metric.total_failed,
  }));

  // Notion-style colors
  const colors = {
    sent: '#6B7280', // Gray-500
    delivered: '#10B981', // Emerald-500
    failed: '#EF4444', // Red-500
  };

  if (loading) {
    return (
      <Card className="card-enhanced">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-64 animate-pulse mt-2"></div>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-gray-100 rounded animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{
      name: string;
      value: number;
      fill: string;
    }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: entry.fill }}
              />
              <span className="text-gray-600">{entry.name}:</span>
              <span className="font-medium text-gray-900">{entry.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="card-enhanced">
      <CardHeader>
        <CardTitle>{t('notifications.analytics.charts.channel_performance')}</CardTitle>
        <CardDescription>
          {t('notifications.analytics.charts.channel_performance_description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="channel"
              stroke="#6B7280"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: '#E5E7EB' }}
            />
            <YAxis
              stroke="#6B7280"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: '#E5E7EB' }}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{
                paddingTop: '20px',
                fontSize: '14px',
              }}
            />
            <Bar
              dataKey="sent"
              fill={colors.sent}
              name={t('notifications.analytics.metrics.sent')}
              radius={[2, 2, 0, 0]}
            />
            <Bar
              dataKey="delivered"
              fill={colors.delivered}
              name={t('notifications.analytics.metrics.delivered')}
              radius={[2, 2, 0, 0]}
            />
            <Bar
              dataKey="failed"
              fill={colors.failed}
              name={t('notifications.analytics.metrics.failed')}
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
