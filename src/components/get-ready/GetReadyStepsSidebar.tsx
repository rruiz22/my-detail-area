import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useGetReadyStore } from '@/hooks/useGetReadyStore';
import { useGetReady } from '@/hooks/useGetReady';
import { cn } from '@/lib/utils';
import { AlertTriangle, ChevronLeft, ChevronRight, Clock, Layers, TrendingUp } from 'lucide-react';
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

  const getStepIcon = (iconName: string) => {
    return Layers;
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
                  {kpis && (
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">
                        {t('get_ready.sidebar.t2l')}: {kpis.avgT2L}d
                      </span>
                    </div>
                  )}
                </div>

                {/* Quick Stats - REAL DATA */}
                {kpis && (
                  <div className="grid grid-cols-2 gap-1.5 mb-2">
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded p-1.5 border border-emerald-200/50 dark:border-emerald-800/50">
                      <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                        {t('get_ready.sidebar.sla')}
                      </div>
                      <div className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                        {Math.round(kpis.slaCompliance * 100)}%
                      </div>
                    </div>
                    <div className="bg-indigo-50 dark:bg-indigo-950/30 rounded p-1.5 border border-indigo-200/50 dark:border-indigo-800/50">
                      <div className="text-xs text-indigo-700 dark:text-indigo-400 font-medium">
                        {t('get_ready.sidebar.daily')}
                      </div>
                      <div className="text-sm font-bold text-indigo-800 dark:text-indigo-300">
                        {kpis.dailyThroughput}
                      </div>
                    </div>
                  </div>
                )}

                {/* Alerts Summary */}
                {(bottleneckAlerts.length > 0 || slaAlerts.length > 0) && (
                  <div className="flex items-center gap-2 mb-2 p-1.5 bg-amber-50 dark:bg-amber-950/30 rounded border border-amber-200/50 dark:border-amber-800/50">
                    <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                      {bottleneckAlerts.length + slaAlerts.length} {t('get_ready.sidebar.alerts')}
                    </span>
                  </div>
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
                          "w-full flex items-center justify-center p-1.5 rounded-md transition-all duration-200 relative",
                          isActive
                            ? "bg-primary/10 dark:bg-primary/20"
                            : "hover:bg-muted dark:hover:bg-muted/50"
                        )}
                      >
                        <div className="relative">
                          <div
                            className={cn(
                              "flex-shrink-0 rounded-full flex items-center justify-center text-xs font-semibold shadow-sm w-6 h-6",
                              isActive
                                ? "bg-primary text-white border-2 border-primary/20"
                                : "text-white"
                            )}
                            style={{ backgroundColor: !isActive ? step.color : undefined }}
                          >
                            {step.name === 'All' ? <Icon className="h-3 w-3" /> : step.order_index}
                          </div>
                          {slaStatus !== 'green' && (
                            <div
                              className={cn(
                                "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card dark:border-card flex items-center justify-center",
                                slaStatus === 'red' ? "bg-red-500" : "bg-yellow-500"
                              )}
                            >
                              {slaStatus === 'red' && <AlertTriangle className="h-1.5 w-1.5 text-white" />}
                              {slaStatus === 'yellow' && <Clock className="h-1.5 w-1.5 text-white" />}
                            </div>
                          )}
                        </div>
                        {step.vehicle_count > 0 && (
                          <Badge
                            variant={isActive ? "secondary" : "outline"}
                            className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full p-0 text-[10px] font-semibold flex items-center justify-center"
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
                    {/* Top Row: Icon, Name, Total Count */}
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <div
                          className={cn(
                            "flex-shrink-0 rounded-full flex items-center justify-center text-xs font-semibold shadow-sm w-7 h-7",
                            isActive
                              ? "bg-white dark:bg-card text-primary border-2 border-primary/20 dark:border-primary/30"
                              : "text-white"
                          )}
                          style={{ backgroundColor: !isActive ? step.color : undefined }}
                        >
                          {step.name === 'All' ? <Icon className="h-3.5 w-3.5" /> : step.order_index}
                        </div>
                        {slaStatus !== 'green' && (
                          <div
                            className={cn(
                              "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card dark:border-card flex items-center justify-center",
                              slaStatus === 'red' ? "bg-red-500" : "bg-yellow-500"
                            )}
                          >
                            {slaStatus === 'red' && <AlertTriangle className="h-1.5 w-1.5 text-white" />}
                            {slaStatus === 'yellow' && <Clock className="h-1.5 w-1.5 text-white" />}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 flex items-center justify-between">
                        <span className={cn(
                          "font-medium text-sm truncate",
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
                    </div>

                    {/* Vehicle Breakdown by Days */}
                    {step.vehicle_count > 0 && (step.vehicles_1_day > 0 || step.vehicles_2_3_days > 0 || step.vehicles_4_plus_days > 0) && (
                      <div className={cn(
                        "grid grid-cols-3 gap-1.5 text-xs",
                        isActive && "opacity-90"
                      )}>
                        {/* 1 Day - Fresh */}
                        <div className={cn(
                          "flex flex-col items-center py-1.5 px-1 rounded border",
                          isActive
                            ? "bg-white/10 border-white/20"
                            : "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/50 dark:border-emerald-800/50"
                        )}>
                          <span className={cn(
                            "font-bold text-sm",
                            isActive ? "text-primary-foreground" : "text-emerald-700 dark:text-emerald-400"
                          )}>
                            {step.vehicles_1_day || 0}
                          </span>
                          <span className={cn(
                            "text-[10px] leading-tight text-center",
                            isActive ? "text-primary-foreground/70" : "text-emerald-600 dark:text-emerald-500"
                          )}>
                            {t('get_ready.sidebar.fresh')}
                          </span>
                        </div>

                        {/* 2-3 Days - Normal */}
                        <div className={cn(
                          "flex flex-col items-center py-1.5 px-1 rounded border",
                          isActive
                            ? "bg-white/10 border-white/20"
                            : "bg-amber-50 dark:bg-amber-950/30 border-amber-200/50 dark:border-amber-800/50"
                        )}>
                          <span className={cn(
                            "font-bold text-sm",
                            isActive ? "text-primary-foreground" : "text-amber-700 dark:text-amber-400"
                          )}>
                            {step.vehicles_2_3_days || 0}
                          </span>
                          <span className={cn(
                            "text-[10px] leading-tight text-center",
                            isActive ? "text-primary-foreground/70" : "text-amber-600 dark:text-amber-500"
                          )}>
                            {t('get_ready.sidebar.normal')}
                          </span>
                        </div>

                        {/* 4+ Days - Critical */}
                        <div className={cn(
                          "flex flex-col items-center py-1.5 px-1 rounded border",
                          isActive
                            ? "bg-white/10 border-white/20"
                            : "bg-red-50 dark:bg-red-950/30 border-red-200/50 dark:border-red-800/50"
                        )}>
                          <span className={cn(
                            "font-bold text-sm",
                            isActive ? "text-primary-foreground" : "text-red-700 dark:text-red-400"
                          )}>
                            {step.vehicles_4_plus_days || 0}
                          </span>
                          <span className={cn(
                            "text-[10px] leading-tight text-center",
                            isActive ? "text-primary-foreground/70" : "text-red-600 dark:text-red-500"
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
