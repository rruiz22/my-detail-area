import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useApprovalMetrics } from '@/hooks/useApprovalAnalytics';
import { cn } from '@/lib/utils';
import { CheckCircle, Clock, DollarSign, Percent, TrendingDown, TrendingUp, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface MetricCardProps {
  title: string;
  value: string | number;
  trend?: number;
  icon: React.ElementType;
  iconColor: string;
  tooltip?: string;
  valueColor?: string;
}

function MetricCard({ title, value, trend, icon: Icon, iconColor, tooltip, valueColor }: MetricCardProps) {
  const showTrend = trend !== undefined && trend !== 0;
  const trendPositive = trend ? trend > 0 : false;
  const TrendIcon = trendPositive ? TrendingUp : TrendingDown;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
          <span className="truncate">{title}</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn("p-1.5 rounded-md", iconColor)}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
              </TooltipTrigger>
              {tooltip && (
                <TooltipContent>
                  <p className="text-xs">{tooltip}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="flex items-baseline justify-between gap-2">
          <div className={cn("text-xl font-bold truncate", valueColor)}>
            {value}
          </div>
          {showTrend && (
            <div className={cn(
              "flex items-center gap-0.5 text-xs font-medium whitespace-nowrap",
              trendPositive ? "text-green-600" : "text-red-600"
            )}>
              <TrendIcon className="h-3 w-3" />
              <span>{Math.abs(trend!).toFixed(0)}%</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MetricCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2 pt-3">
        <Skeleton className="h-3 w-24" />
      </CardHeader>
      <CardContent className="pb-3">
        <Skeleton className="h-6 w-16" />
      </CardContent>
    </Card>
  );
}

export function ApprovalMetricsDashboard() {
  const { t } = useTranslation();
  const { data: metrics, isLoading } = useApprovalMetrics();

  if (isLoading) {
    return (
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      notation: 'compact',
      compactDisplay: 'short'
    }).format(value);
  };

  const formatHours = (hours: number) => {
    if (hours < 24) {
      return `${Math.round(hours)}h`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  };

  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
      {/* Pending Approvals */}
      <MetricCard
        title={t('get_ready.approvals.metrics.pending') || 'Pending Approvals'}
        value={metrics.pending.count}
        icon={Clock}
        iconColor="bg-yellow-50 dark:bg-yellow-950/30 text-yellow-600"
        valueColor="text-yellow-600"
        tooltip="Vehicles currently awaiting approval"
      />

      {/* Approved (90 days) */}
      <MetricCard
        title={t('get_ready.approvals.metrics.approved') || 'Approved (90d)'}
        value={metrics.approved.count}
        trend={metrics.approved.trend}
        icon={CheckCircle}
        iconColor="bg-green-50 dark:bg-green-950/30 text-green-600"
        valueColor="text-green-600"
        tooltip="Vehicles approved in the last 90 days"
      />

      {/* Rejected (90 days) */}
      <MetricCard
        title={t('get_ready.approvals.metrics.rejected') || 'Rejected (90d)'}
        value={metrics.rejected.count}
        trend={metrics.rejected.trend}
        icon={XCircle}
        iconColor="bg-red-50 dark:bg-red-950/30 text-red-600"
        valueColor="text-red-600"
        tooltip="Vehicles rejected in the last 90 days"
      />

      {/* Average Approval Time */}
      <MetricCard
        title={t('get_ready.approvals.metrics.avg_time') || 'Avg Approval Time'}
        value={formatHours(metrics.avgTime.hours)}
        trend={metrics.avgTime.trend}
        icon={Clock}
        iconColor="bg-blue-50 dark:bg-blue-950/30 text-blue-600"
        tooltip="Average time from intake to approval decision"
      />

      {/* Total Cost Approved */}
      <MetricCard
        title={t('get_ready.approvals.metrics.cost_approved') || 'Total Cost Approved'}
        value={formatCurrency(metrics.totalCost.amount)}
        trend={metrics.totalCost.trend}
        icon={DollarSign}
        iconColor="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600"
        tooltip="Total estimated cost of approved work items"
      />

      {/* Approval Rate */}
      <MetricCard
        title={t('get_ready.approvals.metrics.approval_rate') || 'Approval Rate'}
        value={`${metrics.approvalRate.percentage.toFixed(1)}%`}
        icon={Percent}
        iconColor="bg-purple-50 dark:bg-purple-950/30 text-purple-600"
        valueColor="text-purple-600"
        tooltip="Percentage of approvals vs total decisions"
      />
    </div>
  );
}
