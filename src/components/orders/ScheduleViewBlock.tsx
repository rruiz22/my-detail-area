import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  Clock, 
  TrendingUp, 
  CheckCircle, 
  AlertTriangle,
  Timer,
  Target
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { safeFormatDate, calculateDaysFromNow } from '@/utils/dateUtils';

interface ScheduleViewBlockProps {
  order: any;
}

export function ScheduleViewBlock({ order }: ScheduleViewBlockProps) {
  const { t } = useTranslation();

  const getDueDateStatus = () => {
    if (!order.due_date) return null;
    
    const daysLeft = calculateDaysFromNow(order.due_date);
    if (daysLeft === null) return null;
    
    if (daysLeft < 0) {
      return {
        status: 'overdue',
text: t('schedule_view.days_overdue', { days: Math.abs(daysLeft) }),
        color: 'text-destructive',
        bgColor: 'bg-destructive/10',
        icon: AlertTriangle
      };
    } else if (daysLeft === 0) {
      return {
        status: 'today',
        text: t('data_table.due_today'),
        color: 'text-warning',
        bgColor: 'bg-warning/10', 
        icon: Timer
      };
    } else if (daysLeft === 1) {
      return {
        status: 'tomorrow',
text: t('schedule_view.due_tomorrow'),
        color: 'text-warning',
        bgColor: 'bg-warning/10',
        icon: Clock
      };
    } else {
      return {
        status: 'future',
text: t('schedule_view.due_in_days', { days: daysLeft }),
        color: 'text-muted-foreground',
        bgColor: 'bg-muted/10',
        icon: Calendar
      };
    }
  };

  const getOrderProgress = () => {
    const statusProgress = {
      pending: 25,
      in_progress: 60,
      completed: 100,
      cancelled: 0
    };
    return statusProgress[order.status as keyof typeof statusProgress] || 0;
  };

  const getOrderAge = () => {
    if (!order.created_at) return 'N/A';
    const createdDate = new Date(order.created_at);
    const now = new Date();
    const diffTime = now.getTime() - createdDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday'; 
    return `${diffDays} days ago`;
  };

  const dueDateStatus = getDueDateStatus();
  const progress = getOrderProgress();
  const orderAge = getOrderAge();

  const scheduleItems = [
    {
      icon: Calendar,
      label: t('orders.created'),
      value: safeFormatDate(order.created_at),
      subtitle: orderAge
    },
    {
      icon: Target,
      label: t('orders.due_date'),
value: order.due_date ? safeFormatDate(order.due_date) : t('schedule_view.not_set'),
subtitle: dueDateStatus?.text || t('schedule_view.no_due_date')
    },
    {
      icon: Clock,
label: t('orders.updated'),
      value: safeFormatDate(order.updated_at),
subtitle: t('schedule_view.most_recent_change')
    }
  ];

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calendar className="h-5 w-5 text-primary" />
          {t('schedule_view.schedule_timeline')}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Due Date Status Banner */}
        {dueDateStatus && (
          <div className={`p-3 rounded-lg ${dueDateStatus.bgColor} border border-border/50`}>
            <div className="flex items-center gap-2">
              <dueDateStatus.icon className={`h-4 w-4 ${dueDateStatus.color}`} />
              <span className={`text-sm font-medium ${dueDateStatus.color}`}>
                {dueDateStatus.text}
              </span>
            </div>
          </div>
        )}

        {/* Order Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
<span className="text-sm font-medium">{t('schedule_view.order_progress')}</span>
            <span className="text-sm text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex items-center gap-2">
            {progress === 100 ? (
              <CheckCircle className="h-4 w-4 text-success" />
            ) : (
              <TrendingUp className="h-4 w-4 text-primary" />
            )}
            <span className="text-xs text-muted-foreground">
  {order.status === 'completed' ? t('schedule_view.order_completed') : t('schedule_view.in_progress')}
            </span>
          </div>
        </div>

        {/* Schedule Timeline */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
{t('schedule_view.timeline')}
          </h4>
          
          <div className="space-y-3">
            {scheduleItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={index} className="flex items-start gap-3 p-2 rounded-lg bg-muted/20">
                  <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        {item.label}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {item.subtitle}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium mt-1">
                      {item.value}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SLA Compliance */}
        {order.sla_hours && (
          <div className="pt-3 border-t space-y-2">
            <div className="flex items-center justify-between">
<span className="text-sm font-medium">{t('schedule_view.sla_compliance')}</span>
              <Badge variant={progress >= 80 ? 'default' : 'destructive'}>
{progress >= 80 ? t('schedule_view.on_track') : t('schedule_view.at_risk')}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
{t('schedule_view.target_completion', { hours: order.sla_hours })}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}