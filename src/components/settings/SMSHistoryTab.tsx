import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Calendar,
  Phone,
  User,
  AlertCircle,
  Download
} from 'lucide-react';
import { format } from 'date-fns';

interface SMSHistoryRecord {
  id: string;
  user_id: string;
  dealer_id: number;
  module: string;
  event_type: string;
  entity_id: string | null;
  phone_number: string;
  message_content: string;
  twilio_sid: string | null;
  status: string | null;
  sent_at: string | null;
  sent_day: string;
  cost_cents: number | null;
  error_message: string | null;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export function SMSHistoryTab() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [records, setRecords] = useState<SMSHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('7days');

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    sent: 0,
    failed: 0,
    totalCost: 0
  });

  useEffect(() => {
    fetchSMSHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, moduleFilter, dateFilter]);

  const fetchSMSHistory = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('sms_send_history')
        .select(`
          *,
          profiles!inner(
            first_name,
            last_name,
            email
          )
        `)
        .order('sent_at', { ascending: false })
        .limit(100);

      // Apply date filter
      if (dateFilter !== 'all') {
        const daysAgo = parseInt(dateFilter.replace('days', ''));
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        query = query.gte('sent_at', date.toISOString());
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Apply module filter
      if (moduleFilter !== 'all') {
        query = query.eq('module', moduleFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setRecords(data || []);

      // Calculate statistics
      const total = data?.length || 0;
      const sent = data?.filter(r => r.status === 'sent' || r.status === 'delivered').length || 0;
      const failed = data?.filter(r => r.status === 'failed').length || 0;
      const totalCost = data?.reduce((sum, r) => sum + (r.cost_cents || 0), 0) || 0;

      setStats({ total, sent, failed, totalCost });

    } catch (error: any) {
      console.error('Error fetching SMS history:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: 'Failed to load SMS history'
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter(record => {
    const searchLower = searchTerm.toLowerCase();
    const userName = `${record.profiles?.first_name} ${record.profiles?.last_name}`.toLowerCase();
    const email = record.profiles?.email.toLowerCase() || '';
    const phoneNumber = record.phone_number.toLowerCase();
    const message = record.message_content.toLowerCase();

    return (
      userName.includes(searchLower) ||
      email.includes(searchLower) ||
      phoneNumber.includes(searchLower) ||
      message.includes(searchLower)
    );
  });

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return (
          <Badge variant="default" className="bg-emerald-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {status === 'delivered' ? 'Delivered' : 'Sent'}
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case 'queued':
      case 'sending':
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            {status}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <AlertCircle className="h-3 w-3 mr-1" />
            {status || 'Unknown'}
          </Badge>
        );
    }
  };

  const getModuleBadge = (module: string) => {
    const moduleColors: Record<string, string> = {
      sales_orders: 'bg-blue-500',
      service_orders: 'bg-purple-500',
      recon_orders: 'bg-amber-500',
      car_wash: 'bg-cyan-500',
      get_ready: 'bg-emerald-500'
    };

    const color = moduleColors[module] || 'bg-gray-500';

    return (
      <Badge className={`${color} text-white`}>
        {module.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  };

  const exportToCSV = () => {
    const headers = ['Date', 'User', 'Phone', 'Module', 'Event', 'Status', 'Message', 'Cost'];
    const rows = filteredRecords.map(record => [
      record.sent_at ? format(new Date(record.sent_at), 'yyyy-MM-dd HH:mm:ss') : 'N/A',
      `${record.profiles?.first_name} ${record.profiles?.last_name}`,
      record.phone_number,
      record.module,
      record.event_type,
      record.status || 'unknown',
      record.message_content.replace(/"/g, '""'), // Escape quotes
      record.cost_cents ? `$${(record.cost_cents / 100).toFixed(2)}` : '$0.00'
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sms-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: t('common.success'),
      description: `Exported ${filteredRecords.length} records to CSV`
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading SMS history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total SMS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Successfully Sent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">{stats.sent}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? ((stats.sent / stats.total) * 100).toFixed(1) : 0}% success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.failed}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? ((stats.failed / stats.total) * 100).toFixed(1) : 0}% failure rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${(stats.totalCost / 100).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              ${stats.sent > 0 ? ((stats.totalCost / 100) / stats.sent).toFixed(3) : '0.00'} per SMS
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                SMS History
              </CardTitle>
              <CardDescription>
                View all SMS notifications sent through the system
              </CardDescription>
            </div>
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search user, phone, message..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="queued">Queued</SelectItem>
              </SelectContent>
            </Select>

            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Modules" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                <SelectItem value="sales_orders">Sales Orders</SelectItem>
                <SelectItem value="service_orders">Service Orders</SelectItem>
                <SelectItem value="recon_orders">Recon Orders</SelectItem>
                <SelectItem value="car_wash">Car Wash</SelectItem>
                <SelectItem value="get_ready">Get Ready</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1days">Last 24 hours</SelectItem>
                <SelectItem value="7days">Last 7 days</SelectItem>
                <SelectItem value="30days">Last 30 days</SelectItem>
                <SelectItem value="90days">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results count */}
          <div className="text-sm text-muted-foreground">
            Showing {filteredRecords.length} of {records.length} records
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No SMS records found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">
                              {record.sent_at
                                ? format(new Date(record.sent_at), 'MMM dd, yyyy')
                                : 'N/A'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {record.sent_at
                                ? format(new Date(record.sent_at), 'HH:mm:ss')
                                : ''}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">
                              {record.profiles?.first_name} {record.profiles?.last_name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {record.profiles?.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono text-sm">{record.phone_number}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getModuleBadge(record.module)}</TableCell>
                      <TableCell>
                        <span className="text-sm capitalize">
                          {record.event_type.replace('_', ' ')}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate text-sm" title={record.message_content}>
                          {record.message_content}
                        </div>
                        {record.error_message && (
                          <div className="text-xs text-red-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {record.error_message}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {record.cost_cents ? `$${(record.cost_cents / 100).toFixed(2)}` : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
