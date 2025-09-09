import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend
} from 'recharts';
import { useTranslation } from 'react-i18next';
import type { OrderAnalytics } from '@/hooks/useReportsData';

interface StatusDistributionChartProps {
  data: OrderAnalytics;
}

const STATUS_COLORS = {
  pending: 'hsl(var(--chart-1))',
  in_progress: 'hsl(var(--chart-2))',
  completed: 'hsl(var(--chart-3))',
  cancelled: 'hsl(var(--chart-4))',
};

export const StatusDistributionChart: React.FC<StatusDistributionChartProps> = ({ data }) => {
  const { t } = useTranslation();

  const chartData = data.status_distribution.map((item) => ({
    name: t(`reports.status.${item.name}`),
    value: item.value,
    color: STATUS_COLORS[item.name as keyof typeof STATUS_COLORS] || 'hsl(var(--muted))'
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium text-foreground">{data.name}</p>
          <p className="text-sm text-muted-foreground">{`${t('reports.charts.orders')}: ${data.value}`}</p>
          <p className="text-sm text-muted-foreground">
            {`${t('reports.charts.percentage')}: ${((data.value / data.payload.total) * 100).toFixed(1)}%`}
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // Don't show labels for slices < 5%
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const total = chartData.reduce((sum, item) => sum + item.value, 0);
  const enhancedData = chartData.map(item => ({ ...item, total }));

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={enhancedData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {enhancedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Custom Legend */}
      <div className="flex flex-wrap justify-center gap-4">
        {enhancedData.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: item.color }}
            />
            <span className="text-sm text-muted-foreground">
              {item.name} ({item.value})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};