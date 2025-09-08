import { useTranslation } from 'react-i18next';
import { Clock, User, Edit, AlertCircle, CheckCircle, ArrowRight, DollarSign, Calendar, UserCheck, FileText, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrderActivity } from '@/hooks/useOrderActivity';
import { formatDistanceToNow } from 'date-fns';
import { es, enUS, ptBR } from 'date-fns/locale';

interface RecentActivityProps {
  orderId: string;
}

export function RecentActivity({ orderId }: RecentActivityProps) {
  const { t, i18n } = useTranslation();
  const { activities, loading, error } = useOrderActivity(orderId);

  const getDateLocale = () => {
    switch (i18n.language) {
      case 'es': return es;
      case 'pt-BR': return ptBR;
      default: return enUS;
    }
  };

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'order_created':
        return <Package className="w-4 h-4 text-green-500" />;
      case 'status_changed':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'priority_changed':
        return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'assignment_changed':
        return <UserCheck className="w-4 h-4 text-purple-500" />;
      case 'due_date_changed':
        return <Calendar className="w-4 h-4 text-indigo-500" />;
      case 'customer_updated':
        return <User className="w-4 h-4 text-cyan-500" />;
      case 'services_updated':
        return <Package className="w-4 h-4 text-pink-500" />;
      case 'amount_updated':
        return <DollarSign className="w-4 h-4 text-emerald-500" />;
      case 'notes_updated':
        return <FileText className="w-4 h-4 text-slate-500" />;
      default:
        return <Edit className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getActivityColor = (activityType: string) => {
    switch (activityType) {
      case 'order_created':
        return 'border-l-green-500';
      case 'status_changed':
        return 'border-l-blue-500';
      case 'priority_changed':
        return 'border-l-orange-500';
      case 'assignment_changed':
        return 'border-l-purple-500';
      case 'due_date_changed':
        return 'border-l-indigo-500';
      case 'customer_updated':
        return 'border-l-cyan-500';
      case 'services_updated':
        return 'border-l-pink-500';
      case 'amount_updated':
        return 'border-l-emerald-500';
      case 'notes_updated':
        return 'border-l-slate-500';
      default:
        return 'border-l-muted-foreground';
    }
  };

  const formatUserName = (activity: any) => {
    if (!activity.profiles) {
      return t('activity.system');
    }
    
    const { first_name, last_name, email } = activity.profiles;
    if (first_name || last_name) {
      return `${first_name || ''} ${last_name || ''}`.trim();
    }
    return email.split('@')[0];
  };

  const renderActivityDetails = (activity: any) => {
    if (activity.old_value && activity.new_value && activity.field_name !== 'notes') {
      return (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
          <span className="bg-red-50 text-red-700 px-2 py-1 rounded border">
            {activity.old_value}
          </span>
          <ArrowRight className="w-3 h-3" />
          <span className="bg-green-50 text-green-700 px-2 py-1 rounded border">
            {activity.new_value}
          </span>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {t('activity.recent_activity')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-2 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {t('activity.recent_activity')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm">{t('activity.error_loading')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="w-4 h-4" />
          {t('activity.recent_activity')}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px] px-6">
          {activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">{t('activity.no_activity')}</p>
            </div>
          ) : (
            <div className="space-y-0">
              {activities.map((activity, index) => (
                <div key={activity.id}>
                  <div className={`flex gap-3 py-3 border-l-2 pl-4 ${getActivityColor(activity.activity_type)}`}>
                    <div className="flex-shrink-0 mt-0.5">
                      {getActivityIcon(activity.activity_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {activity.description || t(`activity.${activity.activity_type}`)}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {formatUserName(activity)}
                            </span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(activity.created_at), {
                                addSuffix: true,
                                locale: getDateLocale()
                              })}
                            </span>
                          </div>
                          {renderActivityDetails(activity)}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {t(`activity.types.${activity.activity_type}`)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {index < activities.length - 1 && (
                    <Separator className="ml-10" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}