/**
 * useUserMigration Hook
 *
 * Custom hook for migrating users between dealerships
 *
 * Features:
 * - Fetch users from source dealership
 * - Validate target dealership
 * - Migrate selected users via RPC
 * - Track migration progress and errors
 *
 * @module hooks/useUserMigration
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export interface DealershipUser {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  phone?: string;
  membership_active: boolean;
  membership_created: string;
  custom_role?: string;
}

interface MigrationResult {
  success: boolean;
  migrated_count: number;
  failed_count: number;
  errors?: string[];
}

export function useUserMigration() {
  const { toast } = useToast();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<DealershipUser[]>([]);

  /**
   * Fetch users from a dealership
   */
  const fetchDealershipUsers = useCallback(async (dealershipId: number) => {
    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('get_dealership_export_data', {
        p_dealership_id: dealershipId,
        p_include_users: true,
        p_include_orders: false,
        p_include_contacts: false
      });

      if (error) throw error;
      if (!data || !data.success) {
        throw new Error(data?.error || 'Failed to fetch users');
      }

      const dealershipUsers = (data.users || []) as DealershipUser[];
      setUsers(dealershipUsers);

      return dealershipUsers;
    } catch (error: any) {
      console.error('Error fetching dealership users:', error);
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to fetch dealership users',
        variant: 'destructive'
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  /**
   * Migrate selected users to target dealership
   */
  const migrateUsers = useCallback(async (
    userIds: string[],
    sourceDealerId: number,
    targetDealerId: number
  ): Promise<MigrationResult> => {
    try {
      setLoading(true);

      // Validation
      if (userIds.length === 0) {
        throw new Error('No users selected for migration');
      }

      if (sourceDealerId === targetDealerId) {
        throw new Error('Source and target dealerships cannot be the same');
      }

      console.log('🚀 Starting user migration:', {
        userIds,
        from: sourceDealerId,
        to: targetDealerId,
        count: userIds.length
      });

      // Call RPC function
      const { data, error } = await supabase.rpc('migrate_users_to_dealership', {
        p_user_ids: userIds,
        p_source_dealer_id: sourceDealerId,
        p_target_dealer_id: targetDealerId
      });

      if (error) {
        console.error('❌ Migration RPC error:', error);
        throw error;
      }

      console.log('✅ Migration result:', data);

      const result = data as MigrationResult;

      // Show toast based on result
      if (result.success) {
        toast({
          title: t('common.success'),
          description: t('dealerships.users_migrated_successfully', {
            count: result.migrated_count
          })
        });
      } else {
        toast({
          title: t('common.error'),
          description: result.errors?.[0] || 'Migration failed',
          variant: 'destructive'
        });
      }

      return result;

    } catch (error: any) {
      console.error('Error migrating users:', error);

      toast({
        title: t('common.error'),
        description: error.message || 'Failed to migrate users',
        variant: 'destructive'
      });

      return {
        success: false,
        migrated_count: 0,
        failed_count: userIds.length,
        errors: [error.message]
      };
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  /**
   * Get user full name
   */
  const getUserFullName = (user: DealershipUser): string => {
    return `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
  };

  /**
   * Filter active users only
   */
  const getActiveUsers = useCallback(() => {
    return users.filter(u => u.membership_active);
  }, [users]);

  /**
   * Filter inactive users only
   */
  const getInactiveUsers = useCallback(() => {
    return users.filter(u => !u.membership_active);
  }, [users]);

  return {
    // State
    users,
    loading,

    // Methods
    fetchDealershipUsers,
    migrateUsers,
    getUserFullName,
    getActiveUsers,
    getInactiveUsers
  };
}
