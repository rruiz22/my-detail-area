import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TimeRange, useBottleneckDetection } from '@/hooks/useGetReadyHistoricalAnalytics';
import { cn } from '@/lib/utils';
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, RotateCcw, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BottleneckAnalysisProps {
  timeRange?: TimeRange;
  topN?: number;
  onStepClick?: (stepId: string) => void;
  onViewAffectedVehicles?: (stepId: string) => void;
  className?: string;
}

export function BottleneckAnalysis({
  timeRange = '30d',
  topN = 3,
  onStepClick,
  onViewAffectedVehicles,
  className
}: BottleneckAnalysisProps) {
  const { t } = useTranslation();
  const { data: bottlenecks, isLoading, error } = useBottleneckDetection(timeRange, topN);

  // Get severity badge variant
  const getSeverityVariant = (severity: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  // Get severity color classes
  const getSeverityColors = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          border: 'border-red-300',
          bg: 'bg-red-50',
          text: 'text-red-900',
          icon: 'text-red-600'
        };
      case 'high':
        return {
          border: 'border-orange-300',
          bg: 'bg-orange-50',
          text: 'text-orange-900',
          icon: 'text-orange-600'
        };
      case 'medium':
        return {
          border: 'border-yellow-300',
          bg: 'bg-yellow-50',
          text: 'text-yellow-900',
          icon: 'text-yellow-600'
        };
      default:
        return {
          border: 'border-gray-300',
          bg: 'bg-gray-50',
          text: 'text-gray-900',
          icon: 'text-gray-600'
        };
    }
  };

  // Get recommended actions based on bottleneck characteristics
  const getRecommendedActions = (bottleneck: any): string[] => {
    const actions: string[] = [];

    if (bottleneck.revisit_rate > 20) {
      actions.push(t('get_ready.analytics.recommendations.reviewQualityControl'));
    }

    if (bottleneck.avg_total_time / 24 > 3) {
      actions.push(t('get_ready.analytics.recommendations.increaseResources'));
    }

    if (bottleneck.backtrack_count > 5) {
      actions.push(t('get_ready.analytics.recommendations.improveWorkflow'));
    }

    if (bottleneck.total_vehicles > 10) {
      actions.push(t('get_ready.analytics.recommendations.considerParallel'));
    }

    if (actions.length === 0) {
      actions.push(t('get_ready.analytics.recommendations.monitorClosely'));
    }

    return actions;
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{t('get_ready.analytics.bottleneckDetection')}</CardTitle>
          <CardDescription>{t('get_ready.analytics.loading')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center">
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
          <CardTitle>{t('get_ready.analytics.bottleneckDetection')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center">
            <div className="text-destructive">
              {t('get_ready.analytics.errorLoadingData')}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!bottlenecks || bottlenecks.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            {t('get_ready.analytics.bottleneckDetection')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-emerald-200 bg-emerald-50">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <AlertTitle className="text-emerald-900">
              {t('get_ready.analytics.noBottlenecksDetected')}
            </AlertTitle>
            <AlertDescription className="text-emerald-800">
              {t('get_ready.analytics.workflowRunningSmoothly')}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const hasCriticalBottlenecks = bottlenecks.some((b: any) => b.severity === 'critical');

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className={cn(
                "h-5 w-5",
                hasCriticalBottlenecks ? "text-red-600" : "text-orange-600"
              )} />
              {t('get_ready.analytics.bottleneckDetection')}
              {hasCriticalBottlenecks && (
                <Badge variant="destructive">
                  {t('get_ready.analytics.actionRequired')}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {t('get_ready.analytics.topBottlenecksIdentified', { count: bottlenecks.length })}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {bottlenecks.map((bottleneck: any, index: number) => {
          const colors = getSeverityColors(bottleneck.severity);
          const actions = getRecommendedActions(bottleneck);
          const avgDays = (bottleneck.avg_total_time / 24).toFixed(1);

          return (
            <div
              key={bottleneck.step_id}
              className={cn(
                "relative p-4 rounded-lg border-2 transition-all",
                colors.border,
                colors.bg,
                "hover:shadow-lg cursor-pointer"
              )}
              onClick={() => onStepClick?.(bottleneck.step_id)}
            >
              {/* Rank Badge */}
              <div className="absolute -top-3 -left-3">
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center font-bold border-2",
                  colors.border,
                  colors.bg,
                  colors.text
                )}>
                  #{index + 1}
                </div>
              </div>

              {/* Header */}
              <div className="flex items-start justify-between mb-3 pl-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={cn("text-lg font-bold", colors.text)}>
                      {bottleneck.step_name}
                    </h3>
                    <Badge variant={getSeverityVariant(bottleneck.severity)}>
                      {t(`get_ready.analytics.severity.${bottleneck.severity}`)}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t('get_ready.analytics.bottleneckScore')}: {bottleneck.bottleneck_score}/100
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {t('get_ready.analytics.vehicles')}
                  </div>
                  <div className="text-xl font-bold">{bottleneck.current_vehicle_count || 0}</div>
                  <div className="text-xs text-muted-foreground">
                    {bottleneck.total_vehicles} processed (30d)
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <RotateCcw className="h-3 w-3" />
                    {t('get_ready.analytics.revisitRate')}
                  </div>
                  <div className="text-xl font-bold text-orange-600">
                    {(bottleneck.revisit_rate || 0).toFixed(1)}%
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {t('get_ready.analytics.avgTime')}
                  </div>
                  <div className="text-xl font-bold text-blue-600">
                    {avgDays}d
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    SLA Risk
                  </div>
                  <div className="text-xl font-bold text-red-600">
                    {bottleneck.vehicles_over_sla || 0}
                  </div>
                </div>
              </div>

              {/* Recommended Actions */}
              <div className="space-y-2 mb-3">
                <div className="text-sm font-medium text-muted-foreground">
                  {t('get_ready.analytics.recommendedActions')}:
                </div>
                <ul className="space-y-1">
                  {actions.map((action, i) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className={cn("mt-0.5", colors.icon)}>•</span>
                      <span className={colors.text}>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewAffectedVehicles?.(bottleneck.step_id);
                  }}
                >
                  {t('get_ready.analytics.viewAffectedVehicles')}
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStepClick?.(bottleneck.step_id);
                  }}
                >
                  {t('get_ready.analytics.viewDetails')}
                </Button>
              </div>
            </div>
          );
        })}

        {/* Overall Summary */}
        {bottlenecks.length > 0 && (
          <Alert className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t('get_ready.analytics.summaryTitle')}</AlertTitle>
            <AlertDescription>
              {hasCriticalBottlenecks
                ? t('get_ready.analytics.criticalBottlenecksFound')
                : t('get_ready.analytics.bottlenecksNeedAttention')
              }
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
