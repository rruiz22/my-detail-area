import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, Target, Calendar, Clock, DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useT2LAnalytics } from '@/hooks/useT2LAnalytics';

interface T2LTrendAnalysisProps {
  dealerId: number;
  dateRange?: {
    from: Date;
    to: Date;
  };
  expanded?: boolean;
}

export function T2LTrendAnalysis({ dealerId, dateRange, expanded = false }: T2LTrendAnalysisProps) {
  const { t } = useTranslation();
  
  const {
    currentStats,
    t2lTrends,
    holdingCostTrends,
    performanceMetrics,
    potentialSavings,
    statsLoading,
    trendsLoading
  } = useT2LAnalytics({ dealerId, dateRange });

  // Predictive analytics - simple trend projection
  const predictedMetrics = useMemo(() => {
    if (!t2lTrends || t2lTrends.length < 3) return null;

    const recent = t2lTrends.slice(-3);
    const avgChange = recent.reduce((acc, curr, idx) => {
      if (idx === 0) return acc;
      return acc + (curr.average_t2l - recent[idx - 1].average_t2l);
    }, 0) / (recent.length - 1);

    const currentT2L = recent[recent.length - 1]?.average_t2l || 0;
    const projectedT2L = Math.max(0, currentT2L + (avgChange * 4)); // 4 weeks ahead

    return {
      projectedT2L,
      trend: avgChange > 0 ? 'increasing' : avgChange < 0 ? 'decreasing' : 'stable',
      confidence: Math.min(90, Math.max(50, 90 - Math.abs(avgChange) * 10))
    };
  }, [t2lTrends]);

  if (statsLoading || trendsLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${expanded ? '' : 'max-h-[600px] overflow-y-auto'}`}>
      {/* Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t('reconHub.analytics.t2lTrends', 'T2L Performance Trends')}
          </CardTitle>
          <CardDescription>
            {t('reconHub.analytics.t2lDescription', 'Time-to-Liquidity analysis and performance metrics')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Current Performance */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  {t('reconHub.analytics.currentPerformance', 'Current Performance')}
                </span>
              </div>
              <div className="text-2xl font-bold">
                {performanceMetrics?.actualT2L?.toFixed(1) || '0'} 
                <span className="text-sm font-normal text-muted-foreground ml-1">days</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress 
                  value={Math.min((performanceMetrics?.targetT2L || 4) / Math.max(performanceMetrics?.actualT2L || 0.1, 0.1) * 100, 100)} 
                  className="h-2 flex-1"
                />
                <span className="text-xs text-muted-foreground">
                  Target: {performanceMetrics?.targetT2L || 4}d
                </span>
              </div>
              <div className="flex items-center gap-1">
                {(performanceMetrics?.actualT2L || 0) <= (performanceMetrics?.targetT2L || 4) ? (
                  <TrendingUp className="h-3 w-3 text-success" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-destructive" />
                )}
                <span className={`text-xs ${
                  (performanceMetrics?.actualT2L || 0) <= (performanceMetrics?.targetT2L || 4) 
                    ? 'text-success' 
                    : 'text-destructive'
                }`}>
                  {(performanceMetrics?.actualT2L || 0) <= (performanceMetrics?.targetT2L || 4)
                    ? t('reconHub.analytics.onTarget', 'On Target')
                    : t('reconHub.analytics.belowTarget', 'Below Target')
                  }
                </span>
              </div>
            </div>

            {/* On-Time Rate */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  {t('reconHub.analytics.onTimeRate', 'On-Time Rate')}
                </span>
              </div>
              <div className="text-2xl font-bold">
                {performanceMetrics?.onTimeRate?.toFixed(1) || '0'}%
              </div>
              <Progress 
                value={performanceMetrics?.onTimeRate || 0} 
                className="h-2"
              />
              <Badge variant={
                (performanceMetrics?.onTimeRate || 0) >= 80 ? 'default' :
                (performanceMetrics?.onTimeRate || 0) >= 60 ? 'secondary' : 
                'destructive'
              }>
                {(performanceMetrics?.onTimeRate || 0) >= 80 
                  ? t('reconHub.analytics.excellent', 'Excellent')
                  : (performanceMetrics?.onTimeRate || 0) >= 60 
                  ? t('reconHub.analytics.good', 'Good')
                  : t('reconHub.analytics.needsImprovement', 'Needs Improvement')
                }
              </Badge>
            </div>

            {/* Holding Costs */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  {t('reconHub.analytics.holdingCosts', 'Avg Holding Cost')}
                </span>
              </div>
              <div className="text-2xl font-bold">
                ${performanceMetrics?.dailyHoldingCost?.toFixed(0) || '0'}
              </div>
              <div className="text-xs text-muted-foreground">
                {t('reconHub.analytics.perVehicle', 'per vehicle')}
              </div>
              {potentialSavings && potentialSavings.monthly > 0 && (
                <div className="text-xs text-success">
                  {t('reconHub.analytics.potentialSavings', 'Potential savings: ${{amount}}/month', {
                    amount: potentialSavings.monthly.toFixed(0)
                  })}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* T2L Trends Chart */}
      {t2lTrends && t2lTrends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('reconHub.analytics.t2lTrendChart', 'T2L Trend Over Time')}</CardTitle>
            <CardDescription>
              {t('reconHub.analytics.weeklyTrends', 'Weekly average T2L performance and completed vehicles')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {expanded ? (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={t2lTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="week_start" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    formatter={(value, name) => [
                      name === 'average_t2l' ? `${Number(value).toFixed(1)} days` : value,
                      name === 'average_t2l' ? 'Avg T2L' : 'Completed'
                    ]}
                  />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="average_t2l" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="Average T2L"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="completed_vehicles" 
                    stroke="hsl(var(--success))" 
                    strokeWidth={2}
                    name="Completed Vehicles"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={t2lTrends.slice(-8)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="week_start" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    formatter={(value) => [`${Number(value).toFixed(1)} days`, 'Avg T2L']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="average_t2l" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Predictive Analytics */}
      {expanded && predictedMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t('reconHub.analytics.predictiveAnalysis', 'Predictive Analysis')}
            </CardTitle>
            <CardDescription>
              {t('reconHub.analytics.predictiveDescription', 'AI-powered forecasting based on historical trends')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <span className="text-sm font-medium">
                  {t('reconHub.analytics.projectedT2L', 'Projected T2L (4 weeks)')}
                </span>
                <div className="text-2xl font-bold">
                  {predictedMetrics.projectedT2L.toFixed(1)}
                  <span className="text-sm font-normal text-muted-foreground ml-1">days</span>
                </div>
                <div className="flex items-center gap-1">
                  {predictedMetrics.trend === 'increasing' ? (
                    <TrendingUp className="h-3 w-3 text-destructive" />
                  ) : predictedMetrics.trend === 'decreasing' ? (
                    <TrendingDown className="h-3 w-3 text-success" />
                  ) : (
                    <div className="h-3 w-3 bg-muted-foreground rounded-full" />
                  )}
                  <span className={`text-xs ${
                    predictedMetrics.trend === 'increasing' ? 'text-destructive' :
                    predictedMetrics.trend === 'decreasing' ? 'text-success' :
                    'text-muted-foreground'
                  }`}>
                    {t(`reconHub.analytics.trend.${predictedMetrics.trend}`, predictedMetrics.trend)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-sm font-medium">
                  {t('reconHub.analytics.confidence', 'Confidence Level')}
                </span>
                <div className="text-2xl font-bold">
                  {predictedMetrics.confidence.toFixed(0)}%
                </div>
                <Progress value={predictedMetrics.confidence} className="h-2" />
              </div>

              <div className="space-y-2">
                <span className="text-sm font-medium">
                  {t('reconHub.analytics.recommendation', 'Recommendation')}
                </span>
                <Badge variant={
                  predictedMetrics.trend === 'increasing' ? 'destructive' :
                  predictedMetrics.trend === 'decreasing' ? 'default' :
                  'secondary'
                }>
                  {predictedMetrics.trend === 'increasing' 
                    ? t('reconHub.analytics.optimizeWorkflow', 'Optimize Workflow')
                    : predictedMetrics.trend === 'decreasing'
                    ? t('reconHub.analytics.maintainPace', 'Maintain Current Pace')
                    : t('reconHub.analytics.monitorClosely', 'Monitor Closely')
                  }
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Holding Cost Analysis */}
      {expanded && holdingCostTrends && holdingCostTrends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('reconHub.analytics.holdingCostTrends', 'Holding Cost Analysis')}</CardTitle>
            <CardDescription>
              {t('reconHub.analytics.dailyHoldingCosts', 'Daily holding costs and vehicle inventory levels')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={holdingCostTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value, name) => [
                    name === 'daily_holding_cost' ? `$${Number(value).toFixed(0)}` : value,
                    name === 'daily_holding_cost' ? 'Holding Cost' : 'Vehicle Count'
                  ]}
                />
                <Legend />
                <Bar 
                  yAxisId="left"
                  dataKey="daily_holding_cost" 
                  fill="hsl(var(--destructive))" 
                  name="Daily Holding Cost"
                  opacity={0.7}
                />
                <Bar 
                  yAxisId="right"
                  dataKey="vehicle_count" 
                  fill="hsl(var(--primary))" 
                  name="Vehicle Count"
                  opacity={0.7}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}