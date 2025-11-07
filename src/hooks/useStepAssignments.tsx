import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * Step Assignment with user details
 */
export interface StepAssignment {
  id: string;
  dealer_id: number;
  step_id: string;
  user_id: string;
  role: 'technician' | 'supervisor' | 'manager';
  notification_enabled: boolean;
  created_at: string;
  updated_at: string;
  user?: {
    email: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
}

/**
 * Data for creating a new assignment
 */
export interface CreateStepAssignmentData {
  step_id: string;
  user_id: string;
  role?: 'technician' | 'supervisor' | 'manager';
  notification_enabled?: boolean;
}

/**
 * Hook for managing step user assignments
 *
 * Features:
 * - Get all users assigned to a step
 * - Assign users to a step
 * - Remove users from a step
 * - Bulk assign multiple users
 * - Update assignment settings (role, notifications)
 *
 * @param stepId - Optional step ID to filter assignments
 */
export function useStepAssignments(stepId?: string) {
  const { currentDealership } = useAccessibleDealerships();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // =====================================================
  // FETCH STEP ASSIGNMENTS
  // =====================================================

  const {
    data: assignments = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['stepAssignments', currentDealership?.id, stepId],
    queryFn: async () => {
      if (!currentDealership?.id) {
        return [];
      }

      let query = supabase
        .from('get_ready_step_assignments')
        .select(`
          *,
          user:user_id (
            email,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('dealer_id', currentDealership.id)
        .order('created_at', { ascending: false });

      // Filter by step if provided
      if (stepId) {
        query = query.eq('step_id', stepId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching step assignments:', error);
        throw error;
      }

      return (data || []) as StepAssignment[];
    },
    enabled: !!currentDealership?.id,
    staleTime: CACHE_TIMES.MEDIUM, // 5 minutes
    gcTime: GC_TIMES.MEDIUM, // 10 minutes
  });

  // =====================================================
  // ASSIGN USER TO STEP
  // =====================================================

  const assignUserMutation = useMutation({
    mutationFn: async (data: CreateStepAssignmentData) => {
      if (!currentDealership?.id) {
        throw new Error('No dealership selected');
      }

      const { data: result, error } = await supabase
        .from('get_ready_step_assignments')
        .insert({
          dealer_id: currentDealership.id,
          step_id: data.step_id,
          user_id: data.user_id,
          role: data.role || 'technician',
          notification_enabled: data.notification_enabled ?? true,
        })
        .select(`
          *,
          user:user_id (
            email,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;
      return result as StepAssignment;
    },
    onSuccess: (data) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['stepAssignments'] });
      queryClient.invalidateQueries({ queryKey: ['get-ready-steps'] });

      const userName = data.user?.first_name || data.user?.email || 'User';
      toast({
        title: 'User assigned',
        description: `${userName} has been assigned to this step`,
      });
    },
    onError: (error: any) => {
      console.error('Error assigning user:', error);

      // Check for duplicate constraint error
      if (error.code === '23505') {
        toast({
          title: 'Already assigned',
          description: 'This user is already assigned to this step',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to assign user to step',
          variant: 'destructive',
        });
      }
    },
  });

  // =====================================================
  // BULK ASSIGN USERS TO STEP
  // =====================================================

  const bulkAssignUsersMutation = useMutation({
    mutationFn: async ({
      stepId,
      userIds,
      role = 'technician',
    }: {
      stepId: string;
      userIds: string[];
      role?: 'technician' | 'supervisor' | 'manager';
    }) => {
      if (!currentDealership?.id) {
        throw new Error('No dealership selected');
      }

      // Insert multiple assignments
      const { data, error } = await supabase
        .from('get_ready_step_assignments')
        .insert(
          userIds.map((userId) => ({
            dealer_id: currentDealership.id,
            step_id: stepId,
            user_id: userId,
            role,
            notification_enabled: true,
          }))
        )
        .select(`
          *,
          user:user_id (
            email,
            first_name,
            last_name,
            avatar_url
          )
        `);

      if (error) throw error;
      return data as StepAssignment[];
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['stepAssignments'] });
      queryClient.invalidateQueries({ queryKey: ['get-ready-steps'] });

      toast({
        title: 'Users assigned',
        description: `${data.length} user(s) assigned to step`,
      });
    },
    onError: (error: any) => {
      console.error('Error bulk assigning users:', error);

      if (error.code === '23505') {
        toast({
          title: 'Some users already assigned',
          description: 'Some users were skipped because they are already assigned',
          variant: 'default',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to assign users to step',
          variant: 'destructive',
        });
      }
    },
  });

  // =====================================================
  // REMOVE USER FROM STEP
  // =====================================================

  const removeUserMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from('get_ready_step_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stepAssignments'] });
      queryClient.invalidateQueries({ queryKey: ['get-ready-steps'] });

      toast({
        title: 'User removed',
        description: 'User has been removed from this step',
      });
    },
    onError: (error) => {
      console.error('Error removing user:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove user from step',
        variant: 'destructive',
      });
    },
  });

  // =====================================================
  // UPDATE ASSIGNMENT SETTINGS
  // =====================================================

  const updateAssignmentMutation = useMutation({
    mutationFn: async ({
      assignmentId,
      updates,
    }: {
      assignmentId: string;
      updates: {
        role?: 'technician' | 'supervisor' | 'manager';
        notification_enabled?: boolean;
      };
    }) => {
      const { data, error } = await supabase
        .from('get_ready_step_assignments')
        .update(updates)
        .eq('id', assignmentId)
        .select(`
          *,
          user:user_id (
            email,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;
      return data as StepAssignment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stepAssignments'] });

      toast({
        title: 'Assignment updated',
        description: 'Assignment settings have been updated',
      });
    },
    onError: (error) => {
      console.error('Error updating assignment:', error);
      toast({
        title: 'Error',
        description: 'Failed to update assignment',
        variant: 'destructive',
      });
    },
  });

  // =====================================================
  // REPLACE ALL ASSIGNMENTS (for step editing)
  // =====================================================

  const replaceAssignmentsMutation = useMutation({
    mutationFn: async ({
      stepId,
      userIds,
      role = 'technician',
    }: {
      stepId: string;
      userIds: string[];
      role?: 'technician' | 'supervisor' | 'manager';
    }) => {
      if (!currentDealership?.id) {
        throw new Error('No dealership selected');
      }

      // Delete all existing assignments for this step
      const { error: deleteError } = await supabase
        .from('get_ready_step_assignments')
        .delete()
        .eq('step_id', stepId)
        .eq('dealer_id', currentDealership.id);

      if (deleteError) throw deleteError;

      // Insert new assignments
      if (userIds.length > 0) {
        const { data, error: insertError } = await supabase
          .from('get_ready_step_assignments')
          .insert(
            userIds.map((userId) => ({
              dealer_id: currentDealership.id,
              step_id: stepId,
              user_id: userId,
              role,
              notification_enabled: true,
            }))
          )
          .select(`
            *,
            user:user_id (
              email,
              first_name,
              last_name,
              avatar_url
            )
          `);

        if (insertError) throw insertError;
        return data as StepAssignment[];
      }

      return [];
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['stepAssignments'] });
      queryClient.invalidateQueries({ queryKey: ['get-ready-steps'] });

      toast({
        title: 'Assignments updated',
        description: `${data.length} user(s) now assigned to step`,
      });
    },
    onError: (error) => {
      console.error('Error replacing assignments:', error);
      toast({
        title: 'Error',
        description: 'Failed to update step assignments',
        variant: 'destructive',
      });
    },
  });

  // =====================================================
  // HELPER FUNCTIONS
  // =====================================================

  /**
   * Get user IDs currently assigned to the step
   */
  const getAssignedUserIds = (): string[] => {
    return assignments.map((assignment) => assignment.user_id);
  };

  /**
   * Check if a user is assigned to the step
   */
  const isUserAssigned = (userId: string): boolean => {
    return assignments.some((assignment) => assignment.user_id === userId);
  };

  // =====================================================
  // RETURN HOOK INTERFACE
  // =====================================================

  return {
    // Data
    assignments,
    isLoading,
    error,

    // Queries
    refetch,

    // Mutations
    assignUser: assignUserMutation.mutate,
    assignUserAsync: assignUserMutation.mutateAsync,
    bulkAssignUsers: bulkAssignUsersMutation.mutate,
    bulkAssignUsersAsync: bulkAssignUsersMutation.mutateAsync,
    removeUser: removeUserMutation.mutate,
    removeUserAsync: removeUserMutation.mutateAsync,
    updateAssignment: updateAssignmentMutation.mutate,
    updateAssignmentAsync: updateAssignmentMutation.mutateAsync,
    replaceAssignments: replaceAssignmentsMutation.mutate,
    replaceAssignmentsAsync: replaceAssignmentsMutation.mutateAsync,

    // Mutation states
    isAssigning: assignUserMutation.isPending,
    isBulkAssigning: bulkAssignUsersMutation.isPending,
    isRemoving: removeUserMutation.isPending,
    isUpdating: updateAssignmentMutation.isPending,
    isReplacing: replaceAssignmentsMutation.isPending,

    // Helpers
    getAssignedUserIds,
    isUserAssigned,
  };
}
