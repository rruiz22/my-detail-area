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
  // Vehicle grouping by days (for sidebar)
  vehicles_1_day?: number;
  vehicles_2_3_days?: number;
  vehicles_4_plus_days?: number;
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
  // Approval fields
  requires_approval: boolean;
  approval_status: ApprovalStatus;
  approved_by?: string | null;
  approved_at?: string | null;
  approval_notes?: string | null;
  rejected_by?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  // Timer control
  timer_paused?: boolean;
  frontline_reached_at?: string | null;
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

// Approval System Types
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'not_required';
export type ApprovalAction = 'approve' | 'reject' | 'request';

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

// Approval History Types
export interface ApprovalHistory {
  id: string;
  vehicle_id: string;
  dealer_id: number;
  action: ApprovalStatus;
  action_by: string;
  action_at: string;
  notes?: string | null;
  reason?: string | null;
  vehicle_step_id?: string | null;
  vehicle_workflow_type?: string | null;
  vehicle_priority?: string | null;
  created_at: string;
}

export interface ApprovalHistoryWithUser extends ApprovalHistory {
  user_name?: string;
  user_email?: string;
}

// Approval Request/Response Types
export interface ApprovalRequest {
  vehicleId: string;
  notes?: string;
}

export interface RejectRequest {
  vehicleId: string;
  reason: string;
  notes?: string;
}

export interface ApprovalResponse {
  success: boolean;
  vehicle_id?: string;
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  reason?: string;
  error?: string;
}

// Approval Summary for Dashboard
export interface ApprovalSummary {
  total_pending: number;
  total_approved_today: number;
  total_rejected_today: number;
  pending_critical: number;
  oldest_pending_days: number;
}

// =====================================================
// NOTIFICATIONS SYSTEM TYPES
// =====================================================

// Notification Type Enum
export type NotificationType =
  | 'sla_warning'
  | 'sla_critical'
  | 'approval_pending'
  | 'approval_approved'
  | 'approval_rejected'
  | 'bottleneck_detected'
  | 'bottleneck_resolved'
  | 'vehicle_status_change'
  | 'work_item_completed'
  | 'work_item_created'
  | 'step_completed'
  | 'system_alert';

// Notification Priority Enum
export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical';

// Core Notification Interface
export interface GetReadyNotification {
  id: string;
  dealer_id: number;
  user_id: string | null; // null means broadcast to all users
  notification_type: NotificationType;
  priority: NotificationPriority;

  // Content
  title: string;
  message: string;
  action_label?: string | null;
  action_url?: string | null;

  // Related entities
  related_vehicle_id?: string | null;
  related_step_id?: string | null;
  related_work_item_id?: string | null;

  // Metadata
  metadata?: Record<string, unknown>;

  // Status
  is_read: boolean;
  read_at?: string | null;
  dismissed_at?: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
  expires_at?: string | null;
}

// Notification with Vehicle Info (for display)
export interface NotificationWithVehicle extends GetReadyNotification {
  vehicle?: {
    stock_number: string;
    vehicle_year: number | null;
    vehicle_make: string | null;
    vehicle_model: string | null;
    step_id: string;
  };
  step?: {
    name: string;
    color: string;
  };
}

// User Notification Preferences
export interface UserNotificationPreferences {
  user_id: string;
  dealer_id: number;

  // Notification type preferences
  sla_warnings_enabled: boolean;
  sla_critical_enabled: boolean;
  approval_notifications_enabled: boolean;
  bottleneck_alerts_enabled: boolean;
  vehicle_status_enabled: boolean;
  work_item_notifications_enabled: boolean;
  step_completion_enabled: boolean;
  system_alerts_enabled: boolean;

  // Delivery preferences
  in_app_enabled: boolean;
  email_enabled: boolean;
  sound_enabled: boolean;
  desktop_enabled: boolean;

  // Quiet hours
  quiet_hours_enabled: boolean;
  quiet_hours_start?: string | null;
  quiet_hours_end?: string | null;

  // Auto-dismiss settings
  auto_dismiss_read_after_days?: number;
  auto_dismiss_unread_after_days?: number;

  created_at: string;
  updated_at: string;
}

// Notification Filters
export interface NotificationFilters {
  type?: NotificationType | 'all';
  priority?: NotificationPriority | 'all';
  is_read?: boolean | 'all';
  date_from?: string;
  date_to?: string;
}

// Notification Summary (for badge/counter)
export interface NotificationSummary {
  total_unread: number;
  unread_by_priority: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  unread_by_type: Partial<Record<NotificationType, number>>;
}

// Notification Actions
export interface NotificationAction {
  label: string;
  icon?: string;
  onClick: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'ghost';
}

// RPC Function Responses
export interface MarkAsReadResponse {
  success: boolean;
  notification_id?: string;
}

export interface MarkAllAsReadResponse {
  success: boolean;
  count: number;
}

export interface DismissNotificationResponse {
  success: boolean;
  notification_id?: string;
}

export interface CreateNotificationParams {
  dealer_id: number;
  user_id?: string | null;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  action_label?: string;
  action_url?: string;
  vehicle_id?: string;
  step_id?: string;
  metadata?: Record<string, unknown>;
}

// Notification Sound Settings
export interface NotificationSoundSettings {
  enabled: boolean;
  volume: number; // 0-100
  sound_id: 'default' | 'chime' | 'alert' | 'ping';
}

// Notification Group (for grouping similar notifications)
export interface NotificationGroup {
  type: NotificationType;
  priority: NotificationPriority;
  count: number;
  latest_notification: GetReadyNotification;
  notifications: GetReadyNotification[];
}