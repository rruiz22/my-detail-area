import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { 
  ReconWorkflow,
  ReconWorkflowInsert,
  ReconWorkflowUpdate,
  ReconWorkflowStep,
  ReconWorkflowStepInsert,
  ReconWorkflowWithSteps,
  WorkflowStepTemplate
} from '@/types/recon-hub';
import { DEFAULT_WORKFLOW_STEPS } from '@/types/recon-hub';

interface UseReconWorkflowsProps {
  dealerId: number;
}

export function useReconWorkflows({ dealerId }: UseReconWorkflowsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);

  /**
   * Fetch all workflows for the dealer
   */
  const { 
    data: workflows = [],
    isLoading: workflowsLoading,
    error: workflowsError 
  } = useQuery({
    queryKey: ['recon-workflows', dealerId],
    queryFn: async (): Promise<ReconWorkflowWithSteps[]> => {
      const { data: workflowData, error: workflowError } = await supabase
        .from('recon_workflows')
        .select(`
          *,
          recon_workflow_steps (
            id,
            workflow_id,
            step_name,
            step_type,
            sla_hours,
            requires_approval,
            can_be_parallel,
            order_index,
            created_at,
            updated_at
          )
        `)
        .eq('dealer_id', dealerId)
        .order('is_default', { ascending: false });

      if (workflowError) throw workflowError;

      return (workflowData || []).map(workflow => ({
        ...workflow,
        steps: (workflow.recon_workflow_steps || [])
          .sort((a, b) => a.order_index - b.order_index)
      }));
    },
    enabled: !!dealerId
  });

  /**
   * Get default workflow (or first active one)
   */
  const defaultWorkflow = workflows.find(w => w.is_default && w.is_active) || 
                          workflows.find(w => w.is_active);

  /**
   * Create a new workflow
   */
  const createWorkflowMutation = useMutation({
    mutationFn: async ({ 
      name, 
      description, 
      isDefault = false,
      steps = []
    }: {
      name: string;
      description?: string;
      isDefault?: boolean;
      steps?: WorkflowStepTemplate[];
    }) => {
      // If setting as default, first remove default from others
      if (isDefault) {
        await supabase
          .from('recon_workflows')
          .update({ is_default: false })
          .eq('dealer_id', dealerId);
      }

      // Create workflow
      const { data: workflow, error: workflowError } = await supabase
        .from('recon_workflows')
        .insert({
          dealer_id: dealerId,
          name,
          description,
          is_default: isDefault,
          is_active: true
        })
        .select()
        .single();

      if (workflowError) throw workflowError;

      // Create steps if provided
      if (steps.length > 0) {
        const stepInserts: ReconWorkflowStepInsert[] = steps.map((step, index) => ({
          workflow_id: workflow.id,
          step_name: step.name,
          step_type: step.type,
          sla_hours: step.sla_hours,
          requires_approval: step.requires_approval,
          can_be_parallel: step.can_be_parallel,
          order_index: index
        }));

        const { error: stepsError } = await supabase
          .from('recon_workflow_steps')
          .insert(stepInserts);

        if (stepsError) throw stepsError;
      }

      return workflow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recon-workflows', dealerId] });
      toast({
        title: "Workflow Created",
        description: "New workflow has been created successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create workflow: " + error.message,
        variant: "destructive"
      });
    }
  });

  /**
   * Update an existing workflow
   */
  const updateWorkflowMutation = useMutation({
    mutationFn: async ({ 
      workflowId,
      updates
    }: {
      workflowId: string;
      updates: ReconWorkflowUpdate;
    }) => {
      // If setting as default, first remove default from others
      if (updates.is_default) {
        await supabase
          .from('recon_workflows')
          .update({ is_default: false })
          .eq('dealer_id', dealerId)
          .neq('id', workflowId);
      }

      const { error } = await supabase
        .from('recon_workflows')
        .update(updates)
        .eq('id', workflowId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recon-workflows', dealerId] });
      toast({
        title: "Workflow Updated",
        description: "Workflow has been updated successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update workflow: " + error.message,
        variant: "destructive"
      });
    }
  });

  /**
   * Delete a workflow
   */
  const deleteWorkflowMutation = useMutation({
    mutationFn: async (workflowId: string) => {
      // First delete all steps (cascade should handle this, but being explicit)
      await supabase
        .from('recon_workflow_steps')
        .delete()
        .eq('workflow_id', workflowId);

      // Then delete the workflow
      const { error } = await supabase
        .from('recon_workflows')
        .delete()
        .eq('id', workflowId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recon-workflows', dealerId] });
      toast({
        title: "Workflow Deleted",
        description: "Workflow has been deleted successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete workflow: " + error.message,
        variant: "destructive"
      });
    }
  });

  /**
   * Add step to workflow
   */
  const addStepMutation = useMutation({
    mutationFn: async ({
      workflowId,
      step,
      position
    }: {
      workflowId: string;
      step: WorkflowStepTemplate;
      position?: number;
    }) => {
      // Get current steps to determine order
      const { data: existingSteps } = await supabase
        .from('recon_workflow_steps')
        .select('order_index')
        .eq('workflow_id', workflowId)
        .order('order_index', { ascending: false })
        .limit(1);

      const orderIndex = position !== undefined ? 
        position : 
        (existingSteps?.[0]?.order_index || 0) + 1;

      // If inserting at specific position, update order of existing steps
      if (position !== undefined) {
        const { data: stepsToUpdate } = await supabase
          .from('recon_workflow_steps')
          .select('id, order_index')
          .eq('workflow_id', workflowId)
          .gte('order_index', position);

        if (stepsToUpdate) {
          for (const step of stepsToUpdate) {
            await supabase
              .from('recon_workflow_steps')
              .update({ order_index: step.order_index + 1 })
              .eq('id', step.id);
          }
        }
      }

      const { error } = await supabase
        .from('recon_workflow_steps')
        .insert({
          workflow_id: workflowId,
          step_name: step.name,
          step_type: step.type,
          sla_hours: step.sla_hours,
          requires_approval: step.requires_approval,
          can_be_parallel: step.can_be_parallel,
          order_index: orderIndex
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recon-workflows', dealerId] });
      toast({
        title: "Step Added",
        description: "New step has been added to the workflow"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add step: " + error.message,
        variant: "destructive"
      });
    }
  });

  /**
   * Remove step from workflow
   */
  const removeStepMutation = useMutation({
    mutationFn: async (stepId: string) => {
      const { error } = await supabase
        .from('recon_workflow_steps')
        .delete()
        .eq('id', stepId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recon-workflows', dealerId] });
      toast({
        title: "Step Removed",
        description: "Step has been removed from the workflow"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to remove step: " + error.message,
        variant: "destructive"
      });
    }
  });

  /**
   * Create default workflow for new dealers
   */
  const createDefaultWorkflow = async () => {
    return createWorkflowMutation.mutateAsync({
      name: "Standard Recon Workflow",
      description: "Default reconditioning workflow with standard industry steps",
      isDefault: true,
      steps: DEFAULT_WORKFLOW_STEPS
    });
  };

  /**
   * Clone an existing workflow
   */
  const cloneWorkflowMutation = useMutation({
    mutationFn: async ({ 
      sourceWorkflowId, 
      newName 
    }: { 
      sourceWorkflowId: string; 
      newName: string; 
    }) => {
      const sourceWorkflow = workflows.find(w => w.id === sourceWorkflowId);
      if (!sourceWorkflow) throw new Error('Source workflow not found');

      // Create new workflow
      const { data: newWorkflow, error: workflowError } = await supabase
        .from('recon_workflows')
        .insert({
          dealer_id: dealerId,
          name: newName,
          description: `Cloned from ${sourceWorkflow.name}`,
          is_default: false,
          is_active: true
        })
        .select()
        .single();

      if (workflowError) throw workflowError;

      // Clone steps
      if (sourceWorkflow.steps.length > 0) {
        const stepInserts: ReconWorkflowStepInsert[] = sourceWorkflow.steps.map(step => ({
          workflow_id: newWorkflow.id,
          step_name: step.step_name,
          step_type: step.step_type,
          sla_hours: step.sla_hours,
          requires_approval: step.requires_approval,
          can_be_parallel: step.can_be_parallel,
          order_index: step.order_index
        }));

        const { error: stepsError } = await supabase
          .from('recon_workflow_steps')
          .insert(stepInserts);

        if (stepsError) throw stepsError;
      }

      return newWorkflow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recon-workflows', dealerId] });
      toast({
        title: "Workflow Cloned",
        description: "Workflow has been cloned successfully"
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to clone workflow: " + error.message,
        variant: "destructive"
      });
    }
  });

  return {
    // Data
    workflows,
    defaultWorkflow,
    selectedWorkflow,
    setSelectedWorkflow,

    // Loading states
    workflowsLoading,
    creatingWorkflow: createWorkflowMutation.isPending,
    updatingWorkflow: updateWorkflowMutation.isPending,
    deletingWorkflow: deleteWorkflowMutation.isPending,
    addingStep: addStepMutation.isPending,
    removingStep: removeStepMutation.isPending,
    cloningWorkflow: cloneWorkflowMutation.isPending,

    // Errors
    workflowsError,

    // Actions
    createWorkflow: createWorkflowMutation.mutate,
    updateWorkflow: updateWorkflowMutation.mutate,
    deleteWorkflow: deleteWorkflowMutation.mutate,
    addStep: addStepMutation.mutate,
    removeStep: removeStepMutation.mutate,
    cloneWorkflow: cloneWorkflowMutation.mutate,
    createDefaultWorkflow,

    // Utility functions
    getWorkflowById: (id: string) => workflows.find(w => w.id === id),
    getStepsByWorkflow: (workflowId: string) => {
      const workflow = workflows.find(w => w.id === workflowId);
      return workflow?.steps || [];
    }
  };
}

export default useReconWorkflows;