/**
 * Centralized Approval Logic Utilities
 * Ensures consistent approval filtering across the Get Ready module
 */

export interface WorkItem {
  id: string;
  approval_required: boolean;
  approval_status: 'pending' | 'approved' | 'declined' | null;
  status?: string;
}

export interface Vehicle {
  id: string;
  requires_approval?: boolean;
  approval_status?: 'pending' | 'approved' | 'declined' | null;
}

/**
 * Check if a work item needs approval
 * Centralized logic to avoid inconsistencies
 */
export function workItemNeedsApproval(workItem: WorkItem): boolean {
  return (
    workItem.approval_required === true &&
    workItem.approval_status !== 'declined' &&
    workItem.approval_status !== 'approved'
  );
}

/**
 * Check if a vehicle needs approval
 * Centralized logic to avoid inconsistencies
 */
export function vehicleNeedsApproval(vehicle: Vehicle): boolean {
  return (
    vehicle.requires_approval === true &&
    vehicle.approval_status === 'pending'
  );
}

/**
 * Filter work items that need approval
 */
export function filterWorkItemsNeedingApproval(workItems: WorkItem[]): WorkItem[] {
  return workItems.filter(workItemNeedsApproval);
}

/**
 * Filter vehicles that need approval
 */
export function filterVehiclesNeedingApproval(vehicles: Vehicle[]): Vehicle[] {
  return vehicles.filter(vehicleNeedsApproval);
}

/**
 * Count work items needing approval
 */
export function countWorkItemsNeedingApproval(workItems: WorkItem[]): number {
  return workItems.filter(workItemNeedsApproval).length;
}

/**
 * Count vehicles needing approval
 */
export function countVehiclesNeedingApproval(vehicles: Vehicle[]): number {
  return vehicles.filter(vehicleNeedsApproval).length;
}

/**
 * Check if a vehicle has any work items needing approval
 */
export function vehicleHasWorkItemsNeedingApproval(
  workItems: WorkItem[]
): boolean {
  return workItems.some(workItemNeedsApproval);
}

/**
 * Get approval status label for UI display
 */
export function getApprovalStatusLabel(
  status: 'pending' | 'approved' | 'declined' | null
): string {
  switch (status) {
    case 'pending':
      return 'Pending Approval';
    case 'approved':
      return 'Approved';
    case 'declined':
      return 'Declined';
    default:
      return 'No Status';
  }
}

/**
 * Get approval priority (for sorting)
 * Higher number = higher priority
 */
export function getApprovalPriority(
  item: WorkItem | Vehicle
): number {
  // Declined items have lowest priority
  if (item.approval_status === 'declined') return 0;

  // Approved items have low priority
  if (item.approval_status === 'approved') return 1;

  // Pending items have high priority
  if (item.approval_status === 'pending') return 3;

  // Items with no status
  return 2;
}
