import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

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
      toast.error('Failed to create vehicle');
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
    },
    onError: (error: any) => {
      console.error('Update vehicle error:', error);
      toast.error('Failed to update vehicle');
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
      toast.error('Failed to delete vehicle');
    },
  });

  // Move vehicle to different step
  const moveVehicleToStep = useMutation({
    mutationFn: async ({ id, stepId }: { id: string; stepId: string }) => {
      const { data, error } = await supabase
        .from('get_ready_vehicles')
        .update({
          step_id: stepId,
          intake_date: new Date().toISOString(), // Reset intake date for new step
          days_in_step: 0,
          sla_status: 'on_track',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error moving vehicle:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['get-ready-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['get-ready-steps'] });
    },
    onError: (error: any) => {
      console.error('Move vehicle error:', error);
      toast.error('Failed to move vehicle');
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
    },
    onError: (error: any) => {
      console.error('Bulk update error:', error);
      toast.error('Failed to update vehicles');
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
    bulkUpdateVehicles: bulkUpdateVehicles.mutateAsync,

    // Loading states
    isCreating: createVehicle.isPending,
    isUpdating: updateVehicle.isPending,
    isDeleting: deleteVehicle.isPending,
    isMoving: moveVehicleToStep.isPending,
    isBulkUpdating: bulkUpdateVehicles.isPending,
  };
}