import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

// Types based on database schema
// ✨ ENHANCED STATUS SYSTEM - Option 2: Simplified Enterprise System
// Pre-Work: awaiting_approval → rejected OR ready → scheduled
// During Work: in_progress ⇄ on_hold / blocked
// Post-Work: completed | cancelled
export type WorkItemStatus =
  // Pre-Work Phase
  | 'awaiting_approval'  // Waiting for approval (when approval_required=true)
  | 'rejected'           // Rejected by approver (needs correction)
  | 'ready'              // Approved or no approval needed, ready to start
  | 'scheduled'          // Scheduled for future date

  // Execution Phase
  | 'in_progress'        // Active work in progress
  | 'on_hold'            // Temporarily paused
  | 'blocked'            // Blocked by dependencies (parts, other work, etc.)

  // Completion Phase
  | 'completed'          // Successfully completed
  | 'cancelled'          // Cancelled (can occur at any pre-completion stage)
  ;

export type WorkItemType = 'mechanical' | 'body_repair' | 'detailing' | 'safety_inspection' | 'reconditioning' | 'parts_ordering' | 'other';

export interface WorkItem {
  id: string;
  vehicle_id: string;
  dealer_id: number;
  title: string;
  description?: string;
  work_type: WorkItemType;
  status: WorkItemStatus;
  priority: number; // 1=low, 2=normal, 3=high
  estimated_cost: number;
  actual_cost: number;
  estimated_hours: number;
  actual_hours: number;
  assigned_technician?: string;
  assigned_vendor_id?: string | null; // NEW: Vendor assignment
  approval_required: boolean;
  approval_status?: string;
  decline_reason?: string;
  approved_by?: string;
  approved_at?: string;
  parts_required?: Array<{
    part_name: string;
    part_number?: string;
    quantity: number;
    estimated_cost: number;
  }>;
  parts_status?: string;
  blocked_by?: string[];
  blocked_reason?: string; // NEW: Reason for blocking
  on_hold_reason?: string; // NEW: Reason for putting on hold
  cancelled_reason?: string; // NEW: Reason for cancellation
  cancelled_by?: string; // NEW: User who cancelled
  cancelled_at?: string; // NEW: Timestamp of cancellation
  scheduled_start?: string;
  scheduled_end?: string;
  actual_start?: string;
  actual_end?: string;
  photos_before?: string[];
  photos_after?: string[];
  created_by?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  assigned_technician_profile?: {
    first_name: string;
    last_name: string;
  };
  assigned_vendor?: { // NEW: Vendor data when joined
    id: string;
    name: string;
    specialties: string[];
  } | null;
  // Computed counts
  media_count?: number; // NEW: Count of linked media
  notes_count?: number; // NEW: Count of linked notes
}

export interface CreateWorkItemInput {
  vehicle_id: string;
  title: string;
  description?: string;
  work_type: WorkItemType;
  priority?: number;
  estimated_cost?: number;
  estimated_hours?: number;
  assigned_technician?: string;
  approval_required?: boolean;
  parts_required?: Array<{
    part_name: string;
    part_number?: string;
    quantity: number;
    estimated_cost: number;
  }>;
  scheduled_start?: string;
  scheduled_end?: string;
}

export interface UpdateWorkItemInput {
  id: string;
  title?: string;
  description?: string;
  work_type?: WorkItemType;
  status?: WorkItemStatus;
  priority?: number;
  estimated_cost?: number;
  actual_cost?: number;
  estimated_hours?: number;
  actual_hours?: number;
  assigned_technician?: string;
  approval_required?: boolean;
  parts_required?: Array<{
    part_name: string;
    part_number?: string;
    quantity: number;
    estimated_cost: number;
  }>;
  parts_status?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  actual_start?: string;
  actual_end?: string;
  photos_before?: string[];
  photos_after?: string[];
}

/**
 * Hook to fetch all work items for a vehicle
 */
export function useWorkItems(vehicleId: string | null) {
  const { t } = useTranslation();
  const { currentDealership } = useAccessibleDealerships();

  return useQuery({
    queryKey: ['work-items', vehicleId],
    queryFn: async () => {
      if (!vehicleId) return [];
      if (!currentDealership?.id) {
        throw new Error('No dealership selected');
      }

      const { data, error } = await supabase
        .from('get_ready_work_items')
        .select(`
          *,
          assigned_technician_profile:profiles!assigned_technician(
            first_name,
            last_name
          )
        `)
        .eq('vehicle_id', vehicleId)
        .eq('dealer_id', currentDealership.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching work items:', error);
        toast.error(t('get_ready.work_items.error_loading'));
        throw error;
      }

      // Fetch vendor data separately if there are assigned vendors
      const workItemsWithVendors = data || [];
      const vendorIds = [...new Set(workItemsWithVendors
        .map(wi => wi.assigned_vendor_id)
        .filter(Boolean)
      )];

      let vendors: any[] = [];
      if (vendorIds.length > 0) {
        const { data: vendorsData, error: vendorsError } = await supabase
          .from('recon_vendors')
          .select('id, name, specialties')
          .in('id', vendorIds);

        if (!vendorsError && vendorsData) {
          vendors = vendorsData;
        }
      }

      // Fetch counts of linked media and notes for each work item
      const workItemIds = workItemsWithVendors.map(wi => wi.id);

      let mediaCounts = new Map<string, number>();
      let notesCounts = new Map<string, number>();

      if (workItemIds.length > 0) {
        // Get media counts
        const { data: mediaData } = await supabase
          .from('vehicle_media')
          .select('linked_work_item_id')
          .in('linked_work_item_id', workItemIds)
          .not('linked_work_item_id', 'is', null);

        if (mediaData) {
          mediaData.forEach(item => {
            const count = mediaCounts.get(item.linked_work_item_id!) || 0;
            mediaCounts.set(item.linked_work_item_id!, count + 1);
          });
        }

        // Get notes counts
        const { data: notesData } = await supabase
          .from('vehicle_notes')
          .select('linked_work_item_id')
          .in('linked_work_item_id', workItemIds)
          .not('linked_work_item_id', 'is', null);

        if (notesData) {
          notesData.forEach(item => {
            const count = notesCounts.get(item.linked_work_item_id!) || 0;
            notesCounts.set(item.linked_work_item_id!, count + 1);
          });
        }
      }

      // Map vendor data and counts to work items
      const vendorMap = new Map(vendors.map(v => [v.id, v]));
      const result = workItemsWithVendors.map(workItem => ({
        ...workItem,
        assigned_vendor: workItem.assigned_vendor_id
          ? vendorMap.get(workItem.assigned_vendor_id) || null
          : null,
        media_count: mediaCounts.get(workItem.id) || 0,
        notes_count: notesCounts.get(workItem.id) || 0,
      }));

      return result as WorkItem[];
    },
    enabled: !!vehicleId,
  });
}

/**
 * Hook to create a new work item
 */
export function useCreateWorkItem() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentDealership } = useAccessibleDealerships();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateWorkItemInput) => {
      if (!currentDealership?.id) {
        throw new Error('No dealership selected');
      }

      // ✨ NEW: Determine initial status based on approval requirement
      const initialStatus: WorkItemStatus = input.approval_required
        ? 'awaiting_approval'  // Needs approval first
        : 'ready';             // Ready to start immediately

      const { data, error } = await supabase
        .from('get_ready_work_items')
        .insert({
          ...input,
          dealer_id: currentDealership.id,
          created_by: user?.id,
          status: initialStatus,
          priority: input.priority || 2,
          estimated_cost: input.estimated_cost || 0,
          actual_cost: 0,
          estimated_hours: input.estimated_hours || 0,
          actual_hours: 0,
          approval_required: input.approval_required || false,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating work item:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['work-items', data.vehicle_id] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-detail', data.vehicle_id] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-timeline', data.vehicle_id] });

      // ✅ NEW: Invalidate vehicles query to refresh Approvals tab
      // When work item has approval_required=true, trigger marks vehicle for approval
      // This ensures Approvals tab shows the vehicle immediately
      queryClient.invalidateQueries({ queryKey: ['get-ready-vehicles'] });

      toast.success(t('get_ready.work_items.created_successfully'));
    },
    onError: (error) => {
      console.error('Create work item mutation error:', error);
      toast.error(t('get_ready.work_items.error_creating'));
    },
  });
}

/**
 * Hook to update a work item
 */
export function useUpdateWorkItem() {
  const { t } = useTranslation();
  const { currentDealership } = useAccessibleDealerships();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateWorkItemInput) => {
      const { id, ...updates } = input;

      if (!currentDealership?.id) {
        throw new Error('No dealership selected');
      }

      const { data, error } = await supabase
        .from('get_ready_work_items')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('dealer_id', currentDealership.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating work item:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['work-items', data.vehicle_id] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-detail', data.vehicle_id] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-timeline', data.vehicle_id] });

      // ✅ NEW: Invalidate vehicles query to refresh Approvals tab
      // Changing approval_required might affect vehicle approval status via trigger
      queryClient.invalidateQueries({ queryKey: ['get-ready-vehicles'] });

      toast.success(t('get_ready.work_items.updated_successfully'));
    },
    onError: (error) => {
      console.error('Update work item mutation error:', error);
      toast.error(t('get_ready.work_items.error_updating'));
    },
  });
}

/**
 * Hook to approve a work item
 */
export function useApproveWorkItem() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, vehicleId }: { id: string; vehicleId: string }) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // ✨ NEW: After approval, work item becomes 'ready' to start
      const { data, error } = await supabase
        .from('get_ready_work_items')
        .update({
          approval_status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          status: 'approved', // Changed to 'approved' for approved work items
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error approving work item:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['work-items', data.vehicle_id] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-detail', data.vehicle_id] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-timeline', data.vehicle_id] });

      // ✅ NEW: Invalidate vehicles query to refresh Approvals tab
      // Approving work item might remove vehicle from Approvals via trigger
      queryClient.invalidateQueries({ queryKey: ['get-ready-vehicles'] });

      toast.success(t('get_ready.work_items.approved_successfully'));
    },
    onError: (error) => {
      console.error('Approve work item mutation error:', error);
      toast.error(t('get_ready.work_items.error_approving'));
    },
  });
}

/**
 * Hook to decline a work item
 */
export function useDeclineWorkItem() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, vehicleId, reason }: { id: string; vehicleId: string; reason: string }) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // ✨ NEW: Use 'rejected' instead of 'declined' for approval rejection
      const { data, error } = await supabase
        .from('get_ready_work_items')
        .update({
          status: 'rejected', // ✨ NEW: Change from 'declined' to 'rejected'
          approval_status: 'declined',
          decline_reason: reason,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error declining work item:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['work-items', data.vehicle_id] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-detail', data.vehicle_id] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-timeline', data.vehicle_id] });

      // ✅ NEW: Invalidate vehicles query to refresh Approvals tab
      // Declining work item affects vehicle approval status via trigger
      queryClient.invalidateQueries({ queryKey: ['get-ready-vehicles'] });

      toast.success(t('get_ready.work_items.declined_successfully'));
    },
    onError: (error) => {
      console.error('Decline work item mutation error:', error);
      toast.error(t('get_ready.work_items.error_declining'));
    },
  });
}

/**
 * Hook to start a work item (marks actual_start timestamp)
 */
export function useStartWorkItem() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, vehicleId }: { id: string; vehicleId: string }) => {
      const { data, error } = await supabase
        .from('get_ready_work_items')
        .update({
          status: 'in_progress',
          actual_start: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error starting work item:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['work-items', data.vehicle_id] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-detail', data.vehicle_id] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-timeline', data.vehicle_id] });
      toast.success(t('get_ready.work_items.started_successfully'));
    },
    onError: (error) => {
      console.error('Start work item mutation error:', error);
      toast.error(t('get_ready.work_items.error_starting'));
    },
  });
}

/**
 * Hook to complete a work item (marks actual_end timestamp)
 * Auto-calculates actual_hours from actual_start if not provided
 */
export function useCompleteWorkItem() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, vehicleId, actualCost, actualHours }: {
      id: string;
      vehicleId: string;
      actualCost?: number;
      actualHours?: number;
    }) => {
      // First, fetch the work item to get actual_start for auto-calculation
      const { data: workItem, error: fetchError } = await supabase
        .from('get_ready_work_items')
        .select('actual_start, estimated_hours')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('Error fetching work item for completion:', fetchError);
        throw fetchError;
      }

      // Auto-calculate actual_hours if not provided and actual_start exists
      let finalActualHours = actualHours;
      if (actualHours === undefined && workItem?.actual_start) {
        const startTime = new Date(workItem.actual_start);
        const endTime = new Date();
        const diffInMs = endTime.getTime() - startTime.getTime();
        // Convert to hours with 2 decimal precision
        finalActualHours = Math.round((diffInMs / (1000 * 60 * 60)) * 100) / 100;
        console.log(`Auto-calculated actual_hours: ${finalActualHours} (from ${workItem.actual_start} to ${endTime.toISOString()})`);
      } else if (actualHours === undefined) {
        // Fallback to estimated_hours if no actual_start
        finalActualHours = workItem?.estimated_hours || 0;
      }

      const { data, error } = await supabase
        .from('get_ready_work_items')
        .update({
          status: 'completed',
          actual_end: new Date().toISOString(),
          actual_cost: actualCost,
          actual_hours: finalActualHours,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error completing work item:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['work-items', data.vehicle_id] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-detail', data.vehicle_id] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-timeline', data.vehicle_id] });
      toast.success(t('get_ready.work_items.completed_successfully'));
    },
    onError: (error) => {
      console.error('Complete work item mutation error:', error);
      toast.error(t('get_ready.work_items.error_completing'));
    },
  });
}

/**
 * Hook to delete a work item
 */
export function useDeleteWorkItem() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, vehicleId }: { id: string; vehicleId: string }) => {
      const { error } = await supabase
        .from('get_ready_work_items')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting work item:', error);
        throw error;
      }

      return { id, vehicleId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['work-items', data.vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-detail', data.vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-timeline', data.vehicleId] });
      toast.success(t('get_ready.work_items.deleted_successfully'));
    },
    onError: (error) => {
      console.error('Delete work item mutation error:', error);
      toast.error(t('get_ready.work_items.error_deleting'));
    },
  });
}

/**
 * ✨ NEW: Hook to pause a work item (in_progress → on_hold)
 */
export function usePauseWorkItem() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, vehicleId, reason }: { id: string; vehicleId: string; reason?: string }) => {
      const { data, error } = await supabase
        .from('get_ready_work_items')
        .update({
          status: 'on_hold',
          on_hold_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error pausing work item:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['work-items', data.vehicle_id] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-detail', data.vehicle_id] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-timeline', data.vehicle_id] });
      toast.success(t('get_ready.work_items.paused_successfully'));
    },
    onError: (error) => {
      console.error('Pause work item mutation error:', error);
      toast.error(t('get_ready.work_items.error_pausing'));
    },
  });
}

/**
 * ✨ NEW: Hook to block a work item (in_progress → blocked)
 */
export function useBlockWorkItem() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, vehicleId, reason }: { id: string; vehicleId: string; reason: string }) => {
      const { data, error } = await supabase
        .from('get_ready_work_items')
        .update({
          status: 'blocked',
          blocked_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error blocking work item:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['work-items', data.vehicle_id] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-detail', data.vehicle_id] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-timeline', data.vehicle_id] });
      toast.success(t('get_ready.work_items.blocked_successfully'));
    },
    onError: (error) => {
      console.error('Block work item mutation error:', error);
      toast.error(t('get_ready.work_items.error_blocking'));
    },
  });
}

/**
 * ✨ NEW: Hook to resume a work item (on_hold → in_progress)
 */
export function useResumeWorkItem() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, vehicleId }: { id: string; vehicleId: string }) => {
      const { data, error } = await supabase
        .from('get_ready_work_items')
        .update({
          status: 'in_progress',
          on_hold_reason: null, // Clear the hold reason
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error resuming work item:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['work-items', data.vehicle_id] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-detail', data.vehicle_id] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-timeline', data.vehicle_id] });
      toast.success(t('get_ready.work_items.resumed_successfully'));
    },
    onError: (error) => {
      console.error('Resume work item mutation error:', error);
      toast.error(t('get_ready.work_items.error_resuming'));
    },
  });
}

/**
 * ✨ NEW: Hook to unblock a work item (blocked → in_progress)
 */
export function useUnblockWorkItem() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, vehicleId }: { id: string; vehicleId: string }) => {
      const { data, error } = await supabase
        .from('get_ready_work_items')
        .update({
          status: 'in_progress',
          blocked_reason: null, // Clear the blocked reason
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error unblocking work item:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['work-items', data.vehicle_id] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-detail', data.vehicle_id] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-timeline', data.vehicle_id] });
      toast.success(t('get_ready.work_items.unblocked_successfully'));
    },
    onError: (error) => {
      console.error('Unblock work item mutation error:', error);
      toast.error(t('get_ready.work_items.error_unblocking'));
    },
  });
}

/**
 * ✨ NEW: Hook to cancel a work item (any pre-completion status → cancelled)
 */
export function useCancelWorkItem() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, vehicleId, reason }: { id: string; vehicleId: string; reason: string }) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('get_ready_work_items')
        .update({
          status: 'cancelled',
          cancelled_reason: reason,
          cancelled_by: user.id,
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error cancelling work item:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['work-items', data.vehicle_id] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-detail', data.vehicle_id] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-timeline', data.vehicle_id] });
      toast.success(t('get_ready.work_items.cancelled_successfully'));
    },
    onError: (error) => {
      console.error('Cancel work item mutation error:', error);
      toast.error(t('get_ready.work_items.error_cancelling'));
    },
  });
}

/**
 * Hook to assign a vendor to a work item
 */
export function useAssignVendorToWorkItem() {
  const { t } = useTranslation();
  const { currentDealership } = useAccessibleDealerships();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workItemId, vendorId, vehicleId }: {
      workItemId: string;
      vendorId: string | null;
      vehicleId: string;
    }) => {
      if (!currentDealership?.id) {
        throw new Error('No dealership selected');
      }

      const { data, error } = await supabase
        .from('get_ready_work_items')
        .update({
          assigned_vendor_id: vendorId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', workItemId)
        .eq('dealer_id', currentDealership.id)
        .select()
        .single();

      if (error) {
        console.error('Error assigning vendor:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['work-items', variables.vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-detail', variables.vehicleId] });
      toast.success(
        variables.vendorId
          ? t('get_ready.vendors.vendor_assigned_successfully')
          : t('get_ready.vendors.vendor_unassigned_successfully')
      );
    },
    onError: (error) => {
      console.error('Assign vendor mutation error:', error);
      toast.error(t('get_ready.vendors.error_assigning_vendor'));
    },
  });
}