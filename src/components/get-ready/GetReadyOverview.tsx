import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
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
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Cell } from 'recharts';
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

  // Workflow distribution calculation removed - workflow_type no longer exists

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

  // Calculate overall step average for all steps combined
  // This uses historicalStepAnalytics which is already filtered by timeRange (7d, 30d, 90d)
  const overallStepAverage = useMemo(() => {
    if (!historicalStepAnalytics || historicalStepAnalytics.length === 0) {
      return { avgDays: 0, totalSteps: 0, totalVehicles: 0, totalTransitions: 0 };
    }

    // Calculate weighted average across all steps based on historical data
    // Use total_transitions as the weight since it represents actual step activity in the time period
    let totalTimeWeighted = 0;
    let totalTransitions = 0;

    historicalStepAnalytics.forEach(step => {
      const transitions = step.total_transitions || 0;
      const avgTimeHours = step.avg_total_time || 0;

      totalTimeWeighted += (avgTimeHours / 24) * transitions; // Convert hours to days
      totalTransitions += transitions;
    });

    const avgDays = totalTransitions > 0 ? totalTimeWeighted / totalTransitions : 0;

    return {
      avgDays,
      totalSteps: historicalStepAnalytics.length,
      totalVehicles: allVehicles.length,
      totalTransitions
    };
  }, [historicalStepAnalytics, allVehicles]);

  // Prepare chart data for top 5 steps by avg time
  const stepChartData = useMemo(() => {
    if (!stepStats || stepStats.length === 0) {
      return [];
    }

    // Sort by avgDays (descending) and take top 5
    return stepStats
      .filter(s => {
        // Strict validation: must have valid avgDays and step name
        return s.avgDays > 0 &&
               !isNaN(s.avgDays) &&
               isFinite(s.avgDays) &&
               s.step_name;
      })
      .sort((a, b) => b.avgDays - a.avgDays)
      .slice(0, 5)
      .map(stat => ({
        name: stat.step_name,
        avgDays: parseFloat(stat.avgDays.toFixed(1)),
        color: stat.step?.color || '#6B7280',
        count: stat.count
      }));
  }, [stepStats]);

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

      {/* Average Time by Step Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Average Time by Step
          </CardTitle>
          <CardDescription>
            Top 5 steps with longest average processing time ({timeRange === '7d' ? 'last 7 days' : timeRange === '30d' ? 'last 30 days' : 'last 90 days'})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stepChartData.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              <div className="text-center">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">No step data available for the selected time range</p>
              </div>
            </div>
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={stepChartData}
                  layout="horizontal"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    type="number"
                    domain={[0, 'dataMax + 1']}
                    label={{ value: 'Days', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    tick={{ fontSize: 12 }}
                  />
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border bg-background p-3 shadow-lg">
                          <div className="font-semibold text-sm mb-1">{data.name}</div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>Average: <span className="font-semibold text-foreground">{data.avgDays} days</span></div>
                            <div>Vehicles: <span className="font-semibold text-foreground">{data.count}</span></div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="avgDays"
                    radius={[0, 4, 4, 0]}
                  >
                    {stepChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Executive KPIs */}
      <GetReadyDashboardWidget />

      {/* Enterprise Metrics Dashboard */}
      <GetReadyEnterpriseMetrics allVehicles={allVehicles} timeRange={timeRange} />

      {/* Workflow Distribution section removed - workflow_type no longer exists */}

      {/* Step Analysis & Priority Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Step Analysis - Overall Average */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Step Analysis
            </CardTitle>
            <CardDescription>Average time across all workflow steps</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Overall Average Display */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-indigo-50 border border-indigo-200">
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-indigo-100">
                    <Clock className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Average Time Per Step
                    </div>
                    <div className="text-3xl font-bold text-indigo-600 mt-1">
                      {overallStepAverage.avgDays.toFixed(1)}
                      <span className="text-lg text-muted-foreground ml-1">days</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Based on {timeRange === '7d' ? 'last 7 days' : timeRange === '30d' ? 'last 30 days' : 'last 90 days'}
                    </div>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div className="text-sm text-muted-foreground">{overallStepAverage.totalSteps} Steps</div>
                  <div className="text-sm text-muted-foreground">{overallStepAverage.totalVehicles} Vehicles</div>
                </div>
              </div>

              {/* Top Steps Summary */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Top Steps by Volume
                </div>
                <div className="space-y-2">
                  {stepStats.slice(0, 3).map((stat) => (
                    <div
                      key={stat.step_id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleNavigateToDetails(stat.step_id)}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: stat.step?.color || '#6B7280' }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{stat.step_name}</div>
                          <div className="text-xs text-muted-foreground">
                            Avg: {stat.avgDays.toFixed(1)}d
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="ml-2">{stat.count}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* View All Button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/get-ready/details')}
              >
                View All Steps
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
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

      {/* Quick Access section removed per user request */}

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
