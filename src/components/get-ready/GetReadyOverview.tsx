import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGetReady } from '@/hooks/useGetReady';
import { TimeRange, useStepRevisitAnalytics } from '@/hooks/useGetReadyHistoricalAnalytics';
import { useGetReadyStore } from '@/hooks/useGetReadyStore';
import { cn } from '@/lib/utils';
import {
    AlertTriangle,
    ArrowRight,
    Calendar,
    CheckCircle2,
    Clock,
    FileText,
    Layers,
    Shield,
    Target,
    TrendingUp,
    Users,
    Zap
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { GetReadyAlerts } from './GetReadyAlerts';
import { GetReadyDashboardWidget } from './GetReadyDashboardWidget';
import { GetReadyEnterpriseMetrics } from './GetReadyEnterpriseMetrics';
import { BottleneckAnalysis, StepPerformanceMatrix, TimeSeriesCharts } from './analytics';

interface GetReadyOverviewProps {
  className?: string;
  allVehicles: any[];
}

export function GetReadyOverview({ className, allVehicles }: GetReadyOverviewProps) {
  const { t } = useTranslation();
  const { steps } = useGetReady();
  const { setSelectedStepId } = useGetReadyStore();
  const navigate = useNavigate();

  // Time Range State with localStorage persistence
  const [timeRange, setTimeRange] = useState<TimeRange>(() => {
    const stored = localStorage.getItem('getReady.overview.timeRange');
    return (stored as TimeRange) || '30d';
  });

  // Persist time range selection
  useEffect(() => {
    localStorage.setItem('getReady.overview.timeRange', timeRange);
  }, [timeRange]);

  // Fetch historical step analytics for accurate average days calculation
  const { data: historicalStepAnalytics } = useStepRevisitAnalytics(timeRange);

  // Calculate workflow distribution
  const workflowStats = useMemo(() => {
    const stats = {
      standard: { count: 0, avgT2L: 0, totalT2L: 0 },
      express: { count: 0, avgT2L: 0, totalT2L: 0 },
      priority: { count: 0, avgT2L: 0, totalT2L: 0 },
    };

    allVehicles.forEach(v => {
      if (stats[v.workflow_type as keyof typeof stats]) {
        stats[v.workflow_type as keyof typeof stats].count++;
        const t2l = parseFloat(v.t2l) || 0;
        stats[v.workflow_type as keyof typeof stats].totalT2L += t2l;
      }
    });

    // Calculate averages
    Object.keys(stats).forEach(key => {
      const workflow = stats[key as keyof typeof stats];
      workflow.avgT2L = workflow.count > 0 ? workflow.totalT2L / workflow.count : 0;
    });

    return stats;
  }, [allVehicles]);

  // Calculate priority breakdown
  const priorityStats = useMemo(() => {
    const stats = {
      urgent: { count: 0, atRisk: 0 },
      high: { count: 0, atRisk: 0 },
      medium: { count: 0, atRisk: 0 },
      normal: { count: 0, atRisk: 0 },
      low: { count: 0, atRisk: 0 },
    };

    allVehicles.forEach(v => {
      const priority = v.priority || 'normal';
      if (stats[priority as keyof typeof stats]) {
        stats[priority as keyof typeof stats].count++;
        if (v.sla_status === 'warning' || v.sla_status === 'critical' || v.sla_status === 'red') {
          stats[priority as keyof typeof stats].atRisk++;
        }
      }
    });

    return stats;
  }, [allVehicles]);

  // Calculate work items summary
  const workItemsTotal = useMemo(() => {
    const total = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      declined: 0,
    };

    allVehicles.forEach(v => {
      if (v.work_item_counts) {
        total.pending += v.work_item_counts.pending || 0;
        total.in_progress += v.work_item_counts.in_progress || 0;
        total.completed += v.work_item_counts.completed || 0;
        total.declined += v.work_item_counts.declined || 0;
      }
    });

    const totalItems = total.pending + total.in_progress + total.completed + total.declined;
    const completionRate = totalItems > 0 ? (total.completed / totalItems) * 100 : 0;

    return { ...total, totalItems, completionRate };
  }, [allVehicles]);

  // Calculate step analysis with historical averages
  const stepStats = useMemo(() => {
    // First, get current vehicle counts and at-risk counts
    const stepMap = new Map();

    allVehicles.forEach(v => {
      if (!stepMap.has(v.step_id)) {
        stepMap.set(v.step_id, {
          step_id: v.step_id,
          step_name: v.step_name,
          count: 0,
          atRisk: 0,
        });
      }

      const stats = stepMap.get(v.step_id);
      stats.count++;
      if (v.sla_status === 'warning' || v.sla_status === 'critical' || v.sla_status === 'red') {
        stats.atRisk++;
      }
    });

    // Merge with historical analytics for accurate average days
    return Array.from(stepMap.values())
      .map(s => {
        const historicalData = historicalStepAnalytics?.find(h => h.step_id === s.step_id);
        const avgDays = historicalData
          ? historicalData.avg_total_time / 24  // Convert hours to days
          : 0; // Fallback if no historical data

        return {
          ...s,
          avgDays,
          revisitRate: historicalData?.revisit_rate || 0,
          step: steps.find(step => step.id === s.step_id)
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [allVehicles, steps, historicalStepAnalytics]);

  // Calculate team performance
  const teamStats = useMemo(() => {
    const teamMap = new Map();

    allVehicles.forEach(v => {
      const assignee = v.assigned_to || 'Unassigned';
      if (!teamMap.has(assignee)) {
        teamMap.set(assignee, {
          name: assignee,
          vehicles: 0,
          completed: 0,
          totalT2L: 0,
        });
      }

      const stats = teamMap.get(assignee);
      stats.vehicles++;
      stats.totalT2L += parseFloat(v.t2l) || 0;

      // Count as completed if at "ready" step
      if (v.step_id === 'ready' || v.step_name?.toLowerCase().includes('ready')) {
        stats.completed++;
      }
    });

    return Array.from(teamMap.values())
      .map(t => ({
        ...t,
        avgT2L: t.vehicles > 0 ? t.totalT2L / t.vehicles : 0,
        completionRate: t.vehicles > 0 ? (t.completed / t.vehicles) * 100 : 0,
      }))
      .sort((a, b) => b.vehicles - a.vehicles)
      .slice(0, 5); // Top 5 team members
  }, [allVehicles]);

  // Calculate recent activity (last 24h)
  const recentActivity = useMemo(() => {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const vehiclesAdded = allVehicles.filter(v => {
      const created = new Date(v.created_at);
      return created >= last24h;
    }).length;

    const vehiclesCompleted = allVehicles.filter(v => {
      return v.step_id === 'ready' || v.step_name?.toLowerCase().includes('ready');
    }).length;

    return {
      vehiclesAdded,
      vehiclesCompleted,
      totalActive: allVehicles.length,
    };
  }, [allVehicles]);

  const handleNavigateToDetails = (stepId?: string, filters?: any) => {
    if (stepId) {
      setSelectedStepId(stepId);
    }
    navigate('/get-ready/details');
  };

  const totalVehicles = allVehicles.length;

  const handleStepClick = (stepId: string) => {
    setSelectedStepId(stepId);
    navigate('/get-ready/details');
  };

  return (
    <div className={cn("h-full overflow-auto space-y-6 p-6", className)}>
      {/* Time Range Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">{t('get_ready.analytics.timeRange')}:</span>
            </div>
            <Tabs value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
              <TabsList>
                <TabsTrigger value="7d">
                  {t('get_ready.analytics.last7Days')}
                </TabsTrigger>
                <TabsTrigger value="30d">
                  {t('get_ready.analytics.last30Days')}
                </TabsTrigger>
                <TabsTrigger value="90d">
                  {t('get_ready.analytics.last90Days')}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Executive KPIs */}
      <GetReadyDashboardWidget />

      {/* Enterprise Metrics Dashboard */}
      <GetReadyEnterpriseMetrics allVehicles={allVehicles} timeRange={timeRange} />

      {/* Workflow Distribution */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Workflow Distribution</h3>
        <div className="grid gap-4 md:grid-cols-3">
          {/* Standard Workflow */}
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleNavigateToDetails()}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                Standard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold">{workflowStats.standard.count}</div>
                <div className="text-sm text-muted-foreground">
                  ({totalVehicles > 0 ? Math.round((workflowStats.standard.count / totalVehicles) * 100) : 0}%)
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Avg T2L: {workflowStats.standard.avgT2L.toFixed(1)}d
              </div>
              <Progress
                value={totalVehicles > 0 ? (workflowStats.standard.count / totalVehicles) * 100 : 0}
                className="h-2"
              />
            </CardContent>
          </Card>

          {/* Express Workflow */}
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleNavigateToDetails()}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-5 w-5 text-emerald-600" />
                Express
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold">{workflowStats.express.count}</div>
                <div className="text-sm text-muted-foreground">
                  ({totalVehicles > 0 ? Math.round((workflowStats.express.count / totalVehicles) * 100) : 0}%)
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Avg T2L: {workflowStats.express.avgT2L.toFixed(1)}d
              </div>
              <Progress
                value={totalVehicles > 0 ? (workflowStats.express.count / totalVehicles) * 100 : 0}
                className="h-2"
              />
            </CardContent>
          </Card>

          {/* Priority Workflow */}
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleNavigateToDetails()}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-5 w-5 text-purple-600" />
                Priority
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold">{workflowStats.priority.count}</div>
                <div className="text-sm text-muted-foreground">
                  ({totalVehicles > 0 ? Math.round((workflowStats.priority.count / totalVehicles) * 100) : 0}%)
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Avg T2L: {workflowStats.priority.avgT2L.toFixed(1)}d
              </div>
              <Progress
                value={totalVehicles > 0 ? (workflowStats.priority.count / totalVehicles) * 100 : 0}
                className="h-2"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Step Analysis & Priority Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Step Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Step Analysis
            </CardTitle>
            <CardDescription>Vehicle distribution by workflow step</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stepStats.slice(0, 6).map((stat, index) => (
                <div
                  key={stat.step_id}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleNavigateToDetails(stat.step_id)}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: stat.step?.color || '#6B7280' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{stat.step_name}</div>
                      <div className="text-xs text-muted-foreground">
                        Avg: {stat.avgDays.toFixed(1)}d
                        {stat.atRisk > 0 && (
                          <span className="text-amber-600 ml-2">• {stat.atRisk} at risk</span>
                        )}
                        {stat.revisitRate > 10 && (
                          <span className="text-blue-600 ml-2">• {stat.revisitRate.toFixed(0)}% revisit</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{stat.count}</Badge>
                    {stat.atRisk > 0 && (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Priority Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Priority Breakdown
            </CardTitle>
            <CardDescription>Vehicle priority distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(priorityStats).map(([priority, stats]) => {
                const getPriorityColor = (p: string) => {
                  switch (p) {
                    case 'urgent': return 'bg-red-100 text-red-700';
                    case 'high': return 'bg-orange-100 text-orange-700';
                    case 'medium': return 'bg-yellow-100 text-yellow-700';
                    case 'normal': return 'bg-blue-100 text-blue-700';
                    case 'low': return 'bg-gray-100 text-gray-700';
                    default: return 'bg-gray-100 text-gray-700';
                  }
                };

                if (stats.count === 0) return null;

                return (
                  <div key={priority} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Badge className={cn("capitalize", getPriorityColor(priority))}>
                        {priority}
                      </Badge>
                      {stats.atRisk > 0 && (
                        <span className="text-xs text-amber-600 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {stats.atRisk} at risk
                        </span>
                      )}
                    </div>
                    <div className="text-lg font-semibold">{stats.count}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Work Items Summary & Team Performance */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Work Items Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Work Items Summary
            </CardTitle>
            <CardDescription>Aggregate work items across all vehicles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Pending</div>
                  <div className="text-2xl font-bold text-amber-600">{workItemsTotal.pending}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">In Progress</div>
                  <div className="text-2xl font-bold text-sky-600">{workItemsTotal.in_progress}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Completed</div>
                  <div className="text-2xl font-bold text-emerald-600">{workItemsTotal.completed}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Total Items</div>
                  <div className="text-2xl font-bold">{workItemsTotal.totalItems}</div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Completion Rate</span>
                  <span className="text-muted-foreground">{workItemsTotal.completionRate.toFixed(1)}%</span>
                </div>
                <Progress value={workItemsTotal.completionRate} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Performance
            </CardTitle>
            <CardDescription>Top performers by vehicle count</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {teamStats.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No team data available
                </div>
              ) : (
                teamStats.map((member, index) => (
                  <div key={member.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0">
                          {index + 1}
                        </Badge>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{member.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Avg T2L: {member.avgT2L.toFixed(1)}d
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold">{member.vehicles}</div>
                      <div className="text-xs text-muted-foreground">vehicles</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Activity (Last 24h)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{recentActivity.vehiclesAdded}</div>
                <div className="text-xs text-muted-foreground">Vehicles Added</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              <div>
                <div className="text-2xl font-bold">{recentActivity.vehiclesCompleted}</div>
                <div className="text-xs text-muted-foreground">Ready for Frontline</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 border border-purple-100">
              <Layers className="h-8 w-8 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">{recentActivity.totalActive}</div>
                <div className="text-xs text-muted-foreground">Total Active</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Access to Details */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Access</CardTitle>
          <CardDescription>Jump to specific views with pre-applied filters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {stepStats.filter(s => s.atRisk > 0).length > 0 && (
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-start gap-2 text-left border-amber-200 bg-amber-50 hover:bg-amber-100"
                onClick={() => handleNavigateToDetails()}
              >
                <div className="flex items-center gap-2 w-full">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium">SLA Risk</span>
                </div>
                <div className="text-2xl font-bold text-amber-600">
                  {stepStats.reduce((sum, s) => sum + s.atRisk, 0)}
                </div>
                <div className="text-xs text-muted-foreground">vehicles at risk</div>
              </Button>
            )}

            {workItemsTotal.pending > 0 && (
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-start gap-2 text-left"
                onClick={() => handleNavigateToDetails()}
              >
                <div className="flex items-center gap-2 w-full">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm font-medium">Pending Work</span>
                </div>
                <div className="text-2xl font-bold">{workItemsTotal.pending}</div>
                <div className="text-xs text-muted-foreground">work items</div>
              </Button>
            )}

            {priorityStats.urgent.count > 0 && (
              <Button
                variant="outline"
                className="h-auto p-4 flex flex-col items-start gap-2 text-left border-red-200 bg-red-50 hover:bg-red-100"
                onClick={() => handleNavigateToDetails()}
              >
                <div className="flex items-center gap-2 w-full">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">Urgent</span>
                </div>
                <div className="text-2xl font-bold text-red-600">{priorityStats.urgent.count}</div>
                <div className="text-xs text-muted-foreground">vehicles</div>
              </Button>
            )}

            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-center justify-center gap-2"
              onClick={() => handleNavigateToDetails()}
            >
              <ArrowRight className="h-5 w-5" />
              <span className="text-sm font-medium">View All Vehicles</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Historical Analytics Section - RE-ENABLED with improved caching */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">{t('get_ready.analytics.historicalAnalytics')}</h2>
        </div>

        {/* Time Series Charts */}
        <TimeSeriesCharts timeRange={timeRange} />

        {/* Bottleneck Detection */}
        <BottleneckAnalysis
          timeRange={timeRange}
          onStepClick={handleStepClick}
          onViewAffectedVehicles={handleStepClick}
        />

        {/* Step Performance Matrix */}
        <StepPerformanceMatrix
          timeRange={timeRange}
          onStepClick={handleStepClick}
        />
      </div>
    </div>
  );
}
