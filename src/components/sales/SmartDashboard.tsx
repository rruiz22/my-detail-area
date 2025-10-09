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
import { useMemo } from 'react';

interface Order {
  id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  dueDate?: string;
  createdAt: string;
  assignedTo?: string;
  comments?: number;
  vehicleMake?: string;
  vehicleModel?: string;
  services?: any[];
}

interface SmartDashboardProps {
  allOrders: Order[];
  tabCounts: Record<string, number>;
  onCardClick: (filter: string) => void;
}

export function SmartDashboard({ allOrders, tabCounts, onCardClick }: SmartDashboardProps) {
  const { t } = useTranslation();

  // Calculate real metrics from orders
  const metrics = useMemo(() => {
    const now = new Date();

    // Delayed orders: past due date and not completed
    const delayed = allOrders.filter(order => {
      if (!order.dueDate || order.status === 'completed' || order.status === 'cancelled') {
        return false;
      }
      return new Date(order.dueDate) < now;
    }).length;

    // Delayed today specifically
    const delayedToday = allOrders.filter(order => {
      if (!order.dueDate || order.status === 'completed' || order.status === 'cancelled') {
        return false;
      }
      const dueDate = new Date(order.dueDate);
      return dueDate < now && dueDate.toDateString() === now.toDateString();
    }).length;

    // Unassigned orders
    const unassigned = allOrders.filter(order =>
      !order.assignedTo || order.assignedTo === 'Unassigned'
    ).length;

    // Orders with comments
    const withComments = allOrders.filter(order =>
      typeof order.comments === 'number' && order.comments > 0
    ).length;

    // Total comments
    const totalComments = allOrders.reduce((sum, order) =>
      sum + (typeof order.comments === 'number' ? order.comments : 0), 0
    );

    // Avg comments per order (with comments)
    const avgComments = withComments > 0
      ? (totalComments / withComments).toFixed(1)
      : '0';

    // Top 3 vehicle makes
    const makeCount = allOrders.reduce((acc, order) => {
      if (order.vehicleMake) {
        acc[order.vehicleMake] = (acc[order.vehicleMake] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const topMakes = Object.entries(makeCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    // Orders with VIN
    const total = allOrders.length;
    const withVin = allOrders.filter(order => order.vehicleModel).length;
    const vinCompletion = total > 0 ? Math.round((withVin / total) * 100) : 0;

    // Completion rate
    const completed = tabCounts.complete || 0;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      delayed,
      delayedToday,
      unassigned,
      withComments,
      totalComments,
      avgComments,
      topMakes,
      vinCompletion,
      completionRate,
      completed,
      total
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
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.id}
              className="border-border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:scale-[1.02] group"
              onClick={() => onCardClick(card.id)}
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Completion Rate */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span className="font-medium">{metrics.completionRate}%</span>
              </div>
              <Progress value={metrics.completionRate} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {metrics.completed} of {metrics.total} orders completed
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Team Activity */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Team Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Orders with comments</span>
                <span className="font-semibold">{metrics.withComments}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total comments</span>
                <span className="font-semibold">{metrics.totalComments}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Avg per order</span>
                <span className="font-semibold">{metrics.avgComments}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Insights */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Car className="h-4 w-4" />
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
                      <span className="text-muted-foreground">{count} orders</span>
                    </div>
                  ))}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No vehicle data yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
