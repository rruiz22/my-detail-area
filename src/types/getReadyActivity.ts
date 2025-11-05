export interface GetReadyActivity {
  id: string;
  vehicle_id: string;
  dealer_id: number;
  activity_type: ActivityType;
  action_by: string;
  action_at: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  description: string;
  metadata?: Record<string, any>;
  created_at: string;

  // Joined data
  get_ready_vehicles?: {
    stock_number: string;
    vin: string;
    vehicle_year: number;
    vehicle_make: string;
    vehicle_model: string;
  };
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
  };
}

export type ActivityType =
  | 'vehicle_created'
  | 'vehicle_updated'
  | 'vehicle_deleted'
  | 'step_changed'
  | 'priority_changed'
  | 'workflow_changed'
  | 'work_item_created'
  | 'work_item_updated'
  | 'work_item_completed'
  | 'work_item_approved'
  | 'work_item_declined'
  | 'work_item_deleted'
  | 'note_added'
  | 'note_updated'
  | 'note_deleted'
  | 'media_uploaded'
  | 'media_deleted'
  | 'vendor_assigned'
  | 'vendor_removed'
  | 'approval_requested'
  | 'approval_granted'
  | 'approval_rejected'
  | 'sla_warning'
  | 'sla_critical'
  | 'vehicle_completed';

export interface ActivityFilters {
  activityTypes?: ActivityType[];
  userIds?: string[];
  vehicleId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  searchQuery?: string;
}

export interface ActivityStats {
  total_activities: number;
  activities_today: number;
  top_activity_type: ActivityType;
  most_active_user_id: string;
  activity_trend: Array<{ date: string; count: number }>;
}

