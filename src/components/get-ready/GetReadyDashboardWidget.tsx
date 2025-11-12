import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useGetReady } from '@/hooks/useGetReady';
import { cn } from '@/lib/utils';
import { AlertTriangle, Clock, Target, TrendingDown, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GetReadyAlerts } from './GetReadyAlerts';

interface GetReadyDashboardWidgetProps {
  className?: string;
}

export function GetReadyDashboardWidget({ className }: GetReadyDashboardWidgetProps) {
  const { t } = useTranslation();
  const { kpis, bottleneckAlerts, slaAlerts } = useGetReady();

  if (!kpis) {
    return (
      <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-muted rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const slaComplianceColor = kpis.slaCompliance >= 0.9 ? 'text-green-600' :
                            kpis.slaCompliance >= 0.75 ? 'text-yellow-600' : 'text-red-600';

  const t2lTrendColor = kpis.avgT2L <= kpis.targetT2L ? 'text-green-600' : 'text-red-600';
  const T2LTrendIcon = kpis.avgT2L <= kpis.targetT2L ? TrendingUp : TrendingDown;

  return (
    <div className={cn("space-y-6", className)}>
      {/* KPIs Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Average T2L */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('get_ready.kpis.avg_t2l')}
            </CardTitle>
            <T2LTrendIcon className={cn("h-4 w-4", t2lTrendColor)} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.avgT2L}d</div>
            <p className="text-xs text-muted-foreground">
              Target: {kpis.targetT2L}d
            </p>
            <div className="mt-2">
              <Progress
                value={Math.max(0, Math.min(100, (kpis.targetT2L / kpis.avgT2L) * 100))}
                className="h-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* SLA Compliance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('get_ready.kpis.sla_compliance')}
            </CardTitle>
            <Target className={cn("h-4 w-4", slaComplianceColor)} />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", slaComplianceColor)}>
              {Math.round(kpis.slaCompliance * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {kpis.slaCompliance >= 0.9 ? 'Excellent' :
               kpis.slaCompliance >= 0.75 ? 'Good' : 'Needs Improvement'}
            </p>
            <div className="mt-2">
              <Progress value={kpis.slaCompliance * 100} className="h-1" />
            </div>
          </CardContent>
        </Card>

        {/* Daily Throughput */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('get_ready.kpis.daily_throughput')}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.dailyThroughput}</div>
            <p className="text-xs text-muted-foreground">
              vehicles/day
            </p>
            <div className="mt-2">
              <Progress value={Math.min(100, (kpis.dailyThroughput / 5) * 100)} className="h-1" />
            </div>
          </CardContent>
        </Card>

        {/* Total Holding Cost */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('get_ready.kpis.total_holding_cost')}
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${kpis.totalHoldingCosts.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Avg: ${kpis.avgHoldingCost}/vehicle
            </p>
            <div className="flex items-center gap-1 mt-2">
              <Badge variant="outline" className="text-xs">
                {kpis.roiImprovement > 0 ? '+' : ''}{Math.round(kpis.roiImprovement * 100)}% vs baseline
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {(bottleneckAlerts.length > 0 || slaAlerts.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {t('get_ready.dashboard.title')} - Active Alerts
            </CardTitle>
            <CardDescription>
              Issues requiring immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GetReadyAlerts compact />
          </CardContent>
        </Card>
      )}

      {/* Performance Summary Card removed per user request */}
    </div>
  );
}






