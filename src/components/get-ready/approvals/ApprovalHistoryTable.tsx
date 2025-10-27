import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useApprovalFilters } from '@/hooks/useApprovalFilters';
import { useApprovalHistory } from '@/hooks/useApprovalHistory';
import { cn } from '@/lib/utils';
import type { ApprovalHistoryItem } from '@/types/approvals';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface ExpandedRowProps {
  item: ApprovalHistoryItem;
}

function ExpandedRow({ item }: ExpandedRowProps) {
  return (
    <TableRow>
      <TableCell colSpan={7} className="bg-muted/30 p-4">
        <div className="space-y-3">
          {/* Work Items */}
          {item.work_items.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Work Items ({item.work_items.length})</h4>
              <div className="space-y-1">
                {item.work_items.map(wi => (
                  <div key={wi.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {wi.title} ({wi.work_type})
                    </span>
                    <span className="font-medium">
                      ${wi.estimated_cost.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes or Rejection Reason */}
          {item.notes && (
            <div>
              <h4 className="text-sm font-medium mb-1">Approval Notes</h4>
              <p className="text-sm text-muted-foreground">{item.notes}</p>
            </div>
          )}
          {item.rejection_reason && (
            <div>
              <h4 className="text-sm font-medium mb-1">Rejection Reason</h4>
              <p className="text-sm text-destructive">{item.rejection_reason}</p>
            </div>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

export function ApprovalHistoryTable() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: historyData = [], isLoading } = useApprovalHistory();
  const { pageSize, setPageSize, currentPage, setCurrentPage, sortBy, sortOrder, setSortBy, setSortOrder } = useApprovalFilters();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  // Sort data
  const sortedData = [...historyData].sort((a, b) => {
    let aVal: any;
    let bVal: any;

    switch (sortBy) {
      case 'date':
        aVal = new Date(a.action_date).getTime();
        bVal = new Date(b.action_date).getTime();
        break;
      case 'vehicle':
        aVal = a.stock_number;
        bVal = b.stock_number;
        break;
      case 'status':
        aVal = a.approval_status;
        bVal = b.approval_status;
        break;
      case 'approver':
        aVal = a.approver_name;
        bVal = b.approver_name;
        break;
      case 'cost':
        aVal = a.estimated_cost;
        bVal = b.estimated_cost;
        break;
      case 'time':
        aVal = a.time_to_approval_hours;
        bVal = b.time_to_approval_hours;
        break;
      default:
        aVal = a.action_date;
        bVal = b.action_date;
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  // Paginate data
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = sortedData.slice(startIndex, endIndex);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatTime = (hours: number) => {
    if (hours < 24) {
      return `${Math.round(hours)}h`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  };

  const SortIcon = ({ column }: { column: typeof sortBy }) => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? (
      <ChevronUp className="inline h-4 w-4 ml-1" />
    ) : (
      <ChevronDown className="inline h-4 w-4 ml-1" />
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            {t('get_ready.approvals.history.title') || 'Approval History'}
          </CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {sortedData.length} {sortedData.length === 1 ? 'record' : 'records'}
            </span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => setPageSize(Number(value) as 25 | 50 | 100)}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25 / page</SelectItem>
                <SelectItem value="50">50 / page</SelectItem>
                <SelectItem value="100">100 / page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sortedData.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {t('get_ready.approvals.history.no_data') || 'No approval history found'}
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('date')}
                    >
                      Date <SortIcon column="date" />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('vehicle')}
                    >
                      Vehicle <SortIcon column="vehicle" />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('status')}
                    >
                      Status <SortIcon column="status" />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('approver')}
                    >
                      Approver <SortIcon column="approver" />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('cost')}
                    >
                      Cost <SortIcon column="cost" />
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('time')}
                    >
                      Time <SortIcon column="time" />
                    </TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((item) => (
                    <React.Fragment key={item.id}>
                      <TableRow className={cn(expandedRows.has(item.id) && "border-b-0")}>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRow(item.id)}
                            className="h-8 w-8 p-0"
                          >
                            {expandedRows.has(item.id) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">
                          {format(new Date(item.action_date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{item.stock_number}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.vehicle_year} {item.vehicle_make} {item.vehicle_model}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={item.approval_status === 'approved' ? 'default' : 'destructive'}
                            className={cn(
                              item.approval_status === 'approved' && 'bg-green-600 hover:bg-green-700'
                            )}
                          >
                            {item.approval_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {item.approver_name}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(item.estimated_cost)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatTime(item.time_to_approval_hours)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              navigate(`/get-ready/details?vehicle=${item.vehicle_id}`);
                            }}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                      {expandedRows.has(item.id) && <ExpandedRow item={item} />}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(endIndex, sortedData.length)} of {sortedData.length}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="text-sm">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
