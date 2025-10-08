import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  DollarSign,
  Car,
  Users,
  Timer,
  Target
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useDashboardData } from '@/hooks/useDashboardData';

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
  const { t, i18n } = useTranslation();
  const { data: dashboardData, isLoading } = useDashboardData();

  const formatCurrency = (amount: number) => {
    const currencyMap = {
      'en': 'USD',
      'es': 'USD', // Assuming US Spanish
      'pt-BR': 'BRL'
    };
    const currency = currencyMap[i18n.language as keyof typeof currencyMap] || 'USD';

    return new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  // Use real data from database (respects RLS policies automatically)
  const metrics = dashboardData?.overall || {
    totalOrders: 0,
    pendingOrders: 0,
    completedToday: 0,
    revenue: 0,
    activeVehicles: 0
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

      <MetricCard
        title={t('dashboard.metrics.revenue')}
        value={formatCurrency(metrics.revenue)}
        icon={<DollarSign className="w-4 h-4" />}
        color="success"
        subtitle={t('dashboard.metrics.total_revenue')}
      />
    </div>
  );
}