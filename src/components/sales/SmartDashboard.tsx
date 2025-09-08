import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, Clock, AlertCircle, BarChart3, TrendingUp, DollarSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SmartDashboardProps {
  tabCounts: Record<string, number>;
  onCardClick: (filter: string) => void;
}

export function SmartDashboard({ tabCounts, onCardClick }: SmartDashboardProps) {
  const { t } = useTranslation();

  const kpiCards = [
    {
      id: 'today',
      title: t('orders.today_orders'),
      value: tabCounts.today || 0,
      icon: Calendar,
      color: 'text-success',
      bgColor: 'bg-success/10',
      trend: '+12%',
      subtitle: new Date().toLocaleDateString(),
      urgent: 0
    },
    {
      id: 'tomorrow', 
      title: t('orders.tomorrow_orders'),
      value: tabCounts.tomorrow || 0,
      icon: Clock,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      trend: '+8%',
      subtitle: new Date(Date.now() + 86400000).toLocaleDateString(),
      urgent: 0
    },
    {
      id: 'pending',
      title: t('orders.pending_orders'),
      value: tabCounts.pending || 0,
      icon: AlertCircle,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      trend: '-3%',
      subtitle: t('orders.require_attention'),
      urgent: Math.floor((tabCounts.pending || 0) * 0.3)
    },
    {
      id: 'week',
      title: t('orders.week_orders'),
      value: tabCounts.week || 0,
      icon: BarChart3,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
      trend: '+15%',
      subtitle: 'Sep 1 - Sep 7',
      urgent: 0
    }
  ];

  const completionRate = tabCounts.all ? Math.round(((tabCounts.all - tabCounts.pending) / tabCounts.all) * 100) : 0;

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
                  <div className="text-right">
                    <div className={`text-xs font-medium ${card.trend.startsWith('+') ? 'text-success' : 'text-destructive'}`}>
                      {card.trend}
                    </div>
                    {card.urgent > 0 && (
                      <Badge variant="destructive" className="text-xs mt-1">
                        {card.urgent} urgent
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Stats & Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span className="font-medium">{completionRate}%</span>
              </div>
              <Progress value={completionRate} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {tabCounts.all - tabCounts.pending} of {tabCounts.all} orders completed
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Revenue Potential
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">$24,350</div>
            <p className="text-xs text-muted-foreground">Estimated from pending orders</p>
            <div className="text-xs text-success mt-1">+18% vs last week</div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Avg. Processing Time</span>
              <span className="font-medium">2.4h</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Orders this month</span>
              <span className="font-medium">{tabCounts.all * 4}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>SLA Compliance</span>
              <span className="font-medium text-success">94%</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}