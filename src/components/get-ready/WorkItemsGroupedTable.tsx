import { LiveWorkTimer } from '@/components/get-ready/LiveWorkTimer';
import { WorkItemStatusBadge, getStatusColor } from '@/components/get-ready/WorkItemStatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { WorkItemStatus } from '@/hooks/useVehicleWorkItems';
import { cn } from '@/lib/utils';
import {
    AlertTriangle,
    Ban,
    CheckCheck,
    CheckCircle,
    Clock,
    DollarSign,
    Edit,
    FileText,
    Image,
    Pause,
    Play,
    RotateCcw,
    Trash2,
    Unlock,
    User,
    XCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface WorkItem {
  id: string;
  title: string;
  description?: string;
  status: WorkItemStatus;
  work_type: string;
  priority: number;
  estimated_cost: number;
  estimated_hours: number;
  actual_cost?: number;
  actual_hours?: number;
  actual_start?: string;
  approval_required: boolean;
  approval_status?: boolean;
  decline_reason?: string;
  assigned_technician_profile?: {
    first_name: string;
    last_name: string;
  };
  media_count?: number;
  notes_count?: number;
  // ✨ NEW: Phase 1 - Add missing status reason fields
  blocked_reason?: string;
  on_hold_reason?: string;
  cancel_reason?: string;
}

interface WorkItemsGroupedTableProps {
  workItems: WorkItem[];
  onApprove: (id: string) => void;
  onDecline: (item: WorkItem) => void;
  onStart: (id: string) => void;
  onComplete: (item: WorkItem) => void;
  onEdit: (item: WorkItem) => void;
  onDelete: (id: string) => void;
  onNavigateToMedia?: (workItemId: string) => void;
  onNavigateToNotes?: (workItemId: string) => void;
  // ✨ NEW: Additional action handlers for new statuses
  onPause?: (item: WorkItem) => void;
  onResume?: (id: string) => void;
  onBlock?: (item: WorkItem) => void;
  onUnblock?: (id: string) => void;
  onCancel?: (item: WorkItem) => void;
  isLoading?: boolean;
}

export function WorkItemsGroupedTable({
  workItems,
  onApprove,
  onDecline,
  onStart,
  onComplete,
  onEdit,
  onDelete,
  onNavigateToMedia,
  onNavigateToNotes,
  // ✨ NEW: Destructure new action handlers
  onPause,
  onResume,
  onBlock,
  onUnblock,
  onCancel,
  isLoading,
}: WorkItemsGroupedTableProps) {
  const { t } = useTranslation();

  // ✨ Group work items by status (simplified workflow - no 'ready' or 'queued')
  const groupedItems = {
    // Pre-Work Phase
    pending: workItems.filter((item) => item.status === 'pending' || item.status === 'queued'), // Map 'queued' to 'pending'
    awaiting_approval: workItems.filter((item) => item.status === 'awaiting_approval'),
    rejected: workItems.filter((item) => item.status === 'rejected'),
    scheduled: workItems.filter((item) => item.status === 'scheduled'),

    // Execution Phase
    in_progress: workItems.filter((item) => item.status === 'in_progress'),
    on_hold: workItems.filter((item) => item.status === 'on_hold'),
    blocked: workItems.filter((item) => item.status === 'blocked'),

    // Completion Phase
    completed: workItems.filter((item) => item.status === 'completed'),
    cancelled: workItems.filter((item) => item.status === 'cancelled'),
  };


  // ✨ NEW: Use imported getStatusColor helper for border colors
  const getStatusBorderColor = (status: WorkItemStatus) => {
    // Map 'queued' to 'pending' for display purposes
    const displayStatus = status === 'queued' ? 'pending' : status;
    const config = getStatusColor(displayStatus);
    return `border-l-4 ${config.borderColor.replace('border-', 'border-l-')} ${config.bgColor}`;
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

  const renderWorkItem = (item: WorkItem) => (
    <TableRow
      key={item.id}
      className={cn('hover:bg-muted/50 transition-colors', getStatusBorderColor(item.status))}
    >
      {/* Title & Description */}
      <TableCell className="min-w-[200px]">
        <div className="flex items-start gap-2">
          {/* ✨ NEW: Use WorkItemStatusBadge component */}
          <div className="pt-0.5">
            <WorkItemStatusBadge
              status={item.status === 'queued' ? 'pending' : item.status}
              size="sm"
              showIcon={true}
            />
          </div>
          <div className="flex-1 min-w-0">
            {/* ✨ ENHANCED: Title with inline timer and badges */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="font-medium text-sm line-clamp-1">{item.title}</span>

                {/* Show reason badges for special states */}
                {item.status === 'blocked' && item.blocked_reason && (
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300 text-xs">
                    {t('get_ready.work_items.status.blocked')}: {item.blocked_reason}
                  </Badge>
                )}
                {item.status === 'on_hold' && item.on_hold_reason && (
                  <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300 text-xs">
                    {t('get_ready.work_items.status.on_hold')}: {item.on_hold_reason}
                  </Badge>
                )}
              </div>

              {/* ✨ NEW: Timer always visible for in_progress items */}
              {item.status === 'in_progress' && item.actual_start && (
                <div className="flex-shrink-0">
                  <LiveWorkTimer
                    startTime={item.actual_start}
                    size="sm"
                    showStopButton={false}
                  />
                </div>
              )}

              {/* ✨ NEW: Final time for completed items */}
              {item.status === 'completed' && item.actual_hours && (
                <Badge
                  variant="outline"
                  className="bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 font-mono text-xs flex-shrink-0"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {item.actual_hours.toFixed(1)}h
                </Badge>
              )}

              {/* ✨ NEW: Elapsed time for on_hold/blocked (if has actual_start) */}
              {(item.status === 'on_hold' || item.status === 'blocked') && item.actual_start && (
                <Badge
                  variant="outline"
                  className={cn(
                    "font-mono text-xs flex-shrink-0",
                    item.status === 'on_hold'
                      ? "bg-gray-50 dark:bg-gray-950/30 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800"
                      : "bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800"
                  )}
                >
                  {item.status === 'on_hold' ? (
                    <Pause className="h-3 w-3 mr-1" />
                  ) : (
                    <AlertTriangle className="h-3 w-3 mr-1" />
                  )}
                  {/* Calculate elapsed from actual_start to now */}
                  {(() => {
                    const start = new Date(item.actual_start);
                    const now = new Date();
                    const hours = (now.getTime() - start.getTime()) / (1000 * 60 * 60);
                    return hours.toFixed(1);
                  })()}h
                </Badge>
              )}
            </div>
            {item.description && (
              <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                {item.description}
              </div>
            )}
            {/* Media/Notes Count Badges - Clickeable */}
            {((item.media_count ?? 0) > 0 || (item.notes_count ?? 0) > 0) && (
              <div className="flex items-center gap-1.5 mt-1.5">
                {(item.media_count ?? 0) > 0 && (
                  <Badge
                    variant="secondary"
                    className="text-xs bg-purple-100 text-purple-700 gap-1 cursor-pointer hover:bg-purple-200 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigateToMedia?.(item.id);
                    }}
                    title={t('get_ready.work_items.view_media')}
                  >
                    <Image className="h-3 w-3" />
                    {item.media_count}
                  </Badge>
                )}
                {(item.notes_count ?? 0) > 0 && (
                  <Badge
                    variant="secondary"
                    className="text-xs bg-blue-100 text-blue-700 gap-1 cursor-pointer hover:bg-blue-200 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigateToNotes?.(item.id);
                    }}
                    title={t('get_ready.work_items.view_notes')}
                  >
                    <FileText className="h-3 w-3" />
                    {item.notes_count}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </TableCell>

      {/* Type & Priority */}
      <TableCell className="hidden sm:table-cell">
        <div className="flex flex-col gap-1">
          <Badge variant="outline" className="text-xs capitalize w-fit">
            {t(`get_ready.work_items.type.${item.work_type}`)}
          </Badge>
          <Badge variant="outline" className={cn('text-xs capitalize w-fit', getPriorityLabel(item.priority).color)}>
            {getPriorityLabel(item.priority).label}
          </Badge>
        </div>
      </TableCell>

      {/* Cost & Hours */}
      <TableCell className="hidden md:table-cell">
        <div className="flex flex-col gap-1 text-xs">
          {item.estimated_cost > 0 && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              <span>${item.estimated_cost.toFixed(2)}</span>
            </div>
          )}
          {item.estimated_hours > 0 && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{item.estimated_hours}h</span>
            </div>
          )}
        </div>
      </TableCell>

      {/* Assigned */}
      <TableCell className="hidden lg:table-cell">
        {item.assigned_technician_profile && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span className="truncate max-w-[120px]">
              {`${item.assigned_technician_profile.first_name} ${item.assigned_technician_profile.last_name}`}
            </span>
          </div>
        )}
      </TableCell>

      {/* ❌ REMOVED: Timer column (now inline with title) */}

      {/* Quick Actions */}
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          {/* ✨ NEW: Contextual Actions Based on Status */}

          {/* Approval Actions - awaiting_approval status */}
          {item.status === 'awaiting_approval' && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-300"
                onClick={() => onApprove(item.id)}
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">{t('get_ready.work_items.approve')}</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-300"
                onClick={() => onDecline(item)}
              >
                <XCircle className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">{t('get_ready.work_items.decline')}</span>
              </Button>
            </>
          )}

          {/* Start Action - pending or rejected status */}
          {(item.status === 'pending' || item.status === 'rejected') && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    onClick={() => onStart(item.id)}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-center">
                    <div className="font-semibold">{t('get_ready.work_items.start')}</div>
                    <div className="text-xs text-muted-foreground">Pending → In Progress</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* In Progress Actions - pause, block, complete */}
          {item.status === 'in_progress' && (
            <>
              {/* Pause Action */}
              {onPause && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                        onClick={() => onPause(item)}
                      >
                        <Pause className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-center">
                        <div className="font-semibold">{t('get_ready.work_items.pause')}</div>
                        <div className="text-xs text-muted-foreground">In Progress → On Hold</div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Block Action */}
              {onBlock && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                        onClick={() => onBlock(item)}
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-center">
                        <div className="font-semibold">{t('get_ready.work_items.block')}</div>
                        <div className="text-xs text-muted-foreground">In Progress → Blocked</div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Complete Action */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                      onClick={() => onComplete(item)}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-center">
                      <div className="font-semibold">{t('get_ready.work_items.complete')}</div>
                      <div className="text-xs text-muted-foreground">In Progress → Completed</div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}

          {/* Resume Action - on_hold status */}
          {item.status === 'on_hold' && onResume && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    onClick={() => onResume(item.id)}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-center">
                    <div className="font-semibold">{t('get_ready.work_items.resume')}</div>
                    <div className="text-xs text-muted-foreground">On Hold → In Progress</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Unblock Action - blocked status */}
          {item.status === 'blocked' && onUnblock && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    onClick={() => onUnblock(item.id)}
                  >
                    <Unlock className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-center">
                    <div className="font-semibold">{t('get_ready.work_items.unblock')}</div>
                    <div className="text-xs text-muted-foreground">Blocked → In Progress</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Edit Action - available for all non-completed/cancelled */}
          {item.status !== 'completed' && item.status !== 'cancelled' && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => onEdit(item)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('get_ready.actions.edit')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Cancel Action - available for all pre-completion statuses */}
          {item.status !== 'completed' && item.status !== 'cancelled' && onCancel && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => onCancel(item)}
                  >
                    <Ban className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('get_ready.work_items.cancel')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Delete Action - pending, completed, cancelled or rejected */}
          {(item.status === 'pending' || item.status === 'completed' || item.status === 'cancelled' || item.status === 'rejected') && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => onDelete(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-center">
                    <div className="font-semibold">{t('get_ready.work_items.delete')}</div>
                    <div className="text-xs text-muted-foreground">{t('get_ready.work_items.delete_description')}</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </TableCell>
    </TableRow>
  );

  const renderGroup = (status: WorkItemStatus, items: WorkItem[], groupLabel: string) => {
    if (items.length === 0) return null;

    return (
      <div key={status} className="mb-6">
        {/* Group Header */}
        <div className="flex items-center gap-2 mb-2 px-2">
          <WorkItemStatusBadge status={status} size="sm" showIcon={true} />
          <h3 className="font-semibold text-sm">
            {groupLabel}
          </h3>
          <Badge variant="secondary" className="text-xs">
            {items.length}
          </Badge>
        </div>

        {/* Group Table */}
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[200px]">Work Item</TableHead>
                <TableHead className="hidden sm:table-cell w-[140px]">Type & Priority</TableHead>
                <TableHead className="hidden md:table-cell w-[100px]">Cost & Hours</TableHead>
                <TableHead className="hidden lg:table-cell w-[120px]">Assigned</TableHead>
                {/* ❌ REMOVED: Timer column (now inline with title) */}
                <TableHead className="text-right w-[180px]">{t('get_ready.actions.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => renderWorkItem(item))}
            </TableBody>
          </Table>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* ✨ Render groups in logical workflow order (pre-work → execution → completion) */}

      {/* Pre-Work Phase - Simplified workflow */}
      {renderGroup('awaiting_approval', groupedItems.awaiting_approval, t('get_ready.work_items.status.awaiting_approval'))}
      {renderGroup('pending', groupedItems.pending, t('get_ready.work_items.status.pending'))}
      {renderGroup('rejected', groupedItems.rejected, t('get_ready.work_items.status.rejected'))}
      {renderGroup('scheduled', groupedItems.scheduled, t('get_ready.work_items.status.scheduled'))}

      {/* Execution Phase */}
      {renderGroup('in_progress', groupedItems.in_progress, t('get_ready.work_items.status.in_progress'))}
      {renderGroup('on_hold', groupedItems.on_hold, t('get_ready.work_items.status.on_hold'))}
      {renderGroup('blocked', groupedItems.blocked, t('get_ready.work_items.status.blocked'))}

      {/* Completion Phase */}
      {renderGroup('completed', groupedItems.completed, t('get_ready.work_items.status.completed'))}
      {renderGroup('cancelled', groupedItems.cancelled, t('get_ready.work_items.status.cancelled'))}

      {/* Empty State */}
      {workItems.length === 0 && !isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <div className="text-sm">{t('get_ready.work_items.no_items')}</div>
        </div>
      )}
    </div>
  );
}
