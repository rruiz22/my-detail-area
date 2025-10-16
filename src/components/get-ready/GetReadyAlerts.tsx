import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useGetReady } from '@/hooks/useGetReady';
import { cn } from '@/lib/utils';
import { AlertTriangle, Clock, TrendingDown, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BottleneckAlert, SLAAlert } from '@/types/getReady';

interface GetReadyAlertsProps {
  className?: string;
  compact?: boolean;
}

type AlertWithType =
  | (BottleneckAlert & { type: 'bottleneck' })
  | (SLAAlert & { type: 'sla' });

export function GetReadyAlerts({ className, compact = false }: GetReadyAlertsProps) {
  const { t } = useTranslation();
  const { bottleneckAlerts, slaAlerts } = useGetReady();

  const allAlerts: AlertWithType[] = [
    ...bottleneckAlerts.map(alert => ({ ...alert, type: 'bottleneck' as const })),
    ...slaAlerts.map(alert => ({ ...alert, type: 'sla' as const }))
  ];

  if (allAlerts.length === 0) {
    return compact ? null : (
      <div className={cn("p-4 text-center text-muted-foreground", className)}>
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm">{t('get_ready.alerts.no_alerts')}</span>
        </div>
      </div>
    );
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning':
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'medium':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <TrendingDown className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-red-200 bg-red-50';
      case 'warning':
      case 'high':
        return 'border-amber-200 bg-amber-50';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  if (compact) {
    return (
      <div className={cn("space-y-2", className)}>
        {allAlerts.slice(0, 3).map((alert, index) => (
          <Alert key={index} className={cn("p-3", getSeverityColor(alert.severity))}>
            <div className="flex items-center gap-2">
              {getSeverityIcon(alert.severity)}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">
                  {alert.type === 'bottleneck' ? (
                    <>
                      {t('get_ready.alerts.bottleneck')}: {alert.step_name}
                    </>
                  ) : (
                    <>
                      {t('get_ready.alerts.sla_warning')}: {alert.stock_number}
                    </>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {alert.type === 'bottleneck'
                    ? `${alert.vehicle_count} vehicles, ${alert.avg_wait_time}d avg wait`
                    : `${alert.hours_overdue}h overdue`
                  }
                </div>
              </div>
              <Badge variant="outline" className="text-xs">
                {alert.severity}
              </Badge>
            </div>
          </Alert>
        ))}

        {allAlerts.length > 3 && (
          <div className="text-center">
            <Button variant="ghost" size="sm" className="text-xs">
              +{allAlerts.length - 3} more alerts
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          {t('get_ready.alerts.active_alerts')}: {allAlerts.length}
        </h3>
        <Button variant="ghost" size="sm">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {allAlerts.map((alert, index) => (
          <Alert key={index} className={getSeverityColor(alert.severity)}>
            <div className="flex items-start gap-3">
              {getSeverityIcon(alert.severity)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-medium text-sm">
                    {alert.type === 'bottleneck' ? (
                      <>
                        {t('get_ready.alerts.bottleneck')}: {alert.step_name}
                      </>
                    ) : (
                      <>
                        SLA Alert: {alert.vehicle_info}
                      </>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {alert.severity}
                  </Badge>
                </div>

                <AlertDescription className="text-xs">
                  {alert.type === 'bottleneck' ? (
                    <div>
                      <div className="mb-1">
                        <strong>{alert.vehicle_count} vehicles</strong> with average wait time of{' '}
                        <strong>{alert.avg_wait_time} days</strong>
                      </div>
                      <div className="text-muted-foreground">
                        Recommended: {alert.recommended_action}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-1">
                        Vehicle <strong>{alert.stock_number}</strong> is{' '}
                        <strong>{alert.hours_overdue} hours overdue</strong>
                      </div>
                      <div className="text-muted-foreground">
                        Escalation level: {alert.escalation_level}
                      </div>
                    </div>
                  )}
                </AlertDescription>

                <div className="flex items-center gap-2 mt-2">
                  <Button size="sm" variant="outline" className="h-6 text-xs">
                    View Details
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 text-xs">
                    Dismiss
                  </Button>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(alert.created_at).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
          </Alert>
        ))}
      </div>
    </div>
  );
}






