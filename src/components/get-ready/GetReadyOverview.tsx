import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGetReady } from '@/hooks/useGetReady';
import { TimeRange, useStepRevisitAnalytics } from '@/hooks/useGetReadyHistoricalAnalytics';
import { useGetReadyStore } from '@/hooks/useGetReadyStore';
import { cn } from '@/lib/utils';
import {
    ArrowRight,
    Calendar,
    Clock,
    Layers,
    TrendingUp
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { BottleneckAnalysis, StepPerformanceMatrix, TimeSeriesCharts } from './analytics';
import { SafeBarChart } from './analytics/SafeBarChart';
import { StepTimeBreakdownTable } from './StepTimeBreakdownTable';

interface GetReadyOverviewProps {
  className?: string;
  allVehicles: any[];
}

export function GetReadyOverview({ className, allVehicles }: GetReadyOverviewProps) {
  const { t } = useTranslation();
  const { steps } = useGetReady();
  const { setSelectedStepId } = useGetReadyStore();
  const navigate = useNavigate();

  // Period Type State - NEW: 'relative' (7d) or 'monthly'
  const [periodType, setPeriodType] = useState<'relative' | 'monthly'>(() => {
    const stored = localStorage.getItem('getReady.overview.periodType');
    return (stored as 'relative' | 'monthly') || 'relative';
  });

  // Time Range State (for relative periods: 7d, 30d, 90d)
  const [timeRange, setTimeRange] = useState<TimeRange>(() => {
    const stored = localStorage.getItem('getReady.overview.timeRange');
    // ✅ Default to 30d for better step coverage
    return (stored as TimeRange) || '30d';
  });

  // Selected Month State (for monthly view)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const stored = localStorage.getItem('getReady.overview.selectedMonth');
    return stored || new Date().toISOString().slice(0, 7); // "2024-12"
  });

  // Persist selections
  useEffect(() => {
    localStorage.setItem('getReady.overview.periodType', periodType);
    localStorage.setItem('getReady.overview.timeRange', timeRange);
    localStorage.setItem('getReady.overview.selectedMonth', selectedMonth);
  }, [periodType, timeRange, selectedMonth]);

  // Generate list of last 12 months for monthly selector
  const availableMonths = useMemo(() => {
    const months = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthValue = date.toISOString().slice(0, 7); // "2024-12"
      const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      months.push({ value: monthValue, label: monthLabel });
    }
    return months;
  }, []);

  // Calculate period label for display
  const periodLabel = useMemo(() => {
    if (periodType === 'monthly') {
      return availableMonths.find(m => m.value === selectedMonth)?.label || selectedMonth;
    }
    return timeRange === '7d' ? 'Last 7 Days' : timeRange === '30d' ? 'Last 30 Days' : 'Last 90 Days';
  }, [periodType, selectedMonth, timeRange, availableMonths]);

  // Fetch historical step analytics for accurate average days calculation
  // NOTE: For monthly periods, we currently use '30d' as approximation
  // TODO: Enhance hook to support exact date ranges for monthly views
  const effectiveTimeRange = periodType === 'monthly' ? '30d' : timeRange;
  const { data: historicalStepAnalytics } = useStepRevisitAnalytics(effectiveTimeRange);

  // Workflow distribution calculation removed - workflow_type no longer exists
  // Priority breakdown calculation removed - not needed for step time analysis
  // Work items summary calculation removed - not needed for step time analysis

  // Calculate step analysis with historical averages
  const stepStats = useMemo(() => {
    console.log('🔍 [stepStats] Starting calculation with:', {
      allVehiclesCount: allVehicles.length,
      stepsCount: steps.length,
      stepIds: steps.map(s => s.id),
      stepNames: steps.map(s => s.name),
      historicalAnalyticsCount: historicalStepAnalytics?.length || 0
    });

    // ✅ FIX: Initialize stepMap with ALL dealer steps (not just steps with active vehicles)
    const stepMap = new Map();

    // STEP 1: Initialize with ALL configured steps from dealer
    steps.forEach(step => {
      console.log('➕ [stepStats] Adding step to map:', step.id, step.name);
      stepMap.set(step.id, {
        step_id: step.id,
        step_name: step.name,
        count: 0,
        atRisk: 0,
      });
    });

    // STEP 2: Add current vehicle counts to steps that have vehicles
    allVehicles.forEach(v => {
      if (stepMap.has(v.step_id)) {
        const stats = stepMap.get(v.step_id);
        stats.count++;
        if (v.sla_status === 'warning' || v.sla_status === 'critical' || v.sla_status === 'red') {
          stats.atRisk++;
        }
      } else {
        // Fallback: if step not in configured steps, add it anyway
        stepMap.set(v.step_id, {
          step_id: v.step_id,
          step_name: v.step_name,
          count: 1,
          atRisk: (v.sla_status === 'warning' || v.sla_status === 'critical' || v.sla_status === 'red') ? 1 : 0,
        });
      }
    });

    // STEP 3: Merge with historical analytics for accurate average days
    return Array.from(stepMap.values())
      .map(s => {
        const historicalData = historicalStepAnalytics?.find(h => h.step_id === s.step_id);

        // ✅ FIX: Defensive null/undefined/NaN checking for avg_total_time
        let avgDays = 0;
        if (historicalData && typeof historicalData.avg_total_time === 'number' && !isNaN(historicalData.avg_total_time)) {
          avgDays = historicalData.avg_total_time / 24; // Convert hours to days
        }

        const stepConfig = steps.find(step => step.id === s.step_id);

        return {
          ...s,
          avgDays: avgDays || 0, // Ensure always a valid number
          revisitRate: historicalData?.revisit_rate || 0,
          step: stepConfig,
          color: stepConfig?.color,
          order_index: stepConfig?.order_index || 999
        };
      })
      .sort((a, b) => {
        // ✅ FIX: Sort by order_index (workflow order), not by count
        // This shows steps in their natural workflow progression
        return a.order_index - b.order_index;
      });
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
      // ✅ FIX: Defensive null checking for transitions and avg_total_time
      const transitions = (typeof step.total_transitions === 'number' && !isNaN(step.total_transitions))
        ? step.total_transitions
        : 0;

      const avgTimeHours = (typeof step.avg_total_time === 'number' && !isNaN(step.avg_total_time))
        ? step.avg_total_time
        : 0;

      if (transitions > 0 && avgTimeHours > 0) {
        totalTimeWeighted += (avgTimeHours / 24) * transitions; // Convert hours to days
        totalTransitions += transitions;
      }
    });

    const avgDays = totalTransitions > 0 ? totalTimeWeighted / totalTransitions : 0;

    return {
      avgDays: avgDays || 0, // Ensure always valid number
      totalSteps: historicalStepAnalytics.length,
      totalVehicles: allVehicles.length,
      totalTransitions
    };
  }, [historicalStepAnalytics, allVehicles]);

  // Prepare chart data for top 5 steps by avg time
  const stepChartData = useMemo(() => {
    if (!stepStats || stepStats.length === 0) {
      console.log('🔍 [Chart Data] stepStats is empty or null');
      return [];
    }

    console.log('🔍 [Chart Data] Processing stepStats:', stepStats.length, 'items');

    // Sort by avgDays (descending) and take top 5
    const processedData = stepStats
      .filter(s => {
        // Strict validation: must have valid avgDays and step name
        const isValid = s.avgDays > 0 &&
               !isNaN(s.avgDays) &&
               isFinite(s.avgDays) &&
               s.step_name;
        if (!isValid) {
          console.warn('🔍 [Chart Data] Filtered out invalid step:', {
            name: s.step_name,
            avgDays: s.avgDays,
            isNaN: isNaN(s.avgDays),
            isFinite: isFinite(s.avgDays)
          });
        }
        return isValid;
      })
      .sort((a, b) => b.avgDays - a.avgDays)
      .slice(0, 5)
      .map(stat => {
        // Double-check numeric safety before chart rendering
        const avgDays = parseFloat(stat.avgDays.toFixed(1));
        const mappedItem = {
          name: stat.step_name,
          avgDays: isNaN(avgDays) || !isFinite(avgDays) ? 0 : avgDays,
          color: stat.step?.color || '#6B7280',
          count: stat.count
        };
        console.log('🔍 [Chart Data] Mapped item:', mappedItem);
        return mappedItem;
      })
      .filter(item => item.avgDays > 0); // Final safety: remove any zero values

    console.log('🔍 [Chart Data] Final processed data:', processedData);
    return processedData;
  }, [stepStats]);

  // Team performance calculation removed - not needed for step time analysis
  // Recent activity calculation removed - not needed for step time analysis

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
      {/* Time Range Selector - Enhanced with Monthly View */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">{t('get_ready.analytics.timeRange')}:</span>
          </div>

          {/* Period Type Selector */}
          <Tabs value={periodType} onValueChange={(value) => setPeriodType(value as 'relative' | 'monthly')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="relative">Last 7 Days</TabsTrigger>
              <TabsTrigger value="monthly">By Month</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Relative Period Selector (7d, 30d, 90d) */}
          {periodType === 'relative' && (
            <Tabs value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
              <TabsList className="w-full">
                <TabsTrigger value="7d">{t('get_ready.analytics.last7Days')}</TabsTrigger>
                <TabsTrigger value="30d">{t('get_ready.analytics.last30Days')}</TabsTrigger>
                <TabsTrigger value="90d">{t('get_ready.analytics.last90Days')}</TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {/* Monthly Selector */}
          {periodType === 'monthly' && (
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {availableMonths.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Helper Text */}
          <p className="text-xs text-muted-foreground">
            {periodType === 'monthly'
              ? `Showing average time per step for ${availableMonths.find(m => m.value === selectedMonth)?.label || selectedMonth}`
              : `Showing data for the ${timeRange === '7d' ? 'last 7 days' : timeRange === '30d' ? 'last 30 days' : 'last 90 days'}`
            }
          </p>
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
            {periodType === 'monthly'
              ? `Top 5 steps with longest average processing time (${availableMonths.find(m => m.value === selectedMonth)?.label || selectedMonth})`
              : `Top 5 steps with longest average processing time (${timeRange === '7d' ? 'last 7 days' : timeRange === '30d' ? 'last 30 days' : 'last 90 days'})`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SafeBarChart data={stepChartData} />
        </CardContent>
      </Card>

      {/* Workflow Distribution section removed - workflow_type no longer exists */}

      {/* Step Analysis - Expanded to full width */}
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
                    {periodType === 'monthly'
                      ? `Based on ${availableMonths.find(m => m.value === selectedMonth)?.label || selectedMonth}`
                      : `Based on ${timeRange === '7d' ? 'last 7 days' : timeRange === '30d' ? 'last 30 days' : 'last 90 days'}`
                    }
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

      {/* Recent Activity - REMOVED (not needed for step time analysis) */}
      {/* Work Items Summary - REMOVED (not related to step timing) */}
      {/* Team Performance - REMOVED (not related to step timing) */}
      {/* Priority Breakdown - REMOVED (not related to step timing) */}

      {/* Detailed Step Breakdown Table - ALL steps with timing data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Detailed Step Breakdown
          </CardTitle>
          <CardDescription>
            Complete timing analysis for all workflow steps
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StepTimeBreakdownTable
            stepStats={stepStats}
            periodLabel={periodLabel}
            onStepClick={handleStepClick}
          />
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
