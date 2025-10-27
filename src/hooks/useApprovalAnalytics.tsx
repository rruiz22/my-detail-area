import type {
    ApprovalAnalyticsData,
    ApprovalMetrics,
    ApproverStats,
    DailyTrendPoint,
    ReasonFrequency,
    WorkTypeStats
} from '@/types/approvals';
import { useQuery } from '@tanstack/react-query';
import { eachDayOfInterval, format, subDays } from 'date-fns';
import { useApprovalHistory } from './useApprovalHistory';
import { useGetReadyApprovalCount } from './useGetReadyApprovalCount';

/**
 * Calculate comprehensive analytics from approval history data
 */
export function useApprovalAnalytics() {
  const { data: historyData = [], isLoading: historyLoading } = useApprovalHistory();
  const { data: pendingCount = 0, isLoading: countLoading } = useGetReadyApprovalCount();

  return useQuery({
    queryKey: ['approval-analytics', historyData, pendingCount],
    queryFn: async (): Promise<ApprovalAnalyticsData> => {
      const now = new Date();
      const last90Days = subDays(now, 90);
      const last180Days = subDays(now, 180);

      // Filter data for current period (90 days)
      const currentPeriod = historyData.filter(item =>
        new Date(item.action_date) >= last90Days
      );

      // Filter data for previous period (90-180 days ago) for trend comparison
      const previousPeriod = historyData.filter(item => {
        const date = new Date(item.action_date);
        return date >= last180Days && date < last90Days;
      });

      // Separate by status
      const approved = currentPeriod.filter(item => item.approval_status === 'approved');
      const rejected = currentPeriod.filter(item => item.approval_status === 'rejected');

      const prevApproved = previousPeriod.filter(item => item.approval_status === 'approved');
      const prevRejected = previousPeriod.filter(item => item.approval_status === 'rejected');

      // Calculate core metrics
      const totalApproved = approved.length;
      const totalRejected = rejected.length;
      const totalProcessed = totalApproved + totalRejected;
      const approvalRate = totalProcessed > 0 ? (totalApproved / totalProcessed) * 100 : 0;

      // Average approval time
      const avgApprovalTimeHours = totalProcessed > 0
        ? currentPeriod.reduce((sum, item) => sum + item.time_to_approval_hours, 0) / totalProcessed
        : 0;

      // Total cost approved
      const totalCostApproved = approved.reduce((sum, item) => sum + item.estimated_cost, 0);
      const totalCostRejected = rejected.reduce((sum, item) => sum + item.estimated_cost, 0);

      // Calculate trends (percentage change from previous period)
      const prevTotalApproved = prevApproved.length;
      const prevTotalRejected = prevRejected.length;
      const prevTotalProcessed = prevTotalApproved + prevTotalRejected;
      const prevAvgTime = prevTotalProcessed > 0
        ? previousPeriod.reduce((sum, item) => sum + item.time_to_approval_hours, 0) / prevTotalProcessed
        : 0;
      const prevTotalCost = prevApproved.reduce((sum, item) => sum + item.estimated_cost, 0);

      const calculateTrend = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      };

      // Top rejection reasons
      const rejectionReasons = new Map<string, number>();
      rejected.forEach(item => {
        if (item.rejection_reason) {
          const count = rejectionReasons.get(item.rejection_reason) || 0;
          rejectionReasons.set(item.rejection_reason, count + 1);
        }
      });

      const topRejectionReasons: ReasonFrequency[] = Array.from(rejectionReasons.entries())
        .map(([reason, count]) => ({
          reason,
          count,
          percentage: (count / totalRejected) * 100
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Approvals by approver
      const approverMap = new Map<string, {
        name: string;
        approved: number;
        rejected: number;
        totalTime: number;
        count: number;
      }>();

      currentPeriod.forEach(item => {
        const existing = approverMap.get(item.approver_id) || {
          name: item.approver_name,
          approved: 0,
          rejected: 0,
          totalTime: 0,
          count: 0
        };

        if (item.approval_status === 'approved') {
          existing.approved++;
        } else {
          existing.rejected++;
        }
        existing.totalTime += item.time_to_approval_hours;
        existing.count++;

        approverMap.set(item.approver_id, existing);
      });

      const approvalsByApprover: ApproverStats[] = Array.from(approverMap.entries())
        .map(([id, stats]) => ({
          approver_id: id,
          approver_name: stats.name,
          total_approved: stats.approved,
          total_rejected: stats.rejected,
          avg_time_hours: stats.totalTime / stats.count,
          approval_rate: (stats.approved / (stats.approved + stats.rejected)) * 100
        }))
        .sort((a, b) => (b.total_approved + b.total_rejected) - (a.total_approved + a.total_rejected));

      // Daily trends for charts
      const dateRange = eachDayOfInterval({ start: last90Days, end: now });
      const dailyMap = new Map<string, DailyTrendPoint>();

      // Initialize all dates
      dateRange.forEach(date => {
        dailyMap.set(format(date, 'yyyy-MM-dd'), {
          date: format(date, 'yyyy-MM-dd'),
          approved: 0,
          rejected: 0,
          pending: 0,
          cost_approved: 0,
          cost_rejected: 0
        });
      });

      // Populate with data
      currentPeriod.forEach(item => {
        const dateKey = format(new Date(item.action_date), 'yyyy-MM-dd');
        const existing = dailyMap.get(dateKey);

        if (existing) {
          if (item.approval_status === 'approved') {
            existing.approved++;
            existing.cost_approved += item.estimated_cost;
          } else {
            existing.rejected++;
            existing.cost_rejected += item.estimated_cost;
          }
        }
      });

      const dailyTrends = Array.from(dailyMap.values());

      // Work type distribution
      const workTypeMap = new Map<string, {
        count: number;
        totalCost: number;
        approved: number;
        total: number;
      }>();

      currentPeriod.forEach(item => {
        item.work_items.forEach(wi => {
          const existing = workTypeMap.get(wi.work_type) || {
            count: 0,
            totalCost: 0,
            approved: 0,
            total: 0
          };

          existing.count++;
          existing.totalCost += wi.estimated_cost;
          existing.total++;
          if (item.approval_status === 'approved') {
            existing.approved++;
          }

          workTypeMap.set(wi.work_type, existing);
        });
      });

      const workTypeDistribution: WorkTypeStats[] = Array.from(workTypeMap.entries())
        .map(([type, stats]) => ({
          work_type: type,
          count: stats.count,
          avg_cost: stats.totalCost / stats.count,
          approval_rate: (stats.approved / stats.total) * 100
        }))
        .sort((a, b) => b.count - a.count);

      return {
        totalPending: pendingCount,
        totalApproved90Days: totalApproved,
        totalRejected90Days: totalRejected,
        approvalRate,
        avgApprovalTimeHours,
        totalCostApproved,

        approvalTrend: calculateTrend(totalApproved, prevTotalApproved),
        rejectionTrend: calculateTrend(totalRejected, prevTotalRejected),
        costTrend: calculateTrend(totalCostApproved, prevTotalCost),
        timeTrend: calculateTrend(avgApprovalTimeHours, prevAvgTime),

        topRejectionReasons,
        approvalsByApprover,
        costBreakdown: {
          approved: totalCostApproved,
          rejected: totalCostRejected,
          pending: 0 // This would require fetching pending vehicle costs
        },

        dailyTrends,
        workTypeDistribution
      };
    },
    enabled: !historyLoading && !countLoading,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  });
}

/**
 * Hook to get formatted metrics for dashboard cards
 */
export function useApprovalMetrics(): { data: ApprovalMetrics | undefined; isLoading: boolean } {
  const { data: analytics, isLoading } = useApprovalAnalytics();

  const metrics: ApprovalMetrics | undefined = analytics ? {
    pending: {
      count: analytics.totalPending,
      trend: 0 // Pending doesn't have historical comparison
    },
    approved: {
      count: analytics.totalApproved90Days,
      trend: analytics.approvalTrend
    },
    rejected: {
      count: analytics.totalRejected90Days,
      trend: analytics.rejectionTrend
    },
    avgTime: {
      hours: analytics.avgApprovalTimeHours,
      trend: analytics.timeTrend
    },
    totalCost: {
      amount: analytics.totalCostApproved,
      trend: analytics.costTrend
    },
    approvalRate: {
      percentage: analytics.approvalRate,
      trend: 0 // Rate trend would need more complex calculation
    }
  } : undefined;

  return { data: metrics, isLoading };
}
