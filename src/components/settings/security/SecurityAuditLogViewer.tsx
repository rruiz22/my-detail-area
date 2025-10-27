import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import {
  Shield,
  Download,
  Search,
  Eye,
  Copy,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Filter,
  Calendar,
  User,
  FileJson,
  ExternalLink,
  ShieldAlert,
  Database
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

/**
 * SecurityAuditLog interface matching the database schema
 */
interface SecurityAuditLog {
  id: string;
  event_type: string;
  event_category: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  user_id: string | null;
  user_email: string | null;
  user_role: string | null;
  dealer_id: number | null;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

/**
 * Notion-style severity badge colors (muted palette only)
 */
const severityConfig = {
  info: {
    className: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: Database,
    label: 'Info'
  },
  low: {
    className: 'bg-slate-50 text-slate-700 border-slate-200',
    icon: Shield,
    label: 'Low'
  },
  medium: {
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: AlertTriangle,
    label: 'Medium'
  },
  high: {
    className: 'bg-orange-50 text-orange-700 border-orange-200',
    icon: ShieldAlert,
    label: 'High'
  },
  critical: {
    className: 'bg-red-50 text-red-700 border-red-200',
    icon: ShieldAlert,
    label: 'Critical'
  }
} as const;

/**
 * Event type categories for filtering
 */
const eventTypes = [
  'all',
  'login',
  'logout',
  'permission_change',
  'data_access',
  'data_modification',
  'integration_access',
  'admin_action',
  'security_violation',
  'password_reset',
  'user_creation',
  'user_deletion'
] as const;

/**
 * Event categories for grouping
 */
const eventCategories = [
  'all',
  'auth',
  'permission',
  'data_access',
  'integration',
  'admin'
] as const;

/**
 * Enterprise Security Audit Log Viewer
 *
 * Features:
 * - Table view with filters (event type, severity, date range, user)
 * - Pagination (20 items per page)
 * - Export to CSV
 * - Detail modal with full log information
 * - Real-time updates (Supabase subscription)
 * - Permission guard (system_admin only)
 * - Notion-style design (muted colors, flat design)
 */
export const SecurityAuditLogViewer: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();

  // Filter states
  const [eventType, setEventType] = useState<string>('all');
  const [eventCategory, setEventCategory] = useState<string>('all');
  const [severity, setSeverity] = useState<string>('all');
  const [searchUser, setSearchUser] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Pagination state
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  // Detail modal state
  const [selectedLog, setSelectedLog] = useState<SecurityAuditLog | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Fetch audit logs with filters
  const { data: logs, isLoading, error, refetch } = useQuery({
    queryKey: [
      'security-audit-log',
      eventType,
      eventCategory,
      severity,
      searchUser,
      startDate,
      endDate
    ],
    queryFn: async () => {
      let query = supabase
        .from('security_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500); // Fetch last 500 logs for client-side pagination

      // Apply filters
      if (eventType !== 'all') {
        query = query.eq('event_type', eventType);
      }

      if (eventCategory !== 'all') {
        query = query.eq('event_category', eventCategory);
      }

      if (severity !== 'all') {
        query = query.eq('severity', severity);
      }

      if (searchUser.trim()) {
        query = query.or(
          `user_email.ilike.%${searchUser}%,user_id.eq.${searchUser}`
        );
      }

      if (startDate) {
        query = query.gte('created_at', startDate);
      }

      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching audit logs:', error);
        throw error;
      }

      return (data || []) as SecurityAuditLog[];
    },
    refetchInterval: 30000 // Refetch every 30 seconds for real-time updates
  });

  // Client-side pagination
  const paginatedLogs = useMemo(() => {
    if (!logs) return [];
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return logs.slice(startIndex, endIndex);
  }, [logs, page]);

  const totalPages = useMemo(() => {
    if (!logs) return 0;
    return Math.ceil(logs.length / itemsPerPage);
  }, [logs]);

  /**
   * Format date/time for display
   */
  const formatDateTime = (dateString: string): string => {
    try {
      return format(parseISO(dateString), 'MMM dd, yyyy HH:mm:ss');
    } catch {
      return dateString;
    }
  };

  /**
   * Export audit logs to CSV
   */
  const exportToCsv = () => {
    if (!logs || logs.length === 0) {
      toast({
        title: t('settings.security.audit.no_data'),
        description: t('settings.security.audit.no_data_export'),
        variant: 'destructive'
      });
      return;
    }

    try {
      // CSV headers
      const headers = [
        'Timestamp',
        'Event Type',
        'Category',
        'Severity',
        'User Email',
        'User Role',
        'Success',
        'IP Address',
        'Resource Type',
        'Resource ID',
        'Error Message'
      ];

      // CSV rows
      const rows = logs.map(log => [
        log.created_at,
        log.event_type,
        log.event_category,
        log.severity,
        log.user_email || 'System',
        log.user_role || 'N/A',
        log.success ? 'Success' : 'Failed',
        log.ip_address || 'N/A',
        log.resource_type || 'N/A',
        log.resource_id || 'N/A',
        log.error_message || 'N/A'
      ]);

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `security-audit-log-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`
      );
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: t('settings.security.audit.export_success'),
        description: t('settings.security.audit.export_success_desc', {
          count: logs.length
        })
      });
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast({
        title: t('common.error'),
        description: t('settings.security.audit.export_error'),
        variant: 'destructive'
      });
    }
  };

  /**
   * Open detail modal
   */
  const openDetailModal = (log: SecurityAuditLog) => {
    setSelectedLog(log);
    setIsDetailModalOpen(true);
  };

  /**
   * Copy log ID to clipboard
   */
  const copyLogId = (logId: string) => {
    navigator.clipboard.writeText(logId);
    toast({
      title: t('common.copied'),
      description: t('settings.security.audit.log_id_copied')
    });
  };

  /**
   * Reset filters
   */
  const resetFilters = () => {
    setEventType('all');
    setEventCategory('all');
    setSeverity('all');
    setSearchUser('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className="card-enhanced">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('settings.security.audit.title')}
          </CardTitle>
          <CardDescription>
            {t('settings.security.audit.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="card-enhanced">
        <CardContent className="py-12 text-center space-y-4">
          <ShieldAlert className="h-16 w-16 mx-auto text-red-500" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {t('settings.security.audit.error_loading')}
            </h3>
            <p className="text-sm text-gray-500 mt-2">
              {t('settings.security.audit.error_loading_desc')}
            </p>
          </div>
          <Button onClick={() => refetch()} variant="outline">
            {t('common.retry')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <PermissionGuard requireSystemPermission permission="admin">
      <div className="space-y-6">
        {/* Header Card */}
        <Card className="card-enhanced">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-gray-700" />
                  {t('settings.security.audit.title')}
                </CardTitle>
                <CardDescription className="mt-1.5">
                  {t('settings.security.audit.description')}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={exportToCsv}
                  variant="outline"
                  size="sm"
                  disabled={!logs || logs.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t('settings.security.audit.export_csv')}
                </Button>
                <Button onClick={() => refetch()} variant="outline" size="sm">
                  {t('common.refresh')}
                </Button>
              </div>
            </div>
          </CardHeader>

          {/* Filters */}
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Event Type Filter */}
              <div className="space-y-2">
                <Label htmlFor="event-type" className="text-sm font-medium">
                  <Filter className="h-3.5 w-3.5 inline mr-1.5" />
                  {t('settings.security.audit.event_type')}
                </Label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger id="event-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type === 'all'
                          ? t('settings.security.audit.all_events')
                          : t(`settings.security.audit.event_${type}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Event Category Filter */}
              <div className="space-y-2">
                <Label htmlFor="event-category" className="text-sm font-medium">
                  <Database className="h-3.5 w-3.5 inline mr-1.5" />
                  {t('settings.security.audit.category')}
                </Label>
                <Select value={eventCategory} onValueChange={setEventCategory}>
                  <SelectTrigger id="event-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {eventCategories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category === 'all'
                          ? t('settings.security.audit.all_categories')
                          : t(`settings.security.audit.category_${category}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Severity Filter */}
              <div className="space-y-2">
                <Label htmlFor="severity" className="text-sm font-medium">
                  <ShieldAlert className="h-3.5 w-3.5 inline mr-1.5" />
                  {t('settings.security.audit.severity')}
                </Label>
                <Select value={severity} onValueChange={setSeverity}>
                  <SelectTrigger id="severity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t('settings.security.audit.all_severity')}
                    </SelectItem>
                    {Object.keys(severityConfig).map(sev => (
                      <SelectItem key={sev} value={sev}>
                        {t(`settings.security.audit.severity_${sev}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* User Search */}
              <div className="space-y-2">
                <Label htmlFor="user-search" className="text-sm font-medium">
                  <User className="h-3.5 w-3.5 inline mr-1.5" />
                  {t('settings.security.audit.user')}
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="user-search"
                    type="text"
                    placeholder={t('settings.security.audit.search_user')}
                    value={searchUser}
                    onChange={e => setSearchUser(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date" className="text-sm font-medium">
                  <Calendar className="h-3.5 w-3.5 inline mr-1.5" />
                  {t('settings.security.audit.start_date')}
                </Label>
                <Input
                  id="start-date"
                  type="datetime-local"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-date" className="text-sm font-medium">
                  <Calendar className="h-3.5 w-3.5 inline mr-1.5" />
                  {t('settings.security.audit.end_date')}
                </Label>
                <Input
                  id="end-date"
                  type="datetime-local"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {/* Reset Filters */}
            <div className="flex justify-end">
              <Button onClick={resetFilters} variant="ghost" size="sm">
                {t('settings.security.audit.reset_filters')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Audit Log Table */}
        <Card className="card-enhanced">
          <CardContent className="p-0">
            {!logs || logs.length === 0 ? (
              <div className="py-16 text-center space-y-4">
                <Shield className="h-16 w-16 mx-auto text-gray-300" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {t('settings.security.audit.no_logs')}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {t('settings.security.audit.no_logs_desc')}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50 hover:bg-gray-50">
                        <TableHead className="font-semibold">
                          {t('settings.security.audit.timestamp')}
                        </TableHead>
                        <TableHead className="font-semibold">
                          {t('settings.security.audit.event_type')}
                        </TableHead>
                        <TableHead className="font-semibold">
                          {t('settings.security.audit.user')}
                        </TableHead>
                        <TableHead className="font-semibold">
                          {t('settings.security.audit.severity')}
                        </TableHead>
                        <TableHead className="font-semibold">
                          {t('settings.security.audit.status')}
                        </TableHead>
                        <TableHead className="font-semibold text-right">
                          {t('settings.security.audit.actions')}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedLogs.map(log => {
                        const severityInfo = severityConfig[log.severity];
                        const SeverityIcon = severityInfo.icon;

                        return (
                          <TableRow
                            key={log.id}
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => openDetailModal(log)}
                          >
                            <TableCell className="font-mono text-xs">
                              {formatDateTime(log.created_at)}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">
                                  {log.event_type}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {log.event_category}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-sm">
                                  {log.user_email || 'System'}
                                </span>
                                {log.user_role && (
                                  <span className="text-xs text-gray-500">
                                    {log.user_role}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={severityInfo.className}
                              >
                                <SeverityIcon className="h-3 w-3 mr-1" />
                                {severityInfo.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {log.success ? (
                                <div className="flex items-center gap-1.5 text-green-600">
                                  <CheckCircle2 className="h-4 w-4" />
                                  <span className="text-sm">
                                    {t('settings.security.audit.success')}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-red-600">
                                  <XCircle className="h-4 w-4" />
                                  <span className="text-sm">
                                    {t('settings.security.audit.failed')}
                                  </span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={e => {
                                  e.stopPropagation();
                                  openDetailModal(log);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                {t('settings.security.audit.details')}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
                    <div className="text-sm text-gray-600">
                      {t('settings.security.audit.showing_results', {
                        start: (page - 1) * itemsPerPage + 1,
                        end: Math.min(page * itemsPerPage, logs.length),
                        total: logs.length
                      })}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        {t('common.previous')}
                      </Button>
                      <span className="text-sm text-gray-600">
                        {t('settings.security.audit.page_of', {
                          page,
                          total: totalPages
                        })}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                      >
                        {t('common.next')}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Detail Modal */}
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            {selectedLog && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-gray-700" />
                    {t('settings.security.audit.log_details')}
                  </DialogTitle>
                  <DialogDescription>
                    {t('settings.security.audit.log_details_desc')}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  {/* Log ID */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">
                        {t('settings.security.audit.log_id')}:
                      </span>
                      <span className="text-sm font-mono text-gray-600">
                        {selectedLog.id}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyLogId(selectedLog.id)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Event Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-gray-500">
                        {t('settings.security.audit.event_type')}
                      </Label>
                      <p className="text-sm font-medium mt-1">
                        {selectedLog.event_type}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">
                        {t('settings.security.audit.category')}
                      </Label>
                      <p className="text-sm font-medium mt-1">
                        {selectedLog.event_category}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">
                        {t('settings.security.audit.severity')}
                      </Label>
                      <div className="mt-1">
                        <Badge
                          variant="outline"
                          className={severityConfig[selectedLog.severity].className}
                        >
                          {severityConfig[selectedLog.severity].label}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">
                        {t('settings.security.audit.timestamp')}
                      </Label>
                      <p className="text-sm font-mono mt-1">
                        {formatDateTime(selectedLog.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* User Information */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">
                      {t('settings.security.audit.user_information')}
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-gray-500">
                          {t('settings.security.audit.user_email')}
                        </Label>
                        <p className="text-sm mt-1">
                          {selectedLog.user_email || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">
                          {t('settings.security.audit.user_role')}
                        </Label>
                        <p className="text-sm mt-1">
                          {selectedLog.user_role || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">
                          {t('settings.security.audit.ip_address')}
                        </Label>
                        <p className="text-sm font-mono mt-1">
                          {selectedLog.ip_address || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">
                          {t('settings.security.audit.user_agent')}
                        </Label>
                        <p className="text-sm mt-1 truncate" title={selectedLog.user_agent || 'N/A'}>
                          {selectedLog.user_agent || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Resource Information */}
                  {(selectedLog.resource_type || selectedLog.resource_id) && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">
                        {t('settings.security.audit.resource_information')}
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-gray-500">
                            {t('settings.security.audit.resource_type')}
                          </Label>
                          <p className="text-sm mt-1">
                            {selectedLog.resource_type || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500">
                            {t('settings.security.audit.resource_id')}
                          </Label>
                          <p className="text-sm font-mono mt-1">
                            {selectedLog.resource_id || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Status */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">
                      {t('settings.security.audit.status')}
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {selectedLog.success ? (
                          <>
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            <span className="text-sm text-green-600 font-medium">
                              {t('settings.security.audit.operation_successful')}
                            </span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-5 w-5 text-red-600" />
                            <span className="text-sm text-red-600 font-medium">
                              {t('settings.security.audit.operation_failed')}
                            </span>
                          </>
                        )}
                      </div>
                      {selectedLog.error_message && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <Label className="text-xs text-red-700 font-medium">
                            {t('settings.security.audit.error_message')}
                          </Label>
                          <p className="text-sm text-red-600 mt-1">
                            {selectedLog.error_message}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Details (JSONB) */}
                  {selectedLog.details &&
                    Object.keys(selectedLog.details).length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <FileJson className="h-4 w-4" />
                          {t('settings.security.audit.additional_details')}
                        </h4>
                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                          <pre className="text-xs font-mono text-gray-700 overflow-x-auto">
                            {JSON.stringify(selectedLog.details, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}

                  {/* User Profile Link */}
                  {selectedLog.user_id && (
                    <div className="pt-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <a
                          href={`/management?section=users&user=${selectedLog.user_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          {t('settings.security.audit.view_user_profile')}
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  );
};
