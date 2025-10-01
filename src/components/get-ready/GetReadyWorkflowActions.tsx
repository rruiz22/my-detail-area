import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useGetReady } from '@/hooks/useGetReady';
import { cn } from '@/lib/utils';
import {
    Activity,
    AlertTriangle,
    ArrowRight,
    CheckCircle2,
    Clock,
    RotateCcw,
    Settings,
    Shield,
    Target,
    TrendingUp,
    Users,
    Zap
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface GetReadyWorkflowActionsProps {
  expanded?: boolean;
  className?: string;
}

export function GetReadyWorkflowActions({ expanded = false, className }: GetReadyWorkflowActionsProps) {
  const { t } = useTranslation();
  const { steps, kpis, bottleneckAlerts, slaAlerts } = useGetReady();

  // Calculate action priorities based on current state
  const actionItems = [
    {
      id: 'resolve_bottlenecks',
      type: 'critical',
      title: 'Resolve Bottlenecks',
      description: `${bottleneckAlerts.length} bottlenecks detected`,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      count: bottleneckAlerts.length,
      action: () => console.log('Resolve bottlenecks'),
      priority: bottleneckAlerts.length > 0 ? 1 : 10
    },
    {
      id: 'sla_alerts',
      type: 'warning',
      title: 'SLA Alerts',
      description: `${slaAlerts.length} vehicles at risk`,
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      count: slaAlerts.length,
      action: () => console.log('Handle SLA alerts'),
      priority: slaAlerts.length > 0 ? 2 : 11
    },
    {
      id: 'optimize_workflow',
      type: 'improvement',
      title: 'Optimize Workflow',
      description: 'Review and improve processes',
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      count: 0,
      action: () => console.log('Optimize workflow'),
      priority: 3
    },
    {
      id: 'resource_allocation',
      type: 'management',
      title: 'Resource Allocation',
      description: 'Balance team workload',
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      count: 0,
      action: () => console.log('Allocate resources'),
      priority: 4
    },
    {
      id: 'quality_check',
      type: 'quality',
      title: 'Quality Review',
      description: 'Inspect completed work',
      icon: Shield,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      count: 0,
      action: () => console.log('Quality check'),
      priority: 5
    },
    {
      id: 'performance_review',
      type: 'analytics',
      title: 'Performance Review',
      description: 'Analyze team metrics',
      icon: Activity,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
      count: 0,
      action: () => console.log('Performance review'),
      priority: 6
    }
  ];

  // Sort by priority
  const prioritizedActions = actionItems.sort((a, b) => a.priority - b.priority);

  // Quick workflow actions
  const quickActions = [
    {
      label: 'Advance All Ready',
      icon: ArrowRight,
      variant: 'default' as const,
      action: () => console.log('Advance all ready vehicles')
    },
    {
      label: 'Run Quality Check',
      icon: CheckCircle2,
      variant: 'outline' as const,
      action: () => console.log('Run quality check')
    },
    {
      label: 'Reassign Tasks',
      icon: RotateCcw,
      variant: 'outline' as const,
      action: () => console.log('Reassign tasks')
    },
    {
      label: 'Workflow Settings',
      icon: Settings,
      variant: 'ghost' as const,
      action: () => console.log('Open settings')
    }
  ];

  if (!expanded) {
    return (
      <div className={cn("space-y-4", className)}>
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2">
          {quickActions.slice(0, 4).map((action, index) => (
            <Button
              key={index}
              variant={action.variant}
              size="sm"
              onClick={action.action}
              className="h-auto p-3 flex flex-col items-center gap-2 text-xs"
            >
              <action.icon className="h-4 w-4" />
              {action.label}
            </Button>
          ))}
        </div>

        {/* Priority Actions */}
        <div className="space-y-2">
          {prioritizedActions.slice(0, 3).map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border",
                item.bgColor,
                item.borderColor
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn("p-1.5 rounded-full bg-white", item.borderColor, "border")}>
                  <item.icon className={cn("h-4 w-4", item.color)} />
                </div>
                <div>
                  <div className="font-medium text-sm">{item.title}</div>
                  <div className="text-xs text-muted-foreground">{item.description}</div>
                </div>
              </div>
              {item.count > 0 && (
                <Badge variant="outline" className="ml-2">
                  {item.count}
                </Badge>
              )}
            </div>
          ))}
        </div>

        {/* Performance Summary */}
        {kpis && (
          <div className="pt-2 border-t">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <div className="text-muted-foreground">SLA Compliance</div>
                <div className="flex items-center gap-2">
                  <Progress value={kpis.slaCompliance * 100} className="h-1.5 flex-1" />
                  <span className="font-medium">{Math.round(kpis.slaCompliance * 100)}%</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-muted-foreground">Efficiency</div>
                <div className="flex items-center gap-2">
                  <Progress value={kpis.utilizationRate * 100} className="h-1.5 flex-1" />
                  <span className="font-medium">{Math.round(kpis.utilizationRate * 100)}%</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Expanded View
  return (
    <div className={cn("space-y-6", className)}>
      {/* Workflow Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Standard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">12</div>
              <div className="text-xs text-muted-foreground">Active vehicles</div>
              <Progress value={75} className="h-2" />
              <div className="text-xs text-muted-foreground">75% capacity</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-5 w-5 text-green-600" />
              Express
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">5</div>
              <div className="text-xs text-muted-foreground">Active vehicles</div>
              <Progress value={60} className="h-2" />
              <div className="text-xs text-muted-foreground">60% capacity</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-600" />
              Priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">3</div>
              <div className="text-xs text-muted-foreground">Active vehicles</div>
              <Progress value={90} className="h-2" />
              <div className="text-xs text-muted-foreground">90% capacity</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Items */}
      <Card>
        <CardHeader>
          <CardTitle>Action Items</CardTitle>
          <CardDescription>
            Priority tasks that require attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {prioritizedActions.map((item, index) => (
              <div key={item.id}>
                <div className={cn(
                  "flex items-center justify-between p-4 rounded-lg border transition-colors hover:bg-muted/50",
                  item.bgColor,
                  item.borderColor
                )}>
                  <div className="flex items-center gap-4">
                    <div className={cn("p-2 rounded-full", item.bgColor, item.borderColor, "border")}>
                      <item.icon className={cn("h-5 w-5", item.color)} />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{item.title}</div>
                      <div className="text-sm text-muted-foreground">{item.description}</div>
                      {item.type === 'critical' && item.count > 0 && (
                        <div className="text-xs text-red-600 font-medium mt-1">
                          Immediate action required
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {item.count > 0 && (
                      <Badge variant="outline" className={cn("font-bold", item.color)}>
                        {item.count}
                      </Badge>
                    )}
                    <Button onClick={item.action} size="sm">
                      Take Action
                    </Button>
                  </div>
                </div>
                {index < prioritizedActions.length - 1 && <Separator className="my-4" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common workflow operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant}
                onClick={action.action}
                className="h-auto p-4 flex flex-col items-center gap-3"
              >
                <action.icon className="h-6 w-6" />
                <span className="text-sm">{action.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      {kpis && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>
              Real-time workflow performance indicators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">SLA Compliance</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(kpis.slaCompliance * 100)}%
                  </span>
                </div>
                <Progress value={kpis.slaCompliance * 100} className="h-2" />
                <div className="text-xs text-muted-foreground">
                  Target: 90%
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Efficiency Rate</span>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(kpis.utilizationRate * 100)}%
                  </span>
                </div>
                <Progress value={kpis.utilizationRate * 100} className="h-2" />
                <div className="text-xs text-muted-foreground">
                  Target: 85%
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Daily Throughput</span>
                  <span className="text-sm text-muted-foreground">
                    {kpis.dailyThroughput}
                  </span>
                </div>
                <Progress value={Math.min(100, (kpis.dailyThroughput / 20) * 100)} className="h-2" />
                <div className="text-xs text-muted-foreground">
                  Target: 20/day
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Customer Satisfaction</span>
                  <span className="text-sm text-muted-foreground">
                    {kpis.customerSatisfaction}/5.0
                  </span>
                </div>
                <Progress value={(kpis.customerSatisfaction / 5) * 100} className="h-2" />
                <div className="text-xs text-muted-foreground">
                  Target: 4.5/5.0
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}




