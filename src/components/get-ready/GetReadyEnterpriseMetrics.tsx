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
        {/* All metric cards removed per user request - displaying inaccurate/incomplete data */}
      </div>
    </TooltipProvider>
  );
}
