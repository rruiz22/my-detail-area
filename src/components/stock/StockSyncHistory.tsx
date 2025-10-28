import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { usePermissions } from '@/hooks/usePermissions';
import { useStockManagement } from '@/hooks/useStockManagement';
import { supabase } from '@/integrations/supabase/client';
import {
    AlertCircle,
    AlertTriangle,
    CheckCircle,
    Clock,
    Download,
    FileText,
    History,
    RefreshCw,
    Search
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface SyncHistoryRecord {
  id: string;
  dealer_id: number;
  sync_started_at: string;
  sync_completed_at: string | null;
  sync_type: string;
  sync_status: string;
  records_processed: number | null;
  records_added: number | null;
  records_updated: number | null;
  records_removed: number | null;
  file_name: string | null;
  file_size: number | null;
  sync_errors: any | null;
  sync_details: any | null;
  processed_by: string | null;
}

interface StockSyncHistoryProps {
  dealerId?: number;
}

export const StockSyncHistory: React.FC<StockSyncHistoryProps> = ({ dealerId }) => {
  const { t } = useTranslation();
  const { loading: stockLoading } = useStockManagement();
  const { hasModulePermission } = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [syncHistory, setSyncHistory] = useState<SyncHistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const canViewHistory = hasModulePermission('stock', 'view_inventory');

  // Fetch sync history from Supabase
  useEffect(() => {
    const fetchSyncHistory = async () => {
      if (!dealerId || !canViewHistory) {
        setHistoryLoading(false);
        return;
      }

      try {
        setHistoryLoading(true);
        const { data, error } = await supabase
          .from('dealer_inventory_sync_log')
          .select('*')
          .eq('dealer_id', dealerId)
          .order('sync_started_at', { ascending: false })
          .limit(50);

        if (error) {
          console.error('Error fetching sync history:', error);
          setSyncHistory([]);
        } else {
          setSyncHistory(data || []);
        }
      } catch (error) {
        console.error('Error fetching sync history:', error);
        setSyncHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchSyncHistory();
  }, [dealerId, canViewHistory]);

  const filteredHistory = syncHistory.filter(sync => {
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
          <Button
            variant="outline"
            size="sm"
            disabled={!canViewHistory}
            title={!canViewHistory ? t('errors.no_permission') : ''}
          >
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
              {historyLoading || stockLoading ? (
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
                      {(sync.records_processed || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="text-success">
                        +{sync.records_added || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="text-primary">
                        ~{sync.records_updated || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="text-destructive">
                        -{sync.records_removed || 0}
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
