import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TimeRange, useHistoricalKPIs } from '@/hooks/useGetReadyHistoricalAnalytics';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Area, AreaChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface TimeSeriesChartsProps {
  timeRange?: TimeRange;
  className?: string;
}

export function TimeSeriesCharts({ timeRange = '30d', className }: TimeSeriesChartsProps) {
  const { t } = useTranslation();
  const { data: historicalData, isLoading, error } = useHistoricalKPIs(timeRange);

  // Calculate trends for each metric
  const trends = useMemo(() => {
    if (!historicalData || historicalData.length < 2) {
      return { t2l: 0, throughput: 0, sla: 0 };
    }

    const first = historicalData[0];
    const last = historicalData[historicalData.length - 1];

    const calculateChange = (start: number, end: number) => {
      if (start === 0) return 0;
      return ((end - start) / start) * 100;
    };

    return {
      t2l: calculateChange(first.avg_t2l, last.avg_t2l),
      throughput: calculateChange(first.daily_throughput, last.daily_throughput),
      sla: calculateChange(first.sla_compliance, last.sla_compliance),
    };
  }, [historicalData]);

  // Format data for charts
  const chartData = useMemo(() => {
    if (!historicalData) return [];

    return historicalData.map(d => ({
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      fullDate: d.date,
      t2l: Math.round(d.avg_t2l * 10) / 10,
      throughput: d.daily_throughput,
      slaCompliance: Math.round(d.sla_compliance * 100),
      activeVehicles: d.active_vehicles,
      completed: d.vehicles_completed,
    }));
  }, [historicalData]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{t('get_ready.analytics.historicalTrends')}</CardTitle>
          <CardDescription>{t('get_ready.analytics.loading')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">
              {t('common.loading')}...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{t('get_ready.analytics.historicalTrends')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-destructive">
              {t('get_ready.analytics.errorLoadingData')}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{t('get_ready.analytics.historicalTrends')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-muted-foreground">
              {t('get_ready.analytics.noDataAvailable')}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const TrendBadge = ({ value, invertedLogic = false }: { value: number; invertedLogic?: boolean }) => {
    const isPositive = invertedLogic ? value < 0 : value > 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    const colorClass = isPositive ? 'text-emerald-600' : 'text-red-600';

    return (
      <div className={`flex items-center gap-1 text-sm font-medium ${colorClass}`}>
        <Icon className="h-4 w-4" />
        <span>{Math.abs(value).toFixed(1)}%</span>
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{t('get_ready.analytics.historicalTrends')}</CardTitle>
        <CardDescription>
          {t('get_ready.analytics.performanceMetricsOverTime')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="t2l" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="t2l" className="flex items-center gap-2">
              {t('get_ready.analytics.timeToLine')}
              <TrendBadge value={trends.t2l} invertedLogic />
            </TabsTrigger>
            <TabsTrigger value="throughput" className="flex items-center gap-2">
              {t('get_ready.analytics.throughput')}
              <TrendBadge value={trends.throughput} />
            </TabsTrigger>
            <TabsTrigger value="sla" className="flex items-center gap-2">
              {t('get_ready.analytics.slaCompliance')}
              <TrendBadge value={trends.sla} />
            </TabsTrigger>
          </TabsList>

          {/* Time to Line Chart */}
          <TabsContent value="t2l" className="space-y-4">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                    label={{
                      value: t('get_ready.analytics.days'),
                      angle: -90,
                      position: 'insideLeft',
                      style: { fontSize: 12 }
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                    labelStyle={{ fontWeight: 'bold' }}
                    formatter={(value: number) => [`${value.toFixed(1)} ${t('get_ready.analytics.days')}`, t('get_ready.analytics.avgT2L')]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="t2l"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', r: 3 }}
                    activeDot={{ r: 5 }}
                    name={t('get_ready.analytics.avgT2L')}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">{t('get_ready.analytics.currentAvg')}</div>
                <div className="text-2xl font-bold">
                  {chartData[chartData.length - 1]?.t2l.toFixed(1)} {t('get_ready.analytics.days')}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">{t('get_ready.analytics.trendVsPeriod')}</div>
                <div className="text-2xl font-bold flex items-center gap-2">
                  <TrendBadge value={trends.t2l} invertedLogic />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Throughput Chart */}
          <TabsContent value="throughput" className="space-y-4">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorThroughput" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                    label={{
                      value: t('get_ready.analytics.vehicles'),
                      angle: -90,
                      position: 'insideLeft',
                      style: { fontSize: 12 }
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                    labelStyle={{ fontWeight: 'bold' }}
                    formatter={(value: number, name: string) => {
                      const label = name === 'throughput'
                        ? t('get_ready.analytics.completed')
                        : t('get_ready.analytics.active');
                      return [`${value} ${t('get_ready.analytics.vehicles')}`, label];
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="throughput"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#colorThroughput)"
                    name={t('get_ready.analytics.completed')}
                  />
                  <Line
                    type="monotone"
                    dataKey="activeVehicles"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    dot={false}
                    name={t('get_ready.analytics.active')}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">{t('get_ready.analytics.totalCompleted')}</div>
                <div className="text-2xl font-bold">
                  {chartData.reduce((sum, d) => sum + (d.throughput || 0), 0)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">{t('get_ready.analytics.avgDaily')}</div>
                <div className="text-2xl font-bold">
                  {(chartData.reduce((sum, d) => sum + (d.throughput || 0), 0) / chartData.length).toFixed(1)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">{t('get_ready.analytics.trend')}</div>
                <div className="text-2xl font-bold flex items-center gap-2">
                  <TrendBadge value={trends.throughput} />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* SLA Compliance Chart */}
          <TabsContent value="sla" className="space-y-4">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                    label={{
                      value: '%',
                      angle: -90,
                      position: 'insideLeft',
                      style: { fontSize: 12 }
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                    labelStyle={{ fontWeight: 'bold' }}
                    formatter={(value: number) => [`${value}%`, t('get_ready.analytics.slaCompliance')]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="slaCompliance"
                    stroke="hsl(142.1 76.2% 36.3%)"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(142.1 76.2% 36.3%)', r: 3 }}
                    activeDot={{ r: 5 }}
                    name={t('get_ready.analytics.slaCompliance')}
                  />
                  <Line
                    y={80}
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">{t('get_ready.analytics.currentSLA')}</div>
                <div className="text-2xl font-bold">
                  {chartData[chartData.length - 1]?.slaCompliance}%
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">{t('get_ready.analytics.trendVsPeriod')}</div>
                <div className="text-2xl font-bold flex items-center gap-2">
                  <TrendBadge value={trends.sla} />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
