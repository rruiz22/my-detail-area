import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Target, TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, AreaChart, Area } from 'recharts';
import useT2LAnalytics from '@/hooks/useT2LAnalytics';

interface T2LMetricsGridProps {
  dealerId: number;
  expanded?: boolean;
}

export function T2LMetricsGrid({ dealerId, expanded = false }: T2LMetricsGridProps) {
  const { t } = useTranslation();
  
  const {
    currentStats,
    t2lTrends,
    holdingCostTrends,
    performanceMetrics,
    potentialSavings,
    isLoading
  } = useT2LAnalytics({ dealerId });

  const getPerformanceColor = (value: number, target: number, isReverse = false) => {
    const ratio = isReverse ? target / value : value / target;
    if (ratio >= 0.9) return 'text-success';
    if (ratio >= 0.7) return 'text-warning';
    return 'text-destructive';
  };

  const getTrendIcon = (isImproving: boolean) => {
    return isImproving ? (
      <TrendingUp className="h-4 w-4 text-success" />
    ) : (
      <TrendingDown className="h-4 w-4 text-destructive" />
    );
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-muted rounded w-24"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16 mb-2"></div>
              <div className="h-3 bg-muted rounded w-32"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const basicMetrics = (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Current T2L Performance */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t('reconHub.t2l.currentT2L', 'Current T2L')}
          </CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getPerformanceColor(performanceMetrics.actualT2L, performanceMetrics.targetT2L, true)}`}>
            {performanceMetrics.actualT2L.toFixed(1)}
            <span className="text-sm font-normal text-muted-foreground ml-1">days</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Progress 
              value={Math.min((performanceMetrics.targetT2L / Math.max(performanceMetrics.actualT2L, 0.1)) * 100, 100)} 
              className="h-1 flex-1"
            />
            {getTrendIcon(performanceMetrics.isImproving)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Target: {performanceMetrics.targetT2L} days
          </p>
        </CardContent>
      </Card>

      {/* Performance Gap */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t('reconHub.t2l.performanceGap', 'Performance Gap')}
          </CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${performanceMetrics.performanceGap <= 0 ? 'text-success' : 'text-destructive'}`}>
            {performanceMetrics.performanceGap > 0 ? '+' : ''}
            {performanceMetrics.performanceGap.toFixed(1)}
            <span className="text-sm font-normal text-muted-foreground ml-1">days</span>
          </div>
          <Badge 
            variant={performanceMetrics.performanceGap <= 0 ? 'default' : 'destructive'}
            className="mt-2 text-xs"
          >
            {performanceMetrics.performanceGap <= 0 ? 
              t('reconHub.t2l.onTarget', 'On Target') : 
              t('reconHub.t2l.needsImprovement', 'Needs Improvement')
            }
          </Badge>
        </CardContent>
      </Card>

      {/* Completion Rate */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t('reconHub.t2l.completionRate', 'Completion Rate')}
          </CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getPerformanceColor(performanceMetrics.onTimeRate, 80)}`}>
            {performanceMetrics.onTimeRate.toFixed(1)}%
          </div>
          <Progress 
            value={performanceMetrics.onTimeRate} 
            className="h-2 mt-2"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {currentStats?.completed_vehicles || 0} of {currentStats?.total_vehicles || 0} completed
          </p>
        </CardContent>
      </Card>

      {/* Monthly Savings Potential */}
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {t('reconHub.t2l.potentialSavings', 'Potential Savings')}
          </CardTitle>
          <DollarSign className="h-4 w-4 text-success" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-success">
            ${potentialSavings.monthly.toLocaleString()}
            <span className="text-sm font-normal text-muted-foreground ml-1">/mo</span>
          </div>
          <p className="text-xs text-muted-foreground">
            ${potentialSavings.annual.toLocaleString()} annually
          </p>
          <Badge variant="outline" className="mt-2 text-xs">
            If T2L reduced to {performanceMetrics.targetT2L}d
          </Badge>
        </CardContent>
      </Card>
    </div>
  );

  if (!expanded) {
    return basicMetrics;
  }

  return (
    <div className="space-y-6">
      {basicMetrics}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* T2L Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {t('reconHub.t2l.trendChart', 'T2L Trend Analysis')}
            </CardTitle>
            <CardDescription>
              {t('reconHub.t2l.trendDescription', 'Weekly T2L performance vs target')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={t2lTrends}>
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString()} 
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    formatter={(value: number, name: string) => [
                      `${value.toFixed(1)} days`, 
                      name === 'average_t2l' ? 'Actual T2L' : 'Target T2L'
                    ]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="average_t2l" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="target_t2l" 
                    stroke="hsl(var(--muted-foreground))" 
                    strokeDasharray="5 5"
                    strokeWidth={1}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Holding Cost Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {t('reconHub.t2l.holdingCostTrend', 'Holding Cost Analysis')}
            </CardTitle>
            <CardDescription>
              {t('reconHub.t2l.holdingCostDescription', 'Daily holding costs and vehicle count')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={holdingCostTrends}>
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString()} 
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    formatter={(value: number, name: string) => [
                      name === 'totalCost' ? `$${value.toFixed(2)}` : `${value} vehicles`,
                      name === 'totalCost' ? 'Total Cost' : 'Vehicle Count'
                    ]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="totalCost" 
                    stackId="1"
                    stroke="hsl(var(--destructive))" 
                    fill="hsl(var(--destructive))"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>{t('reconHub.t2l.detailedStats', 'Detailed Statistics')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">
                {t('reconHub.t2l.performance', 'Performance')}
              </h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm">Best T2L:</span>
                  <span className="text-sm font-medium">
                    {currentStats?.best_t2l_hours ? (currentStats.best_t2l_hours / 24).toFixed(1) : 0} days
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Worst Active:</span>
                  <span className="text-sm font-medium">
                    {currentStats?.worst_active_t2l_hours ? (currentStats.worst_active_t2l_hours / 24).toFixed(1) : 0} days
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">
                {t('reconHub.t2l.volume', 'Volume')}
              </h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm">Total Vehicles:</span>
                  <span className="text-sm font-medium">{currentStats?.total_vehicles || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Completed:</span>
                  <span className="text-sm font-medium">{currentStats?.completed_vehicles || 0}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">
                {t('reconHub.t2l.costs', 'Costs')}
              </h4>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm">Avg Holding Cost:</span>
                  <span className="text-sm font-medium">
                    ${(currentStats?.average_holding_cost || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Daily Rate:</span>
                  <span className="text-sm font-medium">${performanceMetrics.dailyHoldingCost}/day</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}