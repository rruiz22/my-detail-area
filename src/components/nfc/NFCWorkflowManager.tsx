import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Zap,
  Mail,
  MessageSquare,
  Bell,
  Calendar,
  Link,
  Play,
  Pause,
  Settings,
  Activity,
  ArrowRight
} from 'lucide-react';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { useNFCWorkflows, NFCWorkflow, TriggerConditions, NFCWorkflowAction } from '@/hooks/useNFCWorkflows';

interface NFCWorkflowManagerProps {
  className?: string;
}

// Form data interface for creating/editing workflows
interface WorkflowFormData {
  name: string;
  description: string;
  trigger_type: 'tag_scan' | 'location_entry' | 'time_based' | 'status_change';
  trigger_conditions: TriggerConditions;
  actions: NFCWorkflowAction[];
}

export function NFCWorkflowManager({ className }: NFCWorkflowManagerProps) {
  const { t } = useTranslation();
  const {
    workflows,
    loading,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    toggleWorkflow,
    loadWorkflows
  } = useNFCWorkflows();

  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<NFCWorkflow | null>(null);

  const [formData, setFormData] = useState<WorkflowFormData>({
    name: '',
    description: '',
    trigger_type: 'tag_scan',
    trigger_conditions: {},
    actions: [{
      type: 'send_email',
      config: {}
    }]
  });

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  const filteredWorkflows = workflows.filter(workflow =>
    workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    workflow.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateWorkflow = async () => {
    try {
      await createWorkflow(formData);
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create workflow:', error);
    }
  };

  const handleUpdateWorkflow = async () => {
    if (!selectedWorkflow) return;
    
    try {
      await updateWorkflow(selectedWorkflow.id, formData);
      setIsEditDialogOpen(false);
      setSelectedWorkflow(null);
      resetForm();
    } catch (error) {
      console.error('Failed to update workflow:', error);
    }
  };

  const handleDeleteWorkflow = async (workflow: NFCWorkflow) => {
    try {
      await deleteWorkflow(workflow.id);
    } catch (error) {
      console.error('Failed to delete workflow:', error);
    }
  };

  const handleToggleWorkflow = async (workflow: NFCWorkflow) => {
    try {
      await toggleWorkflow(workflow.id, !workflow.is_active);
    } catch (error) {
      console.error('Failed to toggle workflow:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      trigger_type: 'tag_scan',
      trigger_conditions: {
        tag_type: '',
        location: '',
        time_range: ''
      },
      actions: [{
        type: 'send_email',
        config: {
          recipient: '',
          subject: '',
          message: ''
        }
      }]
    });
  };

  const openEditDialog = (workflow: NFCWorkflow) => {
    setSelectedWorkflow(workflow);
    setFormData({
      name: workflow.name,
      description: workflow.description || '',
      trigger_type: workflow.trigger_type,
      trigger_conditions: workflow.trigger_conditions || {
        tag_type: '',
        location: '',
        time_range: ''
      },
      actions: workflow.actions || [{
        type: 'send_email',
        config: {
          recipient: '',
          subject: '',
          message: ''
        }
      }]
    });
    setIsEditDialogOpen(true);
  };

  const addAction = () => {
    setFormData({
      ...formData,
      actions: [...formData.actions, {
        type: 'send_email',
        config: {
          recipient: '',
          subject: '',
          message: ''
        }
      }]
    });
  };

  const updateAction = (index: number, updates: Partial<NFCWorkflowAction>) => {
    const newActions = [...formData.actions];
    newActions[index] = { ...newActions[index], ...updates };
    setFormData({ ...formData, actions: newActions });
  };

  const removeAction = (index: number) => {
    const newActions = formData.actions.filter((_, i) => i !== index);
    setFormData({ ...formData, actions: newActions });
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'send_email': return Mail;
      case 'send_sms': return MessageSquare;
      case 'send_notification': return Bell;
      case 'update_order_status': return Activity;
      case 'create_task': return Calendar;
      case 'webhook': return Link;
      default: return Zap;
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-success/20 text-success-foreground' : 'bg-muted text-muted-foreground';
  };

  return (
    <div className={className}>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div>
            <h2 className="text-xl font-semibold">{t('nfc_tracking.workflows.title')}</h2>
            <p className="text-muted-foreground">
              {t('nfc_tracking.workflows.subtitle')}
            </p>
          </div>
          <PermissionGuard module="nfc_tracking" permission="manage_workflows">
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {t('nfc_tracking.workflows.create_workflow')}
            </Button>
          </PermissionGuard>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('nfc_tracking.workflows.search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Workflows List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-20 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredWorkflows.map((workflow) => (
              <Card key={workflow.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{workflow.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(workflow.is_active)}>
                          {workflow.is_active ? t('nfc_tracking.workflows.active') : t('nfc_tracking.workflows.inactive')}
                        </Badge>
                        <Badge variant="outline">
                          {t(`nfc_tracking.workflows.triggers.${workflow.trigger_type}`)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={workflow.is_active}
                      onCheckedChange={() => handleToggleWorkflow(workflow)}
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <PermissionGuard module="nfc_tracking" permission="manage_workflows" hideOnDeny>
                          <DropdownMenuItem onClick={() => openEditDialog(workflow)}>
                            <Edit className="w-4 h-4 mr-2" />
                            {t('nfc_tracking.workflows.edit')}
                          </DropdownMenuItem>
                        </PermissionGuard>
                        <PermissionGuard module="nfc_tracking" permission="manage_workflows" hideOnDeny>
                          <DropdownMenuItem onClick={() => handleToggleWorkflow(workflow)}>
                            {workflow.is_active ? (
                              <>
                                <Pause className="w-4 h-4 mr-2" />
                                {t('nfc_tracking.workflows.disable')}
                              </>
                            ) : (
                              <>
                                <Play className="w-4 h-4 mr-2" />
                                {t('nfc_tracking.workflows.enable')}
                              </>
                            )}
                          </DropdownMenuItem>
                        </PermissionGuard>
                        <PermissionGuard module="nfc_tracking" permission="manage_workflows" hideOnDeny>
                          <DropdownMenuItem
                            onClick={() => handleDeleteWorkflow(workflow)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {t('nfc_tracking.workflows.delete')}
                          </DropdownMenuItem>
                        </PermissionGuard>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {workflow.description}
                  </p>
                  
                  {/* Workflow Actions Preview */}
                  <div className="flex flex-wrap gap-2">
                    {workflow.actions?.slice(0, 3).map((action, index) => {
                      const ActionIcon = getActionIcon(action.type);
                      return (
                        <div key={index} className="flex items-center gap-1 px-2 py-1 bg-muted rounded-md text-xs">
                          <ActionIcon className="w-3 h-3" />
                          <span>{t(`nfc_tracking.workflows.actions.${action.type}`)}</span>
                        </div>
                      );
                    })}
                    {workflow.actions && workflow.actions.length > 3 && (
                      <div className="px-2 py-1 bg-muted rounded-md text-xs">
                        +{workflow.actions.length - 3} {t('nfc_tracking.workflows.more_actions')}
                      </div>
                    )}
                  </div>

                  {/* Statistics */}
                  <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                    <div className="text-center">
                      <p className="text-lg font-semibold">{workflow.execution_count || 0}</p>
                      <p className="text-xs text-muted-foreground">{t('nfc_tracking.workflows.executions')}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-success">
                        {Math.round((workflow.success_count || 0) / Math.max(workflow.execution_count || 1, 1) * 100)}%
                      </p>
                      <p className="text-xs text-muted-foreground">{t('nfc_tracking.workflows.success_rate')}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold">
                        {workflow.last_executed ? new Date(workflow.last_executed).toLocaleDateString() : '-'}
                      </p>
                      <p className="text-xs text-muted-foreground">{t('nfc_tracking.workflows.last_run')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {filteredWorkflows.length === 0 && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery ? t('nfc_tracking.workflows.no_results') : t('nfc_tracking.workflows.no_workflows')}
          </div>
        )}
      </div>

      {/* Create/Edit Workflow Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setIsEditDialogOpen(false);
          setSelectedWorkflow(null);
          resetForm();
        }
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditDialogOpen ? t('nfc_tracking.workflows.edit_workflow') : t('nfc_tracking.workflows.create_workflow')}
            </DialogTitle>
            <DialogDescription>
              {t('nfc_tracking.workflows.workflow_description')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="workflow-name">{t('nfc_tracking.workflows.name')}</Label>
                <Input
                  id="workflow-name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder={t('nfc_tracking.workflows.name_placeholder')}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="workflow-description">{t('nfc_tracking.workflows.description')}</Label>
                <Textarea
                  id="workflow-description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder={t('nfc_tracking.workflows.description_placeholder')}
                />
              </div>
            </div>

            {/* Trigger Configuration */}
            <div className="space-y-4">
              <h4 className="font-medium">{t('nfc_tracking.workflows.trigger_config')}</h4>
              <div className="grid gap-2">
                <Label htmlFor="trigger-type">{t('nfc_tracking.workflows.trigger_type')}</Label>
                <Select 
                  value={formData.trigger_type} 
                  onValueChange={(value: any) => setFormData({...formData, trigger_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tag_scan">{t('nfc_tracking.workflows.triggers.tag_scan')}</SelectItem>
                    <SelectItem value="location_entry">{t('nfc_tracking.workflows.triggers.location_entry')}</SelectItem>
                    <SelectItem value="time_based">{t('nfc_tracking.workflows.triggers.time_based')}</SelectItem>
                    <SelectItem value="status_change">{t('nfc_tracking.workflows.triggers.status_change')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">{t('nfc_tracking.workflows.actions')}</h4>
                <Button variant="outline" size="sm" onClick={addAction}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('nfc_tracking.workflows.add_action')}
                </Button>
              </div>
              
              {formData.actions.map((action, index) => (
                <Card key={index} className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h5 className="font-medium text-sm">
                      {t('nfc_tracking.workflows.action')} {index + 1}
                    </h5>
                    {formData.actions.length > 1 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => removeAction(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid gap-3">
                    <Select 
                      value={action.type} 
                      onValueChange={(value: any) => updateAction(index, { type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="send_email">{t('nfc_tracking.workflows.actions.send_email')}</SelectItem>
                        <SelectItem value="send_sms">{t('nfc_tracking.workflows.actions.send_sms')}</SelectItem>
                        <SelectItem value="send_notification">{t('nfc_tracking.workflows.actions.send_notification')}</SelectItem>
                        <SelectItem value="update_order_status">{t('nfc_tracking.workflows.actions.update_order_status')}</SelectItem>
                        <SelectItem value="create_task">{t('nfc_tracking.workflows.actions.create_task')}</SelectItem>
                        <SelectItem value="webhook">{t('nfc_tracking.workflows.actions.webhook')}</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Action-specific configuration */}
                    {(action.type === 'send_email' || action.type === 'send_sms') && (
                      <>
                        <Input
                          placeholder={t('nfc_tracking.workflows.recipient')}
                          value={action.config.recipient || ''}
                          onChange={(e) => updateAction(index, {
                            config: { ...action.config, recipient: e.target.value }
                          })}
                        />
                        {action.type === 'send_email' && (
                          <Input
                            placeholder={t('nfc_tracking.workflows.subject')}
                            value={action.config.subject || ''}
                            onChange={(e) => updateAction(index, {
                              config: { ...action.config, subject: e.target.value }
                            })}
                          />
                        )}
                        <Textarea
                          placeholder={t('nfc_tracking.workflows.message')}
                          value={action.config.message || ''}
                          onChange={(e) => updateAction(index, {
                            config: { ...action.config, message: e.target.value }
                          })}
                        />
                      </>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateDialogOpen(false);
              setIsEditDialogOpen(false);
              setSelectedWorkflow(null);
              resetForm();
            }}>
              {t('nfc_tracking.workflows.cancel')}
            </Button>
            <Button onClick={isEditDialogOpen ? handleUpdateWorkflow : handleCreateWorkflow}>
              {isEditDialogOpen ? t('nfc_tracking.workflows.save') : t('nfc_tracking.workflows.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}