import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import type { WorkItemType } from '@/hooks/useVehicleWorkItems';

export interface WorkItemTemplate {
  id: string;
  dealer_id: number;
  name: string;
  description?: string;
  work_type: WorkItemType;
  priority: number; // 1=low, 2=normal, 3=high
  estimated_cost: number;
  estimated_hours: number;
  approval_required: boolean;
  is_active: boolean;
  auto_assign: boolean;
  order_index: number;
  step_id?: string | null; // Optional: associates template with specific step
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  work_type: WorkItemType;
  priority?: number;
  estimated_cost?: number;
  estimated_hours?: number;
  approval_required?: boolean;
  auto_assign?: boolean;
  order_index?: number;
  step_id?: string | null;
}

export interface UpdateTemplateInput extends Partial<CreateTemplateInput> {
  id: string;
}

/**
 * Hook to fetch all work item templates for the current dealership
 */
export function useWorkItemTemplates(includeInactive = false) {
  const { currentDealership } = useAccessibleDealerships();
  const { toast } = useToast();

  return useQuery({
    queryKey: ['work-item-templates', currentDealership?.id, includeInactive],
    queryFn: async (): Promise<WorkItemTemplate[]> => {
      if (!currentDealership?.id) return [];

      let query = supabase
        .from('work_item_templates')
        .select('*')
        .eq('dealer_id', currentDealership.id)
        .order('order_index', { ascending: true });

      if (!includeInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching work item templates:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!currentDealership?.id,
  });
}

/**
 * Hook to fetch only auto-assign templates
 */
export function useAutoAssignTemplates() {
  const { currentDealership } = useAccessibleDealerships();

  return useQuery({
    queryKey: ['work-item-templates', 'auto-assign', currentDealership?.id],
    queryFn: async (): Promise<WorkItemTemplate[]> => {
      if (!currentDealership?.id) return [];

      const { data, error } = await supabase
        .from('work_item_templates')
        .select('*')
        .eq('dealer_id', currentDealership.id)
        .eq('is_active', true)
        .eq('auto_assign', true)
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Error fetching auto-assign templates:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!currentDealership?.id,
  });
}

/**
 * Hook to create work items from templates for a vehicle
 */
export function useCreateWorkItemsFromTemplates() {
  const { currentDealership } = useAccessibleDealerships();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vehicleId: string) => {
      if (!currentDealership?.id) {
        throw new Error('No dealership selected');
      }

      // 1. Fetch auto-assign templates
      const { data: templates, error: templatesError } = await supabase
        .from('work_item_templates')
        .select('*')
        .eq('dealer_id', currentDealership.id)
        .eq('is_active', true)
        .eq('auto_assign', true)
        .order('order_index', { ascending: true });

      if (templatesError) throw templatesError;
      if (!templates || templates.length === 0) {
        console.log('No auto-assign templates found, skipping work item creation');
        return [];
      }

      // 2. Create work items from templates
      const workItems = templates.map(template => ({
        vehicle_id: vehicleId,
        dealer_id: currentDealership.id,
        title: template.name,
        description: template.description || null,
        work_type: template.work_type,
        status: 'pending' as const,
        priority: template.priority,
        estimated_cost: template.estimated_cost,
        actual_cost: 0,
        estimated_hours: template.estimated_hours,
        actual_hours: 0,
        approval_required: template.approval_required,
      }));

      const { data, error } = await supabase
        .from('get_ready_work_items')
        .insert(workItems)
        .select();

      if (error) throw error;

      return data;
    },
    onSuccess: (data, vehicleId) => {
      queryClient.invalidateQueries({ queryKey: ['work-items', vehicleId] });
      if (data && data.length > 0) {
        toast({ description: t('get_ready.templates.work_items_created') });
      }
    },
    onError: (error) => {
      console.error('Error creating work items from templates:', error);
      toast({ variant: 'destructive', description: t('get_ready.templates.error_creating_work_items') });
    },
  });
}

/**
 * Hook to create a new work item template
 */
export function useCreateTemplate() {
  const { t } = useTranslation();
  const { currentDealership } = useAccessibleDealerships();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTemplateInput) => {
      if (!currentDealership?.id) {
        throw new Error('No dealership selected');
      }

      const { data, error } = await supabase
        .from('work_item_templates')
        .insert({
          dealer_id: currentDealership.id,
          name: input.name,
          description: input.description || null,
          work_type: input.work_type,
          priority: input.priority || 2,
          estimated_cost: input.estimated_cost || 0,
          estimated_hours: input.estimated_hours || 0,
          approval_required: input.approval_required || false,
          auto_assign: input.auto_assign !== undefined ? input.auto_assign : true,
          order_index: input.order_index || 0,
          step_id: input.step_id || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-item-templates'] });
      toast({ description: t('get_ready.templates.template_created') });
    },
    onError: (error) => {
      console.error('Error creating template:', error);
      toast({ variant: 'destructive', description: t('get_ready.templates.error_creating') });
    },
  });
}

/**
 * Hook to update a work item template
 */
export function useUpdateTemplate() {
  const { t } = useTranslation();
  const { currentDealership } = useAccessibleDealerships();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateTemplateInput) => {
      if (!currentDealership?.id) {
        throw new Error('No dealership selected');
      }

      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description || null;
      if (input.work_type !== undefined) updateData.work_type = input.work_type;
      if (input.priority !== undefined) updateData.priority = input.priority;
      if (input.estimated_cost !== undefined) updateData.estimated_cost = input.estimated_cost;
      if (input.estimated_hours !== undefined) updateData.estimated_hours = input.estimated_hours;
      if (input.approval_required !== undefined) updateData.approval_required = input.approval_required;
      if (input.auto_assign !== undefined) updateData.auto_assign = input.auto_assign;
      if (input.order_index !== undefined) updateData.order_index = input.order_index;
      if (input.step_id !== undefined) updateData.step_id = input.step_id;

      const { data, error } = await supabase
        .from('work_item_templates')
        .update(updateData)
        .eq('id', id)
        .eq('dealer_id', currentDealership.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-item-templates'] });
      toast({ description: t('get_ready.templates.template_updated') });
    },
    onError: (error) => {
      console.error('Error updating template:', error);
      toast({ variant: 'destructive', description: t('get_ready.templates.error_updating') });
    },
  });
}

/**
 * Hook to delete a work item template
 */
export function useDeleteTemplate() {
  const { t } = useTranslation();
  const { currentDealership } = useAccessibleDealerships();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      if (!currentDealership?.id) {
        throw new Error('No dealership selected');
      }

      const { error } = await supabase
        .from('work_item_templates')
        .delete()
        .eq('id', templateId)
        .eq('dealer_id', currentDealership.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-item-templates'] });
      toast({ description: t('get_ready.templates.template_deleted') });
    },
    onError: (error) => {
      console.error('Error deleting template:', error);
      toast({ variant: 'destructive', description: t('get_ready.templates.error_deleting') });
    },
  });
}

/**
 * Hook to toggle template auto-assign status
 */
export function useToggleTemplateAutoAssign() {
  const { t } = useTranslation();
  const { currentDealership } = useAccessibleDealerships();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ templateId, autoAssign }: { templateId: string; autoAssign: boolean }) => {
      if (!currentDealership?.id) {
        throw new Error('No dealership selected');
      }

      const { data, error } = await supabase
        .from('work_item_templates')
        .update({
          auto_assign: autoAssign,
          updated_at: new Date().toISOString(),
        })
        .eq('id', templateId)
        .eq('dealer_id', currentDealership.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-item-templates'] });
      toast({ description: t('get_ready.templates.template_updated') });
    },
    onError: (error) => {
      console.error('Error toggling auto-assign:', error);
      toast({ variant: 'destructive', description: t('get_ready.templates.error_updating') });
    },
  });
}

/**
 * Hook to toggle template active status
 */
export function useToggleTemplateActive() {
  const { t } = useTranslation();
  const { currentDealership } = useAccessibleDealerships();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ templateId, isActive }: { templateId: string; isActive: boolean }) => {
      if (!currentDealership?.id) {
        throw new Error('No dealership selected');
      }

      const { data, error } = await supabase
        .from('work_item_templates')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', templateId)
        .eq('dealer_id', currentDealership.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-item-templates'] });
      toast({ description: t('get_ready.templates.template_updated') });
    },
    onError: (error) => {
      console.error('Error toggling active status:', error);
      toast({ variant: 'destructive', description: t('get_ready.templates.error_updating') });
    },
  });
}

/**
 * Hook to reorder templates
 */
export function useReorderTemplates() {
  const { t } = useTranslation();
  const { currentDealership } = useAccessibleDealerships();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templates: Array<{ id: string; order_index: number }>) => {
      if (!currentDealership?.id) {
        throw new Error('No dealership selected');
      }

      // Update all templates with new order_index
      const updates = templates.map(({ id, order_index }) =>
        supabase
          .from('work_item_templates')
          .update({ order_index, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('dealer_id', currentDealership.id)
      );

      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);

      if (errors.length > 0) {
        throw errors[0].error;
      }

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-item-templates'] });
      toast({ description: t('get_ready.templates.templates_reordered') });
    },
    onError: (error) => {
      console.error('Error reordering templates:', error);
      toast({ variant: 'destructive', description: t('get_ready.templates.error_reordering') });
    },
  });
}

/**
 * Hook to duplicate a template
 */
export function useDuplicateTemplate() {
  const { t } = useTranslation();
  const { currentDealership } = useAccessibleDealerships();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      if (!currentDealership?.id) {
        throw new Error('No dealership selected');
      }

      // Get the original template
      const { data: original, error: fetchError } = await supabase
        .from('work_item_templates')
        .select('*')
        .eq('id', templateId)
        .eq('dealer_id', currentDealership.id)
        .single();

      if (fetchError) throw fetchError;

      // Create duplicate with "(Copy)" suffix
      const { data, error } = await supabase
        .from('work_item_templates')
        .insert({
          dealer_id: currentDealership.id,
          name: `${original.name} (Copy)`,
          description: original.description,
          work_type: original.work_type,
          priority: original.priority,
          estimated_cost: original.estimated_cost,
          estimated_hours: original.estimated_hours,
          approval_required: original.approval_required,
          auto_assign: false, // Disabled by default for copies
          order_index: original.order_index + 1,
          step_id: original.step_id || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-item-templates'] });
      toast({ description: t('get_ready.templates.template_duplicated') });
    },
    onError: (error) => {
      console.error('Error duplicating template:', error);
      toast({ variant: 'destructive', description: t('get_ready.templates.error_duplicating') });
    },
  });
}

/**
 * Hook to create work items from manually selected templates
 * Unlike useCreateWorkItemsFromTemplates, this doesn't filter by auto_assign
 */
export function useCreateWorkItemsFromSelectedTemplates() {
  const { currentDealership } = useAccessibleDealerships();
  const { user } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ vehicleId, templateIds }: { vehicleId: string; templateIds: string[] }) => {
      if (!currentDealership?.id) {
        throw new Error('No dealership selected');
      }

      if (templateIds.length === 0) {
        throw new Error('No templates selected');
      }

      // 1. Fetch selected templates
      const { data: templates, error: templatesError } = await supabase
        .from('work_item_templates')
        .select('*')
        .eq('dealer_id', currentDealership.id)
        .eq('is_active', true)
        .in('id', templateIds);

      if (templatesError) throw templatesError;
      if (!templates || templates.length === 0) {
        throw new Error('No templates found');
      }

      // 2. Create work items from templates
      const workItems = templates.map(template => ({
        vehicle_id: vehicleId,
        dealer_id: currentDealership.id,
        title: template.name,
        description: template.description || null,
        work_type: template.work_type,
        status: 'pending' as const,
        priority: template.priority,
        estimated_cost: template.estimated_cost,
        actual_cost: 0,
        estimated_hours: template.estimated_hours,
        actual_hours: 0,
        approval_required: template.approval_required,
        created_by: user?.id,
      }));

      const { data, error } = await supabase
        .from('get_ready_work_items')
        .insert(workItems)
        .select();

      if (error) throw error;

      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['work-items', variables.vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-detail', variables.vehicleId] });
      queryClient.invalidateQueries({ queryKey: ['vehicle-timeline', variables.vehicleId] });
      if (data && data.length > 0) {
        toast({ description: t('get_ready.work_items.templates_added') });
      }
    },
    onError: (error) => {
      console.error('Error creating work items from selected templates:', error);
      toast({ variant: 'destructive', description: t('get_ready.work_items.error_adding_from_templates') });
    },
  });
}
