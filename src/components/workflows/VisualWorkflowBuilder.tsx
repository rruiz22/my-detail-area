import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Play, 
  Pause, 
  Save, 
  Plus, 
  Trash2, 
  Settings, 
  Zap,
  MessageSquare,
  Mail,
  Phone,
  Clock,
  Users,
  Database,
  GitBranch,
  Filter,
  ArrowRight,
  Circle,
  Square
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

interface WorkflowNode {
  id: string;
  type: 'trigger' | 'condition' | 'action' | 'delay';
  title: string;
  description: string;
  config: any;
  position: { x: number; y: number };
  connections: string[];
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  nodes: WorkflowNode[];
  isActive: boolean;
}

interface VisualWorkflowBuilderProps {
  dealerId: number;
  onSave?: (workflow: WorkflowTemplate) => void;
  editingWorkflow?: WorkflowTemplate;
}

export const VisualWorkflowBuilder: React.FC<VisualWorkflowBuilderProps> = ({
  dealerId,
  onSave,
  editingWorkflow
}) => {
  const { t } = useTranslation();
  const [workflow, setWorkflow] = useState<WorkflowTemplate>(
    editingWorkflow || {
      id: `workflow-${Date.now()}`,
      name: t('workflows.new_workflow', 'New Workflow'),
      description: '',
      category: 'custom',
      nodes: [],
      isActive: false
    }
  );
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [draggedNodeType, setDraggedNodeType] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const nodeTypes = useMemo(() => [
    {
      type: 'trigger',
      title: t('workflows.triggers', 'Triggers'),
      items: [
        { id: 'order_created', title: t('workflows.order_created', 'Order Created'), icon: Plus },
        { id: 'status_changed', title: t('workflows.status_changed', 'Status Changed'), icon: GitBranch },
        { id: 'time_based', title: t('workflows.time_based', 'Time Based'), icon: Clock },
        { id: 'sms_received', title: t('workflows.sms_received', 'SMS Received'), icon: MessageSquare }
      ]
    },
    {
      type: 'condition',
      title: t('workflows.conditions', 'Conditions'),
      items: [
        { id: 'if_status', title: t('workflows.if_status', 'If Status'), icon: Filter },
        { id: 'if_time', title: t('workflows.if_time', 'If Time'), icon: Clock },
        { id: 'if_customer', title: t('workflows.if_customer', 'If Customer'), icon: Users },
        { id: 'if_value', title: t('workflows.if_value', 'If Value'), icon: Database }
      ]
    },
    {
      type: 'action',
      title: t('workflows.actions', 'Actions'),
      items: [
        { id: 'send_sms', title: t('workflows.send_sms', 'Send SMS'), icon: MessageSquare },
        { id: 'send_email', title: t('workflows.send_email', 'Send Email'), icon: Mail },
        { id: 'make_call', title: t('workflows.make_call', 'Make Call'), icon: Phone },
        { id: 'update_status', title: t('workflows.update_status', 'Update Status'), icon: Database },
        { id: 'notify_team', title: t('workflows.notify_team', 'Notify Team'), icon: Users }
      ]
    },
    {
      type: 'delay',
      title: t('workflows.delays', 'Delays'),
      items: [
        { id: 'wait_minutes', title: t('workflows.wait_minutes', 'Wait Minutes'), icon: Clock },
        { id: 'wait_hours', title: t('workflows.wait_hours', 'Wait Hours'), icon: Clock },
        { id: 'wait_days', title: t('workflows.wait_days', 'Wait Days'), icon: Clock }
      ]
    }
  ], [t]);

  const handleDragStart = useCallback((event: React.DragEvent, nodeType: string, nodeId: string) => {
    setDraggedNodeType(`${nodeType}:${nodeId}`);
    event.dataTransfer.effectAllowed = 'copy';
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    if (!draggedNodeType || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const [type, id] = draggedNodeType.split(':');
    const nodeTypeInfo = nodeTypes.find(nt => nt.type === type);
    const nodeInfo = nodeTypeInfo?.items.find(item => item.id === id);

    if (!nodeInfo) return;

    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      type: type as WorkflowNode['type'],
      title: nodeInfo.title,
      description: '',
      config: {},
      position: { x, y },
      connections: []
    };

    setWorkflow(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode]
    }));

    setDraggedNodeType(null);
  }, [draggedNodeType, nodeTypes]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleNodeClick = (node: WorkflowNode) => {
    setSelectedNode(node);
    setIsConfigOpen(true);
  };

  const handleNodeDelete = (nodeId: string) => {
    setWorkflow(prev => ({
      ...prev,
      nodes: prev.nodes.filter(node => node.id !== nodeId)
    }));
  };

  const handleNodeUpdate = (updatedNode: WorkflowNode) => {
    setWorkflow(prev => ({
      ...prev,
      nodes: prev.nodes.map(node => 
        node.id === updatedNode.id ? updatedNode : node
      )
    }));
    setIsConfigOpen(false);
  };

  const handleSaveWorkflow = () => {
    onSave?.(workflow);
  };

  const getNodeIcon = (type: WorkflowNode['type']) => {
    switch (type) {
      case 'trigger': return <Zap className="h-4 w-4" />;
      case 'condition': return <GitBranch className="h-4 w-4" />;
      case 'action': return <Play className="h-4 w-4" />;
      case 'delay': return <Clock className="h-4 w-4" />;
      default: return <Circle className="h-4 w-4" />;
    }
  };

  const getNodeColor = (type: WorkflowNode['type']) => {
    switch (type) {
      case 'trigger': return 'bg-green-100 border-green-300 text-green-800';
      case 'condition': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'action': return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'delay': return 'bg-purple-100 border-purple-300 text-purple-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900">
      {/* Sidebar with node types */}
      <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-sm mb-3">{t('workflows.workflow_builder', 'Workflow Builder')}</h3>
            <div className="space-y-2">
              <Input
                placeholder={t('workflows.workflow_name', 'Workflow name')}
                value={workflow.name}
                onChange={(e) => setWorkflow(prev => ({ ...prev, name: e.target.value }))}
              />
              <Textarea
                placeholder={t('workflows.workflow_description', 'Description')}
                value={workflow.description}
                onChange={(e) => setWorkflow(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
              <div className="flex items-center space-x-2">
                <Switch
                  checked={workflow.isActive}
                  onCheckedChange={(checked) => setWorkflow(prev => ({ ...prev, isActive: checked }))}
                />
                <Label className="text-sm">{t('workflows.active', 'Active')}</Label>
              </div>
            </div>
          </div>

          {nodeTypes.map((nodeType) => (
            <div key={nodeType.type}>
              <h4 className="font-medium text-sm mb-2 text-gray-600 dark:text-gray-400">
                {nodeType.title}
              </h4>
              <div className="space-y-1">
                {nodeType.items.map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, nodeType.type, item.id)}
                    className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 cursor-grab hover:shadow-sm transition-shadow"
                  >
                    <item.icon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{item.title}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main canvas */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{workflow.nodes.length} nodes</Badge>
              <Badge variant={workflow.isActive ? "default" : "secondary"}>
                {workflow.isActive ? t('workflows.active', 'Active') : t('workflows.inactive', 'Inactive')}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setWorkflow(prev => ({ ...prev, nodes: [] }))}>
                <Trash2 className="h-4 w-4 mr-2" />
                {t('workflows.clear', 'Clear')}
              </Button>
              <Button onClick={handleSaveWorkflow}>
                <Save className="h-4 w-4 mr-2" />
                {t('workflows.save', 'Save')}
              </Button>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          className="flex-1 relative overflow-auto bg-gray-50 dark:bg-gray-900"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          style={{
            backgroundImage: `
              radial-gradient(circle, #d1d5db 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px'
          }}
        >
          {workflow.nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-gray-400 mb-2">
                  <ArrowRight className="h-12 w-12 mx-auto" />
                </div>
                <p className="text-gray-500 text-lg font-medium">
                  {t('workflows.drag_to_start', 'Drag components here to start building')}
                </p>
                <p className="text-gray-400 text-sm">
                  {t('workflows.drag_description', 'Create automated workflows by connecting triggers, conditions, and actions')}
                </p>
              </div>
            </div>
          )}

          {workflow.nodes.map((node) => (
            <div
              key={node.id}
              className={`absolute cursor-pointer select-none ${getNodeColor(node.type)}`}
              style={{
                left: node.position.x,
                top: node.position.y,
                transform: 'translate(-50%, -50%)'
              }}
              onClick={() => handleNodeClick(node)}
            >
              <div className="p-3 rounded-lg border-2 min-w-32 max-w-48">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {getNodeIcon(node.type)}
                    <span className="font-medium text-sm">{node.title}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNodeDelete(node.id);
                    }}
                    className="h-6 w-6 p-0 hover:bg-red-100"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                {node.description && (
                  <p className="text-xs opacity-75">{node.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Node Configuration Dialog */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedNode && getNodeIcon(selectedNode.type)}
              {t('workflows.configure_node', 'Configure Node')}
            </DialogTitle>
            <DialogDescription>
              {t('workflows.configure_description', 'Configure the settings for this workflow node')}
            </DialogDescription>
          </DialogHeader>
          
          {selectedNode && (
            <NodeConfigForm
              node={selectedNode}
              onSave={handleNodeUpdate}
              onCancel={() => setIsConfigOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface NodeConfigFormProps {
  node: WorkflowNode;
  onSave: (node: WorkflowNode) => void;
  onCancel: () => void;
}

const NodeConfigForm: React.FC<NodeConfigFormProps> = ({ node, onSave, onCancel }) => {
  const { t } = useTranslation();
  const [config, setConfig] = useState(node.config);
  const [description, setDescription] = useState(node.description);

  const handleSave = () => {
    onSave({
      ...node,
      config,
      description
    });
  };

  const renderConfigFields = () => {
    switch (node.type) {
      case 'trigger':
        return (
          <div className="space-y-4">
            <div>
              <Label>{t('workflows.trigger_event', 'Trigger Event')}</Label>
              <Select value={config.event} onValueChange={(value) => setConfig(prev => ({ ...prev, event: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder={t('workflows.select_event', 'Select event')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="order_created">{t('workflows.order_created', 'Order Created')}</SelectItem>
                  <SelectItem value="status_changed">{t('workflows.status_changed', 'Status Changed')}</SelectItem>
                  <SelectItem value="sms_received">{t('workflows.sms_received', 'SMS Received')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'condition':
        return (
          <div className="space-y-4">
            <div>
              <Label>{t('workflows.condition_type', 'Condition Type')}</Label>
              <Select value={config.type} onValueChange={(value) => setConfig(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder={t('workflows.select_condition', 'Select condition')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="status_equals">{t('workflows.status_equals', 'Status Equals')}</SelectItem>
                  <SelectItem value="time_between">{t('workflows.time_between', 'Time Between')}</SelectItem>
                  <SelectItem value="customer_type">{t('workflows.customer_type', 'Customer Type')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('workflows.condition_value', 'Value')}</Label>
              <Input
                value={config.value || ''}
                onChange={(e) => setConfig(prev => ({ ...prev, value: e.target.value }))}
                placeholder={t('workflows.enter_value', 'Enter value')}
              />
            </div>
          </div>
        );

      case 'action':
        return (
          <div className="space-y-4">
            <div>
              <Label>{t('workflows.action_type', 'Action Type')}</Label>
              <Select value={config.type} onValueChange={(value) => setConfig(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder={t('workflows.select_action', 'Select action')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="send_sms">{t('workflows.send_sms', 'Send SMS')}</SelectItem>
                  <SelectItem value="send_email">{t('workflows.send_email', 'Send Email')}</SelectItem>
                  <SelectItem value="update_status">{t('workflows.update_status', 'Update Status')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {config.type === 'send_sms' && (
              <div>
                <Label>{t('workflows.sms_message', 'SMS Message')}</Label>
                <Textarea
                  value={config.message || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, message: e.target.value }))}
                  placeholder={t('workflows.enter_message', 'Enter message')}
                />
              </div>
            )}
          </div>
        );

      case 'delay':
        return (
          <div className="space-y-4">
            <div>
              <Label>{t('workflows.delay_duration', 'Delay Duration')}</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={config.duration || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                  placeholder="1"
                />
                <Select value={config.unit} onValueChange={(value) => setConfig(prev => ({ ...prev, unit: value }))}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutes">{t('workflows.minutes', 'Minutes')}</SelectItem>
                    <SelectItem value="hours">{t('workflows.hours', 'Hours')}</SelectItem>
                    <SelectItem value="days">{t('workflows.days', 'Days')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>{t('workflows.node_description', 'Description')}</Label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('workflows.enter_description', 'Enter description')}
        />
      </div>

      {renderConfigFields()}

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel}>
          {t('common.cancel', 'Cancel')}
        </Button>
        <Button onClick={handleSave}>
          {t('common.save', 'Save')}
        </Button>
      </div>
    </div>
  );
};