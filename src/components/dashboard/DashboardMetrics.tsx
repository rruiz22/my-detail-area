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

  // Mock data - in real app this would come from API/database
  const metrics = {
    totalOrders: 142,
    pendingOrders: 23,
    completedToday: 18,
    revenue: 15420.50,
    activeVehicles: 89,
    avgProcessingTime: '2.4h',
    customerSatisfaction: 95,
    teamEfficiency: 87
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <MetricCard
        title={t('dashboard.metrics.total_orders')}
        value={metrics.totalOrders}
        change={12}
        trend="up"
        icon={<Car className="w-4 h-4" />}
        color="primary"
        subtitle={t('dashboard.metrics.orders_this_month')}
      />
      
      <MetricCard
        title={t('dashboard.metrics.pending_orders')}
        value={metrics.pendingOrders}
        change={-5}
        trend="down"
        icon={<Clock className="w-4 h-4" />}
        color="warning"
        subtitle={t('dashboard.metrics.awaiting_processing')}
      />
      
      <MetricCard
        title={t('dashboard.metrics.completed_today')}
        value={metrics.completedToday}
        change={8}
        trend="up"
        icon={<CheckCircle className="w-4 h-4" />}
        color="success"
        subtitle={t('dashboard.metrics.finished_today')}
      />
      
      <MetricCard
        title={t('dashboard.metrics.revenue')}
        value={formatCurrency(metrics.revenue)}
        change={15}
        trend="up"
        icon={<DollarSign className="w-4 h-4" />}
        color="success"
        subtitle={t('dashboard.metrics.monthly_revenue')}
      />
      
      <MetricCard
        title={t('dashboard.metrics.active_vehicles')}
        value={metrics.activeVehicles}
        icon={<Car className="w-4 h-4" />}
        color="secondary"
        subtitle={t('dashboard.metrics.in_process')}
        progress={74}
      />
      
      <MetricCard
        title={t('dashboard.metrics.avg_processing')}
        value={metrics.avgProcessingTime}
        change={-12}
        trend="up" // Faster processing is good
        icon={<Timer className="w-4 h-4" />}
        color="primary"
        subtitle={t('dashboard.metrics.per_order')}
      />
      
      <MetricCard
        title={t('dashboard.metrics.satisfaction')}
        value={`${metrics.customerSatisfaction}%`}
        change={3}
        trend="up"
        icon={<Users className="w-4 h-4" />}
        color="success"
        subtitle={t('dashboard.metrics.customer_rating')}
        progress={metrics.customerSatisfaction}
      />
      
      <MetricCard
        title={t('dashboard.metrics.efficiency')}
        value={`${metrics.teamEfficiency}%`}
        change={7}
        trend="up"
        icon={<Target className="w-4 h-4" />}
        color="primary"
        subtitle={t('dashboard.metrics.team_performance')}
        progress={metrics.teamEfficiency}
      />
    </div>
  );
}