import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface CreateVehicleInput {
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
}

interface UpdateVehicleInput extends Partial<CreateVehicleInput> {
  id: string;
}

export function useVehicleManagement() {
  const { t } = useTranslation();
  const { currentDealership } = useAccessibleDealerships();
  const queryClient = useQueryClient();

  // Create Vehicle
  const createVehicleMutation = useMutation({
    mutationFn: async (input: CreateVehicleInput) => {
      if (!currentDealership?.id) {
        throw new Error('No dealership selected');
      }

      const { data, error } = await supabase
        .from('get_ready_vehicles')
        .insert({
          dealer_id: currentDealership.id,
          stock_number: input.stock_number,
          vin: input.vin.toUpperCase(),
          vehicle_year: input.vehicle_year,
          vehicle_make: input.vehicle_make,
          vehicle_model: input.vehicle_model,
          vehicle_trim: input.vehicle_trim || null,
          step_id: input.step_id,
          workflow_type: input.workflow_type,
          priority: input.priority,
          assigned_to: input.assigned_to || null,
          notes: input.notes || null,
          status: 'in_progress',
          intake_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate both vehicles and steps queries to update counts
      queryClient.invalidateQueries({ queryKey: ['get-ready-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['get-ready-steps'] });
      toast.success(t('get_ready.vehicle_form.success.created'));
    },
    onError: (error: Error) => {
      console.error('Failed to create vehicle:', error);
      toast.error(t('get_ready.vehicle_form.errors.save_failed'));
    },
  });

  // Update Vehicle
  const updateVehicleMutation = useMutation({
    mutationFn: async ({ id, ...input }: UpdateVehicleInput) => {
      const updateData: any = {};

      if (input.stock_number) updateData.stock_number = input.stock_number;
      if (input.vin) updateData.vin = input.vin.toUpperCase();
      if (input.vehicle_year) updateData.vehicle_year = input.vehicle_year;
      if (input.vehicle_make) updateData.vehicle_make = input.vehicle_make;
      if (input.vehicle_model) updateData.vehicle_model = input.vehicle_model;
      if (input.vehicle_trim !== undefined) updateData.vehicle_trim = input.vehicle_trim || null;
      if (input.step_id) updateData.step_id = input.step_id;
      if (input.workflow_type) updateData.workflow_type = input.workflow_type;
      if (input.priority) updateData.priority = input.priority;
      if (input.assigned_to !== undefined) updateData.assigned_to = input.assigned_to || null;
      if (input.notes !== undefined) updateData.notes = input.notes || null;

      const { data, error } = await supabase
        .from('get_ready_vehicles')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['get-ready-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['get-ready-steps'] });
      toast.success(t('get_ready.vehicle_form.success.updated'));
    },
    onError: (error: Error) => {
      console.error('Failed to update vehicle:', error);
      toast.error(t('get_ready.vehicle_form.errors.save_failed'));
    },
  });

  // Delete Vehicle
  const deleteVehicleMutation = useMutation({
    mutationFn: async (vehicleId: string) => {
      const { error } = await supabase
        .from('get_ready_vehicles')
        .delete()
        .eq('id', vehicleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['get-ready-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['get-ready-steps'] });
      toast.success(t('get_ready.vehicle_form.success.deleted'));
    },
    onError: (error: Error) => {
      console.error('Failed to delete vehicle:', error);
      toast.error(t('get_ready.vehicle_form.errors.delete_failed'));
    },
  });

  // Move Vehicle to Step
  const moveVehicleMutation = useMutation({
    mutationFn: async ({ vehicleId, stepId }: { vehicleId: string; stepId: string }) => {
      const { data, error } = await supabase
        .from('get_ready_vehicles')
        .update({
          step_id: stepId,
          intake_date: new Date().toISOString(), // Reset intake date for new step
        })
        .eq('id', vehicleId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['get-ready-vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['get-ready-steps'] });
      toast.success(t('get_ready.vehicle_form.success.moved'));
    },
    onError: (error: Error) => {
      console.error('Failed to move vehicle:', error);
      toast.error(t('get_ready.vehicle_form.errors.move_failed'));
    },
  });

  return {
    createVehicle: createVehicleMutation.mutate,
    createVehicleAsync: createVehicleMutation.mutateAsync,
    updateVehicle: updateVehicleMutation.mutate,
    updateVehicleAsync: updateVehicleMutation.mutateAsync,
    deleteVehicle: deleteVehicleMutation.mutate,
    moveVehicle: moveVehicleMutation.mutate,
    isCreating: createVehicleMutation.isPending,
    isUpdating: updateVehicleMutation.isPending,
    isDeleting: deleteVehicleMutation.isPending,
    isMoving: moveVehicleMutation.isPending,
  };
}