import { LiveWorkTimer } from '@/components/get-ready/LiveWorkTimer';
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
    CheckCheck,
    CheckCircle,
    Circle,
    Clock,
    DollarSign,
    Edit,
    Pause,
    Play,
    Trash2,
    User,
    XCircle,
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
}

interface WorkItemsGroupedTableProps {
  workItems: WorkItem[];
  onApprove: (id: string) => void;
  onDecline: (item: WorkItem) => void;
  onStart: (id: string) => void;
  onComplete: (item: WorkItem) => void;
  onEdit: (item: WorkItem) => void;
  onDelete: (id: string) => void;
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
  isLoading,
}: WorkItemsGroupedTableProps) {
  const { t } = useTranslation();

  // Group work items by status
  const groupedItems = {
    pending: workItems.filter((item) => item.status === 'pending'),
    in_progress: workItems.filter((item) => item.status === 'in_progress'),
    completed: workItems.filter((item) => item.status === 'completed'),
    declined: workItems.filter((item) => item.status === 'declined'),
  };

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
        return 'border-l-4 border-l-green-500 bg-green-50/50';
      case 'in_progress':
        return 'border-l-4 border-l-blue-500 bg-blue-50/50';
      case 'pending':
        return 'border-l-4 border-l-yellow-500 bg-yellow-50/50';
      case 'declined':
        return 'border-l-4 border-l-red-500 bg-red-50/50';
      default:
        return 'border-l-4 border-l-gray-500';
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

  const renderWorkItem = (item: WorkItem) => (
    <TableRow
      key={item.id}
      className={cn('hover:bg-muted/50 transition-colors', getStatusColor(item.status))}
    >
      {/* Title & Description */}
      <TableCell className="min-w-[200px]">
        <div className="flex items-start gap-2">
          {getStatusIcon(item.status)}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm line-clamp-1">{item.title}</span>
              {item.approval_required && !item.approval_status && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-xs">
                  {t('get_ready.work_items.approval_required')}
                </Badge>
              )}
              {item.approval_status === 'approved' && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs">
                  {t('get_ready.approvals.status.approved')}
                </Badge>
              )}
            </div>
            {item.description && (
              <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                {item.description}
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
        {(item.assigned_technician_profile || (item as any).assigned_to) && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span className="truncate max-w-[120px]">
              {item.assigned_technician_profile
                ? `${item.assigned_technician_profile.first_name} ${item.assigned_technician_profile.last_name}`
                : (item as any).assigned_to
              }
            </span>
          </div>
        )}
      </TableCell>

      {/* Timer */}
      <TableCell className="hidden xl:table-cell">
        {item.status === 'in_progress' && item.actual_start && (
          <LiveWorkTimer startTime={item.actual_start} size="sm" showStopButton={false} />
        )}
      </TableCell>

      {/* Quick Actions */}
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          {/* Approval Actions - IMPROVED VISIBILITY */}
          {item.approval_required && !item.approval_status && (
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

          {/* Start Action */}
          {item.status === 'pending' && !item.approval_required && (
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

          {/* Complete Action */}
          {item.status === 'in_progress' && (
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
          )}

          {/* Edit Action */}
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

          {/* Delete Action */}
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
              <TooltipContent>{t('get_ready.actions.delete')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
          {getStatusIcon(status)}
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
                <TableHead className="hidden xl:table-cell w-[100px]">Timer</TableHead>
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
      {/* Render groups in order: pending, in_progress, declined, completed */}
      {renderGroup('pending', groupedItems.pending, t('get_ready.work_items.status.pending'))}
      {renderGroup('in_progress', groupedItems.in_progress, t('get_ready.work_items.status.in_progress'))}
      {renderGroup('declined', groupedItems.declined, t('get_ready.work_items.status.declined'))}
      {renderGroup('completed', groupedItems.completed, t('get_ready.work_items.status.completed'))}

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
