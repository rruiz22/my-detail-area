import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Car,
  Clock,
  AlertTriangle,
  CheckCircle,
  BarChart3
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { safeFormatDateOnly } from '@/utils/dateUtils';
import type { ReconOrder } from '@/hooks/useReconOrderManagement';

interface ReconDashboardProps {
  orders: ReconOrder[];
  tabCounts: Record<string, number>;
  onCardClick: (filter: string) => void;
}

interface ReconMetrics {
  averageReconTime: number;
  readyForSaleCount: number;
}

export function ReconDashboard({ orders, tabCounts, onCardClick }: ReconDashboardProps) {
  const { t } = useTranslation();

  // Calculate recon-specific metrics
  const calculateMetrics = (): ReconMetrics => {
    const completedOrders = orders.filter(order => order.status === 'completed');
    const readyForSaleOrders = orders.filter(order => order.status === 'ready_for_sale');

    const averageReconTime = completedOrders.length > 0 ?
      completedOrders.reduce((sum, order) => {
        if (order.completedAt && order.createdAt) {
          const days = Math.ceil((new Date(order.completedAt).getTime() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24));
          return sum + days;
        }
        return sum;
      }, 0) / completedOrders.length : 0;

    const readyForSaleCount = readyForSaleOrders.length;

    return {
      averageReconTime,
      readyForSaleCount
    };
  };

  const metrics = calculateMetrics();

  // Recon-specific KPI cards
  const reconKpiCards = [
    {
      id: 'pending',
      title: t('recon.dashboard.pending_vehicles'),
      value: tabCounts.pending || 0,
      icon: Clock,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      trend: `${Math.round(((tabCounts.pending || 0) / Math.max(tabCounts.all || 1, 1)) * 100)}%`,
      subtitle: t('recon.dashboard.awaiting_work'),
      urgent: Math.floor((tabCounts.pending || 0) * 0.4)
    },
    {
      id: 'in_progress',
      title: t('recon.dashboard.in_progress'),
      value: tabCounts.inProgress || 0,
      icon: Car,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      trend: `${Math.round(metrics.averageReconTime)}d avg`,
      subtitle: t('recon.dashboard.being_reconditioned'),
      urgent: 0
    },
    {
      id: 'needsApproval',
      title: t('recon.dashboard.needs_approval'),
      value: tabCounts.needsApproval || 0,
      icon: AlertTriangle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      trend: t('recon.dashboard.high_priority'),
      subtitle: t('recon.dashboard.manager_review'),
      urgent: tabCounts.needsApproval || 0
    },
    {
      id: 'readyForSale',
      title: t('recon.dashboard.ready_for_sale'),
      value: tabCounts.readyForSale || 0,
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/10',
      trend: t('recon.dashboard.ready_to_sell'),
      subtitle: t('recon.dashboard.completed_vehicles'),
      urgent: 0
    }
  ];

  // Condition grade distribution
  const conditionGrades = orders.reduce((acc, order) => {
    const grade = order.conditionGrade || 'unknown';
    acc[grade] = (acc[grade] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Acquisition source distribution
  const acquisitionSources = orders.reduce((acc, order) => {
    const source = order.acquisitionSource || 'unknown';
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t('recon.dashboard.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('recon.dashboard.subtitle')}</p>
        </div>
        <Badge variant="outline" className="text-xs">
          {t('recon.dashboard.updated')} {safeFormatDateOnly(new Date().toISOString())}
        </Badge>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {reconKpiCards.map((card) => {
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
                    <div className="text-xs font-medium text-accent">
                      {card.trend}
                    </div>
                    {card.urgent > 0 && (
                      <Badge variant="destructive" className="text-xs mt-1">
                        {card.urgent} {t('common.urgent')}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Condition Grade Distribution */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {t('recon.dashboard.condition_distribution')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(conditionGrades).map(([grade, count]) => {
              const percentage = orders.length > 0 ? (count / orders.length) * 100 : 0;
              const gradeColor = {
                excellent: 'text-success bg-success/10',
                good: 'text-primary bg-primary/10', 
                fair: 'text-warning bg-warning/10',
                poor: 'text-destructive bg-destructive/10',
                unknown: 'text-muted-foreground bg-muted/10'
              }[grade] || 'text-muted-foreground bg-muted/10';
              
              return (
                <div key={grade} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{t(`recon.condition_grades.${grade}`)}</span>
                    <span className="font-medium">{count} ({percentage.toFixed(0)}%)</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Acquisition Source Distribution */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {t('recon.dashboard.acquisition_sources')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(acquisitionSources).map(([source, count]) => {
              const percentage = orders.length > 0 ? (count / orders.length) * 100 : 0;
              
              return (
                <div key={source} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{t(`recon.acquisition_sources.${source}`)}</span>
                    <span className="font-medium">{count} ({percentage.toFixed(0)}%)</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}