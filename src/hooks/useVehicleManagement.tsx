// Vehicle Management Hook - Updated 2025-10-01
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

  console.log('[useVehicleManagement] Hook called with:', {
    hasDealership: !!currentDealership,
    dealershipId: currentDealership?.id,
    hasQueryClient: !!queryClient,
    hasTranslation: !!t,
    timestamp: new Date().toISOString()
  });

  // Create Vehicle
  const createVehicleMutation = useMutation({
    mutationFn: async (input: CreateVehicleInput) => {
      if (!currentDealership?.id) {
        throw new Error('No dealership selected');
      }

      // 1. Create the vehicle
      const { data: vehicle, error } = await supabase
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

      // 2. Auto-create work items from templates
      try {
        const { data: templates } = await supabase
          .from('work_item_templates')
          .select('*')
          .eq('dealer_id', currentDealership.id)
          .eq('is_active', true)
          .eq('auto_assign', true)
          .order('order_index', { ascending: true });

        if (templates && templates.length > 0) {
          const workItems = templates.map(template => ({
            vehicle_id: vehicle.id,
            dealer_id: currentDealership.id,
            title: template.name,
            description: template.description || null,
            work_type: template.work_type,
            status: 'pending',
            priority: template.priority,
            estimated_cost: template.estimated_cost,
            actual_cost: 0,
            estimated_hours: template.estimated_hours,
            actual_hours: 0,
            approval_required: template.approval_required,
          }));

          await supabase.from('get_ready_work_items').insert(workItems);
          console.log(`Created ${workItems.length} work items from templates for vehicle ${vehicle.id}`);
        }
      } catch (workItemError) {
        // Log error but don't fail vehicle creation
        console.error('Error creating work items from templates:', workItemError);
      }

      return vehicle;
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
      if (!currentDealership?.id) {
        throw new Error('No dealership selected');
      }

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
        .eq('dealer_id', currentDealership.id)
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
      if (!currentDealership?.id) {
        throw new Error('No dealership selected');
      }

      const { error } = await supabase
        .from('get_ready_vehicles')
        .delete()
        .eq('id', vehicleId)
        .eq('dealer_id', currentDealership.id);

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

  console.log('[useVehicleManagement] moveVehicleMutation:', {
    exists: !!moveVehicleMutation,
    hasMutate: !!moveVehicleMutation?.mutate,
    mutateType: typeof moveVehicleMutation?.mutate,
    isPending: moveVehicleMutation?.isPending,
    keys: moveVehicleMutation ? Object.keys(moveVehicleMutation) : []
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