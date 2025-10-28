import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  Car,
  Eye,
  Filter,
  RefreshCw,
  Loader2,
  ArrowRight,
  Building2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow, format } from 'date-fns';
import { es, ptBR } from 'date-fns/locale';
import { useRecentActivity } from '@/hooks/useRecentActivity';

export function RecentActivity() {
  const { t, i18n } = useTranslation();
  const [filter, setFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const { data: activities = [], isLoading, refetch } = useRecentActivity(20);

  // Get locale for date-fns
  const getLocale = () => {
    switch (i18n.language) {
      case 'es': return es;
      case 'pt-BR': return ptBR;
      default: return undefined;
    }
  };

  // Map activity type to department
  const getDepartmentFromOrderType = (orderType?: string) => {
    if (!orderType) return 'Sales';
    const typeMap: Record<string, string> = {
      'sales': 'Sales',
      'service': 'Service',
      'recon': 'Recon',
      'car_wash': 'Car Wash',
      'carwash': 'Car Wash'  // ✅ FIX: DB stores as 'carwash' not 'car_wash'
    };
    return typeMap[orderType] || 'Sales';
  };

  // Format activity description with old/new values
  const formatActivityDescription = (activity: typeof activities[0]) => {
    const { activity_type, old_value, new_value, field_name } = activity;

    // Get base translation key
    const translationKey = `dashboard.activity.${activity_type}`;
    const baseText = t(translationKey, { defaultValue: activity.description || 'Activity' });

    // Determine if we should show value changes
    const shouldShowValues = old_value && new_value && activity_type !== 'order_created';

    return {
      text: baseText,
      showValues: shouldShowValues,
      oldValue: old_value,
      newValue: new_value,
      fieldName: field_name
    };
  };

  // Translate and format values (status, dates, etc)
  const translateValue = (value: string | null, fieldName: string | null): string => {
    if (!value) return 'N/A';

    // If it's a status field, try to translate the status
    if (fieldName === 'status') {
      const statusKey = `orders.status.${value}`;
      const translated = t(statusKey);

      // If translation not found (returns key), format the value nicely
      if (translated === statusKey) {
        // Convert snake_case to Title Case (in_progress → In Progress)
        return value
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      }

      return translated;
    }

    // If it's a date/timestamp field, format it nicely
    if (fieldName === 'due_date' || value.includes('T') || value.includes('+')) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          // Format as: Oct 7, 2:00 PM
          return format(date, 'MMM d, h:mm a', { locale: getLocale() });
        }
      } catch (e) {
        // If parsing fails, continue to return raw value
      }
    }

    // For other fields, return as is
    return value;
  };

  // Filter activities by department
  const filteredActivities = filter === 'all'
    ? activities
    : activities.filter(activity => {
        const dept = getDepartmentFromOrderType(activity.order_type);
        return dept === filter;
      });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'order_created':
        return <Car className="w-4 h-4 text-emerald-600" />;
      case 'status_changed':
        return <RefreshCw className="w-4 h-4 text-amber-600" />;
      case 'priority_changed':
        return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case 'assignment_changed':
        return <User className="w-4 h-4 text-indigo-600" />;
      case 'due_date_changed':
      case 'customer_updated':
      case 'services_updated':
      case 'amount_updated':
      case 'notes_updated':
        return <RefreshCw className="w-4 h-4 text-gray-600" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getDepartmentColor = (department: string) => {
    switch (department) {
      case 'Sales': return 'bg-blue-100 text-blue-700';
      case 'Service': return 'bg-green-100 text-green-700';
      case 'Recon': return 'bg-orange-100 text-orange-700';
      case 'Car Wash': return 'bg-cyan-100 text-cyan-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg">{t('dashboard.activity.recent_activity')}</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant={showFilters ? "default" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{t('dashboard.activity.filter')}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                console.log('[RecentActivity] Refresh button clicked');
                setIsRefreshing(true);
                await refetch();
                // Keep animation visible for at least 500ms
                setTimeout(() => setIsRefreshing(false), 500);
              }}
              disabled={isLoading || isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Filter Badges - Collapsible */}
        {showFilters && (
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge
              variant={filter === 'all' ? 'default' : 'secondary'}
              className="cursor-pointer"
              onClick={() => setFilter('all')}
            >
              {t('dashboard.activity.all')}
            </Badge>
            <Badge
              variant={filter === 'Sales' ? 'default' : 'secondary'}
              className="cursor-pointer"
              onClick={() => setFilter('Sales')}
            >
              {t('dashboard.departments.sales')}
            </Badge>
            <Badge
              variant={filter === 'Service' ? 'default' : 'secondary'}
              className="cursor-pointer"
              onClick={() => setFilter('Service')}
            >
              {t('dashboard.departments.service')}
            </Badge>
            <Badge
              variant={filter === 'Recon' ? 'default' : 'secondary'}
              className="cursor-pointer"
              onClick={() => setFilter('Recon')}
            >
              {t('dashboard.departments.recon')}
            </Badge>
            <Badge
              variant={filter === 'Car Wash' ? 'default' : 'secondary'}
              className="cursor-pointer"
              onClick={() => setFilter('Car Wash')}
            >
              {t('dashboard.departments.car_wash')}
            </Badge>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[500px] px-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <Clock className="w-12 h-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                {t('dashboard.activity.no_recent_activity')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredActivities.map((activity, index) => {
                const department = getDepartmentFromOrderType(activity.order_type);
                const formattedActivity = formatActivityDescription(activity);

                return (
                  <div key={activity.id}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-1">
                        {getActivityIcon(activity.activity_type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col gap-2">
                          {/* Title and metadata */}
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-sm flex-1">
                              {formattedActivity.text}
                            </p>
                            <p className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                              {formatDistanceToNow(new Date(activity.created_at), {
                                addSuffix: true,
                                locale: getLocale()
                              })}
                            </p>
                          </div>

                          {/* Show old value → new value if available */}
                          {formattedActivity.showValues && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                                {translateValue(formattedActivity.oldValue, formattedActivity.fieldName)}
                              </Badge>
                              <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                                {translateValue(formattedActivity.newValue, formattedActivity.fieldName)}
                              </Badge>
                            </div>
                          )}

                          {/* Customer/Stock/TAG and user info */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            {/* Show customer_name only for sales/service orders */}
                            {activity.customer_name && activity.order_type !== 'recon' && activity.order_type !== 'car_wash' && (
                              <p className="text-sm text-muted-foreground">
                                {t('dashboard.activity.customer')}: {activity.customer_name}
                              </p>
                            )}
                            {/* Show stock_number for recon orders */}
                            {activity.order_type === 'recon' && activity.stock_number && (
                              <p className="text-sm text-muted-foreground">
                                {t('dashboard.activity.stock')}: {activity.stock_number}
                              </p>
                            )}
                            {/* Show TAG for car wash orders */}
                            {activity.order_type === 'car_wash' && activity.tag && (
                              <p className="text-sm text-muted-foreground">
                                TAG: {activity.tag}
                              </p>
                            )}
                            {activity.user_name && (
                              <p className="text-xs text-muted-foreground">{activity.user_name}</p>
                            )}
                          </div>

                          {/* Badges */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Dealership Badge */}
                            {activity.dealer_name && (
                              <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700 border-indigo-200">
                                <Building2 className="w-3 h-3 mr-1" />
                                {activity.dealer_name}
                              </Badge>
                            )}

                            {/* Department Badge */}
                            <Badge className={getDepartmentColor(department)} variant="secondary">
                              {t(`dashboard.departments.${department.toLowerCase().replace(' ', '_')}`)}
                            </Badge>

                            {/* Order Number Badge */}
                            {activity.order_number && (
                              <Badge variant="outline" className="text-xs">
                                {activity.order_number}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {index < filteredActivities.length - 1 && (
                      <Separator className="mt-4" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}