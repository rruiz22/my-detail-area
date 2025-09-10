import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3, Calendar, TrendingUp, Award, Users, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart } from 'recharts';
import type { ReconOrderWithWorkflow } from '@/types/recon-hub';

interface PerformanceComparisonProps {
  dealerId: number;
  orders: ReconOrderWithWorkflow[];
  loading?: boolean;
}

interface PerformanceMetrics {
  period: string;
  avgT2L: number;
  completedVehicles: number;
  onTimeRate: number;
  avgHoldingCost: number;
  efficiency: number;
}

interface DepartmentMetrics {
  department: string;
  avgT2L: number;
  throughput: number;
  quality: number;
  cost: number;
  efficiency: number;
}

const INDUSTRY_BENCHMARKS = {
  avgT2L: 5.2, // days
  onTimeRate: 75, // percentage
  efficiency: 85 // percentage
};

export function PerformanceComparison({ dealerId, orders, loading = false }: PerformanceComparisonProps) {
  const { t } = useTranslation();
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('month');
  const [comparisonType, setComparisonType] = useState<'historical' | 'benchmark' | 'department'>('historical');

  // Historical performance data
  const historicalData = useMemo((): PerformanceMetrics[] => {
    if (!orders.length) return [];

    const now = new Date();
    const periods = [];

    // Generate periods based on selection
    for (let i = 5; i >= 0; i--) {
      let periodStart: Date;
      let periodEnd: Date;
      let periodLabel: string;

      if (selectedPeriod === 'week') {
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (i + 1) * 7);
        periodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7);
        periodLabel = `Week ${6 - i}`;
      } else if (selectedPeriod === 'month') {
        periodStart = new Date(now.getFullYear(), now.getMonth() - (i + 1), 1);
        periodEnd = new Date(now.getFullYear(), now.getMonth() - i, 0);
        periodLabel = periodStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      } else {
        periodStart = new Date(now.getFullYear(), now.getMonth() - (i + 1) * 3, 1);
        periodEnd = new Date(now.getFullYear(), now.getMonth() - i * 3, 0);
        periodLabel = `Q${Math.ceil((periodStart.getMonth() + 1) / 3)} ${periodStart.getFullYear()}`;
      }

      // Filter orders for this period
      const periodOrders = orders.filter(order => {
        const orderDate = new Date(order.t2lMetrics?.acquisition_date || new Date());
        return orderDate >= periodStart && orderDate <= periodEnd;
      });

      const completedOrders = periodOrders.filter(order => 
        order.t2lMetrics?.frontline_ready_date
      );

      const avgT2L = completedOrders.length > 0 
        ? completedOrders.reduce((sum, order) => {
            if (!order.t2lMetrics?.frontline_ready_date) return sum;
            const days = (new Date(order.t2lMetrics.frontline_ready_date).getTime() - 
                         new Date(order.t2lMetrics.acquisition_date).getTime()) / (1000 * 60 * 60 * 24);
            return sum + days;
          }, 0) / completedOrders.length
        : 0;

      const onTimeOrders = completedOrders.filter(order => {
        if (!order.t2lMetrics?.frontline_ready_date) return false;
        const days = (new Date(order.t2lMetrics.frontline_ready_date).getTime() - 
                     new Date(order.t2lMetrics.acquisition_date).getTime()) / (1000 * 60 * 60 * 24);
        return days <= 4; // Target is 4 days or less
      });

      const avgHoldingCost = completedOrders.length > 0
        ? completedOrders.reduce((sum, order) => {
            return sum + (order.t2lMetrics?.holding_cost_daily || 45) * avgT2L;
          }, 0) / completedOrders.length
        : 0;

      periods.push({
        period: periodLabel,
        avgT2L,
        completedVehicles: completedOrders.length,
        onTimeRate: completedOrders.length > 0 ? (onTimeOrders.length / completedOrders.length) * 100 : 0,
        avgHoldingCost,
        efficiency: completedOrders.length > 0 ? Math.min(100, (4 / Math.max(avgT2L, 0.1)) * 100) : 0
      });
    }

    return periods;
  }, [orders, selectedPeriod]);

  // Department comparison data (simulated)
  const departmentData = useMemo((): DepartmentMetrics[] => {
    return [
      {
        department: t('reconHub.departments.inspection', 'Inspection'),
        avgT2L: 0.8,
        throughput: 95,
        quality: 88,
        cost: 120,
        efficiency: 92
      },
      {
        department: t('reconHub.departments.bodyshop', 'Body Shop'),
        avgT2L: 2.1,
        throughput: 78,
        quality: 94,
        cost: 850,
        efficiency: 85
      },
      {
        department: t('reconHub.departments.mechanical', 'Mechanical'),
        avgT2L: 1.5,
        throughput: 88,
        quality: 91,
        cost: 650,
        efficiency: 89
      },
      {
        department: t('reconHub.departments.detailing', 'Detailing'),
        avgT2L: 0.6,
        throughput: 98,
        quality: 96,
        cost: 180,
        efficiency: 94
      }
    ];
  }, [t]);

  // Current vs benchmark comparison
  const benchmarkComparison = useMemo(() => {
    const currentPeriod = historicalData[historicalData.length - 1];
    if (!currentPeriod) return null;

    return {
      t2l: {
        current: currentPeriod.avgT2L,
        benchmark: INDUSTRY_BENCHMARKS.avgT2L,
        performance: currentPeriod.avgT2L <= INDUSTRY_BENCHMARKS.avgT2L ? 'above' : 'below'
      },
      onTime: {
        current: currentPeriod.onTimeRate,
        benchmark: INDUSTRY_BENCHMARKS.onTimeRate,
        performance: currentPeriod.onTimeRate >= INDUSTRY_BENCHMARKS.onTimeRate ? 'above' : 'below'
      },
      efficiency: {
        current: currentPeriod.efficiency,
        benchmark: INDUSTRY_BENCHMARKS.efficiency,
        performance: currentPeriod.efficiency >= INDUSTRY_BENCHMARKS.efficiency ? 'above' : 'below'
      }
    };
  }, [historicalData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <div className="h-6 w-48 bg-muted rounded mb-2"></div>
                <div className="h-4 w-64 bg-muted rounded"></div>
              </div>
              <div className="flex gap-2">
                <div className="h-10 w-32 bg-muted rounded"></div>
                <div className="h-10 w-32 bg-muted rounded"></div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80 bg-muted rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                {t('reconHub.comparison.title', 'Performance Comparison')}
              </CardTitle>
              <CardDescription>
                {t('reconHub.comparison.description', 'Compare performance across time periods, benchmarks, and departments')}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">{t('reconHub.comparison.weekly', 'Weekly')}</SelectItem>
                  <SelectItem value="month">{t('reconHub.comparison.monthly', 'Monthly')}</SelectItem>
                  <SelectItem value="quarter">{t('reconHub.comparison.quarterly', 'Quarterly')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={comparisonType} onValueChange={(value: any) => setComparisonType(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="historical">{t('reconHub.comparison.historical', 'Historical')}</SelectItem>
                  <SelectItem value="benchmark">{t('reconHub.comparison.benchmark', 'Benchmark')}</SelectItem>
                  <SelectItem value="department">{t('reconHub.comparison.department', 'Department')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={comparisonType} onValueChange={(value: any) => setComparisonType(value)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="historical" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {t('reconHub.comparison.historical', 'Historical')}
          </TabsTrigger>
          <TabsTrigger value="benchmark" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            {t('reconHub.comparison.benchmark', 'Benchmark')}
          </TabsTrigger>
          <TabsTrigger value="department" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t('reconHub.comparison.department', 'Department')}
          </TabsTrigger>
        </TabsList>

        {/* Historical Comparison */}
        <TabsContent value="historical" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('reconHub.comparison.historicalTrends', 'Historical Performance Trends')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={historicalData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="completedVehicles" fill="hsl(var(--primary))" name="Completed Vehicles" />
                  <Line yAxisId="right" type="monotone" dataKey="avgT2L" stroke="hsl(var(--destructive))" strokeWidth={2} name="Avg T2L (days)" />
                  <Line yAxisId="right" type="monotone" dataKey="onTimeRate" stroke="hsl(var(--success))" strokeWidth={2} name="On-Time Rate (%)" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Performance Summary */}
          {historicalData.length >= 2 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('reconHub.comparison.performanceSummary', 'Performance Summary')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    {
                      metric: 'avgT2L',
                      label: t('reconHub.comparison.avgT2L', 'Avg T2L'),
                      current: historicalData[historicalData.length - 1].avgT2L,
                      previous: historicalData[historicalData.length - 2].avgT2L,
                      format: (v: number) => `${v.toFixed(1)} days`,
                      inverse: true // Lower is better
                    },
                    {
                      metric: 'onTimeRate',
                      label: t('reconHub.comparison.onTimeRate', 'On-Time Rate'),
                      current: historicalData[historicalData.length - 1].onTimeRate,
                      previous: historicalData[historicalData.length - 2].onTimeRate,
                      format: (v: number) => `${v.toFixed(1)}%`,
                      inverse: false // Higher is better
                    },
                    {
                      metric: 'completedVehicles',
                      label: t('reconHub.comparison.throughput', 'Throughput'),
                      current: historicalData[historicalData.length - 1].completedVehicles,
                      previous: historicalData[historicalData.length - 2].completedVehicles,
                      format: (v: number) => `${v} vehicles`,
                      inverse: false // Higher is better
                    }
                  ].map((item) => {
                    const change = ((item.current - item.previous) / Math.max(item.previous, 0.1)) * 100;
                    const isImprovement = item.inverse ? change < 0 : change > 0;
                    
                    return (
                      <div key={item.metric} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{item.label}</span>
                          <Badge variant={isImprovement ? 'default' : 'secondary'}>
                            {isImprovement ? (
                              <TrendingUp className="h-3 w-3 mr-1" />
                            ) : (
                              <TrendingUp className="h-3 w-3 mr-1 rotate-180" />
                            )}
                            {Math.abs(change).toFixed(1)}%
                          </Badge>
                        </div>
                        <div className="text-2xl font-bold">{item.format(item.current)}</div>
                        <div className="text-xs text-muted-foreground">
                          {t('reconHub.comparison.previous', 'Previous: {{value}}', { 
                            value: item.format(item.previous) 
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Benchmark Comparison */}
        <TabsContent value="benchmark" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('reconHub.comparison.industryBenchmark', 'Industry Benchmark Comparison')}</CardTitle>
              <CardDescription>
                {t('reconHub.comparison.benchmarkDescription', 'Compare your performance against industry standards')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {benchmarkComparison && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    {
                      title: t('reconHub.comparison.avgT2L', 'Average T2L'),
                      current: benchmarkComparison.t2l.current,
                      benchmark: benchmarkComparison.t2l.benchmark,
                      performance: benchmarkComparison.t2l.performance,
                      format: (v: number) => `${v.toFixed(1)} days`,
                      icon: Clock
                    },
                    {
                      title: t('reconHub.comparison.onTimeRate', 'On-Time Rate'),
                      current: benchmarkComparison.onTime.current,
                      benchmark: benchmarkComparison.onTime.benchmark,
                      performance: benchmarkComparison.onTime.performance,
                      format: (v: number) => `${v.toFixed(1)}%`,
                      icon: TrendingUp
                    },
                    {
                      title: t('reconHub.comparison.efficiency', 'Efficiency'),
                      current: benchmarkComparison.efficiency.current,
                      benchmark: benchmarkComparison.efficiency.benchmark,
                      performance: benchmarkComparison.efficiency.performance,
                      format: (v: number) => `${v.toFixed(1)}%`,
                      icon: Award
                    }
                  ].map((metric) => {
                    const IconComponent = metric.icon;
                    const progressValue = (metric.current / metric.benchmark) * 100;
                    
                    return (
                      <Card key={metric.title}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <IconComponent className="h-4 w-4" />
                            {metric.title}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-2xl font-bold">
                                {metric.format(metric.current)}
                              </span>
                              <Badge variant={metric.performance === 'above' ? 'default' : 'destructive'}>
                                {metric.performance === 'above' 
                                  ? t('reconHub.comparison.aboveBenchmark', 'Above')
                                  : t('reconHub.comparison.belowBenchmark', 'Below')
                                }
                              </Badge>
                            </div>
                            <div>
                              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                <span>{t('reconHub.comparison.yourPerformance', 'Your Performance')}</span>
                                <span>{t('reconHub.comparison.industryBenchmark', 'Industry Benchmark')}</span>
                              </div>
                              <Progress value={Math.min(progressValue, 100)} className="h-2" />
                              <div className="text-center text-xs text-muted-foreground mt-1">
                                {t('reconHub.comparison.benchmarkValue', 'Benchmark: {{value}}', { 
                                  value: metric.format(metric.benchmark) 
                                })}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Department Comparison */}
        <TabsContent value="department" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('reconHub.comparison.departmentPerformance', 'Department Performance Comparison')}</CardTitle>
              <CardDescription>
                {t('reconHub.comparison.departmentDescription', 'Compare performance across different departments and workflow stages')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Radar Chart */}
                <div>
                  <h4 className="text-sm font-medium mb-4">
                    {t('reconHub.comparison.performanceRadar', 'Performance Radar')}
                  </h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={departmentData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="department" />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} />
                      <Radar
                        name="Efficiency"
                        dataKey="efficiency"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.3}
                      />
                      <Radar
                        name="Quality"
                        dataKey="quality"
                        stroke="hsl(var(--success))"
                        fill="hsl(var(--success))"
                        fillOpacity={0.3}
                      />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Bar Chart */}
                <div>
                  <h4 className="text-sm font-medium mb-4">
                    {t('reconHub.comparison.throughputComparison', 'Throughput Comparison')}
                  </h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={departmentData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="department" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="throughput" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Department Details */}
          <Card>
            <CardHeader>
              <CardTitle>{t('reconHub.comparison.departmentDetails', 'Department Details')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {departmentData.map((dept) => (
                  <div key={dept.department} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-semibold">{dept.department}</h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{dept.avgT2L} days avg</span>
                        <span>•</span>
                        <span>{dept.throughput}% throughput</span>
                        <span>•</span>
                        <span>${dept.cost} avg cost</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Quality</div>
                        <div className="font-semibold">{dept.quality}%</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Efficiency</div>
                        <div className="font-semibold">{dept.efficiency}%</div>
                      </div>
                      <Badge variant={
                        dept.efficiency >= 90 ? 'default' :
                        dept.efficiency >= 80 ? 'secondary' :
                        'destructive'
                      }>
                        {dept.efficiency >= 90 ? 'Excellent' :
                         dept.efficiency >= 80 ? 'Good' :
                         'Needs Work'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}