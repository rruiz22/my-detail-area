import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TimeRange, useStepRevisitAnalytics } from '@/hooks/useGetReadyHistoricalAnalytics';
import { cn } from '@/lib/utils';
import { AlertTriangle, ArrowRight, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface StepPerformanceMatrixProps {
  timeRange?: TimeRange;
  onStepClick?: (stepId: string) => void;
  className?: string;
}

export function StepPerformanceMatrix({
  timeRange = '30d',
  onStepClick,
  className
}: StepPerformanceMatrixProps) {
  const { t } = useTranslation();
  const { data: stepAnalytics, isLoading, error } = useStepRevisitAnalytics(timeRange);

  // Get severity color based on revisit rate
  const getSeverityColor = (revisitRate: number) => {
    if (revisitRate >= 30) return 'bg-red-100 border-red-300 text-red-800';
    if (revisitRate >= 15) return 'bg-orange-100 border-orange-300 text-orange-800';
    if (revisitRate >= 5) return 'bg-yellow-100 border-yellow-300 text-yellow-800';
    return 'bg-emerald-100 border-emerald-300 text-emerald-800';
  };

  // Get time color based on average time
  const getTimeColor = (hours: number) => {
    const days = hours / 24;
    if (days >= 7) return 'text-red-600';
    if (days >= 3) return 'text-orange-600';
    if (days >= 1) return 'text-yellow-600';
    return 'text-emerald-600';
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{t('get_ready.analytics.stepPerformanceMatrix')}</CardTitle>
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
          <CardTitle>{t('get_ready.analytics.stepPerformanceMatrix')}</CardTitle>
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

  if (!stepAnalytics || stepAnalytics.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{t('get_ready.analytics.stepPerformanceMatrix')}</CardTitle>
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

  // Calculate summary stats
  const totalVehicles = stepAnalytics.reduce((sum, s) => sum + s.total_vehicles, 0);
  const avgRevisitRate = stepAnalytics.reduce((sum, s) => sum + (s.revisit_rate || 0), 0) / stepAnalytics.length;
  const totalBacktracks = stepAnalytics.reduce((sum, s) => sum + (s.backtrack_count || 0), 0);
  const stepsWithHighRevisits = stepAnalytics.filter(s => (s.revisit_rate || 0) >= 15).length;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              {t('get_ready.analytics.stepPerformanceMatrix')}
              {stepsWithHighRevisits > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {stepsWithHighRevisits} {t('get_ready.analytics.needsAttention')}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {t('get_ready.analytics.revisitRatesAndBacktracks')}
            </CardDescription>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 pt-4">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">{t('get_ready.analytics.avgRevisitRate')}</div>
            <div className="text-2xl font-bold">{avgRevisitRate.toFixed(1)}%</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">{t('get_ready.analytics.totalBacktracks')}</div>
            <div className="text-2xl font-bold text-amber-600">{totalBacktracks}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">{t('get_ready.analytics.vehiclesProcessed')}</div>
            <div className="text-2xl font-bold">{totalVehicles}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">{t('get_ready.analytics.stepsAnalyzed')}</div>
            <div className="text-2xl font-bold">{stepAnalytics.length}</div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {/* Header Row */}
          <div className="grid grid-cols-12 gap-3 text-xs font-medium text-muted-foreground pb-2 border-b">
            <div className="col-span-3">{t('get_ready.analytics.step')}</div>
            <div className="col-span-2 text-center">{t('get_ready.analytics.vehicles')}</div>
            <div className="col-span-2 text-center">{t('get_ready.analytics.revisitRate')}</div>
            <div className="col-span-2 text-center">{t('get_ready.analytics.avgTime')}</div>
            <div className="col-span-2 text-center">{t('get_ready.analytics.backtracks')}</div>
            <div className="col-span-1"></div>
          </div>

          {/* Step Rows */}
          {stepAnalytics.map((step) => {
            const revisitRate = step.revisit_rate || 0;
            const avgHours = step.avg_total_time || 0;
            const avgDays = avgHours / 24;
            const hasRevisits = step.max_revisits > 1;
            const hasBacktracks = (step.backtrack_count || 0) > 0;

            return (
              <div
                key={step.step_id}
                className={cn(
                  "grid grid-cols-12 gap-3 items-center p-3 rounded-lg border transition-all",
                  "hover:shadow-md hover:border-primary/50 cursor-pointer",
                  getSeverityColor(revisitRate)
                )}
                onClick={() => onStepClick?.(step.step_id)}
              >
                {/* Step Name */}
                <div className="col-span-3 font-medium truncate flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    {step.step_name}
                    {hasBacktracks && (
                      <div className="text-xs text-amber-700 mt-0.5 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {t('get_ready.analytics.backtrackDetected')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Vehicle Count */}
                <div className="col-span-2 text-center">
                  <div className="text-lg font-bold">{step.total_vehicles}</div>
                  <div className="text-xs text-muted-foreground">
                    {t('get_ready.analytics.vehicles').toLowerCase()}
                  </div>
                </div>

                {/* Revisit Rate */}
                <div className="col-span-2 text-center">
                  <div className="flex items-center justify-center gap-1">
                    {hasRevisits && <RotateCcw className="h-4 w-4" />}
                    <span className="text-lg font-bold">{revisitRate.toFixed(1)}%</span>
                  </div>
                  {step.max_revisits > 1 && (
                    <div className="text-xs text-muted-foreground">
                      {t('get_ready.analytics.maxRevisits')}: {step.max_revisits}
                    </div>
                  )}
                </div>

                {/* Average Time */}
                <div className="col-span-2 text-center">
                  <div className={cn("text-lg font-bold", getTimeColor(avgHours))}>
                    {avgDays < 1
                      ? `${avgHours.toFixed(1)}h`
                      : `${avgDays.toFixed(1)}d`
                    }
                  </div>
                  {step.avg_time_revisits > 0 && (
                    <div className="text-xs text-muted-foreground">
                      +{(step.avg_time_revisits / 24).toFixed(1)}d {t('get_ready.analytics.onRevisit')}
                    </div>
                  )}
                </div>

                {/* Backtracks */}
                <div className="col-span-2 text-center">
                  <div className="text-lg font-bold">
                    {step.backtrack_count || 0}
                  </div>
                  {hasBacktracks && (
                    <div className="text-xs text-amber-700">
                      {((step.backtrack_count / step.total_vehicles) * 100).toFixed(0)}% {t('get_ready.analytics.rate')}
                    </div>
                  )}
                </div>

                {/* Action */}
                <div className="col-span-1 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStepClick?.(step.step_id);
                    }}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            {t('get_ready.analytics.revisitRateSeverity')}:
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-emerald-100 border border-emerald-300" />
              <span className="text-xs">{'< 5% '}{t('get_ready.analytics.excellent')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-300" />
              <span className="text-xs">5-15% {t('get_ready.analytics.good')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-orange-100 border border-orange-300" />
              <span className="text-xs">15-30% {t('get_ready.analytics.needsImprovement')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-100 border border-red-300" />
              <span className="text-xs">{'>= 30% '}{t('get_ready.analytics.critical')}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
