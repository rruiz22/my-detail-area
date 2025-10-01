import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertTriangle,
  CheckCircle,
  Circle,
  Pause,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Play,
  CheckCheck,
  XCircle,
  User,
  DollarSign,
  Clock,
  Wrench,
  Loader2,
  FileStack,
} from 'lucide-react';
import { LiveWorkTimer } from '@/components/get-ready/LiveWorkTimer';
import { cn } from '@/lib/utils';
import {
  useWorkItems,
  useCreateWorkItem,
  useUpdateWorkItem,
  useApproveWorkItem,
  useDeclineWorkItem,
  useStartWorkItem,
  useCompleteWorkItem,
  useDeleteWorkItem,
  WorkItemType,
  WorkItemStatus,
  CreateWorkItemInput,
} from '@/hooks/useVehicleWorkItems';
import { AddFromTemplatesModal } from '@/components/get-ready/AddFromTemplatesModal';

interface VehicleWorkItemsTabProps {
  vehicleId: string;
  className?: string;
}

export function VehicleWorkItemsTab({ vehicleId, className }: VehicleWorkItemsTabProps) {
  const { t } = useTranslation();
  const { data: workItems = [], isLoading } = useWorkItems(vehicleId);
  const createWorkItem = useCreateWorkItem();
  const updateWorkItem = useUpdateWorkItem();
  const approveWorkItem = useApproveWorkItem();
  const declineWorkItem = useDeclineWorkItem();
  const startWorkItem = useStartWorkItem();
  const completeWorkItem = useCompleteWorkItem();
  const deleteWorkItem = useDeleteWorkItem();

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
  const [selectedWorkItem, setSelectedWorkItem] = useState<any>(null);

  // Form states
  const [newWorkItem, setNewWorkItem] = useState<Partial<CreateWorkItemInput>>({
    vehicle_id: vehicleId,
    work_type: 'other',
    priority: 2,
    estimated_cost: 0,
    estimated_hours: 0,
    approval_required: false,
  });
  const [declineReason, setDeclineReason] = useState('');
  const [completionData, setCompletionData] = useState({ actualCost: 0, actualHours: 0 });

  // Calculate counters
  const counters = workItems.reduce(
    (acc, item) => {
      if (item.approval_required && !item.approval_status) {
        acc.needAttention++;
      }
      if (item.status === 'in_progress') acc.inProgress++;
      if (item.status === 'declined') acc.declined++;
      if (item.status === 'completed') acc.completed++;
      return acc;
    },
    { needAttention: 0, inProgress: 0, declined: 0, completed: 0 }
  );

  const getStatusIcon = (status: WorkItemStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Circle className="h-4 w-4 text-blue-600" />;
      case 'pending':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'declined':
        return <Pause className="h-4 w-4 text-red-600" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: WorkItemStatus) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'in_progress':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'declined':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1:
        return { label: t('common.priority.low'), color: 'bg-gray-100 text-gray-800 border-gray-200' };
      case 2:
        return { label: t('common.priority.normal'), color: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 3:
        return { label: t('common.priority.high'), color: 'bg-red-100 text-red-800 border-red-200' };
      default:
        return { label: t('common.priority.normal'), color: 'bg-gray-100 text-gray-800 border-gray-200' };
    }
  };

  const handleCreateWorkItem = async () => {
    if (!newWorkItem.title || !newWorkItem.work_type) {
      return;
    }

    await createWorkItem.mutateAsync(newWorkItem as CreateWorkItemInput);
    setCreateModalOpen(false);
    setNewWorkItem({
      vehicle_id: vehicleId,
      work_type: 'other',
      priority: 2,
      estimated_cost: 0,
      estimated_hours: 0,
      approval_required: false,
    });
  };

  const handleApprove = async (workItemId: string) => {
    await approveWorkItem.mutateAsync({ id: workItemId, vehicleId });
  };

  const handleDecline = async () => {
    if (!selectedWorkItem || !declineReason) return;
    await declineWorkItem.mutateAsync({
      id: selectedWorkItem.id,
      vehicleId,
      reason: declineReason,
    });
    setDeclineModalOpen(false);
    setDeclineReason('');
    setSelectedWorkItem(null);
  };

  const handleStart = async (workItemId: string) => {
    await startWorkItem.mutateAsync({ id: workItemId, vehicleId });
  };

  const handleComplete = async () => {
    if (!selectedWorkItem) return;
    await completeWorkItem.mutateAsync({
      id: selectedWorkItem.id,
      vehicleId,
      actualCost: completionData.actualCost,
      actualHours: completionData.actualHours,
    });
    setCompleteModalOpen(false);
    setCompletionData({ actualCost: 0, actualHours: 0 });
    setSelectedWorkItem(null);
  };

  const handleDelete = async (workItemId: string) => {
    if (confirm(t('get_ready.work_items.confirm_delete'))) {
      await deleteWorkItem.mutateAsync({ id: workItemId, vehicleId });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={cn('h-full flex flex-col', className)}>
      {/* Counters */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <div>
              <div className="text-2xl font-bold">{counters.needAttention}</div>
              <div className="text-xs text-muted-foreground">{t('get_ready.work_items.need_attention')}</div>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Circle className="h-4 w-4 text-blue-600" />
            <div>
              <div className="text-2xl font-bold">{counters.inProgress}</div>
              <div className="text-xs text-muted-foreground">{t('get_ready.work_items.in_progress')}</div>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Pause className="h-4 w-4 text-red-600" />
            <div>
              <div className="text-2xl font-bold">{counters.declined}</div>
              <div className="text-xs text-muted-foreground">{t('get_ready.work_items.declined')}</div>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <div>
              <div className="text-2xl font-bold">{counters.completed}</div>
              <div className="text-xs text-muted-foreground">{t('get_ready.work_items.completed')}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Add Work Item Buttons */}
      <div className="flex gap-2 mb-4">
        <Button size="sm" onClick={() => setCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('get_ready.work_items.add_work_item')}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setTemplatesModalOpen(true)}>
          <FileStack className="h-4 w-4 mr-2" />
          {t('get_ready.work_items.add_from_templates')}
        </Button>
      </div>

      {/* Work Items List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {workItems.length > 0 ? (
          workItems.map((item) => (
            <Card key={item.id} className="p-3 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {getStatusIcon(item.status)}
                  <div className="flex-1">
                    <div className="font-medium text-sm">{item.title}</div>
                    {item.description && (
                      <div className="text-xs text-muted-foreground mt-1">{item.description}</div>
                    )}

                    {/* Metadata row */}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant="outline" className={cn('text-xs', getStatusColor(item.status))}>
                        {t(`get_ready.work_items.status.${item.status}`)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {t(`get_ready.work_items.type.${item.work_type}`)}
                      </Badge>
                      <Badge variant="outline" className={cn('text-xs', getPriorityLabel(item.priority).color)}>
                        {getPriorityLabel(item.priority).label}
                      </Badge>

                      {item.estimated_cost > 0 && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <DollarSign className="h-3 w-3" />
                          <span>${item.estimated_cost.toFixed(2)}</span>
                        </div>
                      )}

                      {item.estimated_hours > 0 && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{item.estimated_hours}h</span>
                        </div>
                      )}

                      {item.assigned_technician_profile && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>
                            {item.assigned_technician_profile.first_name}{' '}
                            {item.assigned_technician_profile.last_name}
                          </span>
                        </div>
                      )}

                      {item.approval_required && !item.approval_status && (
                        <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                          {t('get_ready.work_items.approval_required')}
                        </Badge>
                      )}

                      {item.decline_reason && (
                        <div className="flex items-center gap-1 text-xs text-red-600">
                          <XCircle className="h-3 w-3" />
                          <span>{item.decline_reason}</span>
                        </div>
                      )}

                      {/* Live Timer for In Progress Items */}
                      {item.status === 'in_progress' && item.actual_start && (
                        <LiveWorkTimer
                          startTime={item.actual_start}
                          size="sm"
                          showStopButton={false}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{t('get_ready.actions.actions')}</DropdownMenuLabel>

                    {item.approval_required && !item.approval_status && (
                      <>
                        <DropdownMenuItem onClick={() => handleApprove(item.id)}>
                          <CheckCheck className="h-4 w-4 mr-2 text-green-600" />
                          {t('get_ready.work_items.approve')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedWorkItem(item);
                            setDeclineModalOpen(true);
                          }}
                        >
                          <XCircle className="h-4 w-4 mr-2 text-red-600" />
                          {t('get_ready.work_items.decline')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}

                    {item.status === 'pending' && (
                      <>
                        <DropdownMenuItem onClick={() => handleStart(item.id)}>
                          <Play className="h-4 w-4 mr-2 text-blue-600" />
                          {t('get_ready.work_items.start')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}

                    {item.status === 'in_progress' && (
                      <>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedWorkItem(item);

                            // Calculate actual hours from actual_start if available
                            let calculatedHours = item.actual_hours || item.estimated_hours || 0;
                            if (item.actual_start && !item.actual_hours) {
                              const startTime = new Date(item.actual_start);
                              const endTime = new Date();
                              const diffInMs = endTime.getTime() - startTime.getTime();
                              // Convert to hours with 2 decimal precision
                              calculatedHours = Math.round((diffInMs / (1000 * 60 * 60)) * 100) / 100;
                            }

                            setCompletionData({
                              actualCost: item.actual_cost || item.estimated_cost || 0,
                              actualHours: calculatedHours,
                            });
                            setCompleteModalOpen(true);
                          }}
                        >
                          <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                          {t('get_ready.work_items.complete')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}

                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedWorkItem(item);
                        setEditModalOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      {t('get_ready.actions.edit')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(item.id)} className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('get_ready.actions.delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Wrench className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <div className="text-sm">{t('get_ready.work_items.no_items')}</div>
          </div>
        )}
      </div>

      {/* Create Work Item Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('get_ready.work_items.add_work_item')}</DialogTitle>
            <DialogDescription>{t('get_ready.work_items.add_description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">{t('get_ready.work_items.title')}</Label>
              <Input
                id="title"
                value={newWorkItem.title || ''}
                onChange={(e) => setNewWorkItem({ ...newWorkItem, title: e.target.value })}
                placeholder={t('get_ready.work_items.title_placeholder')}
              />
            </div>
            <div>
              <Label htmlFor="description">{t('get_ready.work_items.description')}</Label>
              <Textarea
                id="description"
                value={newWorkItem.description || ''}
                onChange={(e) => setNewWorkItem({ ...newWorkItem, description: e.target.value })}
                placeholder={t('get_ready.work_items.description_placeholder')}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="work_type">{t('get_ready.work_items.work_type')}</Label>
                <Select
                  value={newWorkItem.work_type}
                  onValueChange={(value: WorkItemType) => setNewWorkItem({ ...newWorkItem, work_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mechanical">{t('get_ready.work_items.type.mechanical')}</SelectItem>
                    <SelectItem value="body_repair">{t('get_ready.work_items.type.body_repair')}</SelectItem>
                    <SelectItem value="detailing">{t('get_ready.work_items.type.detailing')}</SelectItem>
                    <SelectItem value="safety_inspection">{t('get_ready.work_items.type.safety_inspection')}</SelectItem>
                    <SelectItem value="reconditioning">{t('get_ready.work_items.type.reconditioning')}</SelectItem>
                    <SelectItem value="parts_ordering">{t('get_ready.work_items.type.parts_ordering')}</SelectItem>
                    <SelectItem value="other">{t('get_ready.work_items.type.other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="priority">{t('get_ready.work_items.priority')}</Label>
                <Select
                  value={String(newWorkItem.priority)}
                  onValueChange={(value) => setNewWorkItem({ ...newWorkItem, priority: Number(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{t('common.priority.low')}</SelectItem>
                    <SelectItem value="2">{t('common.priority.normal')}</SelectItem>
                    <SelectItem value="3">{t('common.priority.high')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="estimated_cost">{t('get_ready.work_items.estimated_cost')}</Label>
                <Input
                  id="estimated_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={newWorkItem.estimated_cost || 0}
                  onChange={(e) => setNewWorkItem({ ...newWorkItem, estimated_cost: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="estimated_hours">{t('get_ready.work_items.estimated_hours')}</Label>
                <Input
                  id="estimated_hours"
                  type="number"
                  min="0"
                  step="0.5"
                  value={newWorkItem.estimated_hours || 0}
                  onChange={(e) => setNewWorkItem({ ...newWorkItem, estimated_hours: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="approval_required"
                checked={newWorkItem.approval_required || false}
                onChange={(e) => setNewWorkItem({ ...newWorkItem, approval_required: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="approval_required" className="cursor-pointer">
                {t('get_ready.work_items.approval_required')}
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
              {t('common.actions.cancel')}
            </Button>
            <Button onClick={handleCreateWorkItem} disabled={createWorkItem.isPending}>
              {createWorkItem.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('common.actions.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline Modal */}
      <Dialog open={declineModalOpen} onOpenChange={setDeclineModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('get_ready.work_items.decline_title')}</DialogTitle>
            <DialogDescription>{t('get_ready.work_items.decline_description')}</DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="decline_reason">{t('get_ready.work_items.decline_reason')}</Label>
            <Textarea
              id="decline_reason"
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder={t('get_ready.work_items.decline_reason_placeholder')}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineModalOpen(false)}>
              {t('common.actions.cancel')}
            </Button>
            <Button onClick={handleDecline} disabled={declineWorkItem.isPending || !declineReason} variant="destructive">
              {declineWorkItem.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('get_ready.work_items.decline')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Modal */}
      <Dialog open={completeModalOpen} onOpenChange={setCompleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('get_ready.work_items.complete_title')}</DialogTitle>
            <DialogDescription>{t('get_ready.work_items.complete_description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="actual_cost">{t('get_ready.work_items.actual_cost')}</Label>
              <Input
                id="actual_cost"
                type="number"
                min="0"
                step="0.01"
                value={completionData.actualCost}
                onChange={(e) => setCompletionData({ ...completionData, actualCost: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="actual_hours">
                {t('get_ready.work_items.actual_hours')}
                {selectedWorkItem?.actual_start && !selectedWorkItem?.actual_hours && (
                  <span className="text-xs text-muted-foreground ml-2 font-normal">
                    ({t('get_ready.work_items.auto_calculated')})
                  </span>
                )}
              </Label>
              <Input
                id="actual_hours"
                type="number"
                min="0"
                step="0.5"
                value={completionData.actualHours}
                onChange={(e) => setCompletionData({ ...completionData, actualHours: Number(e.target.value) })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteModalOpen(false)}>
              {t('common.actions.cancel')}
            </Button>
            <Button onClick={handleComplete} disabled={completeWorkItem.isPending}>
              {completeWorkItem.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('get_ready.work_items.complete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add from Templates Modal */}
      <AddFromTemplatesModal
        vehicleId={vehicleId}
        open={templatesModalOpen}
        onOpenChange={setTemplatesModalOpen}
      />
    </div>
  );
}