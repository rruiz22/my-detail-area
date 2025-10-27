// Enterprise Approvals Dashboard Types

export interface ApprovalHistoryItem {
  id: string;
  vehicle_id: string;
  stock_number: string;
  vehicle_year: number | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vin: string;
  approval_status: 'approved' | 'rejected';
  action_date: string;
  approver_id: string;
  approver_name: string;
  approver_email?: string;
  notes?: string;
  rejection_reason?: string;
  estimated_cost: number;
  actual_cost?: number;
  time_to_approval_hours: number;
  work_items_count: number;
  work_items: ApprovalWorkItem[];
}

export interface ApprovalWorkItem {
  id: string;
  title: string;
  work_type: string;
  estimated_cost: number;
  approval_status: string;
  approval_required: boolean;
}

export interface ApprovalAnalyticsData {
  // Core Metrics
  totalPending: number;
  totalApproved90Days: number;
  totalRejected90Days: number;
  approvalRate: number; // percentage
  avgApprovalTimeHours: number;
  totalCostApproved: number;

  // Trends (compared to previous period)
  approvalTrend: number; // percentage change
  rejectionTrend: number; // percentage change
  costTrend: number; // percentage change
  timeTrend: number; // percentage change

  // Breakdowns
  topRejectionReasons: ReasonFrequency[];
  approvalsByApprover: ApproverStats[];
  costBreakdown: {
    approved: number;
    rejected: number;
    pending: number;
  };

  // Time series data for charts
  dailyTrends: DailyTrendPoint[];
  workTypeDistribution: WorkTypeStats[];
}

export interface ReasonFrequency {
  reason: string;
  count: number;
  percentage: number;
}

export interface ApproverStats {
  approver_id: string;
  approver_name: string;
  total_approved: number;
  total_rejected: number;
  avg_time_hours: number;
  approval_rate: number;
}

export interface DailyTrendPoint {
  date: string; // YYYY-MM-DD
  approved: number;
  rejected: number;
  pending: number;
  cost_approved: number;
  cost_rejected: number;
}

export interface WorkTypeStats {
  work_type: string;
  count: number;
  avg_cost: number;
  approval_rate: number;
}

export interface ApprovalFiltersState {
  dateRange: {
    from: Date;
    to: Date;
    preset: '7d' | '30d' | '90d' | 'custom';
  };
  statuses: ('pending' | 'approved' | 'rejected')[];
  approvers: string[]; // user IDs
  costRange: {
    min: number;
    max: number;
  };
  workTypes: string[];
  searchQuery: string;
  sortBy: 'date' | 'vehicle' | 'status' | 'approver' | 'cost' | 'time';
  sortOrder: 'asc' | 'desc';
  pageSize: 25 | 50 | 100;
  currentPage: number;
}

export interface ApprovalMetrics {
  pending: {
    count: number;
    trend: number;
  };
  approved: {
    count: number;
    trend: number;
  };
  rejected: {
    count: number;
    trend: number;
  };
  avgTime: {
    hours: number;
    trend: number;
  };
  totalCost: {
    amount: number;
    trend: number;
  };
  approvalRate: {
    percentage: number;
    trend: number;
  };
}
