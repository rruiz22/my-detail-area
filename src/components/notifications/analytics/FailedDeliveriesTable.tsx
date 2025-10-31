/**
 * FailedDeliveriesTable Component
 * DataTable for failed notification debugging
 */

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { MoreVertical, RefreshCw, Eye, Download, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { exportToCSV } from '@/lib/notification-analytics';
import type { FailedDelivery } from '@/types/notification-analytics';

interface FailedDeliveriesTableProps {
  data: FailedDelivery[];
  loading?: boolean;
  onRetry?: (id: string) => Promise<void>;
  onViewDetails?: (delivery: FailedDelivery) => void;
}

export const FailedDeliveriesTable: React.FC<FailedDeliveriesTableProps> = ({
  data,
  loading,
  onRetry,
  onViewDetails,
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<keyof FailedDelivery>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());

  // Filter and sort data
  const filteredData = useMemo(() => {
    let filtered = data;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.user_email?.toLowerCase().includes(query) ||
          item.user_name?.toLowerCase().includes(query) ||
          item.error_message?.toLowerCase().includes(query) ||
          item.provider?.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (aValue === undefined || bValue === undefined) return 0;

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [data, searchQuery, sortColumn, sortDirection]);

  const handleSort = (column: keyof FailedDelivery) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const handleRetry = async (id: string) => {
    if (!onRetry) return;

    setRetryingIds((prev) => new Set(prev).add(id));
    try {
      await onRetry(id);
    } finally {
      setRetryingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleExport = () => {
    const exportData = filteredData.map((item) => ({
      User: item.user_name || item.user_email || item.user_id,
      Channel: item.channel,
      Provider: item.provider,
      Error: item.error_message,
      'Error Code': item.error_code || 'N/A',
      'Retry Count': item.retry_count,
      Created: new Date(item.created_at).toLocaleString(),
      'Last Retry': item.last_retry_at
        ? new Date(item.last_retry_at).toLocaleString()
        : 'Never',
    }));

    exportToCSV(exportData, `failed-deliveries-${new Date().toISOString()}`);
  };

  if (loading) {
    return (
      <Card className="card-enhanced">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-64 animate-pulse mt-2"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-enhanced">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t('notifications.analytics.charts.failed_deliveries')}</CardTitle>
            <CardDescription>
              {t('notifications.analytics.charts.failed_deliveries_description')}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              {t('common.action_buttons.export_csv')}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={t('notifications.analytics.search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('created_at')}
                >
                  {t('notifications.analytics.table.timestamp')}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('user_name')}
                >
                  {t('notifications.analytics.table.user')}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('channel')}
                >
                  {t('notifications.analytics.table.channel')}
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSort('provider')}
                >
                  {t('notifications.analytics.table.provider')}
                </TableHead>
                <TableHead>{t('notifications.analytics.table.error')}</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50 text-center"
                  onClick={() => handleSort('retry_count')}
                >
                  {t('notifications.analytics.table.retries')}
                </TableHead>
                <TableHead className="text-right">
                  {t('common.actions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                    <svg
                      className="h-12 w-12 mx-auto mb-4 opacity-50"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <p>{t('notifications.analytics.no_failures')}</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((delivery) => (
                  <TableRow key={delivery.id}>
                    <TableCell className="text-sm">
                      {formatDistanceToNow(new Date(delivery.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">
                          {delivery.user_name || 'Unknown User'}
                        </span>
                        {delivery.user_email && (
                          <span className="text-xs text-gray-500">{delivery.user_email}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {t(`notifications.channels.${delivery.channel}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{delivery.provider}</TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        <div className="text-sm text-gray-900 truncate">
                          {delivery.error_message}
                        </div>
                        {delivery.error_code && (
                          <div className="text-xs text-gray-500">Code: {delivery.error_code}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={delivery.retry_count > 3 ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {delivery.retry_count}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onRetry && (
                            <DropdownMenuItem
                              onClick={() => handleRetry(delivery.id)}
                              disabled={retryingIds.has(delivery.id)}
                            >
                              <RefreshCw
                                className={`h-4 w-4 mr-2 ${
                                  retryingIds.has(delivery.id) ? 'animate-spin' : ''
                                }`}
                              />
                              {t('notifications.analytics.actions.retry')}
                            </DropdownMenuItem>
                          )}
                          {onViewDetails && (
                            <DropdownMenuItem onClick={() => onViewDetails(delivery)}>
                              <Eye className="h-4 w-4 mr-2" />
                              {t('notifications.analytics.actions.view_details')}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination info */}
        {filteredData.length > 0 && (
          <div className="mt-4 text-sm text-gray-600 text-center">
            {t('common.showing')} {filteredData.length} {t('common.of')} {data.length}{' '}
            {t('notifications.analytics.table.failed_deliveries')}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
