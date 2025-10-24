import { AddFromTemplatesModal } from '@/components/get-ready/AddFromTemplatesModal';
import { QuickAddWorkItemModal } from '@/components/get-ready/QuickAddWorkItemModal';
import { WorkItemsGroupedTable } from '@/components/get-ready/WorkItemsGroupedTable';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
    CreateWorkItemInput,
    useApproveWorkItem,
    useCompleteWorkItem,
    useCreateWorkItem,
    useDeclineWorkItem,
    useDeleteWorkItem,
    useStartWorkItem,
    useUpdateWorkItem,
    useWorkItems,
    WorkItemType,
    // ✨ NEW: Import new hooks for enhanced status system
    usePauseWorkItem,
    useResumeWorkItem,
    useBlockWorkItem,
    useUnblockWorkItem,
    useCancelWorkItem,
} from '@/hooks/useVehicleWorkItems';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
    AlertTriangle,
    CheckCircle,
    Circle,
    Loader2,
    Pause,
    Plus
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface VehicleWorkItemsTabProps {
  vehicleId: string;
  onSwitchTab?: (tab: string) => void;
  className?: string;
}

export function VehicleWorkItemsTab({ vehicleId, onSwitchTab, className }: VehicleWorkItemsTabProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: workItems = [], isLoading } = useWorkItems(vehicleId);
  const createWorkItem = useCreateWorkItem();
  const updateWorkItem = useUpdateWorkItem();
  const approveWorkItem = useApproveWorkItem();
  const declineWorkItem = useDeclineWorkItem();
  const startWorkItem = useStartWorkItem();
  const completeWorkItem = useCompleteWorkItem();
  const deleteWorkItem = useDeleteWorkItem();
  // ✨ NEW: Initialize new hooks for enhanced status system
  const pauseWorkItem = usePauseWorkItem();
  const resumeWorkItem = useResumeWorkItem();
  const blockWorkItem = useBlockWorkItem();
  const unblockWorkItem = useUnblockWorkItem();
  const cancelWorkItem = useCancelWorkItem();

  // Modal states
  const [quickAddModalOpen, setQuickAddModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [declineModalOpen, setDeclineModalOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
  // ✨ NEW: Modal states for new actions
  const [pauseModalOpen, setPauseModalOpen] = useState(false);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
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
  // ✨ NEW: Form states for new actions
  const [pauseReason, setPauseReason] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  // ✨ Calculate counters with simplified workflow (no 'approved')
  const counters = workItems.reduce(
    (acc, item) => {
      // Need Attention: awaiting_approval + rejected + blocked
      if (
        item.status === 'awaiting_approval' ||
        item.status === 'rejected' ||
        item.status === 'blocked'
      ) {
        acc.needAttention++;
      }
      // In Progress: in_progress only
      if (item.status === 'in_progress') acc.inProgress++;
      // On Hold: ONLY on_hold (NOT rejected - that needs attention)
      if (item.status === 'on_hold') acc.onHold++;
      // Completed
      if (item.status === 'completed') acc.completed++;
      return acc;
    },
    { needAttention: 0, inProgress: 0, onHold: 0, completed: 0 }
  );


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

  // NEW: Navigate to media/notes tabs
  const handleNavigateToMedia = (workItemId: string) => {
    onSwitchTab?.('media');
    toast({
      description: t('get_ready.work_items.navigating_to_media'),
    });
  };

  const handleNavigateToNotes = (workItemId: string) => {
    onSwitchTab?.('notes');
    toast({
      description: t('get_ready.work_items.navigating_to_notes'),
    });
  };

  // ✨ NEW: Handlers for enhanced status system
  const handlePause = async () => {
    if (!selectedWorkItem) return;
    await pauseWorkItem.mutateAsync({
      id: selectedWorkItem.id,
      vehicleId,
      reason: pauseReason || undefined,
    });
    setPauseModalOpen(false);
    setPauseReason('');
    setSelectedWorkItem(null);
  };

  const handleResume = async (workItemId: string) => {
    await resumeWorkItem.mutateAsync({ id: workItemId, vehicleId });
  };

  const handleBlock = async () => {
    if (!selectedWorkItem || !blockReason) return;
    await blockWorkItem.mutateAsync({
      id: selectedWorkItem.id,
      vehicleId,
      reason: blockReason,
    });
    setBlockModalOpen(false);
    setBlockReason('');
    setSelectedWorkItem(null);
  };

  const handleUnblock = async (workItemId: string) => {
    await unblockWorkItem.mutateAsync({ id: workItemId, vehicleId });
  };

  const handleCancel = async () => {
    if (!selectedWorkItem || !cancelReason) return;
    await cancelWorkItem.mutateAsync({
      id: selectedWorkItem.id,
      vehicleId,
      reason: cancelReason,
    });
    setCancelModalOpen(false);
    setCancelReason('');
    setSelectedWorkItem(null);
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
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
            <Pause className="h-4 w-4 text-gray-600" />
            <div>
              <div className="text-2xl font-bold">{counters.onHold}</div>
              <div className="text-xs text-muted-foreground">{t('get_ready.work_items.status.on_hold')}</div>
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

      {/* Add Work Item Button */}
      <div className="flex gap-2 mb-4">
        <Button size="sm" onClick={() => setQuickAddModalOpen(true)} className="flex-1">
          <Plus className="h-4 w-4 mr-2" />
          {t('get_ready.work_items.add_work_item')}
        </Button>
      </div>

      {/* Work Items Grouped Table */}
      <div className="flex-1  pb-4">
        <WorkItemsGroupedTable
          workItems={workItems}
          onApprove={handleApprove}
          onDecline={(item) => {
            setSelectedWorkItem(item);
            setDeclineModalOpen(true);
          }}
          onStart={handleStart}
          onComplete={(item) => {
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
          onEdit={(item) => {
            setSelectedWorkItem(item);
            setEditModalOpen(true);
          }}
          onDelete={handleDelete}
          onNavigateToMedia={handleNavigateToMedia}
          onNavigateToNotes={handleNavigateToNotes}
          onPause={(item) => {
            setSelectedWorkItem(item);
            setPauseModalOpen(true);
          }}
          onResume={handleResume}
          onBlock={(item) => {
            setSelectedWorkItem(item);
            setBlockModalOpen(true);
          }}
          onUnblock={handleUnblock}
          onCancel={(item) => {
            setSelectedWorkItem(item);
            setCancelModalOpen(true);
          }}
          isLoading={isLoading}
        />
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
            <div>
              <Label htmlFor="assigned_technician">{t('get_ready.work_items.assigned_to')}</Label>
              <Input
                id="assigned_technician"
                value={newWorkItem.assigned_technician || ''}
                onChange={(e) => setNewWorkItem({ ...newWorkItem, assigned_technician: e.target.value })}
                placeholder={t('get_ready.work_items.assigned_to_placeholder')}
              />
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

      {/* Edit Work Item Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('get_ready.work_items.edit_title')}</DialogTitle>
            <DialogDescription>{t('get_ready.work_items.edit_description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_title">{t('get_ready.work_items.title')}</Label>
              <Input
                id="edit_title"
                value={selectedWorkItem?.title || ''}
                onChange={(e) => setSelectedWorkItem({ ...selectedWorkItem, title: e.target.value })}
                placeholder={t('get_ready.work_items.title_placeholder')}
              />
            </div>
            <div>
              <Label htmlFor="edit_description">{t('get_ready.work_items.description')}</Label>
              <Textarea
                id="edit_description"
                value={selectedWorkItem?.description || ''}
                onChange={(e) => setSelectedWorkItem({ ...selectedWorkItem, description: e.target.value })}
                placeholder={t('get_ready.work_items.description_placeholder')}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_work_type">{t('get_ready.work_items.work_type')}</Label>
                <Select
                  value={selectedWorkItem?.work_type || 'other'}
                  onValueChange={(value: WorkItemType) => setSelectedWorkItem({ ...selectedWorkItem, work_type: value })}
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
                <Label htmlFor="edit_priority">{t('get_ready.work_items.priority')}</Label>
                <Select
                  value={String(selectedWorkItem?.priority || 2)}
                  onValueChange={(value) => setSelectedWorkItem({ ...selectedWorkItem, priority: Number(value) })}
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
                <Label htmlFor="edit_estimated_cost">{t('get_ready.work_items.estimated_cost')}</Label>
                <Input
                  id="edit_estimated_cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={selectedWorkItem?.estimated_cost || 0}
                  onChange={(e) => setSelectedWorkItem({ ...selectedWorkItem, estimated_cost: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="edit_estimated_hours">{t('get_ready.work_items.estimated_hours')}</Label>
                <Input
                  id="edit_estimated_hours"
                  type="number"
                  min="0"
                  step="0.5"
                  value={selectedWorkItem?.estimated_hours || 0}
                  onChange={(e) => setSelectedWorkItem({ ...selectedWorkItem, estimated_hours: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit_assigned_technician">{t('get_ready.work_items.assigned_to')}</Label>
              <Input
                id="edit_assigned_technician"
                value={selectedWorkItem?.assigned_technician || ''}
                onChange={(e) => setSelectedWorkItem({ ...selectedWorkItem, assigned_technician: e.target.value })}
                placeholder={t('get_ready.work_items.assigned_to_placeholder')}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit_approval_required"
                checked={selectedWorkItem?.approval_required || false}
                onChange={(e) => setSelectedWorkItem({ ...selectedWorkItem, approval_required: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="edit_approval_required" className="cursor-pointer">
                {t('get_ready.work_items.approval_required')}
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              {t('common.actions.cancel')}
            </Button>
            <Button
              onClick={async () => {
                if (selectedWorkItem?.id) {
                  await updateWorkItem.mutateAsync({
                    id: selectedWorkItem.id,
                    title: selectedWorkItem.title,
                    description: selectedWorkItem.description,
                    work_type: selectedWorkItem.work_type,
                    priority: selectedWorkItem.priority,
                    estimated_cost: selectedWorkItem.estimated_cost,
                    estimated_hours: selectedWorkItem.estimated_hours,
                    assigned_technician: selectedWorkItem.assigned_technician,
                    approval_required: selectedWorkItem.approval_required,
                  });
                  setEditModalOpen(false);
                  setSelectedWorkItem(null);
                }
              }}
              disabled={updateWorkItem.isPending}
            >
              {updateWorkItem.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('common.action_buttons.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ✨ NEW: Pause Work Item Modal */}
      <Dialog open={pauseModalOpen} onOpenChange={setPauseModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('get_ready.work_items.pause_title')}</DialogTitle>
            <DialogDescription>{t('get_ready.work_items.pause_description')}</DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="pause_reason">{t('get_ready.work_items.pause_reason')}</Label>
            <Textarea
              id="pause_reason"
              value={pauseReason}
              onChange={(e) => setPauseReason(e.target.value)}
              placeholder={t('get_ready.work_items.pause_reason_placeholder')}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPauseModalOpen(false)}>
              {t('common.actions.cancel')}
            </Button>
            <Button onClick={handlePause} disabled={pauseWorkItem.isPending}>
              {pauseWorkItem.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('get_ready.work_items.pause')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ✨ NEW: Block Work Item Modal */}
      <Dialog open={blockModalOpen} onOpenChange={setBlockModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('get_ready.work_items.block_title')}</DialogTitle>
            <DialogDescription>{t('get_ready.work_items.block_description')}</DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="block_reason">{t('get_ready.work_items.block_reason')}</Label>
            <Textarea
              id="block_reason"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder={t('get_ready.work_items.block_reason_placeholder')}
              rows={3}
              required
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockModalOpen(false)}>
              {t('common.actions.cancel')}
            </Button>
            <Button onClick={handleBlock} disabled={blockWorkItem.isPending || !blockReason} variant="destructive">
              {blockWorkItem.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('get_ready.work_items.block')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ✨ NEW: Cancel Work Item Modal */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('get_ready.work_items.cancel_title')}</DialogTitle>
            <DialogDescription>{t('get_ready.work_items.cancel_description')}</DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="cancel_reason">{t('get_ready.work_items.cancel_reason')}</Label>
            <Textarea
              id="cancel_reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder={t('get_ready.work_items.cancel_reason_placeholder')}
              rows={3}
              required
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelModalOpen(false)}>
              {t('common.actions.cancel')}
            </Button>
            <Button onClick={handleCancel} disabled={cancelWorkItem.isPending || !cancelReason} variant="destructive">
              {cancelWorkItem.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('get_ready.work_items.cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Add Modal */}
      <QuickAddWorkItemModal
        vehicleId={vehicleId}
        open={quickAddModalOpen}
        onOpenChange={setQuickAddModalOpen}
        onCreateCustom={() => setCreateModalOpen(true)}
      />

      {/* Add from Templates Modal (kept for backward compatibility) */}
      <AddFromTemplatesModal
        vehicleId={vehicleId}
        open={templatesModalOpen}
        onOpenChange={setTemplatesModalOpen}
      />
    </div>
  );
}
