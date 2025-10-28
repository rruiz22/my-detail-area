import { NotificationEvent } from '@/components/profile/NotificationEventsTable';

// =====================================================
// SALES ORDERS EVENTS
// =====================================================
export const SALES_ORDER_EVENTS: NotificationEvent[] = [
  {
    id: 'order_created',
    label: 'Order Created',
    category: 'orders',
    description: 'When a new sales order is created',
    hasConfig: false,
  },
  {
    id: 'order_assigned',
    label: 'Order Assigned',
    category: 'orders',
    description: 'When an order is assigned to you',
    hasConfig: false,
  },
  {
    id: 'status_changed',
    label: 'Status Changed',
    category: 'orders',
    description: 'When order status changes',
    hasConfig: true, // Can configure which statuses trigger notification
  },
  {
    id: 'comment_added',
    label: 'Comment Added',
    category: 'team',
    description: 'When someone comments on an order',
    hasConfig: false,
  },
  {
    id: 'attachment_added',
    label: 'Attachment Added',
    category: 'team',
    description: 'When a file is attached to an order',
    hasConfig: false,
  },
  {
    id: 'follower_added',
    label: 'Follower Added',
    category: 'team',
    description: 'When you are added as a follower to an order',
    hasConfig: false,
  },
  {
    id: 'due_date_approaching',
    label: 'Due Date Approaching',
    category: 'deadlines',
    description: 'Reminder before order due date',
    hasConfig: true, // Can configure minutes before
  },
  {
    id: 'overdue',
    label: 'Overdue',
    category: 'deadlines',
    description: 'When an order is overdue',
    hasConfig: false,
  },
  {
    id: 'priority_changed',
    label: 'Priority Changed',
    category: 'orders',
    description: 'When order priority changes',
    hasConfig: false,
  },
  {
    id: 'payment_received',
    label: 'Payment Received',
    category: 'financial',
    description: 'When payment is confirmed for an order',
    hasConfig: false,
  },
];

// =====================================================
// SERVICE ORDERS EVENTS
// =====================================================
export const SERVICE_ORDER_EVENTS: NotificationEvent[] = [
  {
    id: 'order_created',
    label: 'Order Created',
    category: 'orders',
    description: 'When a new service order is created',
    hasConfig: false,
  },
  {
    id: 'order_assigned',
    label: 'Order Assigned',
    category: 'orders',
    description: 'When an order is assigned to you',
    hasConfig: false,
  },
  {
    id: 'status_changed',
    label: 'Status Changed',
    category: 'orders',
    description: 'When order status changes',
    hasConfig: true,
  },
  {
    id: 'comment_added',
    label: 'Comment Added',
    category: 'team',
    description: 'When someone comments on an order',
    hasConfig: false,
  },
  {
    id: 'attachment_added',
    label: 'Attachment Added',
    category: 'team',
    description: 'When a file is attached to an order',
    hasConfig: false,
  },
  {
    id: 'follower_added',
    label: 'Follower Added',
    category: 'team',
    description: 'When you are added as a follower',
    hasConfig: false,
  },
  {
    id: 'due_date_approaching',
    label: 'Due Date Approaching',
    category: 'deadlines',
    description: 'Reminder before service due date',
    hasConfig: true,
  },
  {
    id: 'overdue',
    label: 'Overdue',
    category: 'deadlines',
    description: 'When a service order is overdue',
    hasConfig: false,
  },
  {
    id: 'priority_changed',
    label: 'Priority Changed',
    category: 'orders',
    description: 'When order priority changes',
    hasConfig: false,
  },
  {
    id: 'customer_approval_required',
    label: 'Customer Approval Required',
    category: 'orders',
    description: 'When additional work requires customer approval',
    hasConfig: false,
  },
];

// =====================================================
// RECON ORDERS EVENTS
// =====================================================
export const RECON_ORDER_EVENTS: NotificationEvent[] = [
  {
    id: 'order_created',
    label: 'Order Created',
    category: 'orders',
    description: 'When a new recon order is created',
    hasConfig: false,
  },
  {
    id: 'order_assigned',
    label: 'Order Assigned',
    category: 'orders',
    description: 'When an order is assigned to you',
    hasConfig: false,
  },
  {
    id: 'status_changed',
    label: 'Status Changed',
    category: 'orders',
    description: 'When recon status changes',
    hasConfig: true,
  },
  {
    id: 'comment_added',
    label: 'Comment Added',
    category: 'team',
    description: 'When someone comments',
    hasConfig: false,
  },
  {
    id: 'attachment_added',
    label: 'Attachment Added',
    category: 'team',
    description: 'When a file is attached',
    hasConfig: false,
  },
  {
    id: 'follower_added',
    label: 'Follower Added',
    category: 'team',
    description: 'When you are added as a follower',
    hasConfig: false,
  },
  {
    id: 'due_date_approaching',
    label: 'Due Date Approaching',
    category: 'deadlines',
    description: 'Reminder before recon completion date',
    hasConfig: true,
  },
  {
    id: 'overdue',
    label: 'Overdue',
    category: 'deadlines',
    description: 'When recon is overdue',
    hasConfig: false,
  },
  {
    id: 'priority_changed',
    label: 'Priority Changed',
    category: 'orders',
    description: 'When priority changes',
    hasConfig: false,
  },
  {
    id: 'inspection_completed',
    label: 'Inspection Completed',
    category: 'orders',
    description: 'When vehicle inspection is done',
    hasConfig: false,
  },
  {
    id: 'ready_for_sale',
    label: 'Ready for Sale',
    category: 'orders',
    description: 'When vehicle is ready to be listed',
    hasConfig: false,
  },
];

// =====================================================
// CAR WASH EVENTS
// =====================================================
export const CAR_WASH_EVENTS: NotificationEvent[] = [
  {
    id: 'order_created',
    label: 'Order Created',
    category: 'orders',
    description: 'When a new car wash order is created',
    hasConfig: false,
  },
  {
    id: 'order_assigned',
    label: 'Order Assigned',
    category: 'orders',
    description: 'When an order is assigned to you',
    hasConfig: false,
  },
  {
    id: 'status_changed',
    label: 'Status Changed',
    category: 'orders',
    description: 'When order status changes',
    hasConfig: true,
  },
  {
    id: 'comment_added',
    label: 'Comment Added',
    category: 'team',
    description: 'When someone comments',
    hasConfig: false,
  },
  {
    id: 'overdue',
    label: 'Overdue',
    category: 'deadlines',
    description: 'When service is overdue',
    hasConfig: false,
  },
  {
    id: 'service_completed',
    label: 'Service Completed',
    category: 'orders',
    description: 'When car wash is completed',
    hasConfig: false,
  },
];

// =====================================================
// GET READY EVENTS
// =====================================================
export const GET_READY_EVENTS: NotificationEvent[] = [
  {
    id: 'sla_warning',
    label: 'SLA Warning',
    category: 'deadlines',
    description: 'When vehicle SLA approaches threshold (yellow)',
    hasConfig: false,
  },
  {
    id: 'sla_critical',
    label: 'SLA Critical',
    category: 'deadlines',
    description: 'When vehicle SLA is violated (red)',
    hasConfig: false,
  },
  {
    id: 'approval_pending',
    label: 'Approval Pending',
    category: 'orders',
    description: 'When a vehicle requires approval',
    hasConfig: false,
  },
  {
    id: 'approval_approved',
    label: 'Approval Approved',
    category: 'orders',
    description: 'When a vehicle is approved',
    hasConfig: false,
  },
  {
    id: 'approval_rejected',
    label: 'Approval Rejected',
    category: 'orders',
    description: 'When a vehicle approval is rejected',
    hasConfig: false,
  },
  {
    id: 'bottleneck_detected',
    label: 'Bottleneck Detected',
    category: 'system',
    description: 'When a workflow bottleneck is detected',
    hasConfig: false,
  },
  {
    id: 'bottleneck_resolved',
    label: 'Bottleneck Resolved',
    category: 'system',
    description: 'When a bottleneck is resolved',
    hasConfig: false,
  },
  {
    id: 'vehicle_status_change',
    label: 'Vehicle Status Change',
    category: 'orders',
    description: 'When vehicle status changes',
    hasConfig: false,
  },
  {
    id: 'work_item_completed',
    label: 'Work Item Completed',
    category: 'orders',
    description: 'When a work item is marked as completed',
    hasConfig: false,
  },
  {
    id: 'work_item_created',
    label: 'Work Item Created',
    category: 'orders',
    description: 'When a new work item is created',
    hasConfig: false,
  },
  {
    id: 'step_completed',
    label: 'Step Completed',
    category: 'orders',
    description: 'When a vehicle moves to next step',
    hasConfig: false,
  },
  {
    id: 'system_alert',
    label: 'System Alert',
    category: 'system',
    description: 'Important system notifications',
    hasConfig: false,
  },
];

// =====================================================
// HELPER FUNCTIONS
// =====================================================

export const getEventsForModule = (module: string): NotificationEvent[] => {
  switch (module) {
    case 'sales_orders': return SALES_ORDER_EVENTS;
    case 'service_orders': return SERVICE_ORDER_EVENTS;
    case 'recon_orders': return RECON_ORDER_EVENTS;
    case 'car_wash': return CAR_WASH_EVENTS;
    case 'get_ready': return GET_READY_EVENTS;
    default: return [];
  }
};

export const getAllCategories = (): string[] => [
  'all',
  'orders',
  'team',
  'deadlines',
  'financial',
  'system',
];
