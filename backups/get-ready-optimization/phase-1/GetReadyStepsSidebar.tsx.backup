import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useGetReadyStore } from '@/hooks/useGetReadyStore';
import { useGetReady } from '@/hooks/useGetReady';
import { cn } from '@/lib/utils';
import {
  AlertTriangle, ChevronLeft, ChevronRight, Clock, Layers, TrendingUp,
  Search, Wrench, Hammer, Sparkles, CheckCircle2, Circle, Settings, ClipboardCheck,
  Package, Truck, Car, Droplet, Paintbrush, Gauge, ShieldCheck, Zap, Flag, Target, Award
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';

interface GetReadyStepsSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function GetReadyStepsSidebar({ collapsed, onToggleCollapse }: GetReadyStepsSidebarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { steps: getReadySteps, kpis, bottleneckAlerts, slaAlerts, isLoading: getReadyLoading } = useGetReady();
  const { selectedStepId, setSelectedStepId } = useGetReadyStore();

  const steps = getReadySteps;
  const isLoading = getReadyLoading;

  // 🔍 DIAGNOSTIC LOGGING - Remove after debugging
  React.useEffect(() => {
    if (kpis) {
      console.log('📊 [Sidebar KPIs]:', {
        avgT2L: kpis.avgT2L,
        slaCompliance: kpis.slaCompliance,
        dailyThroughput: kpis.dailyThroughput,
        weeklyCapacity: kpis.weeklyCapacity,
        totalHoldingCosts: kpis.totalHoldingCosts
      });
    }
    console.log('🚨 [Sidebar Alerts]:', {
      bottleneck: bottleneckAlerts.length,
      sla: slaAlerts.length,
      total: bottleneckAlerts.length + slaAlerts.length
    });
    console.log('📍 [Sidebar Steps]:', {
      count: steps.length,
      steps: steps.map(s => ({ id: s.id, name: s.name, vehicles: s.vehicle_count }))
    });
  }, [kpis, bottleneckAlerts, slaAlerts, steps]);

  const getStepIcon = (iconName: string) => {
    const iconMap: Record<string, any> = {
      'search': Search,
      'wrench': Wrench,
      'hammer': Hammer,
      'sparkles': Sparkles,
      'check': CheckCircle2,
      'circle': Circle,
      'layers': Layers,
      'settings': Settings,
      'clipboard': ClipboardCheck,
      'package': Package,
      'truck': Truck,
      'car': Car,
      'droplet': Droplet,
      'paintbrush': Paintbrush,
      'gauge': Gauge,
      'shield': ShieldCheck,
      'zap': Zap,
      'flag': Flag,
      'target': Target,
      'award': Award,
    };
    return iconMap[iconName.toLowerCase()] || Circle;
  };

  const getStepSLAStatus = (stepId: string) => {
    const isBottleneck = bottleneckAlerts.some(alert => alert.step_id === stepId);
    const bottleneck = bottleneckAlerts.find(alert => alert.step_id === stepId);

    if (isBottleneck) {
      return bottleneck?.severity === 'critical' || bottleneck?.severity === 'high' ? 'red' : 'yellow';
    }
    return 'green';
  };

  const getStepAlerts = (stepId: string) => {
    return bottleneckAlerts.filter(alert => alert.step_id === stepId);
  };

  const getSLAStatusColor = (status: string) => {
    switch (status) {
      case 'red': return 'text-red-500 bg-red-50 dark:bg-red-950/30 dark:text-red-400';
      case 'yellow': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30 dark:text-yellow-400';
      default: return 'text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400';
    }
  };

  const handleStepClick = (stepId: string) => {
    setSelectedStepId(stepId);
    if (location.pathname !== '/get-ready/details') {
      navigate('/get-ready/details');
    }
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col bg-card dark:bg-card border-r dark:border-border">
        {/* Header - NO GRADIENT */}
        <div className={cn(
          "border-b dark:border-border bg-muted/30 dark:bg-muted/20 transition-all duration-200",
          collapsed ? "p-1.5" : "p-3"
        )}>
          <div className="flex items-center justify-between">
            {!collapsed && (
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-semibold text-sm text-foreground">
                    {t('get_ready.title')}
                  </h2>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">
                          {t('get_ready.sidebar.t2l')}: {kpis?.avgT2L > 0 ? `${kpis.avgT2L}d` : '--'}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs">
                      <p>Average Time to Line (last 30 days)</p>
                      {kpis?.avgT2L > 0 && <p className="text-muted-foreground">Target: {kpis.targetT2L}d</p>}
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Quick Stats - REAL DATA with tooltips */}
                {kpis && (
                  <div className="grid grid-cols-2 gap-1.5 mb-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded p-1.5 border border-emerald-200/50 dark:border-emerald-800/50 cursor-help">
                          <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                            {t('get_ready.sidebar.sla')}
                          </div>
                          <div className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                            {kpis.slaCompliance > 0 ? `${Math.round(kpis.slaCompliance * 100)}%` : '--'}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs">
                        <p>SLA Compliance Rate</p>
                        <p className="text-muted-foreground">
                          {kpis.slaCompliance > 0
                            ? `${Math.round(kpis.slaCompliance * 100)}% of vehicles on track`
                            : 'No active vehicles to track'}
                        </p>
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="bg-indigo-50 dark:bg-indigo-950/30 rounded p-1.5 border border-indigo-200/50 dark:border-indigo-800/50 cursor-help">
                          <div className="text-xs text-indigo-700 dark:text-indigo-400 font-medium">
                            {t('get_ready.sidebar.daily')}
                          </div>
                          <div className="text-sm font-bold text-indigo-800 dark:text-indigo-300">
                            {kpis.dailyThroughput > 0 ? kpis.dailyThroughput : '--'}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs">
                        <p>Daily Throughput</p>
                        <p className="text-muted-foreground">
                          {kpis.dailyThroughput > 0
                            ? `${kpis.dailyThroughput} vehicle${kpis.dailyThroughput !== 1 ? 's' : ''} completed today`
                            : 'No vehicles completed today'}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                )}

                {/* Alerts Summary - Expandable with details */}
                {(bottleneckAlerts.length > 0 || slaAlerts.length > 0) && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2 mb-2 p-1.5 bg-amber-50 dark:bg-amber-950/30 rounded border border-amber-200/50 dark:border-amber-800/50 cursor-help">
                        <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                        <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                          {bottleneckAlerts.length + slaAlerts.length} {t('get_ready.sidebar.alerts')}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs max-w-xs">
                      <div className="space-y-2">
                        <p className="font-semibold">Active Alerts</p>
                        {bottleneckAlerts.length > 0 && (
                          <div>
                            <p className="text-red-400 font-medium">Bottleneck Alerts: {bottleneckAlerts.length}</p>
                            {bottleneckAlerts.slice(0, 3).map((alert, i) => (
                              <p key={i} className="text-muted-foreground text-[10px]">
                                • {alert.step_name}: {alert.vehicle_count} vehicles ({alert.severity})
                              </p>
                            ))}
                          </div>
                        )}
                        {slaAlerts.length > 0 && (
                          <div>
                            <p className="text-yellow-400 font-medium">SLA Alerts: {slaAlerts.length}</p>
                            {slaAlerts.slice(0, 3).map((alert, i) => (
                              <p key={i} className="text-muted-foreground text-[10px]">
                                • {alert.stock_number}: {alert.hours_overdue}h overdue ({alert.severity})
                              </p>
                            ))}
                          </div>
                        )}
                        {(bottleneckAlerts.length + slaAlerts.length) > 6 && (
                          <p className="text-muted-foreground italic">
                            +{bottleneckAlerts.length + slaAlerts.length - 6} more alerts
                          </p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}

              </div>
            )}

            {collapsed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex-1 flex justify-center">
                    <div className="relative">
                      <Layers className="h-4 w-4 text-muted-foreground" />
                      {(bottleneckAlerts.length > 0 || slaAlerts.length > 0) && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
                      )}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  <div className="space-y-2">
                    <p>{t('get_ready.title')}</p>
                    {kpis && (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">{t('get_ready.sidebar.t2l')}:</span> {kpis.avgT2L}d
                        </div>
                        <div>
                          <span className="text-muted-foreground">{t('get_ready.sidebar.sla')}:</span> {Math.round(kpis.slaCompliance * 100)}%
                        </div>
                      </div>
                    )}
                    {(bottleneckAlerts.length > 0 || slaAlerts.length > 0) && (
                      <div className="text-xs text-amber-600 dark:text-amber-400">
                        {bottleneckAlerts.length + slaAlerts.length} {t('get_ready.sidebar.alerts')}
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className={cn(
                "text-muted-foreground hover:text-foreground transition-colors h-7 w-7 p-0",
                collapsed ? "ml-0" : "ml-2"
              )}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Steps List */}
        <div className={cn(
          "flex-1 overflow-y-auto transition-all duration-200",
          collapsed ? "p-1" : "p-2 space-y-2"
        )}>
          {collapsed ? (
            <div className="space-y-1">
              {steps?.map((step) => {
                const Icon = getStepIcon(step.icon);
                const isActive = selectedStepId === step.id;
                const slaStatus = getStepSLAStatus(step.id);

                return (
                  <Tooltip key={step.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleStepClick(step.id)}
                        className={cn(
                          "w-full rounded-md transition-all duration-200 relative h-[52px] flex items-center justify-center",
                          isActive
                            ? "bg-primary/10 dark:bg-primary/20"
                            : "hover:bg-muted dark:hover:bg-muted/50"
                        )}
                      >
                        {/* Step icon - Centered */}
                        <Icon className={cn(
                          "h-6 w-6",
                          isActive ? "text-primary" : "text-foreground"
                        )} />

                        {/* Vehicle count badge - top right corner */}
                        {step.vehicle_count > 0 && (
                          <Badge
                            variant={isActive ? "secondary" : "outline"}
                            className="absolute right-0.5 top-0.5 h-4 min-w-[16px] px-1 text-[10px] font-semibold flex items-center justify-center pointer-events-none"
                          >
                            {step.vehicle_count > 9 ? '9+' : step.vehicle_count}
                          </Badge>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium max-w-xs">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{step.name}</span>
                          {step.vehicle_count > 0 && (
                            <Badge variant="outline" className="h-4 px-1.5 text-xs">
                              {step.vehicle_count}
                            </Badge>
                          )}
                          <Badge className={cn("h-4 px-1.5 text-xs", getSLAStatusColor(slaStatus))}>
                            {slaStatus === 'green' ? t('get_ready.sidebar.on_track') : slaStatus === 'yellow' ? t('get_ready.sidebar.at_risk') : t('get_ready.sidebar.critical')}
                          </Badge>
                        </div>

                        {/* Vehicle breakdown by days */}
                        {step.vehicle_count > 0 && (
                          <div className="text-xs space-y-1 border-t pt-2">
                            <div className="font-medium text-muted-foreground mb-1">{t('get_ready.sidebar.by_days')}:</div>
                            {step.vehicles_1_day > 0 && (
                              <div className="flex justify-between items-center">
                                <span className="text-green-600 dark:text-green-400">● {t('get_ready.sidebar.fresh')}</span>
                                <span className="font-semibold">{step.vehicles_1_day}</span>
                              </div>
                            )}
                            {step.vehicles_2_3_days > 0 && (
                              <div className="flex justify-between items-center">
                                <span className="text-yellow-600 dark:text-yellow-400">● {t('get_ready.sidebar.normal')}</span>
                                <span className="font-semibold">{step.vehicles_2_3_days}</span>
                              </div>
                            )}
                            {step.vehicles_4_plus_days > 0 && (
                              <div className="flex justify-between items-center">
                                <span className="text-red-600 dark:text-red-400">● {t('get_ready.sidebar.critical')}</span>
                                <span className="font-semibold">{step.vehicles_4_plus_days}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Step metrics */}
                        <div className="text-xs border-t pt-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t('get_ready.sidebar.sla_hours')}:</span>
                            <span className="font-medium">{step.sla_hours}h</span>
                          </div>
                          {step.cost_per_day > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t('get_ready.sidebar.cost_per_day')}:</span>
                              <span className="font-medium">${step.cost_per_day}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          ) : (
            <>
              {steps?.map((step) => {
                const Icon = getStepIcon(step.icon);
                const isActive = selectedStepId === step.id;
                const slaStatus = getStepSLAStatus(step.id);
                const stepAlerts = getStepAlerts(step.id);

                return (
                  <button
                    key={step.id}
                    onClick={() => handleStepClick(step.id)}
                    className={cn(
                      "w-full flex flex-col gap-2 p-3 rounded-lg transition-all duration-200 relative",
                      "border dark:border-border",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md dark:shadow-primary/20"
                        : "bg-card dark:bg-card hover:bg-muted/50 dark:hover:bg-muted/30 hover:shadow-sm"
                    )}
                  >
                    {/* Top Row: Name and Total Count */}
                    <div className="flex items-center justify-between">
                      <span className={cn(
                        "font-bold text-base tracking-wide truncate",
                        isActive ? "text-primary-foreground" : "text-foreground"
                      )}>
                        {step.name}
                      </span>
                      {step.vehicle_count > 0 && (
                        <Badge
                          variant={isActive ? "secondary" : "outline"}
                          className={cn(
                            "ml-2 h-5 px-2 text-xs font-semibold",
                            isActive && "bg-white/20 text-primary-foreground border-white/30"
                          )}
                        >
                          {step.vehicle_count}
                        </Badge>
                      )}
                    </div>

                    {/* Vehicle Breakdown by Days */}
                    {step.vehicle_count > 0 && (step.vehicles_1_day > 0 || step.vehicles_2_3_days > 0 || step.vehicles_4_plus_days > 0) && (
                      <div className="grid grid-cols-3 gap-1.5 text-xs">
                        {/* 1 Day - Fresh */}
                        <div className={cn(
                          "flex flex-col items-center py-1.5 px-1 rounded border",
                          isActive
                            ? "bg-emerald-600 dark:bg-emerald-700 border-white/30 shadow-sm"
                            : "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/50 dark:border-emerald-800/50"
                        )}>
                          <span className={cn(
                            "font-bold text-sm",
                            isActive ? "text-white" : "text-emerald-700 dark:text-emerald-400"
                          )}>
                            {step.vehicles_1_day || 0}
                          </span>
                          <span className={cn(
                            "text-[10px] leading-tight text-center",
                            isActive ? "text-white/90" : "text-emerald-600 dark:text-emerald-500"
                          )}>
                            {t('get_ready.sidebar.fresh')}
                          </span>
                        </div>

                        {/* 2-3 Days - Normal */}
                        <div className={cn(
                          "flex flex-col items-center py-1.5 px-1 rounded border",
                          isActive
                            ? "bg-amber-600 dark:bg-amber-700 border-white/30 shadow-sm"
                            : "bg-amber-50 dark:bg-amber-950/30 border-amber-200/50 dark:border-amber-800/50"
                        )}>
                          <span className={cn(
                            "font-bold text-sm",
                            isActive ? "text-white" : "text-amber-700 dark:text-amber-400"
                          )}>
                            {step.vehicles_2_3_days || 0}
                          </span>
                          <span className={cn(
                            "text-[10px] leading-tight text-center",
                            isActive ? "text-white/90" : "text-amber-600 dark:text-amber-500"
                          )}>
                            {t('get_ready.sidebar.normal')}
                          </span>
                        </div>

                        {/* 4+ Days - Critical */}
                        <div className={cn(
                          "flex flex-col items-center py-1.5 px-1 rounded border",
                          isActive
                            ? "bg-red-600 dark:bg-red-700 border-white/30 shadow-sm"
                            : "bg-red-50 dark:bg-red-950/30 border-red-200/50 dark:border-red-800/50"
                        )}>
                          <span className={cn(
                            "font-bold text-sm",
                            isActive ? "text-white" : "text-red-700 dark:text-red-400"
                          )}>
                            {step.vehicles_4_plus_days || 0}
                          </span>
                          <span className={cn(
                            "text-[10px] leading-tight text-center",
                            isActive ? "text-white/90" : "text-red-600 dark:text-red-500"
                          )}>
                            {t('get_ready.sidebar.critical')}
                          </span>
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
