/**
 * DeliveryTimelineChart Component
 * Line chart showing delivery metrics over time
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import type { TimeSeriesData } from '@/types/notification-analytics';

interface DeliveryTimelineChartProps {
  data: TimeSeriesData[];
  loading?: boolean;
}

export const DeliveryTimelineChart: React.FC<DeliveryTimelineChartProps> = ({
  data,
  loading,
}) => {
  const { t } = useTranslation();

  // Notion-style colors (muted palette)
  const colors = {
    sent: '#374151', // Gray-700
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
      color: string;
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
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
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
        <CardTitle>{t('notifications.analytics.charts.delivery_timeline')}</CardTitle>
        <CardDescription>
          {t('notifications.analytics.charts.delivery_timeline_description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="date"
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
            <Line
              type="monotone"
              dataKey="sent"
              stroke={colors.sent}
              strokeWidth={2}
              name={t('notifications.analytics.metrics.sent')}
              dot={{ fill: colors.sent, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="delivered"
              stroke={colors.delivered}
              strokeWidth={2}
              name={t('notifications.analytics.metrics.delivered')}
              dot={{ fill: colors.delivered, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="failed"
              stroke={colors.failed}
              strokeWidth={2}
              name={t('notifications.analytics.metrics.failed')}
              dot={{ fill: colors.failed, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
