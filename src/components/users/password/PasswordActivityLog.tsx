import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Activity, 
  Search, 
  Filter, 
  Download,
  Eye,
  Key,
  Shield,
  Clock,
  User,
  RefreshCw,
  Lock
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePasswordManagement } from '@/hooks/usePasswordManagement';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface PasswordActivityLogProps {
  dealerId: number;
}

export const PasswordActivityLog = ({ dealerId }: PasswordActivityLogProps) => {
  const { t } = useTranslation();
  const { getPasswordResetRequests, getBulkOperations } = usePasswordManagement();
  
  const [activities, setActivities] = useState<Array<{
    id: string;
    type: string;
    subtype: string;
    status: string;
    admin_email: string;
    admin_name: string;
    created_at: string;
    completed_at?: string;
    total_users?: number;
    successful_operations?: number;
    failed_operations?: number;
    metadata?: Record<string, unknown>;
  }>>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);

      const [resetRequests, bulkOps] = await Promise.all([
        getPasswordResetRequests(dealerId),
        getBulkOperations(dealerId)
      ]);

      // Combine and format activities
      const allActivities = [
        ...resetRequests.map((req: { id: string; status: string; admin_email: string; admin_name: string; created_at: string; completed_at?: string }) => ({
          id: req.id,
          type: 'password_reset',
          subtype: req.request_type,
          status: req.status,
          user_email: req.profiles?.email || 'N/A',
          user_name: `${req.profiles?.first_name || ''} ${req.profiles?.last_name || ''}`.trim() || 'N/A',
          admin_email: req.admin_profiles?.email || 'N/A',
          admin_name: `${req.admin_profiles?.first_name || ''} ${req.admin_profiles?.last_name || ''}`.trim() || 'N/A',
          created_at: req.created_at,
          completed_at: req.completed_at,
          expires_at: req.expires_at,
          metadata: req.metadata
        })),
        ...bulkOps.map((op: { id: string; operation_type: string; status: string; created_at: string; completed_at?: string; total_users: number; successful_operations: number; failed_operations: number; profiles?: { email: string; first_name?: string; last_name?: string } }) => ({
          id: op.id,
          type: 'bulk_operation',
          subtype: op.operation_type,
          status: op.status,
          admin_email: op.profiles?.email || 'N/A',
          admin_name: `${op.profiles?.first_name || ''} ${op.profiles?.last_name || ''}`.trim() || 'N/A',
          created_at: op.created_at,
          completed_at: op.completed_at,
          total_users: op.total_users,
          successful_operations: op.successful_operations,
          failed_operations: op.failed_operations,
          metadata: { bulk_operation: true }
        }))
      ];

      // Sort by creation date, newest first
      allActivities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setActivities(allActivities);

    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  }, [dealerId, getBulkOperations, getPasswordResetRequests]);

  useEffect(() => {
    if (dealerId) {
      fetchActivities();
    }
  }, [dealerId, fetchActivities]);

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = !searchTerm || 
      activity.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.admin_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.admin_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'all' || activity.type === filterType;
    const matchesStatus = filterStatus === 'all' || activity.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  const getActivityIcon = (type: string, subtype: string) => {
    if (type === 'password_reset') {
      switch (subtype) {
        case 'email_reset': return <Key className="h-4 w-4 text-blue-600" />;
        case 'temp_password': return <Lock className="h-4 w-4 text-orange-600" />;
        case 'force_change': return <RefreshCw className="h-4 w-4 text-purple-600" />;
        default: return <Key className="h-4 w-4" />;
      }
    }
    
    if (type === 'bulk_operation') {
      return <Shield className="h-4 w-4 text-red-600" />;
    }

    return <Activity className="h-4 w-4" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'processing':
        return <Badge variant="secondary">Processing</Badge>;
      case 'expired':
        return <Badge variant="outline">Expired</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Cancelled</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const exportActivities = () => {
    const csv = [
      ['Date', 'Type', 'Subtype', 'Status', 'User', 'Admin', 'Details'],
      ...filteredActivities.map(activity => [
        format(new Date(activity.created_at), 'yyyy-MM-dd HH:mm:ss'),
        activity.type,
        activity.subtype,
        activity.status,
        activity.user_name || activity.user_email || 'N/A',
        activity.admin_name || activity.admin_email || 'N/A',
        activity.type === 'bulk_operation' 
          ? `Total: ${activity.total_users}, Success: ${activity.successful_operations}, Failed: ${activity.failed_operations}`
          : activity.expires_at 
          ? `Expires: ${format(new Date(activity.expires_at), 'yyyy-MM-dd HH:mm')}`
          : ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `password-activities-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t('password_management.activity_filters')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search users or admins..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="password_reset">Password Reset</SelectItem>
                  <SelectItem value="bulk_operation">Bulk Operation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={fetchActivities} disabled={loading} variant="outline">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button onClick={exportActivities} variant="outline">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activities List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {t('password_management.activity_log')}
            </div>
            <Badge variant="outline">
              {filteredActivities.length} {t('common.items')}
            </Badge>
          </CardTitle>
          <CardDescription>
            {t('password_management.recent_password_activities')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="border rounded-lg p-4">
                  <div className="space-y-2">
                    <div className="h-4 w-48 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-32 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredActivities.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {t('password_management.no_activities')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredActivities.map((activity) => (
                <div key={activity.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getActivityIcon(activity.type, activity.subtype)}
                      <div className="font-medium">
                        {activity.type === 'password_reset' 
                          ? t(`password_management.${activity.subtype}`)
                          : t(`password_management.${activity.subtype}`)
                        }
                      </div>
                    </div>
                    {getStatusBadge(activity.status)}
                  </div>

                  <div className="text-sm text-muted-foreground space-y-1">
                    {activity.user_name && (
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3" />
                        <span>User: {activity.user_name} ({activity.user_email})</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <Shield className="h-3 w-3" />
                      <span>Admin: {activity.admin_name} ({activity.admin_email})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span>{format(new Date(activity.created_at), 'MMM dd, yyyy HH:mm:ss')}</span>
                    </div>

                    {activity.type === 'bulk_operation' && (
                      <div className="mt-2 p-2 bg-muted rounded text-xs">
                        Total Users: {activity.total_users} | 
                        Successful: {activity.successful_operations} | 
                        Failed: {activity.failed_operations}
                      </div>
                    )}

                    {activity.expires_at && activity.status === 'pending' && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                        Expires: {format(new Date(activity.expires_at), 'MMM dd, yyyy HH:mm')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};