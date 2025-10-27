import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Calendar,
  AlertTriangle,
  UserX,
  Loader2,
  MessageSquare,
  Car,
  CheckCircle,
  TrendingUp
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMemo, memo } from 'react';

interface OrderService {
  id: string;
  name: string;
  price?: number;
  description?: string;
}

interface Order {
  id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  dueDate?: string;
  createdAt: string;
  assignedTo?: string;
  comments?: number;
  vehicleMake?: string;
  vehicleModel?: string;
  services?: OrderService[];
}

interface SmartDashboardProps {
  allOrders: Order[];
  tabCounts: Record<string, number>;
  onCardClick: (filter: string) => void;
}

export const SmartDashboard = memo(function SmartDashboard({ allOrders, tabCounts, onCardClick }: SmartDashboardProps) {
  const { t } = useTranslation();

  // Calculate real metrics from orders - OPTIMIZED: Single-pass reduce O(n)
  const metrics = useMemo(() => {
    const now = new Date();
    const nowDateString = now.toDateString();

    // Single-pass accumulator for ALL metrics
    const calculated = allOrders.reduce((acc, order) => {
      // Total orders count
      acc.total++;

      // Delayed orders logic
      if (order.dueDate && order.status !== 'completed' && order.status !== 'cancelled') {
        const dueDate = new Date(order.dueDate);
        if (dueDate < now) {
          acc.delayed++;
          // Delayed today specifically
          if (dueDate.toDateString() === nowDateString) {
            acc.delayedToday++;
          }
        }
      }

      // Unassigned orders
      if (!order.assignedTo || order.assignedTo === 'Unassigned') {
        acc.unassigned++;
      }

      // Comments tracking
      const commentsCount = typeof order.comments === 'number' ? order.comments : 0;
      if (commentsCount > 0) {
        acc.withComments++;
        acc.totalComments += commentsCount;
      }

      // Vehicle make tracking
      if (order.vehicleMake) {
        acc.makeCount[order.vehicleMake] = (acc.makeCount[order.vehicleMake] || 0) + 1;
      }

      // VIN/Vehicle model tracking
      if (order.vehicleModel) {
        acc.withVin++;
      }

      return acc;
    }, {
      total: 0,
      delayed: 0,
      delayedToday: 0,
      unassigned: 0,
      withComments: 0,
      totalComments: 0,
      makeCount: {} as Record<string, number>,
      withVin: 0
    });

    // Post-processing (single operations, not iterations)
    const avgComments = calculated.withComments > 0
      ? (calculated.totalComments / calculated.withComments).toFixed(1)
      : '0';

    const topMakes = Object.entries(calculated.makeCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    const vinCompletion = calculated.total > 0
      ? Math.round((calculated.withVin / calculated.total) * 100)
      : 0;

    const completed = tabCounts.complete || 0;
    const completionRate = calculated.total > 0
      ? Math.round((completed / calculated.total) * 100)
      : 0;

    return {
      delayed: calculated.delayed,
      delayedToday: calculated.delayedToday,
      unassigned: calculated.unassigned,
      withComments: calculated.withComments,
      totalComments: calculated.totalComments,
      avgComments,
      topMakes,
      vinCompletion,
      completionRate,
      completed,
      total: calculated.total
    };
  }, [allOrders, tabCounts]);

  const kpiCards = [
    {
      id: 'today',
      title: t('orders.today_orders'),
      value: tabCounts.today || 0,
      icon: Calendar,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      subtitle: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      badge: metrics.delayedToday > 0 ? { count: metrics.delayedToday, label: 'delayed', variant: 'destructive' as const } : null
    },
    {
      id: 'delayed',
      title: 'Delayed Orders',
      value: metrics.delayed,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      subtitle: 'Require immediate attention',
      badge: null
    },
    {
      id: 'unassigned',
      title: 'Unassigned Orders',
      value: metrics.unassigned,
      icon: UserX,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      subtitle: 'Awaiting assignment',
      badge: null
    },
    {
      id: 'in_process',
      title: 'In Progress',
      value: tabCounts.in_process || 0,
      icon: Loader2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      subtitle: 'Active work orders',
      badge: null
    }
  ];

  return (
    <div className="space-y-6" role="region" aria-label={t('accessibility.dashboard.overview')}>
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" role="list" aria-label={t('accessibility.dashboard.kpi_cards')}>
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.id}
              className="border-border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:scale-[1.02] group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
              onClick={() => onCardClick(card.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onCardClick(card.id);
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={t('accessibility.dashboard.kpi_card', { title: card.title, value: card.value })}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  {card.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-foreground">{card.value}</div>
                    <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                  </div>
                  {card.badge && (
                    <Badge variant={card.badge.variant} className="text-xs">
                      {card.badge.count} {card.badge.label}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" role="list" aria-label={t('accessibility.dashboard.stats_cards')}>
        {/* Completion Rate */}
        <Card className="border-border shadow-sm" role="article" aria-label={t('accessibility.dashboard.completion_rate')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4" aria-hidden="true" />
              Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span className="font-medium" aria-label={t('accessibility.dashboard.progress_percentage', { value: metrics.completionRate })}>{metrics.completionRate}%</span>
              </div>
              <Progress value={metrics.completionRate} className="h-2" aria-label={`${metrics.completionRate}% complete`} />
              <p className="text-xs text-muted-foreground">
                {metrics.completed} of {metrics.total} orders completed
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Team Activity */}
        <Card className="border-border shadow-sm" role="article" aria-label={t('accessibility.dashboard.team_activity')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4" aria-hidden="true" />
              Team Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Orders with comments</span>
                <span className="font-semibold" aria-label={t('accessibility.dashboard.orders_with_comments', { count: metrics.withComments })}>{metrics.withComments}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total comments</span>
                <span className="font-semibold" aria-label={t('accessibility.dashboard.total_comments', { count: metrics.totalComments })}>{metrics.totalComments}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Avg per order</span>
                <span className="font-semibold" aria-label={t('accessibility.dashboard.average_comments', { value: metrics.avgComments })}>{metrics.avgComments}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Insights */}
        <Card className="border-border shadow-sm" role="article" aria-label={t('accessibility.dashboard.vehicle_insights')}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Car className="h-4 w-4" aria-hidden="true" />
              Vehicle Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.topMakes.length > 0 ? (
                <>
                  <div className="text-xs font-medium text-muted-foreground">Top Makes:</div>
                  {metrics.topMakes.map(([make, count]) => (
                    <div key={make} className="flex justify-between text-sm">
                      <span className="font-medium">{make}</span>
                      <span className="text-muted-foreground" aria-label={t('accessibility.dashboard.vehicle_count', { make, count })}>{count} orders</span>
                    </div>
                  ))}
                </>
              ) : (
                <p className="text-sm text-muted-foreground" role="status">No vehicle data yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - compare allOrders and tabCounts
  return (
    prevProps.allOrders.length === nextProps.allOrders.length &&
    JSON.stringify(prevProps.tabCounts) === JSON.stringify(nextProps.tabCounts) &&
    prevProps.allOrders.every((order, index) =>
      order.id === nextProps.allOrders[index]?.id &&
      order.status === nextProps.allOrders[index]?.status
    )
  );
});
