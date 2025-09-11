import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSteps } from '@/hooks/useGetReadySteps';
import { useGetReadyStore } from '@/hooks/useGetReadyStore';

interface GetReadyStepsSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function GetReadyStepsSidebar({ collapsed, onToggleCollapse }: GetReadyStepsSidebarProps) {
  const { t } = useTranslation();
  const { data: steps, isLoading } = useSteps();
  const { selectedStepId, setSelectedStepId } = useGetReadyStore();

  const getStepIcon = (iconName: string) => {
    // Default to Layers for now - will expand icon mapping later
    return Layers;
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
    <div className="h-full flex flex-col bg-gray-50/50 border-gray-200/60">
      {/* Header */}
      <div className="p-4 border-b border-gray-200/60">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <h2 className="font-semibold text-sm text-gray-900">
              {t('get_ready.steps.title')}
            </h2>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="text-gray-600 hover:text-gray-900"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Steps List */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {steps?.map((step, index) => {
            const Icon = getStepIcon(step.icon);
            const isActive = selectedStepId === step.id;
            
            return (
              <button
                key={step.id}
                onClick={() => setSelectedStepId(step.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-muted"
                )}
              >
                {/* Step Number/Icon */}
                <div 
                  className={cn(
                    "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                    isActive 
                      ? "bg-primary-foreground text-primary" 
                      : "bg-muted text-muted-foreground"
                  )}
                  style={{ backgroundColor: !isActive ? step.color : undefined }}
                >
                  {step.name === 'All' ? <Icon className="h-3 w-3" /> : index}
                </div>

                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm truncate">
                        {step.name}
                      </span>
                      {step.vehicle_count > 0 && (
                        <Badge 
                          variant={isActive ? "secondary" : "outline"}
                          className="ml-2 h-5 px-1.5 text-xs"
                        >
                          {step.vehicle_count}
                        </Badge>
                      )}
                    </div>
                    
                    {/* DIS and DTF badges */}
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1">
                        <Badge 
                          variant="outline" 
                          className="h-4 px-1 text-xs bg-blue-50 border-blue-200 text-blue-700"
                          title={t('get_ready.steps.dis_tooltip')}
                        >
                          {t('get_ready.steps.dis')}: {step.days_in_step_avg}d
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className="h-4 px-1 text-xs bg-green-50 border-green-200 text-green-700"
                          title={t('get_ready.steps.dtf_tooltip')}
                        >
                          {t('get_ready.steps.dtf')}: {step.days_to_frontline_avg}d
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}

                {collapsed && step.vehicle_count > 0 && (
                  <Badge 
                    variant={isActive ? "secondary" : "outline"}
                    className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs"
                  >
                    {step.vehicle_count > 99 ? '99+' : step.vehicle_count}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}