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

  // Use Get Ready steps from database
  const steps = getReadySteps;
  const isLoading = getReadyLoading;

  const getStepIcon = (iconName: string) => {
    // Default to Layers for now - will expand icon mapping later
    return Layers;
  };

  // Helper functions for Get Ready features
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
      case 'red': return 'text-red-500 bg-red-50';
      case 'yellow': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-green-600 bg-green-50';
    }
  };

  const handleStepClick = (stepId: string) => {
    setSelectedStepId(stepId);
    // Navigate to Details View when a step is selected
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
      <div className="h-full flex flex-col bg-white border-gray-200/60">
        {/* Header */}
        <div className={cn(
          "border-b border-gray-200/60 bg-gradient-to-r from-gray-50 to-gray-100/50 transition-all duration-200",
          collapsed ? "p-1.5" : "p-3"
        )}>
          <div className="flex items-center justify-between">
            {!collapsed && (
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-semibold text-sm text-gray-900">
                    {t('get_ready.title')}
                  </h2>
                  {kpis && (
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-gray-500" />
                      <span className="text-xs font-medium text-gray-600">
                        T2L: {kpis.avgT2L}d
                      </span>
                    </div>
                  )}
                </div>

                        {/* Quick Stats */}
                        {kpis && (
                          <div className="grid grid-cols-2 gap-1 mb-2">
                            <div className="bg-green-50 rounded p-1">
                              <div className="text-xs text-green-700 font-medium">SLA</div>
                              <div className="text-xs font-bold text-green-800">{Math.round(kpis.slaCompliance * 100)}%</div>
                            </div>
                            <div className="bg-blue-50 rounded p-1">
                              <div className="text-xs text-blue-700 font-medium">Daily</div>
                              <div className="text-xs font-bold text-blue-800">{kpis.dailyThroughput}</div>
                            </div>
                          </div>
                        )}

                {/* Alerts Summary */}
                {(bottleneckAlerts.length > 0 || slaAlerts.length > 0) && (
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                    <span className="text-xs text-amber-700 font-medium">
                      {bottleneckAlerts.length + slaAlerts.length} active alerts
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
                      <Layers className="h-4 w-4 text-gray-600" />
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
                          <span className="text-muted-foreground">T2L:</span> {kpis.avgT2L}d
                        </div>
                        <div>
                          <span className="text-muted-foreground">SLA:</span> {Math.round(kpis.slaCompliance * 100)}%
                        </div>
                      </div>
                    )}
                    {(bottleneckAlerts.length > 0 || slaAlerts.length > 0) && (
                      <div className="text-xs text-amber-600">
                        {bottleneckAlerts.length + slaAlerts.length} {t('get_ready.alerts.active_alerts')}
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
                "text-gray-600 hover:text-gray-900 transition-colors",
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
          collapsed ? "p-1" : "p-2"
        )}>
          <div className={cn(collapsed ? "space-y-1" : "space-y-2")}>
            {steps?.map((step, index) => {
              const Icon = getStepIcon(step.icon);
              const isActive = selectedStepId === step.id;
              const slaStatus = getStepSLAStatus(step.id);
              const stepAlerts = getStepAlerts(step.id);

              const stepButton = (
                <button
                  onClick={() => handleStepClick(step.id)}
                        className={cn(
                          "w-full flex items-center text-left transition-all duration-200 relative",
                          collapsed
                            ? "gap-0 p-1.5 justify-center"
                            : "gap-2 p-2 rounded-lg",
                    isActive
                      ? collapsed
                        ? "bg-primary/10 rounded-md"
                        : "bg-primary text-primary-foreground shadow-sm rounded-lg"
                      : collapsed
                        ? "hover:bg-gray-100 rounded-md"
                        : "hover:bg-gray-50 hover:shadow-sm rounded-lg"
                  )}
                >
                  {/* Step Number/Icon with SLA indicator */}
                  <div className="relative">
                    <div
                            className={cn(
                              "flex-shrink-0 rounded-full flex items-center justify-center text-xs font-semibold shadow-sm",
                              collapsed ? "w-6 h-6" : "w-6 h-6",
                        isActive
                          ? collapsed
                            ? "bg-primary text-white border-2 border-primary/20"
                            : "bg-white text-primary border-2 border-primary/20"
                          : "text-white"
                      )}
                      style={{ backgroundColor: !isActive ? step.color : undefined }}
                    >
                      {step.name === 'All' ? <Icon className="h-3 w-3" /> : step.order_index}
                    </div>
                    {/* SLA Status Indicator */}
                    {slaStatus !== 'green' && (
                      <div
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white flex items-center justify-center",
                          slaStatus === 'red' ? "bg-red-500" : "bg-yellow-500"
                        )}
                      >
                        {slaStatus === 'red' && <AlertTriangle className="h-1.5 w-1.5 text-white" />}
                        {slaStatus === 'yellow' && <Clock className="h-1.5 w-1.5 text-white" />}
                      </div>
                    )}
                  </div>

                          {!collapsed && (
                            <div className="flex-1 min-w-0">
                              {/* Simple layout: Step name and vehicle count */}
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-sm truncate">
                                  {step.name}
                                </span>
                                {step.vehicle_count > 0 && (
                                  <Badge
                                    variant={isActive ? "secondary" : "outline"}
                                    className="ml-1 h-4 px-1 text-xs font-semibold"
                                  >
                                    {step.vehicle_count}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}

                  {collapsed && step.vehicle_count > 0 && (
                    <Badge
                      variant={isActive ? "secondary" : "outline"}
                      className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full p-0 text-xs font-semibold"
                    >
                      {step.vehicle_count > 9 ? '9+' : step.vehicle_count}
                    </Badge>
                  )}
                </button>
              );

              // Wrap collapsed buttons with tooltip
              if (collapsed) {
                const getReadyStep = getReadySteps.find(s => s.id === step.id);
                return (
                  <Tooltip key={step.id}>
                    <TooltipTrigger asChild>
                      {stepButton}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{step.name}</span>
                          {step.vehicle_count > 0 && (
                            <Badge variant="outline" className="h-4 px-1 text-xs">
                              {step.vehicle_count}
                            </Badge>
                          )}
                          {/* SLA Status Badge */}
                          <Badge className={cn(
                            "h-4 px-1 text-xs",
                            getSLAStatusColor(slaStatus)
                          )}>
                            {slaStatus === 'green' ? 'On Track' : slaStatus === 'yellow' ? 'At Risk' : 'Critical'}
                          </Badge>
                        </div>


                        {/* Step metrics for Get Ready steps */}
                        {getReadyStep && (
                          <div className="text-xs">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">SLA:</span>
                              <span>{getReadyStep.sla_hours}h</span>
                            </div>
                            {getReadyStep.cost_per_day > 0 && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Cost/day:</span>
                                <span>${getReadyStep.cost_per_day}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Alerts for this step */}
                        {stepAlerts.length > 0 && (
                          <div className="text-xs text-amber-600 border-t pt-1">
                            <div className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              <span>{stepAlerts.length} alert{stepAlerts.length > 1 ? 's' : ''}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return <React.Fragment key={step.id}>{stepButton}</React.Fragment>;
            })}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
