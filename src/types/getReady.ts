// Get Ready Types and Interfaces
export interface GetReadyStep {
  id: string;
  name: string;
  description: string | null;
  order_index: number;
  color: string;
  icon: string;
  vehicle_count: number;
  is_default: boolean;
  days_in_step_avg: number;
  days_to_frontline_avg: number;
  // Get Ready specific fields
  sla_hours: number;
  target_throughput: number;
  bottleneck_threshold: number;
  parallel_capable: boolean;
  express_lane_eligible: boolean;
  cost_per_day: number;
}

export interface GetReadyVehicle {
  id: string;
  stock_number: string;
  vin: string;
  short_vin: string;
  vehicle_year: number | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_trim: string | null;
  current_step_name: string;
  current_step_color: string;
  current_step_order: number;
  status: string;
  priority: string;
  days_in_step: string;
  media_count: number;
  work_item_counts?: {
    pending: number;
    in_progress: number;
    completed: number;
  };
  notes_preview: string;
  retail_value: number | null;
  created_at: string;
  // Get Ready specific fields
  intake_date: string;
  target_frontline_date: string;
  sla_status: 'green' | 'yellow' | 'red';
  t2l_estimate: number;
  actual_t2l?: number;
  holding_cost_daily: number;
  total_holding_cost: number;
  priority_score: number;
  workflow_path: 'standard' | 'express' | 'priority';
  sla_hours_remaining: number;
  is_bottlenecked: boolean;
  escalation_level: 0 | 1 | 2 | 3;
}

export interface GetReadyKPIs {
  // Time
  avgT2L: number;              // Average Time to Line
  targetT2L: number;           // Target benchmark
  t2lVariance: number;         // Consistency measure

  // Throughput
  dailyThroughput: number;     // Vehicles/day
  weeklyCapacity: number;      // Weekly processing
  utilizationRate: number;     // Resource efficiency

  // Quality
  slaCompliance: number;       // % on-time delivery
  reworkRate: number;          // % requiring rework
  customerSatisfaction: number; // Rating score

  // Costs
  avgHoldingCost: number;      // Cost per vehicle
  totalHoldingCosts: number;   // Monthly total
  roiImprovement: number;      // vs baseline
}

export interface BottleneckAlert {
  step_id: string;
  step_name: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  vehicle_count: number;
  avg_wait_time: number;
  recommended_action: string;
  created_at: string;
}

export interface SLAAlert {
  vehicle_id: string;
  stock_number: string;
  vehicle_info: string;
  hours_overdue: number;
  severity: 'warning' | 'critical';
  escalation_level: number;
  created_at: string;
}

export type WorkflowPath = 'standard' | 'express' | 'priority';
export type SLAStatus = 'green' | 'yellow' | 'red';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

// Utility types for enhanced analytics
export interface TimeToLineData {
  date: string;
  avg_t2l: number;
  target_t2l: number;
  vehicle_count: number;
}

export interface ThroughputData {
  date: string;
  vehicles_completed: number;
  target_throughput: number;
  efficiency_percentage: number;
}

export interface WorkflowOptimization {
  step_id: string;
  current_performance: number;
  target_performance: number;
  optimization_potential: number;
  recommended_actions: string[];
}

// Vendor Management Types
export type VendorSpecialty = 'mechanical' | 'body_work' | 'paint' | 'detailing' | 'glass' | 'upholstery' | 'electronics' | 'other';

export interface Vendor {
  id: string;
  dealer_id: number;
  name: string;
  specialties: VendorSpecialty[];
  contact_info: {
    email?: string;
    phone?: string;
    address?: string;
    contact_person?: string;
  } | null;
  performance_rating: number | null; // 1-5 stars
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface VendorWithStats extends Vendor {
  active_jobs: number;
  completed_jobs: number;
  average_completion_time: number; // in hours
  on_time_rate: number; // percentage
  total_cost_ytd: number;
}

export interface VendorPerformanceMetrics {
  vendor_id: string;
  vendor_name: string;
  jobs_completed: number;
  avg_rating: number;
  on_time_percentage: number;
  total_revenue: number;
  avg_job_cost: number;
}