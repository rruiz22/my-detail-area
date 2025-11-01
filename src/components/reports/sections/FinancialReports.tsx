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
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Award
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

  const formatCompactCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return formatCurrency(amount);
  };

  const CustomTooltip = ({ active, payload, label }: ChartTooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border-2 rounded-lg shadow-lg p-4">
          <p className="font-semibold text-foreground mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm font-medium">
              {`${entry.name}: ${entry.name.includes('Revenue') ? formatCurrency(Number(entry.value)) : entry.value}`}
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
  const growthRate = revenueData?.growth_rate || 0;
  const isPositiveGrowth = growthRate >= 0;

  return (
    <div className="space-y-6">
      {/* Executive Financial Summary */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Financial Performance Overview</CardTitle>
              <CardDescription className="mt-1">
                Revenue insights and financial metrics
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 border rounded-lg">
              <div className={`p-2 rounded-lg ${isPositiveGrowth ? 'border border-green-200' : 'border border-red-200'}`}>
                {isPositiveGrowth ? (
                  <TrendingUp className="h-5 w-5 text-green-600" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600" />
                )}
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Growth Rate</div>
                <div className={`text-2xl font-bold ${isPositiveGrowth ? 'text-green-600' : 'text-red-600'}`}>
                  {isPositiveGrowth ? '+' : ''}{growthRate.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Total Revenue</span>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{formatCompactCurrency(revenueData?.total_revenue || 0)}</div>
              <div className="text-xs text-muted-foreground">period total</div>
            </div>
            <div className="p-4 border rounded-lg space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Avg per Period</span>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{formatCompactCurrency(revenueData?.avg_revenue_per_period || 0)}</div>
              <div className="text-xs text-muted-foreground">average performance</div>
            </div>
            <div className="p-4 border rounded-lg space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Top Services</span>
                <Award className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{topServicesData.length}</div>
              <div className="text-xs text-muted-foreground">revenue generators</div>
            </div>
            <div className="p-4 border rounded-lg space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Growth Trend</span>
                {isPositiveGrowth ? (
                  <ArrowUpRight className="h-4 w-4 text-green-600" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-600" />
                )}
              </div>
              <div className={`text-2xl font-bold ${isPositiveGrowth ? 'text-green-600' : 'text-red-600'}`}>
                {isPositiveGrowth ? '+' : ''}{growthRate.toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">vs previous period</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs flex items-center gap-2">
              <DollarSign className="h-3.5 w-3.5" />
              Total Revenue
            </CardDescription>
            <CardTitle className="text-3xl font-bold">{formatCurrency(revenueData?.total_revenue || 0)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm">
              {isPositiveGrowth ? (
                <>
                  <div className="flex items-center gap-1 text-green-600">
                    <ArrowUpRight className="h-4 w-4" />
                    <span className="font-semibold">+{growthRate.toFixed(1)}%</span>
                  </div>
                  <span className="text-muted-foreground">vs previous period</span>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1 text-red-600">
                    <ArrowDownRight className="h-4 w-4" />
                    <span className="font-semibold">{growthRate.toFixed(1)}%</span>
                  </div>
                  <span className="text-muted-foreground">vs previous period</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5" />
              Average per Period
            </CardDescription>
            <CardTitle className="text-3xl font-bold">{formatCurrency(revenueData?.avg_revenue_per_period || 0)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm">
              <Target className="h-4 w-4 text-blue-600" />
              <span className="text-muted-foreground">Consistent performance</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs flex items-center gap-2">
              <Award className="h-3.5 w-3.5" />
              Top Service Revenue
            </CardDescription>
            <CardTitle className="text-3xl font-bold">
              {topServicesData.length > 0 ? formatCurrency(topServicesData[0].revenue) : '$0'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm">
              <PieChart className="h-4 w-4 text-amber-600" />
              <span className="text-muted-foreground">
                {topServicesData.length > 0 ? topServicesData[0].name : 'No data'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Analysis Charts */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="trends">Revenue Trends</TabsTrigger>
          <TabsTrigger value="services">Top Services</TabsTrigger>
          <TabsTrigger value="analysis">Detailed Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Performance Over Time</CardTitle>
              <CardDescription>
                Monthly revenue trends with order volume correlation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-80 flex items-center justify-center">
                  <div className="text-muted-foreground">{t('common.loading')}</div>
                </div>
              ) : revenueChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
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
                      tickFormatter={formatCompactCurrency}
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
                      fillOpacity={0.2}
                      strokeWidth={3}
                      name="Revenue"
                    />
                    <Line
                      yAxisId="orders"
                      type="monotone"
                      dataKey="orders"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--chart-2))", r: 4 }}
                      name="Orders"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No revenue data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Revenue Generators</CardTitle>
                <CardDescription>
                  Services ranked by total revenue contribution
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-72 flex items-center justify-center">
                    <div className="text-muted-foreground">{t('common.loading')}</div>
                  </div>
                ) : topServicesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={topServicesData} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis
                        type="number"
                        className="text-xs text-muted-foreground"
                        tick={{ fontSize: 12 }}
                        tickFormatter={formatCompactCurrency}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        className="text-xs text-muted-foreground"
                        tick={{ fontSize: 12 }}
                        width={120}
                      />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        contentStyle={{ border: '2px solid hsl(var(--border))' }}
                      />
                      <Bar
                        dataKey="revenue"
                        fill="hsl(var(--primary))"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <PieChart className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No service data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Distribution</CardTitle>
                <CardDescription>
                  Detailed breakdown of service contributions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex justify-between items-center p-4 border rounded-lg">
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
                        <div key={index} className="p-4 border rounded-lg hover:border-primary/50 transition-colors space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-semibold text-sm mb-1">{service.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {percentage.toFixed(1)}% of total revenue
                              </div>
                            </div>
                            <Badge variant="outline" className="ml-2 font-mono">
                              {formatCurrency(service.revenue)}
                            </Badge>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Award className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No service data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Average Order Value Analysis</CardTitle>
              <CardDescription>
                Track changes in transaction values over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-72 flex items-center justify-center">
                  <div className="text-muted-foreground">{t('common.loading')}</div>
                </div>
              ) : revenueChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
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
                      tickFormatter={formatCompactCurrency}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="avgOrderValue"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      dot={{ fill: "hsl(var(--primary))", r: 6 }}
                      name="Avg Order Value"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No analysis data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
