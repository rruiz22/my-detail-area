import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  usePendingApprovals,
  useApprovalSummary,
  useApproveVehicle,
  useRejectVehicle,
  useBulkApproveVehicles
} from '@/hooks/useGetReadyApprovals';
import { useApproveWorkItem, useDeclineWorkItem } from '@/hooks/useVehicleWorkItems';
import {
  Search,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCheck,
  Filter,
  ArrowRight,
  User,
  Calendar,
  Wrench,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';

type FilterType = 'all' | 'vehicles' | 'work_items' | 'critical';
type SortBy = 'oldest' | 'newest' | 'priority' | 'cost';

export function GetReadyApprovalsTab() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Data hooks
  const { data: pendingVehicles = [], isLoading } = usePendingApprovals();
  const { data: summary } = useApprovalSummary();

  // Mutation hooks
  const approveVehicle = useApproveVehicle();
  const rejectVehicle = useRejectVehicle();
  const approveWorkItem = useApproveWorkItem();
  const declineWorkItem = useDeclineWorkItem();
  const bulkApprove = useBulkApproveVehicles();

  // UI State
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortBy>('oldest');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Modal states
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');

  // Extract work items needing approval
  const pendingWorkItems = useMemo(() => {
    return pendingVehicles.flatMap(vehicle =>
      (vehicle.work_items || [])
        .filter(item => item.approval_required && !item.approval_status)
        .map(item => ({
          ...item,
          vehicle_id: vehicle.id,
          vehicle_stock_number: vehicle.stock_number,
          vehicle_info: `${vehicle.vehicle_year || ''} ${vehicle.vehicle_make || ''} ${vehicle.vehicle_model || ''}`.trim(),
          vehicle_step: vehicle.current_step_name,
          vehicle_step_color: vehicle.current_step_color
        }))
    );
  }, [pendingVehicles]);

  // Combined approval queue (vehicles + work items)
  const approvalQueue = useMemo(() => {
    const items: any[] = [];

    // Add vehicles requiring approval
    if (filterType === 'all' || filterType === 'vehicles') {
      pendingVehicles
        .filter(v => v.requires_approval === true && v.approval_status === 'pending' && !v.approved_by)
        .forEach(vehicle => {
          items.push({
            type: 'vehicle',
            id: vehicle.id,
            vehicle: vehicle,
            priority: vehicle.priority_score || 0,
            created_at: vehicle.intake_date,
            isCritical: vehicle.escalation_level >= 2
          });
        });
    }

    // Add work items requiring approval
    if (filterType === 'all' || filterType === 'work_items') {
      pendingWorkItems.forEach(item => {
        items.push({
          type: 'work_item',
          id: item.id,
          workItem: item,
          priority: item.priority || 0,
          created_at: item.created_at || new Date().toISOString(),
          isCritical: false
        });
      });
    }

    return items;
  }, [pendingVehicles, pendingWorkItems, filterType]);

  // Filter by search (vehicles + work items)
  const filteredQueue = useMemo(() => {
    let filtered = approvalQueue;

    if (search) {
      filtered = filtered.filter(item => {
        if (item.type === 'vehicle') {
          const v = item.vehicle;
          return (
            v.stock_number.toLowerCase().includes(search.toLowerCase()) ||
            v.vin.toLowerCase().includes(search.toLowerCase()) ||
            v.vehicle_make?.toLowerCase().includes(search.toLowerCase()) ||
            v.vehicle_model?.toLowerCase().includes(search.toLowerCase())
          );
        } else {
          const wi = item.workItem;
          return (
            wi.title.toLowerCase().includes(search.toLowerCase()) ||
            wi.description?.toLowerCase().includes(search.toLowerCase()) ||
            wi.vehicle_stock_number.toLowerCase().includes(search.toLowerCase())
          );
        }
      });
    }

    if (filterType === 'critical') {
      filtered = filtered.filter(item => item.isCritical);
    }

    return filtered;
  }, [approvalQueue, search, filterType]);

  // Sort queue
  const sortedQueue = useMemo(() => {
    return [...filteredQueue].sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'priority':
          return b.priority - a.priority;
        case 'cost':
          if (a.type === 'vehicle' && b.type === 'vehicle') {
            return (b.vehicle.total_holding_cost || 0) - (a.vehicle.total_holding_cost || 0);
          }
          if (a.type === 'work_item' && b.type === 'work_item') {
            return (b.workItem.estimated_cost || 0) - (a.workItem.estimated_cost || 0);
          }
          return 0;
        default:
          return 0;
      }
    });
  }, [filteredQueue, sortBy]);

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === sortedQueue.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(sortedQueue.map(item => item.id)));
    }
  };

  // Approval handlers
  const handleApproveVehicle = async (vehicleId: string, notes?: string) => {
    await approveVehicle.mutateAsync({ vehicleId, notes });
    setSelectedItems(prev => {
      const next = new Set(prev);
      next.delete(vehicleId);
      return next;
    });
  };

  const handleApproveWorkItem = async (workItemId: string, vehicleId: string) => {
    await approveWorkItem.mutateAsync({ id: workItemId, vehicleId });
    setSelectedItems(prev => {
      const next = new Set(prev);
      next.delete(workItemId);
      return next;
    });
  };

  const handleReject = (item: any) => {
    setSelectedItem(item);
    setRejectDialogOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedItem || !rejectReason.trim()) return;

    if (selectedItem.type === 'vehicle') {
      await rejectVehicle.mutateAsync({
        vehicleId: selectedItem.id,
        reason: rejectReason,
        notes: rejectNotes
      });
    } else {
      await declineWorkItem.mutateAsync({
        id: selectedItem.id,
        vehicleId: selectedItem.workItem.vehicle_id,
        reason: rejectReason
      });
    }

    setRejectDialogOpen(false);
    setRejectReason('');
    setRejectNotes('');
    setSelectedItem(null);
    setSelectedItems(prev => {
      const next = new Set(prev);
      next.delete(selectedItem.id);
      return next;
    });
  };

  const handleBulkApprove = async () => {
    // Approve vehicles
    const vehicleIds = sortedQueue
      .filter(item => item.type === 'vehicle' && selectedItems.has(item.id))
      .map(item => item.id);

    if (vehicleIds.length > 0) {
      await bulkApprove.mutateAsync({ vehicleIds });
    }

    // Approve work items individually
    const workItemPromises = sortedQueue
      .filter(item => item.type === 'work_item' && selectedItems.has(item.id))
      .map(item => handleApproveWorkItem(item.id, item.workItem.vehicle_id));

    await Promise.all(workItemPromises);

    setSelectedItems(new Set());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin">⏳</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      {/* Header with Summary */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {t('get_ready.approvals.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('get_ready.approvals.description')}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('get_ready.approvals.pending')}
                </p>
                <p className="text-2xl font-semibold">{summary?.total_pending || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-50">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('get_ready.approvals.approved_today')}
                </p>
                <p className="text-2xl font-semibold text-emerald-600">
                  {summary?.total_approved_today || 0}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('get_ready.approvals.rejected_today')}
                </p>
                <p className="text-2xl font-semibold text-red-600">
                  {summary?.total_rejected_today || 0}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-red-50">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('get_ready.approvals.critical')}
                </p>
                <p className="text-2xl font-semibold text-red-600">
                  {summary?.pending_critical || 0}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-red-50">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('get_ready.approvals.oldest_pending')}
                </p>
                <p className="text-2xl font-semibold">
                  {summary?.oldest_pending_days || 0}
                  <span className="text-sm font-normal text-muted-foreground ml-1">days</span>
                </p>
              </div>
              <div className="p-3 rounded-lg bg-gray-100">
                <Calendar className="h-5 w-5 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions */}
      <Card className="border-none shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('get_ready.approvals.search_placeholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filter Type */}
            <Select value={filterType} onValueChange={(value: FilterType) => setFilterType(value)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="vehicles">Vehicles Only</SelectItem>
                <SelectItem value="work_items">Work Items Only</SelectItem>
                <SelectItem value="critical">Critical Only</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={(value: SortBy) => setSortBy(value)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="oldest">{t('get_ready.approvals.sort.oldest')}</SelectItem>
                <SelectItem value="newest">{t('get_ready.approvals.sort.newest')}</SelectItem>
                <SelectItem value="priority">{t('get_ready.approvals.sort.priority')}</SelectItem>
                <SelectItem value="cost">{t('get_ready.approvals.sort.cost')}</SelectItem>
              </SelectContent>
            </Select>

            {/* Bulk Actions */}
            {selectedItems.size > 0 && (
              <div className="flex gap-2">
                <Button
                  onClick={handleBulkApprove}
                  disabled={bulkApprove.isPending}
                  size="sm"
                >
                  <CheckCheck className="h-4 w-4 mr-2" />
                  {t('get_ready.approvals.approve_selected')} ({selectedItems.size})
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Approval Queue */}
      {sortedQueue.length === 0 ? (
        <Card className="border-none shadow-sm">
          <CardContent className="p-12">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-emerald-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {t('get_ready.approvals.no_pending')}
              </h3>
              <p className="text-muted-foreground">
                {t('get_ready.approvals.all_caught_up')}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Select All */}
          <div className="flex items-center gap-2 px-2">
            <Checkbox
              checked={selectedItems.size === sortedQueue.length}
              onCheckedChange={handleSelectAll}
              id="select-all"
            />
            <label
              htmlFor="select-all"
              className="text-sm font-medium cursor-pointer"
            >
              {t('get_ready.approvals.select_all')} ({sortedQueue.length})
            </label>
          </div>

          {/* Approval Cards */}
          {sortedQueue.map(item => (
            <ApprovalQueueCard
              key={item.id}
              item={item}
              selected={selectedItems.has(item.id)}
              onToggleSelect={() => handleToggleSelect(item.id)}
              onApprove={
                item.type === 'vehicle'
                  ? () => handleApproveVehicle(item.id)
                  : () => handleApproveWorkItem(item.id, item.workItem.vehicle_id)
              }
              onReject={() => handleReject(item)}
              onViewDetails={() => {
                if (item.type === 'vehicle') {
                  navigate(`/get-ready/details?vehicle=${item.id}`);
                } else {
                  navigate(`/get-ready/details?vehicle=${item.workItem.vehicle_id}`);
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('get_ready.approvals.reject_dialog.title')}</DialogTitle>
            <DialogDescription>
              {selectedItem?.type === 'vehicle'
                ? t('get_ready.approvals.reject_dialog.vehicle_description')
                : t('get_ready.approvals.reject_dialog.work_item_description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="reject-reason" className="text-sm font-medium">
                {t('get_ready.approvals.reject_dialog.reason')} <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reject-reason"
                placeholder={t('get_ready.approvals.reject_dialog.reason_placeholder')}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="reject-notes" className="text-sm font-medium">
                {t('get_ready.approvals.reject_dialog.additional_notes')}
              </Label>
              <Textarea
                id="reject-notes"
                placeholder={t('get_ready.approvals.reject_dialog.notes_placeholder')}
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                rows={2}
                className="mt-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmReject}
              disabled={!rejectReason.trim() || rejectVehicle.isPending || declineWorkItem.isPending}
            >
              {t('get_ready.approvals.reject_dialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =====================================================
// APPROVAL QUEUE CARD COMPONENT
// =====================================================

interface ApprovalQueueCardProps {
  item: any;
  selected: boolean;
  onToggleSelect: () => void;
  onApprove: () => void;
  onReject: () => void;
  onViewDetails: () => void;
}

function ApprovalQueueCard({
  item,
  selected,
  onToggleSelect,
  onApprove,
  onReject,
  onViewDetails
}: ApprovalQueueCardProps) {
  const { t } = useTranslation();
  const isVehicle = item.type === 'vehicle';
  const data = isVehicle ? item.vehicle : item.workItem;

  return (
    <Card className={cn(
      'border-none shadow-sm hover:shadow-md transition-all',
      selected && 'ring-2 ring-primary',
      item.isCritical && 'border-l-4 border-l-red-500'
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Checkbox */}
          <Checkbox
            checked={selected}
            onCheckedChange={onToggleSelect}
            className="mt-1"
          />

          {/* Content */}
          <div className="flex-1 space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    {isVehicle ? (
                      <><Wrench className="h-3 w-3 mr-1" />{t('get_ready.approvals.type.vehicle')}</>
                    ) : (
                      <><Wrench className="h-3 w-3 mr-1" />{t('get_ready.approvals.type.work_item')}</>
                    )}
                  </Badge>

                  {item.isCritical && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {t('get_ready.approvals.critical')}
                    </Badge>
                  )}
                </div>

                {isVehicle ? (
                  <h3 className="font-semibold">
                    {data.stock_number} - {data.vehicle_year} {data.vehicle_make} {data.vehicle_model}
                  </h3>
                ) : (
                  <div>
                    <h3 className="font-semibold">{data.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Vehicle: {data.vehicle_stock_number} - {data.vehicle_info}
                    </p>
                  </div>
                )}
              </div>

              <div className="text-right text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
              </div>
            </div>

            {/* Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {isVehicle ? (
                <>
                  <div className="flex items-center gap-2">
                    <Badge
                      className="text-xs"
                      style={{ backgroundColor: data.current_step_color }}
                    >
                      {data.current_step_name}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span>${data.total_holding_cost?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{data.days_in_step} days</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Wrench className="h-4 w-4" />
                    <span>{data.work_items?.length || 0} items</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs">
                      {data.work_type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span>${data.estimated_cost?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{data.estimated_hours || 0}h</span>
                  </div>
                  <div>
                    <Badge
                      className="text-xs"
                      style={{ backgroundColor: data.vehicle_step_color }}
                    >
                      {data.vehicle_step}
                    </Badge>
                  </div>
                </>
              )}
            </div>

            {data.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {data.description}
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t">
              <Button
                size="sm"
                onClick={onApprove}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {t('get_ready.approvals.actions.approve')}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={onReject}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4 mr-2" />
                {t('get_ready.approvals.actions.reject')}
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={onViewDetails}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                {t('get_ready.approvals.actions.view_details')}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
