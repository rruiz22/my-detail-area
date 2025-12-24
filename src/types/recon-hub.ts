import { Database } from "@/types/supabase";

// Base types from database
export type ReconWorkflow = Database['public']['Tables']['recon_workflows']['Row'];
export type ReconWorkflowInsert = Database['public']['Tables']['recon_workflows']['Insert'];
export type ReconWorkflowUpdate = Database['public']['Tables']['recon_workflows']['Update'];

export type ReconWorkflowStep = Database['public']['Tables']['recon_workflow_steps']['Row'];
export type ReconWorkflowStepInsert = Database['public']['Tables']['recon_workflow_steps']['Insert'];
export type ReconWorkflowStepUpdate = Database['public']['Tables']['recon_workflow_steps']['Update'];

export type ReconStepInstance = Database['public']['Tables']['recon_step_instances']['Row'];
export type ReconStepInstanceInsert = Database['public']['Tables']['recon_step_instances']['Insert'];
export type ReconStepInstanceUpdate = Database['public']['Tables']['recon_step_instances']['Update'];

export type ReconVehicleLocation = Database['public']['Tables']['recon_vehicle_locations']['Row'];
export type ReconVehicleLocationInsert = Database['public']['Tables']['recon_vehicle_locations']['Insert'];
export type ReconVehicleLocationUpdate = Database['public']['Tables']['recon_vehicle_locations']['Update'];

export type ReconVendor = Database['public']['Tables']['recon_vendors']['Row'];
export type ReconVendorInsert = Database['public']['Tables']['recon_vendors']['Insert'];
export type ReconVendorUpdate = Database['public']['Tables']['recon_vendors']['Update'];

export type ReconT2LMetrics = Database['public']['Tables']['recon_t2l_metrics']['Row'];
export type ReconT2LMetricsInsert = Database['public']['Tables']['recon_t2l_metrics']['Insert'];
export type ReconT2LMetricsUpdate = Database['public']['Tables']['recon_t2l_metrics']['Update'];

// Enum types
export type WorkflowStepType = Database['public']['Enums']['workflow_step_type'];
export type ReconStepStatus = Database['public']['Enums']['recon_step_status'];

// Extended types for UI
export interface ReconWorkflowWithSteps extends ReconWorkflow {
  steps: ReconWorkflowStepWithInstances[];
}

export interface ReconWorkflowStepWithInstances extends ReconWorkflowStep {
  instances?: ReconStepInstance[];
}

export interface ReconStepInstanceWithStep extends ReconStepInstance {
  step: ReconWorkflowStep;
}

export interface ReconOrderWithWorkflow {
  id: string;
  order_number: string;
  customer_name: string;
  vehicle_year?: number;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_vin?: string;
  status: string;
  workflow?: ReconWorkflowWithSteps;
  stepInstances?: ReconStepInstanceWithStep[];
  t2lMetrics?: ReconT2LMetrics;
  location?: ReconVehicleLocation;
}

// T2L Statistics
export interface T2LStats {
  average_t2l_hours: number;
  best_t2l_hours: number;
  worst_active_t2l_hours: number;
  total_vehicles: number;
  completed_vehicles: number;
  average_holding_cost: number;
}

// Color Trigger Alert
export interface ColorTriggerAlert {
  id: string;
  orderId: string;
  vehicleInfo: string;
  stepName: string;
  stepType: WorkflowStepType;
  daysOverdue: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  color: 'green' | 'yellow' | 'orange' | 'red';
}

// Workflow Builder Types
export interface WorkflowStepTemplate {
  id: string;
  name: string;
  type: WorkflowStepType;
  description: string;
  sla_hours: number;
  requires_approval: boolean;
  can_be_parallel: boolean;
  icon: string;
  category: 'intake' | 'inspection' | 'mechanical' | 'cosmetic' | 'final';
}

// Location Tracking
export interface VehicleLocationPoint {
  lat: number;
  lng: number;
}

export interface ReconVehicleLocationWithOrder extends ReconVehicleLocation {
  order: {
    id: string;
    order_number: string;
    vehicle_year?: number;
    vehicle_make?: string;
    vehicle_model?: string;
    vehicle_vin?: string;
    status: string;
  };
}

// Vendor Management
export interface ReconVendorWithStats extends ReconVendor {
  activeJobs: number;
  completedJobs: number;
  averageCompletionTime: number;
  onTimeRate: number;
}

// Analytics Types
export interface ReconAnalytics {
  t2lTrends: T2LTrendData[];
  bottlenecks: BottleneckData[];
  departmentPerformance: DepartmentPerformanceData[];
  holdingCosts: HoldingCostData[];
}

export interface T2LTrendData {
  date: string;
  average_t2l: number;
  completed_vehicles: number;
  target_t2l: number;
}

export interface BottleneckData {
  stepType: WorkflowStepType;
  stepName: string;
  averageTime: number;
  backlogCount: number;
  efficiency: number;
}

export interface DepartmentPerformanceData {
  department: string;
  completionRate: number;
  averageTime: number;
  slaCompliance: number;
}

export interface HoldingCostData {
  date: string;
  totalCost: number;
  vehicleCount: number;
  avgCostPerVehicle: number;
}

// Filter types
export interface ReconHubFilters {
  status?: string[];
  stepType?: WorkflowStepType[];
  priority?: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  workflow?: string[];
  assignedTo?: string[];
}

// Default workflow templates
export const DEFAULT_WORKFLOW_STEPS: WorkflowStepTemplate[] = [
  {
    id: 'created',
    name: 'Vehicle Created',
    type: 'created',
    description: 'Vehicle record created in system',
    sla_hours: 1,
    requires_approval: false,
    can_be_parallel: false,
    icon: 'Plus',
    category: 'intake'
  },
  {
    id: 'bring_to_recon',
    name: 'Bring to Recon',
    type: 'bring_to_recon',
    description: 'Transport vehicle to reconditioning area',
    sla_hours: 4,
    requires_approval: false,
    can_be_parallel: false,
    icon: 'Truck',
    category: 'intake'
  },
  {
    id: 'inspection',
    name: 'Initial Inspection',
    type: 'inspection',
    description: 'Complete vehicle inspection and assessment',
    sla_hours: 8,
    requires_approval: false,
    can_be_parallel: false,
    icon: 'Search',
    category: 'inspection'
  },
  {
    id: 'mechanical',
    name: 'Mechanical Work',
    type: 'mechanical',
    description: 'Complete all mechanical repairs',
    sla_hours: 48,
    requires_approval: false,
    can_be_parallel: true,
    icon: 'Wrench',
    category: 'mechanical'
  },
  {
    id: 'body_work',
    name: 'Body Work',
    type: 'body_work',
    description: 'Complete bodywork and paint repairs',
    sla_hours: 72,
    requires_approval: false,
    can_be_parallel: true,
    icon: 'Paintbrush',
    category: 'cosmetic'
  },
  {
    id: 'detailing',
    name: 'Detailing',
    type: 'detailing',
    description: 'Professional cleaning and detailing',
    sla_hours: 8,
    requires_approval: false,
    can_be_parallel: false,
    icon: 'Sparkles',
    category: 'cosmetic'
  },
  {
    id: 'photos',
    name: 'Photography',
    type: 'photos',
    description: 'Take professional photos for listing',
    sla_hours: 4,
    requires_approval: false,
    can_be_parallel: false,
    icon: 'Camera',
    category: 'final'
  },
  {
    id: 'needs_approval',
    name: 'Needs Approval',
    type: 'needs_approval',
    description: 'Requires management approval to proceed',
    sla_hours: 24,
    requires_approval: true,
    can_be_parallel: false,
    icon: 'CheckCircle',
    category: 'final'
  },
  {
    id: 'front_line',
    name: 'Front Line Ready',
    type: 'front_line',
    description: 'Vehicle ready for sale',
    sla_hours: 1,
    requires_approval: false,
    can_be_parallel: false,
    icon: 'Star',
    category: 'final'
  }
];
