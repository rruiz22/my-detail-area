import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Plus, 
  Truck, 
  Search, 
  Wrench, 
  Paintbrush, 
  Sparkles, 
  Camera, 
  CheckCircle, 
  Star,
  MoreHorizontal 
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import type { ReconOrderWithWorkflow, WorkflowStepType } from '@/types/recon-hub';

interface WorkflowStatusGridProps {
  dealerId: number;
  orders: ReconOrderWithWorkflow[];
  expanded?: boolean;
}

const STEP_ICONS: Record<WorkflowStepType, any> = {
  'created': Plus,
  'bring_to_recon': Truck,
  'inspection': Search,
  'mechanical': Wrench,
  'body_work': Paintbrush,
  'detailing': Sparkles,
  'photos': Camera,
  'needs_approval': CheckCircle,
  'wholesale': MoreHorizontal,
  'front_line': Star,
  'not_for_sale': MoreHorizontal,
  'cant_find_keys': MoreHorizontal
};

const STEP_COLORS: Record<WorkflowStepType, string> = {
  'created': 'bg-blue-100 text-blue-800',
  'bring_to_recon': 'bg-purple-100 text-purple-800',
  'inspection': 'bg-yellow-100 text-yellow-800',
  'mechanical': 'bg-orange-100 text-orange-800',
  'body_work': 'bg-red-100 text-red-800',
  'detailing': 'bg-cyan-100 text-cyan-800',
  'photos': 'bg-green-100 text-green-800',
  'needs_approval': 'bg-amber-100 text-amber-800',
  'wholesale': 'bg-gray-100 text-gray-800',
  'front_line': 'bg-emerald-100 text-emerald-800',
  'not_for_sale': 'bg-slate-100 text-slate-800',
  'cant_find_keys': 'bg-red-100 text-red-800'
};

export function WorkflowStatusGrid({ dealerId, orders, expanded = false }: WorkflowStatusGridProps) {
  const { t } = useTranslation();

  // Group orders by current step/status
  const workflowStats = useMemo(() => {
    const stats = new Map<string, {
      stepType: WorkflowStepType;
      count: number;
      orders: ReconOrderWithWorkflow[];
      avgDaysInStep: number;
    }>();

    orders.forEach(order => {
      // Determine current step based on status
      let currentStepType: WorkflowStepType = 'created';
      
      switch (order.status) {
        case 'pending':
          currentStepType = 'created';
          break;
        case 'in_progress':
          currentStepType = 'inspection'; // Default assumption
          break;
        case 'needs_approval':
          currentStepType = 'needs_approval';
          break;
        case 'completed':
          currentStepType = 'front_line';
          break;
        default:
          currentStepType = 'created';
      }

      const stepKey = currentStepType;
      
      if (!stats.has(stepKey)) {
        stats.set(stepKey, {
          stepType: currentStepType,
          count: 0,
          orders: [],
          avgDaysInStep: 0
        });
      }

      const stepStats = stats.get(stepKey)!;
      stepStats.count++;
      stepStats.orders.push(order);

      // Calculate days in current step (simplified)
      const daysInProcess = order.t2lMetrics ? 
        Math.ceil((Date.now() - new Date(order.t2lMetrics.acquisition_date).getTime()) / (1000 * 60 * 60 * 24)) : 0;
      
      stepStats.avgDaysInStep = (stepStats.avgDaysInStep * (stepStats.count - 1) + daysInProcess) / stepStats.count;
    });

    return Array.from(stats.values()).sort((a, b) => b.count - a.count);
  }, [orders]);

  const getStepDisplayName = (stepType: WorkflowStepType): string => {
    const translations: Record<WorkflowStepType, string> = {
      'created': t('reconHub.workflow.steps.created', 'Vehicle Created'),
      'bring_to_recon': t('reconHub.workflow.steps.bringToRecon', 'Bring to Recon'),
      'inspection': t('reconHub.workflow.steps.inspection', 'Inspection'),
      'mechanical': t('reconHub.workflow.steps.mechanical', 'Mechanical Work'),
      'body_work': t('reconHub.workflow.steps.bodyWork', 'Body Work'),
      'detailing': t('reconHub.workflow.steps.detailing', 'Detailing'),
      'photos': t('reconHub.workflow.steps.photos', 'Photography'),
      'needs_approval': t('reconHub.workflow.steps.needsApproval', 'Needs Approval'),
      'wholesale': t('reconHub.workflow.steps.wholesale', 'Wholesale'),
      'front_line': t('reconHub.workflow.steps.frontLine', 'Front Line Ready'),
      'not_for_sale': t('reconHub.workflow.steps.notForSale', 'Not For Sale'),
      'cant_find_keys': t('reconHub.workflow.steps.cantFindKeys', 'Can\'t Find Keys')
    };
    
    return translations[stepType] || stepType;
  };

  const totalActiveVehicles = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length;

  if (workflowStats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('reconHub.workflow.title', 'Workflow Status Overview')}</CardTitle>
          <CardDescription>
            {t('reconHub.workflow.description', 'Current distribution of vehicles across workflow steps')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {t('reconHub.workflow.noVehicles', 'No Active Vehicles')}
            </h3>
            <p className="text-muted-foreground">
              {t('reconHub.workflow.noVehiclesDescription', 'There are currently no vehicles in the reconditioning workflow')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const basicView = (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t('reconHub.workflow.title', 'Workflow Status Overview')}</CardTitle>
            <CardDescription>
              {t('reconHub.workflow.totalActive', '{{count}} vehicles currently active', { 
                count: totalActiveVehicles 
              })}
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-sm">
            {workflowStats.length} {t('reconHub.workflow.activeSteps', 'Active Steps')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {workflowStats.slice(0, 8).map((step) => {
            const IconComponent = STEP_ICONS[step.stepType];
            const colorClass = STEP_COLORS[step.stepType];
            const percentage = totalActiveVehicles > 0 ? (step.count / totalActiveVehicles) * 100 : 0;

            return (
              <Card key={step.stepType} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2 rounded-lg ${colorClass}`}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <Badge variant="secondary">{step.count}</Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm leading-tight">
                      {getStepDisplayName(step.stepType)}
                    </h4>
                    
                    <Progress value={percentage} className="h-1" />
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{percentage.toFixed(1)}% of total</span>
                      <span>{step.avgDaysInStep.toFixed(1)}d avg</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        {workflowStats.length > 8 && (
          <div className="mt-4 text-center">
            <Button variant="outline" size="sm">
              {t('reconHub.workflow.viewAll', 'View All {{count}} Steps', { 
                count: workflowStats.length 
              })}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (!expanded) {
    return basicView;
  }

  return (
    <div className="space-y-6">
      {basicView}
      
      {/* Detailed Workflow Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>{t('reconHub.workflow.detailedAnalysis', 'Detailed Workflow Analysis')}</CardTitle>
          <CardDescription>
            {t('reconHub.workflow.stepPerformance', 'Step-by-step performance and bottleneck analysis')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {workflowStats.map((step, index) => {
              const IconComponent = STEP_ICONS[step.stepType];
              const colorClass = STEP_COLORS[step.stepType];
              const percentage = totalActiveVehicles > 0 ? (step.count / totalActiveVehicles) * 100 : 0;
              const isBottleneck = step.avgDaysInStep > 2; // More than 2 days average

              return (
                <div key={step.stepType} className="flex items-center p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`p-3 rounded-lg ${colorClass}`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{getStepDisplayName(step.stepType)}</h4>
                        {isBottleneck && (
                          <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                            {t('reconHub.workflow.bottleneck', 'Bottleneck')}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <span>{step.count} vehicles ({percentage.toFixed(1)}%)</span>
                        <span>Avg: {step.avgDaysInStep.toFixed(1)} days</span>
                        <span>Rank: #{index + 1}</span>
                      </div>
                      
                      <Progress value={percentage} className="h-2 mt-2" />
                    </div>
                  </div>
                  
                  <Button variant="ghost" size="sm">
                    {t('reconHub.workflow.viewDetails', 'View Details')}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}