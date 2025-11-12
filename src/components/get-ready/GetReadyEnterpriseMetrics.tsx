import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TimeRange } from '@/hooks/useGetReadyHistoricalAnalytics';
import { cn } from '@/lib/utils';
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  DollarSign,
  HelpCircle,
  Minus,
  TrendingDown,
  TrendingUp,
  Users
} from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

interface EnterpriseMetricsProps {
  className?: string;
  allVehicles: any[];
  timeRange?: TimeRange;
}

interface MetricThresholds {
  excellent: number;
  good: number;
  warning: number;
}

export function GetReadyEnterpriseMetrics({ className, allVehicles, timeRange = '30d' }: EnterpriseMetricsProps) {
  const { t } = useTranslation();

  // =====================================================
  // DATE FILTERING BASED ON TIME RANGE
  // =====================================================

  const filteredVehicles = useMemo(() => {
    const now = new Date();
    const daysMap: Record<TimeRange, number> = {
      '7d': 7,
      '30d': 30,
      '90d': 90
    };
    const days = daysMap[timeRange];
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return allVehicles.filter(v => {
      // Filter by created_at or intake_date
      const vehicleDate = new Date(v.created_at || v.intake_date || v.updated_at);
      return vehicleDate >= cutoffDate;
    });
  }, [allVehicles, timeRange]);

  // =====================================================
  // HERO METRICS CALCULATIONS
  // =====================================================

  // Cost Per Vehicle
  const costPerVehicle = useMemo(() => {
    const totalCost = filteredVehicles.reduce((sum, v) =>
      sum + (parseFloat(v.total_holding_costs || v.holding_cost) || 0), 0
    );
    return filteredVehicles.length > 0 ? totalCost / filteredVehicles.length : 0;
  }, [filteredVehicles]);

  // First Pass Yield (vehicles completed without rework)
  const firstPassYield = useMemo(() => {
    const completedVehicles = filteredVehicles.filter(v =>
      v.step_id === 'ready' || v.step_name?.toLowerCase().includes('ready')
    );

    if (completedVehicles.length === 0) return 0;

    const withoutRework = completedVehicles.filter(v =>
      !v.work_item_counts?.declined || v.work_item_counts.declined === 0
    );

    return (withoutRework.length / completedVehicles.length) * 100;
  }, [filteredVehicles]);

  // Active Rework Rate (declined work items / total work items)
  const reworkRate = useMemo(() => {
    let totalItems = 0;
    let declinedItems = 0;

    filteredVehicles.forEach(v => {
      if (v.work_item_counts) {
        const counts = v.work_item_counts;
        const total = (counts.pending || 0) + (counts.in_progress || 0) +
                     (counts.completed || 0) + (counts.declined || 0);
        totalItems += total;
        declinedItems += counts.declined || 0;
      }
    });

    return totalItems > 0 ? (declinedItems / totalItems) * 100 : 0;
  }, [filteredVehicles]);

  // Team Utilization (vehicles per person vs target)
  const teamUtilization = useMemo(() => {
    const teamMap = new Map();

    filteredVehicles.forEach(v => {
      const assignee = v.assigned_to || 'Unassigned';
      if (assignee !== 'Unassigned') {
        teamMap.set(assignee, (teamMap.get(assignee) || 0) + 1);
      }
    });

    if (teamMap.size === 0) return 0;

    const avgVehiclesPerPerson = Array.from(teamMap.values())
      .reduce((sum, count) => sum + count, 0) / teamMap.size;

    const targetVehiclesPerPerson = 8; // Configurable target
    return Math.min(100, (avgVehiclesPerPerson / targetVehiclesPerPerson) * 100);
  }, [filteredVehicles]);

  // =====================================================
  // FINANCIAL PERFORMANCE CALCULATIONS
  // =====================================================

  const financialBreakdown = useMemo(() => {
    // Calculate total costs for all vehicles (workflow_type removed)
    let totalCost = 0;
    let count = 0;

    filteredVehicles.forEach(v => {
      const cost = parseFloat(v.total_holding_costs || v.holding_cost) || 0;
      totalCost += cost;
      count++;
    });

    const avgCost = count > 0 ? totalCost / count : 0;

    return {
      total: { count, totalCost, avgCost }
    };
  }, [filteredVehicles]);

  // ROI Estimation (simplified)
  const roiEstimation = useMemo(() => {
    const totalCost = filteredVehicles.reduce((sum, v) =>
      sum + (parseFloat(v.total_holding_costs || v.holding_cost) || 0), 0
    );

    const completedCount = filteredVehicles.filter(v =>
      v.step_id === 'ready' || v.step_name?.toLowerCase().includes('ready')
    ).length;

    // Simplified ROI: assume $50/day savings per completed vehicle
    const estimatedSavings = completedCount * 50 * 7; // Weekly savings
    const roi = totalCost > 0 ? ((estimatedSavings - totalCost) / totalCost) * 100 : 0;

    return {
      totalCost,
      estimatedSavings,
      roi,
      completedCount
    };
  }, [filteredVehicles]);

  // =====================================================
  // QUALITY & EFFICIENCY METRICS
  // =====================================================

  const qualityMetrics = useMemo(() => {
    // First Pass Yield Trend (mock - would need historical data)
    const fpyTrend = firstPassYield > 85 ? 'up' : firstPassYield > 70 ? 'stable' : 'down';

    // Rework Incidents Count
    const reworkIncidents = filteredVehicles.reduce((sum, v) =>
      sum + (v.work_item_counts?.declined || 0), 0
    );

    // Quality Score per Step (simplified)
    const stepQuality = new Map();
    filteredVehicles.forEach(v => {
      const stepId = v.step_id;
      if (!stepQuality.has(stepId)) {
        stepQuality.set(stepId, { total: 0, quality: 0 });
      }
      const stats = stepQuality.get(stepId);
      stats.total++;
      // Quality based on days in step vs SLA
      const daysInStep = parseFloat(v.days_in_step) || 0;
      const slaHours = 48; // Default
      const qualityScore = Math.max(0, 100 - ((daysInStep * 24) / slaHours) * 10);
      stats.quality += qualityScore;
    });

    return {
      fpyTrend,
      reworkIncidents,
      stepQuality: Array.from(stepQuality.entries()).map(([stepId, stats]) => ({
        stepId,
        avgQuality: stats.total > 0 ? stats.quality / stats.total : 0
      }))
    };
  }, [filteredVehicles, firstPassYield]);

  const efficiencyMetrics = useMemo(() => {
    // Avg Days Per Step
    const stepDays = new Map();
    filteredVehicles.forEach(v => {
      const stepId = v.step_id;
      if (!stepDays.has(stepId)) {
        stepDays.set(stepId, { total: 0, days: 0 });
      }
      const stats = stepDays.get(stepId);
      stats.total++;
      stats.days += parseFloat(v.days_in_step) || 0;
    });

    const avgDaysPerStep = Array.from(stepDays.entries()).map(([stepId, stats]) => ({
      stepId,
      avgDays: stats.total > 0 ? stats.days / stats.total : 0
    }));

    // Transition Time (simplified - time between steps)
    const avgTransitionTime = 0.5; // Mock value in days

    return {
      avgDaysPerStep,
      avgTransitionTime,
      utilizationRate: teamUtilization
    };
  }, [filteredVehicles, teamUtilization]);

  // =====================================================
  // TEAM PERFORMANCE
  // =====================================================

  const teamPerformance = useMemo(() => {
    const teamMap = new Map();

    filteredVehicles.forEach(v => {
      const assignee = v.assigned_to || 'Unassigned';
      if (assignee === 'Unassigned') return;

      if (!teamMap.has(assignee)) {
        teamMap.set(assignee, {
          name: assignee,
          vehiclesCount: 0,
          totalT2L: 0,
          completed: 0
        });
      }

      const member = teamMap.get(assignee);
      member.vehiclesCount++;
      member.totalT2L += parseFloat(v.t2l) || 0;

      if (v.step_id === 'ready' || v.step_name?.toLowerCase().includes('ready')) {
        member.completed++;
      }
    });

    return Array.from(teamMap.values())
      .map(member => ({
        ...member,
        avgT2L: member.vehiclesCount > 0 ? member.totalT2L / member.vehiclesCount : 0,
        completionRate: member.vehiclesCount > 0 ? (member.completed / member.vehiclesCount) * 100 : 0,
        qualityScore: Math.max(0, 100 - (member.avgT2L * 2)) // Simplified quality score
      }))
      .sort((a, b) => b.vehiclesCount - a.vehiclesCount)
      .slice(0, 5);
  }, [filteredVehicles]);

  // =====================================================
  // HELPER FUNCTIONS
  // =====================================================

  const getMetricColor = (value: number, thresholds: MetricThresholds, inverse = false) => {
    if (inverse) {
      // For metrics where lower is better (cost, rework rate)
      if (value <= thresholds.excellent) return 'text-emerald-600';
      if (value <= thresholds.good) return 'text-gray-600';
      if (value <= thresholds.warning) return 'text-amber-600';
      return 'text-red-600';
    } else {
      // For metrics where higher is better (yield, utilization)
      if (value >= thresholds.excellent) return 'text-emerald-600';
      if (value >= thresholds.good) return 'text-gray-600';
      if (value >= thresholds.warning) return 'text-amber-600';
      return 'text-red-600';
    }
  };

  const getBgColor = (value: number, thresholds: MetricThresholds, inverse = false) => {
    if (inverse) {
      if (value <= thresholds.excellent) return 'bg-emerald-50 border-emerald-200';
      if (value <= thresholds.good) return 'bg-gray-50 border-gray-200';
      if (value <= thresholds.warning) return 'bg-amber-50 border-amber-200';
      return 'bg-red-50 border-red-200';
    } else {
      if (value >= thresholds.excellent) return 'bg-emerald-50 border-emerald-200';
      if (value >= thresholds.good) return 'bg-gray-50 border-gray-200';
      if (value >= thresholds.warning) return 'bg-amber-50 border-amber-200';
      return 'bg-red-50 border-red-200';
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable', isImprovement: boolean) => {
    if (trend === 'stable') return <Minus className="h-4 w-4 text-gray-500" />;
    if (trend === 'up') {
      return isImprovement ?
        <TrendingUp className="h-4 w-4 text-emerald-600" /> :
        <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return isImprovement ?
      <TrendingDown className="h-4 w-4 text-emerald-600" /> :
      <TrendingUp className="h-4 w-4 text-red-600" />;
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <TooltipProvider>
      <div className={cn('space-y-6', className)}>
        {/* HERO METRICS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Cost Per Vehicle */}
          <Card className={cn('transition-all hover:shadow-lg cursor-pointer',
            getBgColor(costPerVehicle, { excellent: 100, good: 200, warning: 300 }, true))}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {t('get_ready.metrics.cost_per_vehicle')}
                </CardTitle>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('get_ready.metrics.cost_per_vehicle_tooltip')}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className={cn('text-3xl font-bold',
                    getMetricColor(costPerVehicle, { excellent: 100, good: 200, warning: 300 }, true))}>
                    ${costPerVehicle.toFixed(0)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {t('get_ready.metrics.per_vehicle')}
                  </p>
                </div>
                <DollarSign className={cn('h-8 w-8',
                  getMetricColor(costPerVehicle, { excellent: 100, good: 200, warning: 300 }, true))} />
              </div>
            </CardContent>
          </Card>

          {/* First Pass Yield */}
          <Card className={cn('transition-all hover:shadow-lg cursor-pointer',
            getBgColor(firstPassYield, { excellent: 85, good: 70, warning: 50 }))}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {t('get_ready.metrics.first_pass_yield')}
                </CardTitle>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('get_ready.metrics.first_pass_yield_tooltip')}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className={cn('text-3xl font-bold',
                    getMetricColor(firstPassYield, { excellent: 85, good: 70, warning: 50 }))}>
                    {firstPassYield.toFixed(1)}%
                  </div>
                  <Progress
                    value={firstPassYield}
                    className="h-2 mt-2"
                    indicatorClassName={cn(
                      firstPassYield >= 85 ? 'bg-emerald-500' :
                      firstPassYield >= 70 ? 'bg-gray-400' :
                      firstPassYield >= 50 ? 'bg-amber-500' : 'bg-red-500'
                    )}
                  />
                </div>
                {getTrendIcon(qualityMetrics.fpyTrend, true)}
              </div>
            </CardContent>
          </Card>

          {/* Active Rework Rate */}
          <Card className={cn('transition-all hover:shadow-lg cursor-pointer',
            getBgColor(reworkRate, { excellent: 5, good: 10, warning: 15 }, true))}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {t('get_ready.metrics.rework_rate')}
                </CardTitle>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('get_ready.metrics.rework_rate_tooltip')}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className={cn('text-3xl font-bold',
                    getMetricColor(reworkRate, { excellent: 5, good: 10, warning: 15 }, true))}>
                    {reworkRate.toFixed(1)}%
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {qualityMetrics.reworkIncidents} {t('get_ready.metrics.incidents')}
                  </p>
                </div>
                <ArrowDown className={cn('h-8 w-8',
                  getMetricColor(reworkRate, { excellent: 5, good: 10, warning: 15 }, true))} />
              </div>
            </CardContent>
          </Card>

          {/* Team Utilization */}
          <Card className={cn('transition-all hover:shadow-lg cursor-pointer',
            getBgColor(teamUtilization, { excellent: 80, good: 60, warning: 40 }))}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {t('get_ready.metrics.team_utilization')}
                </CardTitle>
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('get_ready.metrics.team_utilization_tooltip')}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className={cn('text-3xl font-bold',
                    getMetricColor(teamUtilization, { excellent: 80, good: 60, warning: 40 }))}>
                    {teamUtilization.toFixed(0)}%
                  </div>
                  <Progress
                    value={teamUtilization}
                    className="h-2 mt-2"
                    indicatorClassName={cn(
                      teamUtilization >= 80 ? 'bg-emerald-500' :
                      teamUtilization >= 60 ? 'bg-gray-400' :
                      teamUtilization >= 40 ? 'bg-amber-500' : 'bg-red-500'
                    )}
                  />
                </div>
                <Users className={cn('h-8 w-8',
                  getMetricColor(teamUtilization, { excellent: 80, good: 60, warning: 40 }))} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FINANCIAL PERFORMANCE SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cost Breakdown Card removed - workflow_type no longer exists */}

          {/* ROI Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-gray-600" />
                {t('get_ready.metrics.roi_comparison')}
              </CardTitle>
              <CardDescription>
                {t('get_ready.metrics.cost_vs_value_estimation')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">{t('get_ready.metrics.total_cost')}</p>
                  <p className="text-2xl font-bold text-red-600">
                    ${roiEstimation.totalCost.toFixed(0)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">{t('get_ready.metrics.est_savings')}</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    ${roiEstimation.estimatedSavings.toFixed(0)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{t('get_ready.metrics.roi')}</span>
                  <span className={cn('font-bold',
                    roiEstimation.roi > 0 ? 'text-emerald-600' : 'text-red-600'
                  )}>
                    {roiEstimation.roi > 0 ? '+' : ''}{roiEstimation.roi.toFixed(1)}%
                  </span>
                </div>
                <Progress
                  value={Math.min(100, Math.max(0, roiEstimation.roi + 50))}
                  className="h-2"
                  indicatorClassName={roiEstimation.roi > 0 ? 'bg-emerald-500' : 'bg-red-500'}
                />
              </div>

              <p className="text-xs text-gray-500">
                {t('get_ready.metrics.based_on')} {roiEstimation.completedCount} {t('get_ready.metrics.completed_vehicles')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* QUALITY & EFFICIENCY MATRIX */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quality Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>{t('get_ready.metrics.quality_metrics')}</CardTitle>
              <CardDescription>{t('get_ready.metrics.quality_indicators')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* First Pass Yield Trend */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">{t('get_ready.metrics.fpy_trend')}</p>
                  <p className="text-xs text-gray-500">{firstPassYield.toFixed(1)}%</p>
                </div>
                {getTrendIcon(qualityMetrics.fpyTrend, true)}
              </div>

              {/* Rework Incidents */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">{t('get_ready.metrics.rework_incidents')}</p>
                  <p className="text-xs text-gray-500">{t('get_ready.metrics.declined_items')}</p>
                </div>
                <Badge className={cn(
                  qualityMetrics.reworkIncidents === 0 ? 'bg-emerald-100 text-emerald-700' :
                  qualityMetrics.reworkIncidents < 5 ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                )}>
                  {qualityMetrics.reworkIncidents}
                </Badge>
              </div>

              {/* Quality Score Per Step */}
              <div className="space-y-2">
                <p className="text-sm font-medium">{t('get_ready.metrics.quality_by_step')}</p>
                {qualityMetrics.stepQuality.slice(0, 3).map((step) => (
                  <div key={step.stepId} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-20 truncate">{step.stepId}</span>
                    <Progress
                      value={step.avgQuality}
                      className="h-1.5 flex-1"
                      indicatorClassName={cn(
                        step.avgQuality >= 80 ? 'bg-emerald-500' :
                        step.avgQuality >= 60 ? 'bg-amber-500' : 'bg-red-500'
                      )}
                    />
                    <span className="text-xs font-medium w-10 text-right">
                      {step.avgQuality.toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Efficiency Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>{t('get_ready.metrics.efficiency_metrics')}</CardTitle>
              <CardDescription>{t('get_ready.metrics.operational_efficiency')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Avg Days Per Step */}
              <div className="space-y-2">
                <p className="text-sm font-medium">{t('get_ready.metrics.avg_days_per_step')}</p>
                {efficiencyMetrics.avgDaysPerStep.slice(0, 3).map((step) => (
                  <div key={step.stepId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-xs text-gray-600 truncate">{step.stepId}</span>
                    <Badge variant="outline" className="text-xs">
                      {step.avgDays.toFixed(1)}d
                    </Badge>
                  </div>
                ))}
              </div>

              {/* Transition Time */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">{t('get_ready.metrics.transition_time')}</p>
                  <p className="text-xs text-gray-500">{t('get_ready.metrics.between_steps')}</p>
                </div>
                <Badge variant="outline">
                  {efficiencyMetrics.avgTransitionTime.toFixed(1)}d
                </Badge>
              </div>

              {/* Utilization Rate */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{t('get_ready.metrics.utilization_rate')}</span>
                  <span className="text-gray-600">{teamUtilization.toFixed(0)}%</span>
                </div>
                <Progress
                  value={teamUtilization}
                  className="h-2"
                  indicatorClassName={cn(
                    teamUtilization >= 80 ? 'bg-emerald-500' :
                    teamUtilization >= 60 ? 'bg-gray-400' :
                    'bg-amber-500'
                  )}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* TEAM PERFORMANCE GRID */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-600" />
              {t('get_ready.metrics.team_performance')}
            </CardTitle>
            <CardDescription>
              {t('get_ready.metrics.top_performers')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {teamPerformance.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {t('get_ready.metrics.no_team_data')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase">
                        {t('get_ready.metrics.team_member')}
                      </th>
                      <th className="text-center py-3 px-2 text-xs font-medium text-gray-500 uppercase">
                        {t('get_ready.metrics.vehicles')}
                      </th>
                      <th className="text-center py-3 px-2 text-xs font-medium text-gray-500 uppercase">
                        {t('get_ready.metrics.avg_t2l')}
                      </th>
                      <th className="text-center py-3 px-2 text-xs font-medium text-gray-500 uppercase">
                        {t('get_ready.metrics.completion_rate')}
                      </th>
                      <th className="text-center py-3 px-2 text-xs font-medium text-gray-500 uppercase">
                        {t('get_ready.metrics.quality_score')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamPerformance.map((member, index) => (
                      <tr key={member.name} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0 text-xs">
                              {index + 1}
                            </Badge>
                            <span className="text-sm font-medium truncate">{member.name}</span>
                          </div>
                        </td>
                        <td className="text-center py-3 px-2">
                          <Badge variant="outline">{member.vehiclesCount}</Badge>
                        </td>
                        <td className="text-center py-3 px-2">
                          <span className="text-sm text-gray-600">{member.avgT2L.toFixed(1)}d</span>
                        </td>
                        <td className="text-center py-3 px-2">
                          <div className="flex items-center justify-center gap-2">
                            <Progress
                              value={member.completionRate}
                              className="h-1.5 w-16"
                              indicatorClassName="bg-emerald-500"
                            />
                            <span className="text-xs text-gray-600 w-10">
                              {member.completionRate.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="text-center py-3 px-2">
                          <Badge className={cn(
                            member.qualityScore >= 80 ? 'bg-emerald-100 text-emerald-700' :
                            member.qualityScore >= 60 ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          )}>
                            {member.qualityScore.toFixed(0)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
