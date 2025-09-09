import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar
} from 'recharts';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import type { OrderAnalytics } from '@/hooks/useReportsData';

interface OrderVolumeChartProps {
  data: OrderAnalytics;
  type?: 'line' | 'bar';
}

export const OrderVolumeChart: React.FC<OrderVolumeChartProps> = ({ 
  data, 
  type = 'line' 
}) => {
  const { t } = useTranslation();

  const chartData = data.daily_data.map((item) => ({
    date: format(new Date(item.date), 'MMM dd'),
    orders: item.orders,
    revenue: item.revenue
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium text-foreground">{`${t('common.date')}: ${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {`${entry.name}: ${entry.name === 'orders' ? entry.value : `$${entry.value.toLocaleString()}`}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="date" 
            className="text-xs text-muted-foreground"
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            yAxisId="orders"
            orientation="left"
            className="text-xs text-muted-foreground"
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            yAxisId="revenue"
            orientation="right"
            className="text-xs text-muted-foreground"
            tick={{ fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar
            yAxisId="orders"
            dataKey="orders"
            fill="hsl(var(--primary))"
            name={t('reports.charts.orders')}
            radius={[2, 2, 0, 0]}
          />
          <Bar
            yAxisId="revenue"
            dataKey="revenue"
            fill="hsl(var(--secondary))"
            name={t('reports.charts.revenue')}
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis 
          dataKey="date" 
          className="text-xs text-muted-foreground"
          tick={{ fontSize: 12 }}
        />
        <YAxis 
          yAxisId="orders"
          orientation="left"
          className="text-xs text-muted-foreground"
          tick={{ fontSize: 12 }}
        />
        <YAxis 
          yAxisId="revenue"
          orientation="right"
          className="text-xs text-muted-foreground"
          tick={{ fontSize: 12 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Line
          yAxisId="orders"
          type="monotone"
          dataKey="orders"
          stroke="hsl(var(--primary))"
          strokeWidth={3}
          dot={{ fill: "hsl(var(--primary))", r: 4 }}
          name={t('reports.charts.orders')}
        />
        <Line
          yAxisId="revenue"
          type="monotone"
          dataKey="revenue"
          stroke="hsl(var(--secondary))"
          strokeWidth={3}
          dot={{ fill: "hsl(var(--secondary))", r: 4 }}
          name={t('reports.charts.revenue')}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};