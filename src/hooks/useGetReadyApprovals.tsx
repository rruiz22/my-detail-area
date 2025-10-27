import { useToast } from '@/hooks/use-toast';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { supabase } from '@/integrations/supabase/client';
import type {
    ApprovalHistoryWithUser,
    ApprovalRequest,
    ApprovalResponse,
    ApprovalSummary,
    GetReadyVehicle,
    RejectRequest
} from '@/types/getReady';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// =====================================================
// QUERY HOOKS
// =====================================================

/**
 * Fetch all pending approvals (vehicles + work items)
 */
export function usePendingApprovals() {
  const { currentDealerId } = useAccessibleDealerships();

  return useQuery({
    queryKey: ['get-ready-approvals', 'pending', currentDealerId],
    queryFn: async () => {
      if (!currentDealerId) {
        throw new Error('No dealer selected');
      }

      // Fetch ALL vehicles with work items
      const { data, error } = await supabase
        .from('get_ready_vehicles')
        .select(`
          *,
          step:get_ready_steps(name, color),
          work_items:get_ready_work_items(
            id,
            title,
            description,
            status,
            work_type,
            priority,
            estimated_cost,
            estimated_hours,
            approval_required,
            approval_status,
            created_at
          )
        `)
        .eq('dealer_id', currentDealerId)
        .order('intake_date', { ascending: true });

      if (error) throw error;

      return data as GetReadyVehicle[];
    },
    enabled: !!currentDealerId,
    staleTime: 30000, // 30 seconds - balance between freshness and performance
    refetchInterval: 60000 // Refresh every minute instead of 10 seconds
  });
}

/**
 * Fetch approval summary statistics
 */
export function useApprovalSummary() {
  const { currentDealerId } = useAccessibleDealerships();

  return useQuery({
    queryKey: ['get-ready-approvals', 'summary', currentDealerId],
    queryFn: async () => {
      if (!currentDealerId) {
        throw new Error('No dealer selected');
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get pending count
      const { count: pendingCount } = await supabase
        .from('get_ready_vehicles')
        .select('*', { count: 'exact', head: true })
        .eq('dealer_id', currentDealerId)
        .eq('requires_approval', true)
        .eq('approval_status', 'pending');

      // Get approved today
      const { count: approvedToday } = await supabase
        .from('get_ready_vehicles')
        .select('*', { count: 'exact', head: true })
        .eq('dealer_id', currentDealerId)
        .eq('approval_status', 'approved')
        .gte('approved_at', today.toISOString());

      // Get rejected today
      const { count: rejectedToday } = await supabase
        .from('get_ready_vehicles')
        .select('*', { count: 'exact', head: true })
        .eq('dealer_id', currentDealerId)
        .eq('approval_status', 'rejected')
        .gte('rejected_at', today.toISOString());

      // Get pending critical (>3 days old)
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const { count: criticalCount } = await supabase
        .from('get_ready_vehicles')
        .select('*', { count: 'exact', head: true })
        .eq('dealer_id', currentDealerId)
        .eq('requires_approval', true)
        .eq('approval_status', 'pending')
        .lte('intake_date', threeDaysAgo.toISOString());

      // Get oldest pending vehicle
      const { data: oldestVehicle } = await supabase
        .from('get_ready_vehicles')
        .select('intake_date')
        .eq('dealer_id', currentDealerId)
        .eq('requires_approval', true)
        .eq('approval_status', 'pending')
        .order('intake_date', { ascending: true })
        .limit(1)
        .single();

      const oldestPendingDays = oldestVehicle
        ? Math.floor((Date.now() - new Date(oldestVehicle.intake_date).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        total_pending: pendingCount || 0,
        total_approved_today: approvedToday || 0,
        total_rejected_today: rejectedToday || 0,
        pending_critical: criticalCount || 0,
        oldest_pending_days: oldestPendingDays
      } as ApprovalSummary;
    },
    enabled: !!currentDealerId,
    refetchInterval: 60000 // Refresh every minute
  });
}

/**
 * Fetch approval history for a vehicle
 */
export function useApprovalHistory(vehicleId: string | null) {
  return useQuery({
    queryKey: ['get-ready-approvals', 'history', vehicleId],
    queryFn: async () => {
      if (!vehicleId) return [];

      const { data, error } = await supabase
        .from('get_ready_approval_history')
        .select(`
          *,
          user:action_by(name, email)
        `)
        .eq('vehicle_id', vehicleId)
        .order('action_at', { ascending: false });

      if (error) throw error;

      return data.map(item => ({
        ...item,
        user_name: item.user?.name,
        user_email: item.user?.email
      })) as ApprovalHistoryWithUser[];
    },
    enabled: !!vehicleId
  });
}

// =====================================================
// MUTATION HOOKS
// =====================================================

/**
 * Approve a vehicle
 */
export function useApproveVehicle() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ vehicleId, notes }: ApprovalRequest) => {
      const { data, error } = await supabase
        .rpc('approve_vehicle', {
          p_vehicle_id: vehicleId,
          p_notes: notes || null
        });

      if (error) throw error;

      const result = data as ApprovalResponse;

      if (!result.success) {
        throw new Error(result.error || 'Failed to approve vehicle');
      }

      return result;
    },
    onSuccess: (data, variables) => {
      toast({
        title: 'Vehicle Approved',
        description: `Vehicle has been approved successfully.`,
        variant: 'default'
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['get-ready-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['get-ready-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['get-ready-steps'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-detail', variables.vehicleId] });

      // ✅ Invalidate approval count to update badge immediately
      queryClient.invalidateQueries({ queryKey: ['get-ready-approvals-count'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Approval Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
}

/**
 * Reject a vehicle
 */
export function useRejectVehicle() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ vehicleId, reason, notes }: RejectRequest) => {
      const { data, error } = await supabase
        .rpc('reject_vehicle', {
          p_vehicle_id: vehicleId,
          p_reason: reason,
          p_notes: notes || null
        });

      if (error) throw error;

      const result = data as ApprovalResponse;

      if (!result.success) {
        throw new Error(result.error || 'Failed to reject vehicle');
      }

      return result;
    },
    onSuccess: (data, variables) => {
      toast({
        title: 'Vehicle Rejected',
        description: `Vehicle has been rejected.`,
        variant: 'default'
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['get-ready-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['get-ready-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['get-ready-steps'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-detail', variables.vehicleId] });

      // ✅ Invalidate approval count to update badge immediately
      queryClient.invalidateQueries({ queryKey: ['get-ready-approvals-count'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Rejection Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
}

/**
 * Bulk approve multiple vehicles
 */
export function useBulkApproveVehicles() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ vehicleIds, notes }: { vehicleIds: string[]; notes?: string }) => {
      const results = await Promise.allSettled(
        vehicleIds.map(vehicleId =>
          supabase.rpc('approve_vehicle', {
            p_vehicle_id: vehicleId,
            p_notes: notes || null
          })
        )
      );

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failureCount = results.filter(r => r.status === 'rejected').length;

      return { successCount, failureCount, total: vehicleIds.length };
    },
    onSuccess: (data) => {
      toast({
        title: 'Bulk Approval Complete',
        description: `${data.successCount} vehicles approved${
          data.failureCount > 0 ? `, ${data.failureCount} failed` : ''
        }`,
        variant: data.failureCount > 0 ? 'default' : 'default'
      });

      queryClient.invalidateQueries({ queryKey: ['get-ready-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['get-ready-vehicles'] });

      // ✅ Invalidate approval count to update badge immediately
      queryClient.invalidateQueries({ queryKey: ['get-ready-approvals-count'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Bulk Approval Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
}

/**
 * Request approval for a vehicle (marks as requires_approval)
 */
export function useRequestApproval() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (vehicleId: string) => {
      const { error } = await supabase
        .from('get_ready_vehicles')
        .update({
          requires_approval: true,
          approval_status: 'pending'
        })
        .eq('id', vehicleId);

      if (error) throw error;

      return { vehicleId };
    },
    onSuccess: () => {
      toast({
        title: 'Approval Requested',
        description: 'Vehicle has been submitted for approval',
        variant: 'default'
      });

      queryClient.invalidateQueries({ queryKey: ['get-ready-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['get-ready-vehicles'] });

      // ✅ Invalidate approval count to update badge immediately
      queryClient.invalidateQueries({ queryKey: ['get-ready-approvals-count'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Request Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
}
