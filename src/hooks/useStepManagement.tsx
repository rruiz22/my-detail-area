import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { supabase } from '@/integrations/supabase/client';
import { GetReadyStep } from '@/types/getReady';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';

interface CreateStepInput {
  name: string;
  description?: string;
  order_index: number;
  color: string;
  icon?: string;
  sla_hours: number;
  cost_per_day?: number;
  is_default?: boolean;
  // Last step configuration
  is_last_step?: boolean;
  // Sidebar display options
  show_sidebar_count?: boolean;
  show_sidebar_breakdown?: boolean;
  // Advanced settings
  target_throughput?: number;
  bottleneck_threshold?: number;
  parallel_capable?: boolean;
  express_lane_eligible?: boolean;
}

interface UpdateStepInput extends Partial<CreateStepInput> {
  id: string;
}

export function useStepManagement() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { currentDealership } = useAccessibleDealerships();
  const queryClient = useQueryClient();

  // Create Step
  const createStepMutation = useMutation({
    mutationFn: async (input: CreateStepInput) => {
      if (!currentDealership?.id) {
        throw new Error('No dealership selected');
      }

      // Generate step ID: dealerId_stepName (e.g., "5_inspection")
      const stepId = `${currentDealership.id}_${input.name.toLowerCase().replace(/\s+/g, '_')}`;

      const { data, error } = await supabase
        .from('get_ready_steps')
        .insert({
          id: stepId,
          dealer_id: currentDealership.id,
          name: input.name,
          description: input.description,
          order_index: input.order_index,
          color: input.color,
          icon: input.icon || 'circle',
          sla_hours: input.sla_hours,
          cost_per_day: input.cost_per_day || 0,
          is_default: input.is_default || false,
          is_active: true,
          // Last step configuration
          is_last_step: input.is_last_step || false,
          // Sidebar display options
          show_sidebar_count: input.show_sidebar_count ?? true,
          show_sidebar_breakdown: input.show_sidebar_breakdown ?? true,
          // Advanced settings
          target_throughput: input.target_throughput || 5,
          bottleneck_threshold: input.bottleneck_threshold || 48,
          parallel_capable: input.parallel_capable || false,
          express_lane_eligible: input.express_lane_eligible || false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['get-ready-steps'] });
      toast({ description: t('get_ready.setup.step_created') });
    },
    onError: (error: Error) => {
      console.error('Failed to create step:', error);
      toast({ variant: 'destructive', description: t('get_ready.setup.step_create_failed') });
    },
  });

  // Update Step
  const updateStepMutation = useMutation({
    mutationFn: async ({ id, ...input }: UpdateStepInput) => {
      const { data, error } = await supabase
        .from('get_ready_steps')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['get-ready-steps'] });
      toast({ description: t('get_ready.setup.step_updated') });
    },
    onError: (error: Error) => {
      console.error('Failed to update step:', error);
      toast({ variant: 'destructive', description: t('get_ready.setup.step_update_failed') });
    },
  });

  // Delete Step
  const deleteStepMutation = useMutation({
    mutationFn: async (stepId: string) => {
      // First check if there are vehicles in this step
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('get_ready_vehicles')
        .select('id')
        .eq('step_id', stepId)
        .limit(1);

      if (vehiclesError) throw vehiclesError;

      if (vehicles && vehicles.length > 0) {
        throw new Error('Cannot delete step with active vehicles');
      }

      // If no vehicles, proceed with deletion
      const { error } = await supabase
        .from('get_ready_steps')
        .delete()
        .eq('id', stepId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['get-ready-steps'] });
      toast({ description: t('get_ready.setup.step_deleted') });
    },
    onError: (error: Error) => {
      console.error('Failed to delete step:', error);
      if (error.message === 'Cannot delete step with active vehicles') {
        toast({ variant: 'destructive', description: t('get_ready.setup.step_delete_failed_has_vehicles') });
      } else {
        toast({ variant: 'destructive', description: t('get_ready.setup.step_delete_failed') });
      }
    },
  });

  // Archive Step (soft delete - set is_active to false)
  const archiveStepMutation = useMutation({
    mutationFn: async (stepId: string) => {
      const { data, error } = await supabase
        .from('get_ready_steps')
        .update({ is_active: false })
        .eq('id', stepId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['get-ready-steps'] });
      toast({ description: t('get_ready.setup.step_archived') });
    },
    onError: (error: Error) => {
      console.error('Failed to archive step:', error);
      toast({ variant: 'destructive', description: t('get_ready.setup.step_archive_failed') });
    },
  });

  // Reorder Steps
  const reorderStepsMutation = useMutation({
    mutationFn: async (steps: Array<{ id: string; order_index: number }>) => {
      // First, set all order_index to temporary negative values to avoid unique constraint conflicts
      const tempUpdates = steps.map(({ id }, index) =>
        supabase
          .from('get_ready_steps')
          .update({ order_index: -(index + 1000), updated_at: new Date().toISOString() })
          .eq('id', id)
      );

      const tempResults = await Promise.all(tempUpdates);
      const tempErrors = tempResults.filter(r => r.error);

      if (tempErrors.length > 0) {
        throw tempErrors[0].error;
      }

      // Then, update to final order_index values
      const finalUpdates = steps.map(({ id, order_index }) =>
        supabase
          .from('get_ready_steps')
          .update({ order_index, updated_at: new Date().toISOString() })
          .eq('id', id)
      );

      const finalResults = await Promise.all(finalUpdates);
      const finalErrors = finalResults.filter(r => r.error);

      if (finalErrors.length > 0) {
        throw finalErrors[0].error;
      }

      return finalResults;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['get-ready-steps'] });
      toast({ description: t('get_ready.setup.steps_reordered') });
    },
    onError: (error: Error) => {
      console.error('Failed to reorder steps:', error);
      toast({ variant: 'destructive', description: t('get_ready.setup.steps_reorder_failed') });
    },
  });

  return {
    createStep: createStepMutation.mutate,
    updateStep: updateStepMutation.mutate,
    deleteStep: deleteStepMutation.mutate,
    archiveStep: archiveStepMutation.mutate,
    reorderSteps: reorderStepsMutation.mutate,
    isCreating: createStepMutation.isPending,
    isUpdating: updateStepMutation.isPending,
    isDeleting: deleteStepMutation.isPending,
    isArchiving: archiveStepMutation.isPending,
    isReordering: reorderStepsMutation.isPending,
  };
}
