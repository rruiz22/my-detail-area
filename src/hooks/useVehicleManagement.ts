import { toast } from '@/hooks/use-toast';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

interface VehicleData {
  stock_number: string;
  vin: string;
  vehicle_year: number;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_trim?: string;
  step_id: string;
  workflow_type: 'standard' | 'express' | 'priority';
  priority: 'low' | 'normal' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
  notes?: string;
  dealer_id: string;
}

interface GetReadyVehicle extends VehicleData {
  id: string;
  status: string;
  intake_date: string;
  days_in_step: number;
  sla_status: 'on_track' | 'warning' | 'critical';
  sla_hours_remaining: number | null;
  holding_cost_daily: number;
  total_holding_cost: number;
  progress: number;
  media_count: number;
  created_at: string;
  updated_at: string;
}

export function useVehicleManagement() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { currentDealership } = useAccessibleDealerships();

  // Fetch vehicles
  const { data: vehicles, isLoading } = useQuery({
    queryKey: ['get-ready-vehicles', currentDealership?.id],
    queryFn: async (): Promise<GetReadyVehicle[]> => {
      if (!currentDealership?.id) return [];

      const { data, error } = await supabase
        .from('get_ready_vehicles')
        .select(`
          *,
          get_ready_steps!inner(
            id,
            name,
            color,
            order_index
          )
        `)
        .eq('dealer_id', currentDealership.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching vehicles:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!currentDealership?.id,
    staleTime: 30000,
  });

  // Create vehicle
  const createVehicle = useMutation({
    mutationFn: async (vehicleData: Omit<VehicleData, 'dealer_id'>) => {
      if (!currentDealership?.id) {
        throw new Error('No dealership selected');
      }

      const { data, error } = await supabase
        .from('get_ready_vehicles')
        .insert([
          {
            ...vehicleData,
            dealer_id: currentDealership.id,
            status: 'in_progress',
            intake_date: new Date().toISOString(),
            days_in_step: 0,
            sla_status: 'on_track',
            progress: 0,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating vehicle:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['get-ready-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['get-ready-steps'] });
      queryClient.invalidateQueries({ queryKey: ['get-ready-kpis'] });
    },
    onError: (error: any) => {
      console.error('Create vehicle error:', error);
      toast({
        title: t('common.error'),
        description: t('get_ready.vehicle_form.errors.save_failed'),
        variant: 'destructive',
      });
    },
  });

  // Update vehicle
  const updateVehicle = useMutation({
    mutationFn: async ({
      id,
      data: vehicleData,
    }: {
      id: string;
      data: Partial<VehicleData>;
    }) => {
      const { data, error } = await supabase
        .from('get_ready_vehicles')
        .update({
          ...vehicleData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating vehicle:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['get-ready-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['get-ready-steps'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-activity-log'] }); // Refresh activity log
    },
    onError: (error: any) => {
      console.error('Update vehicle error:', error);
      toast({
        title: t('common.error'),
        description: t('get_ready.vehicle_form.errors.save_failed'),
        variant: 'destructive',
      });
    },
  });

  // Delete vehicle
  const deleteVehicle = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('get_ready_vehicles')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting vehicle:', error);
        throw error;
      }

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['get-ready-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['get-ready-steps'] });
      queryClient.invalidateQueries({ queryKey: ['get-ready-kpis'] });
    },
    onError: (error: any) => {
      console.error('Delete vehicle error:', error);
      toast({
        title: t('common.error'),
        description: t('get_ready.vehicle_form.errors.delete_failed'),
        variant: 'destructive',
      });
    },
  });

  // Move vehicle to different step
  const moveVehicleToStep = useMutation({
    mutationFn: async ({ id, stepId, vehicleId }: { id?: string; stepId: string; vehicleId?: string }) => {
      // Support both 'id' and 'vehicleId' parameters for backwards compatibility
      const actualId = id || vehicleId;
      if (!actualId) {
        throw new Error('Vehicle ID is required');
      }

      console.log('🚀 [DEBUG] Attempting to move vehicle:', { actualId, stepId });

      // ✨ NEW: Check for pending or in-progress work items before moving
      const { data: workItems, error: workItemsError } = await supabase
        .from('get_ready_work_items')
        .select('id, title, status')
        .eq('vehicle_id', actualId)
        .in('status', ['pending', 'in_progress', 'awaiting_approval', 'rejected', 'blocked']);

      console.log('🔍 [DEBUG] Work items check result:', { workItems, workItemsError });

      if (workItemsError) {
        console.error('Error checking work items:', workItemsError);
        throw new Error('Failed to check work items');
      }

      if (workItems && workItems.length > 0) {
        console.log('🚫 [DEBUG] Blocking move due to work items:', workItems);
        const pendingItems = workItems.filter(item => item.status === 'pending');
        const inProgressItems = workItems.filter(item => item.status === 'in_progress');
        const awaitingApprovalItems = workItems.filter(item => item.status === 'awaiting_approval');
        const rejectedItems = workItems.filter(item => item.status === 'rejected');
        const blockedItems = workItems.filter(item => item.status === 'blocked');

        let errorMessage = 'Cannot move vehicle to next step. ';
        const issues = [];

        if (pendingItems.length > 0) {
          issues.push(`${pendingItems.length} pending work item${pendingItems.length > 1 ? 's' : ''}`);
        }
        if (inProgressItems.length > 0) {
          issues.push(`${inProgressItems.length} work item${inProgressItems.length > 1 ? 's' : ''} in progress`);
        }
        if (awaitingApprovalItems.length > 0) {
          issues.push(`${awaitingApprovalItems.length} work item${awaitingApprovalItems.length > 1 ? 's' : ''} awaiting approval`);
        }
        if (rejectedItems.length > 0) {
          issues.push(`${rejectedItems.length} rejected work item${rejectedItems.length > 1 ? 's' : ''}`);
        }
        if (blockedItems.length > 0) {
          issues.push(`${blockedItems.length} blocked work item${blockedItems.length > 1 ? 's' : ''}`);
        }

        errorMessage += issues.join(', ') + '. Please complete or resolve all work items before moving to the next step.';
        throw new Error(errorMessage);
      }

      console.log('✅ [DEBUG] No blocking work items found, proceeding with move');

      // The step change will be automatically tracked by the database trigger
      // which will:
      // 1. Close the current step history entry (set exit_date)
      // 2. Create a new step history entry for the new step
      // 3. Handle visit numbering automatically

      const { data, error } = await supabase
        .from('get_ready_vehicles')
        .update({
          step_id: stepId,
          intake_date: new Date().toISOString(), // Entry date for new step
          days_in_step: 0, // Days in current visit (will be calculated)
          sla_status: 'on_track',
          updated_at: new Date().toISOString(),
        })
        .eq('id', actualId)
        .select()
        .single();

      if (error) {
        console.error('Error moving vehicle:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (movedVehicle) => {
      // Optimistic update: Update vehicle step in cache immediately
      queryClient.setQueryData(
        ['get-ready-vehicles', 'list', currentDealership?.id],
        (oldData: any[] | undefined) =>
          oldData
            ? oldData.map(vehicle => vehicle.id === movedVehicle.id ? movedVehicle : vehicle)
            : [movedVehicle]
      );

      queryClient.invalidateQueries({ queryKey: ['get-ready-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['get-ready-steps'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-activity-log'] }); // Refresh activity log

      toast({
        title: t('common.success'),
        description: t('get_ready.vehicle_form.success.moved'),
      });
    },
    onError: (error: any) => {
      console.error('Move vehicle error:', error);

      // Show specific error message if it's a work items validation error
      if (error.message && error.message.includes('Cannot move vehicle to next step')) {
        toast({
          title: t('common.error'),
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: t('common.error'),
          description: t('get_ready.vehicle_form.errors.move_failed'),
          variant: 'destructive',
        });
      }
    },
  });

  // Bulk update vehicles
  const bulkUpdateVehicles = useMutation({
    mutationFn: async ({
      ids,
      data: vehicleData,
    }: {
      ids: string[];
      data: Partial<VehicleData>;
    }) => {
      const { data, error } = await supabase
        .from('get_ready_vehicles')
        .update({
          ...vehicleData,
          updated_at: new Date().toISOString(),
        })
        .in('id', ids)
        .select();

      if (error) {
        console.error('Error bulk updating vehicles:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['get-ready-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['get-ready-steps'] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-activity-log'] }); // Refresh activity log
    },
    onError: (error: any) => {
      console.error('Bulk update error:', error);
      toast({
        title: t('common.error'),
        description: 'Failed to update vehicles',
        variant: 'destructive',
      });
    },
  });

  return {
    // Data
    vehicles: vehicles || [],
    isLoading,

    // Mutations
    createVehicle: createVehicle.mutateAsync,
    updateVehicle: updateVehicle.mutateAsync,
    deleteVehicle: deleteVehicle.mutateAsync,
    moveVehicleToStep: moveVehicleToStep.mutateAsync,
    moveVehicle: moveVehicleToStep.mutate, // Alias for backwards compatibility
    bulkUpdateVehicles: bulkUpdateVehicles.mutateAsync,

    // Loading states
    isCreating: createVehicle.isPending,
    isUpdating: updateVehicle.isPending,
    isDeleting: deleteVehicle.isPending,
    isMoving: moveVehicleToStep.isPending,
    isBulkUpdating: bulkUpdateVehicles.isPending,
  };
}
