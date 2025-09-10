import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface NFCWorkflowAction {
  type: 'send_email' | 'send_sms' | 'send_notification' | 'update_order_status' | 'create_task' | 'webhook';
  config: {
    recipient?: string;
    subject?: string;
    message?: string;
    status?: string;
    task_title?: string;
    task_description?: string;
    webhook_url?: string;
    webhook_method?: string;
    webhook_headers?: Record<string, string>;
    webhook_payload?: Record<string, any>;
  };
}

export interface NFCWorkflow {
  id: string;
  name: string;
  description?: string;
  trigger_type: 'tag_scan' | 'location_entry' | 'time_based' | 'status_change';
  trigger_conditions?: {
    tag_type?: string;
    location?: string;
    time_range?: string;
    status_from?: string;
    status_to?: string;
  };
  actions: NFCWorkflowAction[];
  is_active: boolean;
  dealer_id?: number;
  execution_count: number;
  success_count: number;
  last_executed?: string;
  created_at: string;
  updated_at: string;
}

interface UseNFCWorkflowsReturn {
  workflows: NFCWorkflow[];
  loading: boolean;
  error: string | null;
  loadWorkflows: (dealerId?: number) => Promise<void>;
  createWorkflow: (workflowData: Partial<NFCWorkflow>) => Promise<void>;
  updateWorkflow: (workflowId: string, updates: Partial<NFCWorkflow>) => Promise<void>;
  deleteWorkflow: (workflowId: string) => Promise<void>;
  toggleWorkflow: (workflowId: string, isActive: boolean) => Promise<void>;
  executeWorkflow: (workflowId: string, context?: any) => Promise<void>;
}

export function useNFCWorkflows(): UseNFCWorkflowsReturn {
  const { t } = useTranslation();
  const [workflows, setWorkflows] = useState<NFCWorkflow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load NFC workflows
  const loadWorkflows = useCallback(async (dealerId?: number) => {
    setLoading(true);
    setError(null);
    
    try {
      let query = supabase
        .from('nfc_workflows')
        .select('*')
        .order('created_at', { ascending: false });

      if (dealerId) {
        query = query.eq('dealer_id', dealerId);
      }

      const { data, error: supabaseError } = await query;

      if (supabaseError) {
        throw supabaseError;
      }

      // Mock data if no real data exists
      if (!data || data.length === 0) {
        const mockWorkflows: NFCWorkflow[] = [
          {
            id: '1',
            name: 'Vehicle Delivery Notification',
            description: 'Send notification when vehicle reaches delivery area',
            trigger_type: 'tag_scan',
            trigger_conditions: {
              tag_type: 'vehicle_delivery',
              location: 'Delivery Area'
            },
            actions: [
              {
                type: 'send_email',
                config: {
                  recipient: 'sales@dealership.com',
                  subject: 'Vehicle Ready for Delivery',
                  message: 'Vehicle {{vin}} is now ready for customer pickup.'
                }
              },
              {
                type: 'send_sms',
                config: {
                  recipient: '{{customer_phone}}',
                  message: 'Your vehicle is ready for pickup! Please come to the dealership at your convenience.'
                }
              }
            ],
            is_active: true,
            execution_count: 15,
            success_count: 14,
            last_executed: '2024-01-15T10:30:00Z',
            created_at: '2024-01-10T08:00:00Z',
            updated_at: '2024-01-15T10:30:00Z'
          },
          {
            id: '2',
            name: 'Service Bay Status Update',
            description: 'Update order status when vehicle enters service bay',
            trigger_type: 'location_entry',
            trigger_conditions: {
              location: 'Service Bay'
            },
            actions: [
              {
                type: 'update_order_status',
                config: {
                  status: 'In Progress'
                }
              },
              {
                type: 'send_notification',
                config: {
                  recipient: 'service_advisor',
                  message: 'Vehicle {{vin}} has entered {{location}}'
                }
              }
            ],
            is_active: true,
            execution_count: 32,
            success_count: 30,
            last_executed: '2024-01-15T14:15:00Z',
            created_at: '2024-01-08T10:00:00Z',
            updated_at: '2024-01-15T14:15:00Z'
          },
          {
            id: '3',
            name: 'Quality Control Task Creation',
            description: 'Create QC task when vehicle reaches quality control station',
            trigger_type: 'tag_scan',
            trigger_conditions: {
              tag_type: 'quality_control'
            },
            actions: [
              {
                type: 'create_task',
                config: {
                  task_title: 'Quality Control Inspection',
                  task_description: 'Perform complete quality control inspection for vehicle {{vin}}'
                }
              }
            ],
            is_active: false,
            execution_count: 8,
            success_count: 8,
            last_executed: '2024-01-14T16:20:00Z',
            created_at: '2024-01-05T12:00:00Z',
            updated_at: '2024-01-14T16:20:00Z'
          }
        ];
        
        setWorkflows(mockWorkflows);
        setLoading(false);
        return;
      }

      setWorkflows(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load NFC workflows';
      setError(message);
      toast.error(t('nfc_tracking.workflows.errors.load_failed'), {
        description: message
      });
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Create new NFC workflow
  const createWorkflow = async (workflowData: Partial<NFCWorkflow>) => {
    setLoading(true);
    setError(null);
    
    try {
      // Use mock data for now since we're working with mock workflows
      const newWorkflow: NFCWorkflow = {
        id: Date.now().toString(),
        name: workflowData.name || '',
        description: workflowData.description || '',
        trigger_type: workflowData.trigger_type || 'tag_scan',
        trigger_conditions: workflowData.trigger_conditions,
        actions: workflowData.actions || [],
        is_active: true,
        execution_count: 0,
        success_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      setWorkflows(prev => [newWorkflow, ...prev]);
      
      toast.success(t('nfc_tracking.workflows.workflow_created'), {
        description: t('nfc_tracking.workflows.workflow_created_desc', { name: newWorkflow.name })
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create NFC workflow';
      setError(message);
      toast.error(t('nfc_tracking.workflows.errors.create_failed'), {
        description: message
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update NFC workflow
  const updateWorkflow = async (workflowId: string, updates: Partial<NFCWorkflow>) => {
    setLoading(true);
    setError(null);
    
    try {
      // Use mock update for now
      const updatedWorkflow = workflows.find(w => w.id === workflowId);
      if (!updatedWorkflow) {
        throw new Error('Workflow not found');
      }
      
      const newWorkflow = {
        ...updatedWorkflow,
        ...updates,
        updated_at: new Date().toISOString()
      };

      if (supabaseError) {
        throw supabaseError;
      }

      setWorkflows(prev => prev.map(workflow => 
        workflow.id === workflowId ? newWorkflow : workflow
      ));
      
      toast.success(t('nfc_tracking.workflows.workflow_updated'), {
        description: t('nfc_tracking.workflows.workflow_updated_desc', { name: newWorkflow.name })
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update NFC workflow';
      setError(message);
      toast.error(t('nfc_tracking.workflows.errors.update_failed'), {
        description: message
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete NFC workflow
  const deleteWorkflow = async (workflowId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { error: supabaseError } = await supabase
        .from('nfc_workflows')
        .delete()
        .eq('id', workflowId);

      if (supabaseError) {
        throw supabaseError;
      }

      setWorkflows(prev => prev.filter(workflow => workflow.id !== workflowId));
      
      toast.success(t('nfc_tracking.workflows.workflow_deleted'), {
        description: t('nfc_tracking.workflows.workflow_deleted_desc')
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete NFC workflow';
      setError(message);
      toast.error(t('nfc_tracking.workflows.errors.delete_failed'), {
        description: message
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Toggle workflow active status
  const toggleWorkflow = async (workflowId: string, isActive: boolean) => {
    try {
      const { data, error: supabaseError } = await supabase
        .from('nfc_workflows')
        .update({ 
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', workflowId)
        .select()
        .single();

      if (supabaseError) {
        throw supabaseError;
      }

      setWorkflows(prev => prev.map(workflow => 
        workflow.id === workflowId ? data : workflow
      ));
      
      toast.success(
        isActive ? t('nfc_tracking.workflows.workflow_enabled') : t('nfc_tracking.workflows.workflow_disabled'),
        {
          description: t('nfc_tracking.workflows.status_changed', { name: data.name })
        }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to toggle NFC workflow';
      setError(message);
      toast.error(t('nfc_tracking.workflows.errors.toggle_failed'), {
        description: message
      });
      throw err;
    }
  };

  // Execute workflow manually or via trigger
  const executeWorkflow = async (workflowId: string, context?: any) => {
    try {
      const workflow = workflows.find(w => w.id === workflowId);
      if (!workflow || !workflow.is_active) {
        throw new Error('Workflow not found or inactive');
      }

      // Call the edge function to execute the workflow
      const { data, error } = await supabase.functions.invoke('execute-nfc-workflow', {
        body: {
          workflow_id: workflowId,
          context: context || {}
        }
      });

      if (error) {
        throw error;
      }

      // Update execution count
      const { error: updateError } = await supabase
        .from('nfc_workflows')
        .update({
          execution_count: workflow.execution_count + 1,
          success_count: data.success ? workflow.success_count + 1 : workflow.success_count,
          last_executed: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', workflowId);

      if (updateError) {
        console.error('Failed to update workflow stats:', updateError);
      }

      // Refresh workflows to get updated stats
      loadWorkflows();

      if (data.success) {
        toast.success(t('nfc_tracking.workflows.workflow_executed'), {
          description: t('nfc_tracking.workflows.workflow_executed_desc', { name: workflow.name })
        });
      } else {
        throw new Error(data.error || 'Workflow execution failed');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to execute NFC workflow';
      setError(message);
      toast.error(t('nfc_tracking.workflows.errors.execute_failed'), {
        description: message
      });
      throw err;
    }
  };

  return {
    workflows,
    loading,
    error,
    loadWorkflows,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    toggleWorkflow,
    executeWorkflow
  };
}