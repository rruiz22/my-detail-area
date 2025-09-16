import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Play, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Clock,
  Filter
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePasswordManagement } from '@/hooks/usePasswordManagement';
import { supabase } from '@/integrations/supabase/client';

interface BulkPasswordOperationsProps {
  dealerId: number;
}

export const BulkPasswordOperations = ({ dealerId }: BulkPasswordOperationsProps) => {
  const { t } = useTranslation();
  const { bulkPasswordOperation, getBulkOperations, loading } = usePasswordManagement();
  
  const [operationType, setOperationType] = useState<'bulk_reset' | 'bulk_force_change' | 'bulk_temp_password'>('bulk_reset');
  const [targetUsers, setTargetUsers] = useState<string[]>([]);
  const [availableUsers, setAvailableUsers] = useState<Array<{ user_id: string; profiles: { id: string; email: string; first_name?: string; last_name?: string } }>>([]);
  const [recentOperations, setRecentOperations] = useState<Array<{ id: string; operation_type: string; created_at: string; user_count: number }>>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);

      const { data, error } = await supabase
        .from('dealer_memberships')
        .select(`
          user_id,
          profiles!inner(id, email, first_name, last_name)
        `)
        .eq('dealer_id', dealerId)
        .eq('is_active', true);

      if (error) throw error;
      setAvailableUsers(data || []);

    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  }, [dealerId]);

  const fetchRecentOperations = useCallback(async () => {
    try {
      const operations = await getBulkOperations(dealerId);
      setRecentOperations(operations.slice(0, 5)); // Show last 5 operations
    } catch (error) {
      console.error('Error fetching operations:', error);
    }
  }, [dealerId, getBulkOperations]);

  useEffect(() => {
    if (dealerId) {
      fetchUsers();
      fetchRecentOperations();
    }
  }, [dealerId, fetchUsers, fetchRecentOperations]);

  const handleUserToggle = (userId: string, checked: boolean) => {
    if (checked) {
      setTargetUsers(prev => [...prev, userId]);
    } else {
      setTargetUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const selectAll = () => {
    setTargetUsers(availableUsers.map(user => user.user_id));
  };

  const selectNone = () => {
    setTargetUsers([]);
  };

  const handleBulkOperation = async () => {
    if (targetUsers.length === 0) return;

    try {
      await bulkPasswordOperation(
        operationType,
        dealerId,
        { userIds: targetUsers }
      );

      // Reset selection
      setTargetUsers([]);
      
      // Refresh recent operations
      await fetchRecentOperations();

    } catch (error) {
      console.error('Error executing bulk operation:', error);
    }
  };

  const getOperationStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />{t('common.completed')}</Badge>;
      case 'processing':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />{t('common.processing')}</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />{t('common.failed')}</Badge>;
      default:
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />{t('common.pending')}</Badge>;
    }
  };

  const getOperationProgress = (operation: any) => {
    if (operation.total_users === 0) return 0;
    return Math.round((operation.processed_users / operation.total_users) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Operation Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('password_management.bulk_configuration')}
          </CardTitle>
          <CardDescription>
            {t('password_management.bulk_configuration_desc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Operation Type */}
          <div className="space-y-2">
            <Label>{t('password_management.operation_type')}</Label>
            <Select value={operationType} onValueChange={(value: any) => setOperationType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bulk_reset">
                  {t('password_management.bulk_email_reset')}
                </SelectItem>
                <SelectItem value="bulk_force_change">
                  {t('password_management.bulk_force_change')}
                </SelectItem>
                <SelectItem value="bulk_temp_password">
                  {t('password_management.bulk_temp_password')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* User Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>{t('password_management.select_users')}</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectAll}
                  disabled={loadingUsers}
                >
                  {t('common.select_all')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectNone}
                >
                  {t('common.select_none')}
                </Button>
              </div>
            </div>

            {loadingUsers ? (
              <div className="text-sm text-muted-foreground">
                {t('common.loading')}...
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto border rounded-lg">
                {availableUsers.map((user) => (
                  <div key={user.user_id} className="flex items-center space-x-2 p-3 border-b last:border-b-0">
                    <Checkbox
                      id={`user-${user.user_id}`}
                      checked={targetUsers.includes(user.user_id)}
                      onCheckedChange={(checked) => 
                        handleUserToggle(user.user_id, checked as boolean)
                      }
                    />
                    <Label 
                      htmlFor={`user-${user.user_id}`} 
                      className="flex-1 cursor-pointer"
                    >
                      <div className="font-medium">
                        {user.profiles?.first_name} {user.profiles?.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {user.profiles?.email}
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            )}

            {targetUsers.length > 0 && (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <Badge variant="outline">
                  {t('password_management.selected_users', { count: targetUsers.length })}
                </Badge>
              </div>
            )}
          </div>

          {/* Warning */}
          {targetUsers.length > 0 && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800">
                  {t('password_management.bulk_warning_title')}
                </p>
                <p className="text-yellow-700 mt-1">
                  {t('password_management.bulk_warning_desc', { 
                    count: targetUsers.length,
                    operation: operationType 
                  })}
                </p>
              </div>
            </div>
          )}

          {/* Execute Button */}
          <Button
            onClick={handleBulkOperation}
            disabled={loading || targetUsers.length === 0}
            className="w-full"
            variant={targetUsers.length > 0 ? "default" : "outline"}
          >
            {loading ? (
              <Clock className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {t('password_management.execute_operation')}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Operations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t('password_management.recent_operations')}
          </CardTitle>
          <CardDescription>
            {t('password_management.recent_operations_desc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentOperations.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">
              {t('password_management.no_operations')}
            </p>
          ) : (
            <div className="space-y-4">
              {recentOperations.map((operation) => (
                <div key={operation.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">
                      {t(`password_management.${operation.operation_type}`)}
                    </div>
                    {getOperationStatusBadge(operation.status)}
                  </div>
                  
                  <div className="text-sm text-muted-foreground mb-2">
                    {t('password_management.operation_details', {
                      total: operation.total_users,
                      successful: operation.successful_operations,
                      failed: operation.failed_operations
                    })}
                  </div>
                  
                  {operation.status === 'processing' && (
                    <Progress 
                      value={getOperationProgress(operation)} 
                      className="h-2" 
                    />
                  )}
                  
                  <div className="text-xs text-muted-foreground mt-2">
                    {t('common.created_at')}: {new Date(operation.created_at).toLocaleString()}
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