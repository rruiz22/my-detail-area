import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Target,
  BarChart3
} from 'lucide-react';
import { 
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Area,
  AreaChart
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { MetricCard } from '../ReportsLayout';
import { useRevenueAnalytics, type ReportsFilters } from '@/hooks/useReportsData';
import type { ChartTooltipProps } from '@/types/charts';

interface FinancialReportsProps {
  filters: ReportsFilters;
}

export const FinancialReports: React.FC<FinancialReportsProps> = ({ filters }) => {
  const { t } = useTranslation();
  const { data: revenueData, isLoading } = useRevenueAnalytics(filters, 'monthly');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const CustomTooltip = ({ active, payload, label }: ChartTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium text-foreground">{`${t('reports.period')}: ${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {`${entry.name}: ${entry.name.includes('Revenue') ? formatCurrency(entry.value) : entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const revenueChartData = revenueData?.period_data.map((item) => ({
    period: item.period,
    revenue: item.revenue,
    orders: item.orders,
    avgOrderValue: item.orders > 0 ? item.revenue / item.orders : 0
  })) || [];

  const topServicesData = revenueData?.top_services || [];

  return (
    <div className="space-y-6">
      {/* Key Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title={t('reports.metrics.total_revenue')}
          value={formatCurrency(revenueData?.total_revenue || 0)}
          change={revenueData?.growth_rate}
          changeLabel={t('reports.metrics.growth_rate')}
          icon={<DollarSign className="h-4 w-4" />}
          loading={isLoading}
        />
        <MetricCard
          title={t('reports.metrics.avg_revenue_per_period')}
          value={formatCurrency(revenueData?.avg_revenue_per_period || 0)}
          icon={<TrendingUp className="h-4 w-4" />}
          loading={isLoading}
        />
        <MetricCard
          title={t('reports.metrics.revenue_growth')}
          value={`${revenueData?.growth_rate || 0}%`}
          icon={revenueData?.growth_rate && revenueData.growth_rate >= 0 ? 
            <TrendingUp className="h-4 w-4" /> : 
            <TrendingDown className="h-4 w-4" />
          }
          loading={isLoading}
        />
        <MetricCard
          title={t('reports.metrics.top_services_count')}
          value={topServicesData.length}
          icon={<Target className="h-4 w-4" />}
          loading={isLoading}
        />
      </div>

      {/* Revenue Analysis Charts */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="trends">{t('reports.tabs.revenue_trends')}</TabsTrigger>
          <TabsTrigger value="services">{t('reports.tabs.top_services')}</TabsTrigger>
          <TabsTrigger value="analysis">{t('reports.tabs.detailed_analysis')}</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('reports.charts.revenue_trends')}</CardTitle>
              <CardDescription>
                {t('reports.charts.monthly_revenue_performance')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-80 flex items-center justify-center">
                  <div className="text-muted-foreground">{t('common.loading')}</div>
                </div>
              ) : revenueChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={revenueChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="period" 
                      className="text-xs text-muted-foreground"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      yAxisId="revenue"
                      orientation="left"
                      className="text-xs text-muted-foreground"
                      tick={{ fontSize: 12 }}
                      tickFormatter={formatCurrency}
                    />
                    <YAxis 
                      yAxisId="orders"
                      orientation="right"
                      className="text-xs text-muted-foreground"
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      yAxisId="revenue"
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.3}
                      strokeWidth={3}
                      name={t('reports.charts.revenue')}
                    />
                    <Line
                      yAxisId="orders"
                      type="monotone"
                      dataKey="orders"
                      stroke="hsl(var(--secondary))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--secondary))", r: 4 }}
                      name={t('reports.charts.orders')}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {t('reports.no_data')}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('reports.charts.top_services_by_revenue')}</CardTitle>
                <CardDescription>
                  {t('reports.charts.highest_revenue_generating_services')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-72 flex items-center justify-center">
                    <div className="text-muted-foreground">{t('common.loading')}</div>
                  </div>
                ) : topServicesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topServicesData} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis 
                        type="number"
                        className="text-xs text-muted-foreground"
                        tick={{ fontSize: 12 }}
                        tickFormatter={formatCurrency}
                      />
                      <YAxis 
                        type="category"
                        dataKey="name"
                        className="text-xs text-muted-foreground"
                        tick={{ fontSize: 12 }}
                        width={100}
                      />
                      <Tooltip 
                        formatter={(value: number) => [formatCurrency(value), t('reports.charts.revenue')]}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Bar
                        dataKey="revenue"
                        fill="hsl(var(--primary))"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('reports.no_data')}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('reports.charts.service_performance')}</CardTitle>
                <CardDescription>
                  {t('reports.charts.service_revenue_breakdown')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                        <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                        <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                ) : topServicesData.length > 0 ? (
                  <>
                    {topServicesData.slice(0, 5).map((service, index) => {
                      const percentage = revenueData?.total_revenue 
                        ? (service.revenue / revenueData.total_revenue) * 100 
                        : 0;
                      return (
                        <div key={index} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-sm">{service.name}</span>
                            <Badge variant="outline">{formatCurrency(service.revenue)}</Badge>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{percentage.toFixed(1)}% of total revenue</span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('reports.no_data')}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('reports.charts.average_order_value_trend')}</CardTitle>
              <CardDescription>
                {t('reports.charts.aov_analysis_over_time')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-72 flex items-center justify-center">
                  <div className="text-muted-foreground">{t('common.loading')}</div>
                </div>
              ) : revenueChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="period" 
                      className="text-xs text-muted-foreground"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      className="text-xs text-muted-foreground"
                      tick={{ fontSize: 12 }}
                      tickFormatter={formatCurrency}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="avgOrderValue"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      dot={{ fill: "hsl(var(--primary))", r: 6 }}
                      name={t('reports.charts.avg_order_value')}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {t('reports.no_data')}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};