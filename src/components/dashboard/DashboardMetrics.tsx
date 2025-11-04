import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  Car,
  Shield
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useDashboardData } from '@/hooks/useDashboardData';
import { usePermissions } from '@/hooks/usePermissions';
import { useMemo } from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'destructive' | 'secondary';
  subtitle?: string;
  progress?: number;
}

const MetricCard = ({
  title,
  value,
  change,
  trend,
  icon,
  color = 'primary',
  subtitle,
  progress
}: MetricCardProps) => {
  const { t } = useTranslation();
  const getColorClasses = (color: string) => {
    const colors = {
      primary: 'text-primary',
      success: 'text-success',
      warning: 'text-warning',
      destructive: 'text-destructive',
      secondary: 'text-secondary'
    };
    return colors[color as keyof typeof colors] || colors.primary;
  };

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="w-3 h-3 text-success" />;
    if (trend === 'down') return <TrendingDown className="w-3 h-3 text-destructive" />;
    return null;
  };

  return (
    <Card className="hover:shadow-md transition-all duration-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={cn("w-8 h-8 rounded-full bg-muted flex items-center justify-center", getColorClasses(color))}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        )}
        
        {progress !== undefined && (
          <div className="mt-3">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">{progress}% {t('dashboard.metrics.of_target')}</p>
          </div>
        )}
        
        {change !== undefined && (
          <div className="flex items-center gap-1 mt-2">
            {getTrendIcon()}
            <span className={cn(
              "text-xs font-medium",
              trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground'
            )}>
              {change > 0 ? '+' : ''}{change}% {t('dashboard.metrics.from_last_month')}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export function DashboardMetrics() {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();

  // Calculate which order types the user has permission to view
  const allowedOrderTypes = useMemo(() => {
    const types: string[] = [];

    if (hasPermission('sales_orders', 'view')) types.push('sales');
    if (hasPermission('service_orders', 'view')) types.push('service');
    if (hasPermission('recon_orders', 'view')) types.push('recon');
    if (hasPermission('car_wash', 'view')) types.push('carwash');

    return types;
  }, [hasPermission]);

  // Pass allowed types to filter dashboard data by permissions
  const { data: dashboardData, isLoading } = useDashboardData(allowedOrderTypes);

  // Use real data from database (now filtered by permissions)
  const metrics = dashboardData?.overall || {
    totalOrders: 0,
    pendingOrders: 0,
    completedToday: 0,
    activeVehicles: 0
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-24"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Permission indicator badge - only show if user has limited access */}
      {allowedOrderTypes.length > 0 && allowedOrderTypes.length < 4 && (
        <div className="flex justify-end">
          <Badge variant="outline" className="text-xs">
            <Shield className="w-3 h-3 mr-1" />
            {t('dashboard.metrics.showing_modules', {
              count: allowedOrderTypes.length,
              total: 4
            })}
          </Badge>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          title={t('dashboard.metrics.total_orders')}
          value={metrics.totalOrders}
          icon={<Car className="w-4 h-4" />}
          color="primary"
          subtitle={t('dashboard.metrics.orders_this_month')}
        />

        <MetricCard
          title={t('dashboard.metrics.pending_orders')}
          value={metrics.pendingOrders}
          icon={<Clock className="w-4 h-4" />}
          color="warning"
          subtitle={t('dashboard.metrics.awaiting_processing')}
        />

        <MetricCard
          title={t('dashboard.metrics.completed_today')}
          value={metrics.completedToday}
          icon={<CheckCircle className="w-4 h-4" />}
          color="success"
          subtitle={t('dashboard.metrics.finished_today')}
        />
      </div>
    </div>
  );
}