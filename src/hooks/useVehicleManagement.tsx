// Vehicle Management Hook - Updated 2025-10-01
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

interface CreateVehicleInput {
  stock_number: string;
  vin: string;
  vehicle_year: number;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_trim?: string;
  step_id: string;
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
  const { user } = useAuth();
  const { toast } = useToast();


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
          priority: input.priority,
          assigned_to: input.assigned_to || null,
          notes: input.notes || null,
          status: 'in_progress',
          intake_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        // Enhanced error handling with specific messages
        console.error('Database error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });

        if (error.code === '23505') {
          // Unique constraint violation
          const errorDetails = error.details || error.message || '';
          const errorMessage = error.message || '';
          const errorHint = error.hint || '';

          // Check both message and details for better detection
          if (errorDetails.includes('stock_number') || errorMessage.includes('stock_number')) {
            throw new Error(`❌ DUPLICATE STOCK NUMBER\n\nStock number "${input.stock_number}" is already registered in this dealership.\n\n💡 Solution: Use a different stock number or check if this vehicle already exists in the system.`);
          } else if (errorDetails.includes('vin') || errorMessage.includes('vin')) {
            throw new Error(`❌ DUPLICATE VIN\n\nVIN "${input.vin}" is already registered in this dealership.\n\n💡 Solution: Verify the VIN is correct or check if this vehicle is already in the system.`);
          } else {
            // Show full error for debugging
            throw new Error(`❌ DUPLICATE ENTRY\n\n${errorMessage}\n\n${errorHint || 'Please check your input values.'}`);
          }
        } else if (error.code === '23503') {
          // Foreign key constraint violation
          throw new Error('❌ INVALID CONFIGURATION\n\nThe selected step or dealership is not valid.\n\n💡 Solution: Please refresh the page and try again.');
        } else {
          throw new Error(error.message || 'Failed to create vehicle');
        }
      }

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
    onSuccess: (newVehicle) => {
      // ✅ FIXED: Predicate-based invalidation to match infinite query keys
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'get-ready-vehicles' &&
          query.queryKey[1] === 'infinite'
      });
      queryClient.invalidateQueries({ queryKey: ['get-ready-steps'] });
      queryClient.invalidateQueries({ queryKey: ['get-ready-approvals-count'] });

      toast({
        title: t('common.success'),
        description: t('get_ready.vehicle_form.success.created'),
      });
    },
    onError: (error: Error) => {
      console.error('Failed to create vehicle:', error);

      // Determine title based on error type
      let title = t('common.error');
      if (error.message.includes('Stock number') || error.message.includes('stock_number')) {
        title = 'Duplicate Stock Number';
      } else if (error.message.includes('VIN') || error.message.includes('vin')) {
        title = 'Duplicate VIN';
      } else if (error.message.includes('Invalid step')) {
        title = 'Invalid Configuration';
      }

      toast({
        title: title,
        description: error.message || t('get_ready.vehicle_form.errors.save_failed'),
        variant: 'destructive',
        duration: 6000, // Show longer for error messages
      });
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

      if (error) {
        // Enhanced error handling with specific messages
        if (error.code === '23505') {
          // Unique constraint violation
          if (error.message.includes('stock_number')) {
            throw new Error(`Stock number "${updateData.stock_number}" already exists in this dealership`);
          } else if (error.message.includes('vin')) {
            throw new Error(`VIN "${updateData.vin}" already exists in this dealership`);
          } else {
            throw new Error('This vehicle data already exists in the system');
          }
        } else if (error.code === '23503') {
          // Foreign key constraint violation
          throw new Error('Invalid step or dealership selected');
        } else {
          throw new Error(error.message || 'Failed to update vehicle');
        }
      }
      return data;
    },
    onSuccess: (updatedVehicle, variables) => {
      // ✅ FIXED: Predicate-based invalidation to match infinite query keys
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'get-ready-vehicles' &&
          query.queryKey[1] === 'infinite'
      });
      queryClient.invalidateQueries({ queryKey: ['get-ready-steps'] });
      queryClient.invalidateQueries({ queryKey: ['get-ready-approvals-count'] });

      toast({
        title: t('common.success'),
        description: t('get_ready.vehicle_form.success.updated'),
      });
    },
    onError: (error: Error) => {
      console.error('Failed to update vehicle:', error);

      // Determine title based on error type
      let title = t('common.error');
      if (error.message.includes('Stock number') || error.message.includes('stock_number')) {
        title = 'Duplicate Stock Number';
      } else if (error.message.includes('VIN') || error.message.includes('vin')) {
        title = 'Duplicate VIN';
      } else if (error.message.includes('Invalid step')) {
        title = 'Invalid Configuration';
      }

      toast({
        title: title,
        description: error.message || t('get_ready.vehicle_form.errors.save_failed'),
        variant: 'destructive',
        duration: 6000, // Show longer for error messages
      });
    },
  });

  // Soft Delete Vehicle (instead of hard delete)
  const deleteVehicleMutation = useMutation({
    mutationFn: async (vehicleId: string) => {
      if (!currentDealership?.id) {
        throw new Error('No dealership selected');
      }

      // Call soft_delete_vehicle function
      const { data, error } = await supabase.rpc('soft_delete_vehicle', {
        p_vehicle_id: vehicleId,
        p_user_id: user?.id
      });

      if (error) throw error;

      // Check function result
      if (data && !data.success) {
        throw new Error(data.error || 'Failed to delete vehicle');
      }

      return vehicleId;
    },
    onSuccess: (vehicleId) => {
      // ✅ FIXED: Predicate-based invalidation to match infinite query keys
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'get-ready-vehicles' &&
          query.queryKey[1] === 'infinite'
      });
      queryClient.invalidateQueries({ queryKey: ['get-ready-steps'] });
      queryClient.invalidateQueries({ queryKey: ['get-ready-approvals-count'] });

      toast({ description: t('get_ready.vehicle_form.success.deleted') });
    },
    onError: (error: Error) => {
      console.error('Failed to delete vehicle:', error);
      toast({ variant: 'destructive', description: t('get_ready.vehicle_form.errors.delete_failed') });
    },
  });

  // Move Vehicle to Step
  const moveVehicleMutation = useMutation({
    mutationFn: async ({ vehicleId, stepId }: { vehicleId: string; stepId: string }) => {
      // ✨ NEW: Check for pending or in-progress work items before moving
      const { data: workItems, error: workItemsError } = await supabase
        .from('get_ready_work_items')
        .select('id, title, status')
        .eq('vehicle_id', vehicleId)
        .in('status', ['pending', 'in_progress', 'awaiting_approval', 'rejected', 'blocked']);

      if (workItemsError) {
        console.error('Error checking work items:', workItemsError);
        throw new Error('Failed to check work items');
      }

      if (workItems && workItems.length > 0) {
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

      // ✨ UPDATED: Don't reset intake_date - let trigger handle step history
      // The manage_vehicle_step_history trigger will automatically:
      // - Close the previous step visit with exit_date
      // - Create a new step history entry with current timestamp
      // - Track visit numbers and backtrack detection
      const { data, error } = await supabase
        .from('get_ready_vehicles')
        .update({
          step_id: stepId,
          // ❌ REMOVED: intake_date reset (preserves original intake date)
        })
        .eq('id', vehicleId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (movedVehicle) => {
      // ✅ FIXED: Predicate-based invalidation to match infinite query keys
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'get-ready-vehicles' &&
          query.queryKey[1] === 'infinite'
      });
      queryClient.invalidateQueries({ queryKey: ['get-ready-steps'] });
      queryClient.invalidateQueries({ queryKey: ['get-ready-approvals-count'] });
      queryClient.invalidateQueries({ queryKey: ['get-ready-kpis'] });

      // ✅ FIX: Invalidate vehicle detail panel and work items
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'get-ready-vehicle-detail' &&
          query.queryKey[1] === movedVehicle.id
      });
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'work-items' &&
          query.queryKey[1] === movedVehicle.id
      });

      toast({
        title: t('common.success'),
        description: t('get_ready.vehicle_form.success.moved'),
      });
    },
    onError: (error: Error) => {
      console.error('Failed to move vehicle:', error);

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

  // Approve Vehicle
  const approveVehicleMutation = useMutation({
    mutationFn: async ({ vehicleId, notes }: { vehicleId: string; notes?: string }) => {
      const { data, error } = await supabase.rpc('approve_vehicle', {
        p_vehicle_id: vehicleId,
        p_notes: notes || null,
      });

      if (error) throw error;

      // Check if approval was successful
      if (data && !data.success) {
        throw new Error(data.error || 'Failed to approve vehicle');
      }

      return data;
    },
    onSuccess: (result) => {
      // ✅ FIXED: Predicate-based invalidation to match infinite query keys
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'get-ready-vehicles' &&
          query.queryKey[1] === 'infinite'
      });
      queryClient.invalidateQueries({ queryKey: ['get-ready-steps'] });
      queryClient.invalidateQueries({ queryKey: ['get-ready-approvals-count'] });
      queryClient.invalidateQueries({ queryKey: ['get-ready-kpis'] });

      // ✅ FIX: Invalidate vehicle detail panel and work items (use result.vehicle_id from RPC)
      if (result.vehicle_id) {
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey[0] === 'get-ready-vehicle-detail' &&
            query.queryKey[1] === result.vehicle_id
        });
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey[0] === 'work-items' &&
            query.queryKey[1] === result.vehicle_id
        });
      }

      toast({ description: t('get_ready.approvals.success.approved') });
    },
    onError: (error: Error) => {
      console.error('Failed to approve vehicle:', error);
      toast({ variant: 'destructive', description: error.message || t('get_ready.approvals.errors.approve_failed') });
    },
  });

  // Reject Vehicle
  const rejectVehicleMutation = useMutation({
    mutationFn: async ({ vehicleId, reason, notes }: { vehicleId: string; reason: string; notes?: string }) => {
      if (!reason || reason.trim() === '') {
        throw new Error('Rejection reason is required');
      }

      const { data, error } = await supabase.rpc('reject_vehicle', {
        p_vehicle_id: vehicleId,
        p_reason: reason,
        p_notes: notes || null,
      });

      if (error) throw error;

      // Check if rejection was successful
      if (data && !data.success) {
        throw new Error(data.error || 'Failed to reject vehicle');
      }

      return data;
    },
    onSuccess: (result) => {
      // ✅ FIXED: Predicate-based invalidation to match infinite query keys
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'get-ready-vehicles' &&
          query.queryKey[1] === 'infinite'
      });
      queryClient.invalidateQueries({ queryKey: ['get-ready-steps'] });
      queryClient.invalidateQueries({ queryKey: ['get-ready-approvals-count'] });
      queryClient.invalidateQueries({ queryKey: ['get-ready-kpis'] });

      // ✅ FIX: Invalidate vehicle detail panel and work items (use result.vehicle_id from RPC)
      if (result.vehicle_id) {
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey[0] === 'get-ready-vehicle-detail' &&
            query.queryKey[1] === result.vehicle_id
        });
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey[0] === 'work-items' &&
            query.queryKey[1] === result.vehicle_id
        });
      }

      toast({ description: t('get_ready.approvals.success.rejected') });
    },
    onError: (error: Error) => {
      console.error('Failed to reject vehicle:', error);
      toast({ variant: 'destructive', description: error.message || t('get_ready.approvals.errors.reject_failed') });
    },
  });

  // Request Approval
  const requestApprovalMutation = useMutation({
    mutationFn: async ({ vehicleId, notes }: { vehicleId: string; notes?: string }) => {
      const { data, error } = await supabase.rpc('request_approval', {
        p_vehicle_id: vehicleId,
        p_notes: notes || null,
      });

      if (error) throw error;

      // Check if request was successful
      if (data && !data.success) {
        throw new Error(data.error || 'Failed to request approval');
      }

      return data;
    },
    onSuccess: (result) => {
      // ✅ FIXED: Predicate-based invalidation to match infinite query keys
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'get-ready-vehicles' &&
          query.queryKey[1] === 'infinite'
      });
      queryClient.invalidateQueries({ queryKey: ['get-ready-steps'] });
      queryClient.invalidateQueries({ queryKey: ['get-ready-approvals-count'] });
      queryClient.invalidateQueries({ queryKey: ['get-ready-kpis'] });

      // ✅ FIX: Invalidate vehicle detail panel and work items (use result.vehicle_id from RPC)
      if (result.vehicle_id) {
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey[0] === 'get-ready-vehicle-detail' &&
            query.queryKey[1] === result.vehicle_id
        });
        queryClient.invalidateQueries({
          predicate: (query) =>
            query.queryKey[0] === 'work-items' &&
            query.queryKey[1] === result.vehicle_id
        });
      }

      toast({ description: t('get_ready.approvals.success.requested') });
    },
    onError: (error: Error) => {
      console.error('Failed to request approval:', error);
      toast({ variant: 'destructive', description: error.message || t('get_ready.approvals.errors.request_failed') });
    },
  });

  return {
    createVehicle: createVehicleMutation.mutate,
    createVehicleAsync: createVehicleMutation.mutateAsync,
    updateVehicle: updateVehicleMutation.mutate,
    updateVehicleAsync: updateVehicleMutation.mutateAsync,
    deleteVehicle: deleteVehicleMutation.mutate,
    deleteVehicleAsync: deleteVehicleMutation.mutateAsync,
    moveVehicle: moveVehicleMutation.mutate,
    moveVehicleAsync: moveVehicleMutation.mutateAsync,
    isCreating: createVehicleMutation.isPending,
    isUpdating: updateVehicleMutation.isPending,
    isDeleting: deleteVehicleMutation.isPending,
    isMoving: moveVehicleMutation.isPending,
    // Approval functions
    approveVehicle: approveVehicleMutation.mutate,
    approveVehicleAsync: approveVehicleMutation.mutateAsync,
    rejectVehicle: rejectVehicleMutation.mutate,
    rejectVehicleAsync: rejectVehicleMutation.mutateAsync,
    requestApproval: requestApprovalMutation.mutate,
    requestApprovalAsync: requestApprovalMutation.mutateAsync,
    isApproving: approveVehicleMutation.isPending,
    isRejecting: rejectVehicleMutation.isPending,
    isRequestingApproval: requestApprovalMutation.isPending,
  };
}
