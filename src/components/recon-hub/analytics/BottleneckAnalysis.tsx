import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Clock, Zap, Target, TrendingUp, Wrench } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { ReconOrderWithWorkflow, WorkflowStepType } from '@/types/recon-hub';

interface BottleneckAnalysisProps {
  dealerId: number;
  orders: ReconOrderWithWorkflow[];
  loading?: boolean;
}

interface BottleneckData {
  stepType: WorkflowStepType;
  stepName: string;
  vehicleCount: number;
  averageDays: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  impactScore: number;
}

const COLORS = ['hsl(var(--destructive))', 'hsl(var(--warning))', 'hsl(var(--success))', 'hsl(var(--primary))'];

export function BottleneckAnalysis({ dealerId, orders, loading = false }: BottleneckAnalysisProps) {
  const { t } = useTranslation();

  // Analyze bottlenecks
  const bottleneckData = useMemo((): BottleneckData[] => {
    if (!orders.length) return [];

    const stepAnalysis = new Map<WorkflowStepType, {
      count: number;
      totalDays: number;
      vehicles: string[];
    }>();

    // Process active orders to identify bottlenecks
    orders.forEach(order => {
      if (order.status === 'completed' || order.status === 'cancelled') return;

      // Simulate workflow step analysis (in real implementation, this would come from step instances)
      const currentStep = order.status as WorkflowStepType;
      const daysInStep = order.t2lMetrics ? 
        Math.ceil((Date.now() - new Date(order.t2lMetrics.acquisition_date).getTime()) / (1000 * 60 * 60 * 24)) : 0;

      if (!stepAnalysis.has(currentStep)) {
        stepAnalysis.set(currentStep, { count: 0, totalDays: 0, vehicles: [] });
      }

      const stepData = stepAnalysis.get(currentStep)!;
      stepData.count += 1;
      stepData.totalDays += daysInStep;
      stepData.vehicles.push(order.id);
    });

    // Convert to bottleneck data with severity scoring
    const bottlenecks: BottleneckData[] = Array.from(stepAnalysis.entries()).map(([stepType, data]) => {
      const averageDays = data.count > 0 ? data.totalDays / data.count : 0;
      const vehicleCount = data.count;
      
      // Calculate impact score based on count and duration
      const impactScore = (vehicleCount * 0.6) + (averageDays * 0.4);
      
      let severity: BottleneckData['severity'] = 'low';
      if (impactScore >= 8) severity = 'critical';
      else if (impactScore >= 6) severity = 'high';
      else if (impactScore >= 4) severity = 'medium';

      return {
        stepType,
        stepName: getStepDisplayName(stepType),
        vehicleCount,
        averageDays,
        severity,
        impactScore
      };
    });

    return bottlenecks.sort((a, b) => b.impactScore - a.impactScore);
  }, [orders, t]);

  function getStepDisplayName(stepType: WorkflowStepType): string {
    const stepNames: Record<WorkflowStepType, string> = {
      'created': t('reconHub.workflow.steps.created', 'Created'),
      'bring_to_recon': t('reconHub.workflow.steps.bringToRecon', 'Bring to Recon'),
      'inspection': t('reconHub.workflow.steps.inspection', 'Inspection'),
      'mechanical': t('reconHub.workflow.steps.mechanical', 'Mechanical'),
      'body_work': t('reconHub.workflow.steps.bodyWork', 'Body Work'),
      'detailing': t('reconHub.workflow.steps.detailing', 'Detailing'),
      'photos': t('reconHub.workflow.steps.photos', 'Photos'),
      'needs_approval': t('reconHub.workflow.steps.needsApproval', 'Needs Approval'),
      'wholesale': t('reconHub.workflow.steps.wholesale', 'Wholesale'),
      'front_line': t('reconHub.workflow.steps.frontLine', 'Front Line'),
      'not_for_sale': t('reconHub.workflow.steps.notForSale', 'Not for Sale'),
      'cant_find_keys': t('reconHub.workflow.steps.cantFindKeys', 'Can\'t Find Keys')
    };
    return stepNames[stepType] || stepType;
  }

  // Recommendations based on analysis
  const recommendations = useMemo(() => {
    if (!bottleneckData.length) return [];

    const recs = [];
    const criticalBottlenecks = bottleneckData.filter(b => b.severity === 'critical');
    const highBottlenecks = bottleneckData.filter(b => b.severity === 'high');

    if (criticalBottlenecks.length > 0) {
      recs.push({
        type: 'critical',
        icon: AlertTriangle,
        title: t('reconHub.bottlenecks.criticalAction', 'Critical Action Required'),
        description: t('reconHub.bottlenecks.criticalDesc', '{{count}} critical bottleneck(s) detected. Immediate attention needed.', {
          count: criticalBottlenecks.length
        }),
        actions: criticalBottlenecks.map(b => 
          t('reconHub.bottlenecks.criticalActionItem', 'Address {{step}} delays ({{count}} vehicles, {{days}} avg days)', {
            step: b.stepName,
            count: b.vehicleCount,
            days: b.averageDays.toFixed(1)
          })
        )
      });
    }

    if (highBottlenecks.length > 0) {
      recs.push({
        type: 'high',
        icon: Clock,
        title: t('reconHub.bottlenecks.optimizeWorkflow', 'Optimize Workflow'),
        description: t('reconHub.bottlenecks.highDesc', 'High-impact bottlenecks identified. Consider process improvements.'),
        actions: highBottlenecks.map(b =>
          t('reconHub.bottlenecks.highActionItem', 'Optimize {{step}} process ({{count}} vehicles)', {
            step: b.stepName,
            count: b.vehicleCount
          })
        )
      });
    }

    // Resource allocation recommendations
    const topBottleneck = bottleneckData[0];
    if (topBottleneck && topBottleneck.vehicleCount >= 3) {
      recs.push({
        type: 'resource',
        icon: Zap,
        title: t('reconHub.bottlenecks.resourceAllocation', 'Resource Allocation'),
        description: t('reconHub.bottlenecks.resourceDesc', 'Consider allocating additional resources to high-traffic steps.'),
        actions: [
          t('reconHub.bottlenecks.addCapacity', 'Add capacity to {{step}} ({{count}} vehicles waiting)', {
            step: topBottleneck.stepName,
            count: topBottleneck.vehicleCount
          })
        ]
      });
    }

    return recs;
  }, [bottleneckData, t]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bottleneck Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {t('reconHub.bottlenecks.title', 'Bottleneck Analysis')}
          </CardTitle>
          <CardDescription>
            {t('reconHub.bottlenecks.description', 'Identify and resolve workflow bottlenecks affecting T2L performance')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bottleneckData.length === 0 ? (
            <div className="text-center py-8">
              <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {t('reconHub.bottlenecks.noBottlenecks', 'No Bottlenecks Detected')}
              </h3>
              <p className="text-muted-foreground">
                {t('reconHub.bottlenecks.noBottlenecksDesc', 'Your workflow is running smoothly!')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bottleneck Impact Chart */}
              <div>
                <h4 className="text-sm font-medium mb-4">
                  {t('reconHub.bottlenecks.impactAnalysis', 'Impact Analysis')}
                </h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={bottleneckData.slice(0, 5)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="stepName" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'impactScore' ? Number(value).toFixed(1) : value,
                        name === 'impactScore' ? 'Impact Score' : name
                      ]}
                    />
                    <Bar 
                      dataKey="impactScore" 
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Distribution Chart */}
              <div>
                <h4 className="text-sm font-medium mb-4">
                  {t('reconHub.bottlenecks.severityDistribution', 'Severity Distribution')}
                </h4>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Critical', value: bottleneckData.filter(b => b.severity === 'critical').length },
                        { name: 'High', value: bottleneckData.filter(b => b.severity === 'high').length },
                        { name: 'Medium', value: bottleneckData.filter(b => b.severity === 'medium').length },
                        { name: 'Low', value: bottleneckData.filter(b => b.severity === 'low').length }
                      ].filter(item => item.value > 0)}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {bottleneckData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Bottleneck List */}
      {bottleneckData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('reconHub.bottlenecks.detailedAnalysis', 'Detailed Analysis')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bottleneckData.map((bottleneck, index) => (
                <div
                  key={bottleneck.stepType}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-bold text-muted-foreground">
                      #{index + 1}
                    </div>
                    <div>
                      <h4 className="font-semibold">{bottleneck.stepName}</h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{bottleneck.vehicleCount} vehicles</span>
                        <span>•</span>
                        <span>{bottleneck.averageDays.toFixed(1)} avg days</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Impact Score</div>
                      <div className="font-semibold">{bottleneck.impactScore.toFixed(1)}</div>
                    </div>
                    <Badge variant={
                      bottleneck.severity === 'critical' ? 'destructive' :
                      bottleneck.severity === 'high' ? 'destructive' :
                      bottleneck.severity === 'medium' ? 'secondary' :
                      'outline'
                    }>
                      {t(`reconHub.bottlenecks.severity.${bottleneck.severity}`, bottleneck.severity)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              {t('reconHub.bottlenecks.recommendations', 'Recommendations')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recommendations.map((rec, index) => {
              const IconComponent = rec.icon;
              return (
                <Alert key={index} className={
                  rec.type === 'critical' ? 'border-destructive bg-destructive/5' :
                  rec.type === 'high' ? 'border-warning bg-warning/5' :
                  'border-primary bg-primary/5'
                }>
                  <IconComponent className="h-4 w-4" />
                  <div>
                    <h4 className="font-semibold mb-2">{rec.title}</h4>
                    <AlertDescription className="mb-3">
                      {rec.description}
                    </AlertDescription>
                    <ul className="space-y-1 text-sm">
                      {rec.actions.map((action, actionIndex) => (
                        <li key={actionIndex} className="flex items-start gap-2">
                          <div className="w-1 h-1 bg-current rounded-full mt-2 flex-shrink-0" />
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Alert>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}