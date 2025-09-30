import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

// Types based on database schema
export type WorkItemStatus = 'pending' | 'in_progress' | 'completed' | 'declined';
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

  return useQuery({
    queryKey: ['work-items', vehicleId],
    queryFn: async () => {
      if (!vehicleId) return [];

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
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching work items:', error);
        toast.error(t('get_ready.work_items.error_loading'));
        throw error;
      }

      return data as WorkItem[];
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateWorkItemInput) => {
      if (!user?.dealer_id) {
        throw new Error('Dealer ID not found');
      }

      const { data, error } = await supabase
        .from('get_ready_work_items')
        .insert({
          ...input,
          dealer_id: user.dealer_id,
          created_by: user.id,
          status: 'pending',
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateWorkItemInput) => {
      const { id, ...updates } = input;

      const { data, error } = await supabase
        .from('get_ready_work_items')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
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

      const { data, error } = await supabase
        .from('get_ready_work_items')
        .update({
          approval_status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          status: 'pending', // Move to pending after approval
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

      const { data, error } = await supabase
        .from('get_ready_work_items')
        .update({
          status: 'declined',
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
      const { data, error } = await supabase
        .from('get_ready_work_items')
        .update({
          status: 'completed',
          actual_end: new Date().toISOString(),
          actual_cost: actualCost,
          actual_hours: actualHours,
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