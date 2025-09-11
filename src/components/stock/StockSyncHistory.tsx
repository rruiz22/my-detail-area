import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useStockManagement } from '@/hooks/useStockManagement';
import { 
  History, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Download,
  Search,
  FileText,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

interface StockSyncHistoryProps {
  dealerId?: number;
}

export const StockSyncHistory: React.FC<StockSyncHistoryProps> = ({ dealerId }) => {
  const { t } = useTranslation();
  const { loading } = useStockManagement();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  // Mock sync history data - replace with real data
  const mockSyncHistory = [
    {
      id: '1',
      sync_started_at: '2024-01-15T10:30:00Z',
      sync_completed_at: '2024-01-15T10:32:15Z',
      sync_type: 'auto_sync',
      sync_status: 'completed',
      records_processed: 245,
      records_added: 12,
      records_updated: 28,
      records_removed: 5,
      file_name: null,
      file_size: null,
      sync_errors: [],
      sync_details: { source: 'Max Inventory API' }
    },
    {
      id: '2',
      sync_started_at: '2024-01-14T15:45:00Z',
      sync_completed_at: '2024-01-14T15:46:30Z',
      sync_type: 'csv_upload',
      sync_status: 'completed',
      records_processed: 156,
      records_added: 156,
      records_updated: 0,
      records_removed: 0,
      file_name: 'inventory_update_20240114.csv',
      file_size: 2048576,
      sync_errors: [],
      sync_details: { uploaded_by: 'user@example.com' }
    },
    {
      id: '3',
      sync_started_at: '2024-01-13T08:15:00Z',
      sync_completed_at: null,
      sync_type: 'auto_sync',
      sync_status: 'failed',
      records_processed: 0,
      records_added: 0,
      records_updated: 0,
      records_removed: 0,
      file_name: null,
      file_size: null,
      sync_errors: [{ message: 'API connection timeout', code: 'TIMEOUT' }],
      sync_details: { source: 'Max Inventory API' }
    }
  ];

  const filteredHistory = mockSyncHistory.filter(sync => {
    const matchesSearch = 
      sync.file_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sync.sync_type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || sync.sync_status === statusFilter;
    const matchesType = typeFilter === 'all' || sync.sync_type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-primary animate-spin" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-warning" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success/10 text-success hover:bg-success/20';
      case 'failed':
        return 'bg-destructive/10 text-destructive hover:bg-destructive/20';
      case 'in_progress':
        return 'bg-primary/10 text-primary hover:bg-primary/20';
      default:
        return 'bg-warning/10 text-warning hover:bg-warning/20';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'csv_upload':
        return <FileText className="w-4 h-4" />;
      case 'auto_sync':
        return <RefreshCw className="w-4 h-4" />;
      default:
        return <History className="w-4 h-4" />;
    }
  };

  const formatDuration = (startTime: string, endTime?: string | null) => {
    if (!endTime) return '--';
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000);
    
    if (duration < 60) return `${duration}s`;
    if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`;
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return '--';
    
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <History className="w-5 h-5" />
            <span>{t('stock.sync_history.title')}</span>
            <Badge variant="secondary">{filteredHistory.length}</Badge>
          </CardTitle>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            {t('stock.sync_history.export')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder={t('stock.sync_history.search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={t('stock.sync_history.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('stock.sync_history.all_statuses')}</SelectItem>
                <SelectItem value="completed">{t('stock.sync_history.completed')}</SelectItem>
                <SelectItem value="failed">{t('stock.sync_history.failed')}</SelectItem>
                <SelectItem value="in_progress">{t('stock.sync_history.in_progress')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={t('stock.sync_history.type')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('stock.sync_history.all_types')}</SelectItem>
                <SelectItem value="auto_sync">{t('stock.sync_history.auto_sync')}</SelectItem>
                <SelectItem value="csv_upload">{t('stock.sync_history.csv_upload')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* History Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('stock.sync_history.date_time')}</TableHead>
                <TableHead>{t('stock.sync_history.type')}</TableHead>
                <TableHead>{t('stock.sync_history.status')}</TableHead>
                <TableHead className="text-right">{t('stock.sync_history.duration')}</TableHead>
                <TableHead className="text-right">{t('stock.sync_history.processed')}</TableHead>
                <TableHead className="text-right">{t('stock.sync_history.added')}</TableHead>
                <TableHead className="text-right">{t('stock.sync_history.updated')}</TableHead>
                <TableHead className="text-right">{t('stock.sync_history.removed')}</TableHead>
                <TableHead>{t('stock.sync_history.file')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {t('common.loading')}...
                  </TableCell>
                </TableRow>
              ) : filteredHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    {t('stock.sync_history.no_history')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredHistory.map((sync) => (
                  <TableRow key={sync.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">
                          {new Date(sync.sync_started_at).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(sync.sync_started_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getTypeIcon(sync.sync_type)}
                        <span className="capitalize">
                          {sync.sync_type.replace('_', ' ')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(sync.sync_status)}>
                        {getStatusIcon(sync.sync_status)}
                        <span className="ml-1 capitalize">{sync.sync_status}</span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatDuration(sync.sync_started_at, sync.sync_completed_at)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {sync.records_processed.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="text-success">
                        +{sync.records_added}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="text-primary">
                        ~{sync.records_updated}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="text-destructive">
                        -{sync.records_removed}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {sync.file_name ? (
                        <div className="space-y-1">
                          <div className="font-medium text-sm truncate max-w-[200px]">
                            {sync.file_name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatFileSize(sync.file_size)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};