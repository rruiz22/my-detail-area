import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export interface PasswordResetRequest {
  id: string;
  user_id: string;
  admin_id: string;
  token: string;
  status: 'pending' | 'completed' | 'expired' | 'cancelled';
  request_type: 'email_reset' | 'temp_password' | 'force_change';
  expires_at: string;
  completed_at?: string;
  temp_password?: string;
  force_change_on_login: boolean;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface BulkPasswordOperation {
  id: string;
  operation_type: 'bulk_reset' | 'bulk_force_change' | 'bulk_temp_password';
  initiated_by: string;
  dealer_id: number;
  target_filters: any;
  total_users: number;
  processed_users: number;
  successful_operations: number;
  failed_operations: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  started_at?: string;
  completed_at?: string;
  error_details: any[];
  created_at: string;
}

export interface PasswordHistory {
  id: string;
  user_id: string;
  password_hash: string;
  created_at: string;
  created_by?: string;
  change_reason: string;
}

export const usePasswordManagement = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const resetUserPassword = async (
    userId: string,
    resetType: 'email_reset' | 'temp_password' | 'force_change',
    dealerId: number,
    options?: {
      tempPassword?: string;
      forceChange?: boolean;
    }
  ) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('reset-user-password', {
        body: {
          userId,
          resetType,
          dealerId,
          tempPassword: options?.tempPassword,
          forceChange: options?.forceChange || false
        }
      });

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: data.message || t('password_management.reset_success'),
      });

      return data;

    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast({
        title: t('common.error'),
        description: error.message || t('password_management.reset_error'),
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const bulkPasswordOperation = async (
    operationType: 'bulk_reset' | 'bulk_force_change' | 'bulk_temp_password',
    dealerId: number,
    targetFilters: any,
    options?: any
  ) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke('bulk-password-operations', {
        body: {
          operationType,
          dealerId,
          targetFilters,
          options
        }
      });

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: data.message || t('password_management.bulk_operation_success'),
      });

      return data;

    } catch (error: any) {
      console.error('Error in bulk operation:', error);
      toast({
        title: t('common.error'),
        description: error.message || t('password_management.bulk_operation_error'),
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getPasswordResetRequests = async (dealerId?: number) => {
    try {
      let query = supabase
        .from('password_reset_requests')
        .select(`
          *,
          profiles!password_reset_requests_user_id_fkey(first_name, last_name, email),
          admin_profiles:profiles!password_reset_requests_admin_id_fkey(first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });

      if (dealerId) {
        query = query.eq('metadata->dealer_id', dealerId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];

    } catch (error: any) {
      console.error('Error fetching password reset requests:', error);
      toast({
        title: t('common.error'),
        description: error.message || t('password_management.fetch_requests_error'),
        variant: 'destructive',
      });
      return [];
    }
  };

  const getBulkOperations = async (dealerId: number) => {
    try {
      const { data, error } = await supabase
        .from('bulk_password_operations')
        .select(`
          *,
          profiles!bulk_password_operations_initiated_by_fkey(first_name, last_name, email)
        `)
        .eq('dealer_id', dealerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];

    } catch (error: any) {
      console.error('Error fetching bulk operations:', error);
      toast({
        title: t('common.error'),
        description: error.message || t('password_management.fetch_operations_error'),
        variant: 'destructive',
      });
      return [];
    }
  };

  const getPasswordHistory = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('password_history')
        .select(`
          *,
          profiles!password_history_created_by_fkey(first_name, last_name, email)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];

    } catch (error: any) {
      console.error('Error fetching password history:', error);
      toast({
        title: t('common.error'),
        description: error.message || t('password_management.fetch_history_error'),
        variant: 'destructive',
      });
      return [];
    }
  };

  const cancelPasswordReset = async (resetId: string) => {
    try {
      const { error } = await supabase
        .from('password_reset_requests')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', resetId);

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: t('password_management.reset_cancelled'),
      });

    } catch (error: any) {
      console.error('Error cancelling reset:', error);
      toast({
        title: t('common.error'),
        description: error.message || t('password_management.cancel_error'),
        variant: 'destructive',
      });
      throw error;
    }
  };

  return {
    loading,
    resetUserPassword,
    bulkPasswordOperation,
    getPasswordResetRequests,
    getBulkOperations,
    getPasswordHistory,
    cancelPasswordReset
  };
};