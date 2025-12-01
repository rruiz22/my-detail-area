/**
 * Remote Kiosk Token Management Hooks
 *
 * Provides queries and mutations for managing remote kiosk access tokens.
 * Tokens are temporary JWT-based links that allow employees to punch in/out
 * from their mobile devices via mda.to short links.
 */

import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';
import { useAuth } from '@/contexts/AuthContext';
import { useDealerFilter } from '@/contexts/DealerFilterContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

// =====================================================
// TYPES
// =====================================================

export type TokenStatus = 'active' | 'expired' | 'revoked' | 'used';

export interface RemoteKioskToken {
  id: string;
  token_hash: string;
  short_code: string;
  full_url: string;
  dealership_id: number;
  employee_id: string;
  created_by: string;
  expires_at: string;
  max_uses: number;
  current_uses: number;
  status: TokenStatus;
  last_used_at: string | null;
  last_used_ip: string | null;
  last_used_user_agent: string | null;
  // GPS location
  last_used_latitude: number | null;
  last_used_longitude: number | null;
  last_used_address: string | null;
  created_at: string;
  updated_at: string;
  revoked_at: string | null;
  revoked_by: string | null;
  revoke_reason: string | null;

  // Joined data
  employee?: {
    first_name: string;
    last_name: string;
    employee_number: string;
    fallback_photo_url: string | null;
    department: string;
    phone: string | null;
  } | null;
  // Note: creator and revoker data not available yet (FKs not created)
  // creator?: {
  //   first_name: string;
  //   last_name: string;
  // } | null;
  // revoker?: {
  //   first_name: string;
  //   last_name: string;
  // } | null;
}

export interface TokenStatistics {
  total_active: number;
  used_today: number;
  expiring_soon: number; // < 1 hour
  total_revoked: number;
  total_tokens: number;
}

export interface TokenUsageHistoryEntry {
  id: string;
  token_id: string;
  action: 'clock_in' | 'clock_out' | 'start_break' | 'end_break';
  timestamp: string;
  ip_address: string | null;
  user_agent: string | null;
  success: boolean;
}

export interface TokenFilters {
  status?: TokenStatus | 'all';
  search?: string; // Employee name or number
  dealershipId?: number | 'all';
}

// =====================================================
// QUERY KEYS
// =====================================================

const QUERY_KEYS = {
  tokens: (filters: TokenFilters) => ['remote_kiosk_tokens', filters],
  tokenDetail: (id: string) => ['remote_kiosk_token', id],
  statistics: (dealershipId: number | 'all') => ['remote_kiosk_token_stats', dealershipId],
  usageHistory: (tokenId: string) => ['remote_kiosk_token_usage', tokenId],
  tokensCreatedPerDay: (dealershipId: number | 'all', days: number) => ['remote_kiosk_tokens_created_per_day', dealershipId, days],
  usageByEmployee: (dealershipId: number | 'all', limit: number) => ['remote_kiosk_usage_by_employee', dealershipId, limit],
} as const;

// =====================================================
// QUERIES
// =====================================================

/**
 * Fetch remote kiosk tokens with optional filters
 * Includes employee and creator info via joins
 */
export function useRemoteKioskTokens(filters: TokenFilters = {}) {
  const { selectedDealerId } = useDealerFilter();
  const { user } = useAuth();

  const dealershipId = filters.dealershipId ?? selectedDealerId;

  return useQuery({
    queryKey: QUERY_KEYS.tokens({ ...filters, dealershipId }),
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      let query = supabase
        .from('remote_kiosk_tokens')
        .select(`
          *,
          employee:detail_hub_employees!remote_kiosk_tokens_employee_id_fkey(
            first_name,
            last_name,
            employee_number,
            fallback_photo_url,
            department,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      // Filter by dealership
      if (dealershipId !== 'all') {
        query = query.eq('dealership_id', dealershipId);
      }

      // Filter by status
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Client-side search filter (employee name/number)
      let filtered = data as RemoteKioskToken[];

      if (filters.search && filters.search.length >= 2) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(token => {
          const employeeName = token.employee
            ? `${token.employee.first_name} ${token.employee.last_name}`.toLowerCase()
            : '';
          const employeeNumber = token.employee?.employee_number.toLowerCase() || '';

          return employeeName.includes(searchLower) || employeeNumber.includes(searchLower);
        });
      }

      return filtered;
    },
    enabled: !!user,
    staleTime: CACHE_TIMES.SHORT, // 1 minute (tokens can change frequently)
    gcTime: GC_TIMES.MEDIUM,
  });
}

/**
 * Get token statistics for dashboard
 */
export function useTokenStatistics() {
  const { selectedDealerId } = useDealerFilter();
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.statistics(selectedDealerId),
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      let baseQuery = supabase.from('remote_kiosk_tokens').select('id, status, expires_at, current_uses, created_at');

      if (selectedDealerId !== 'all') {
        baseQuery = baseQuery.eq('dealership_id', selectedDealerId);
      }

      const { data: tokens, error } = await baseQuery;

      if (error) throw error;

      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const stats: TokenStatistics = {
        total_tokens: tokens.length,
        total_active: tokens.filter(t => t.status === 'active').length,
        total_revoked: tokens.filter(t => t.status === 'revoked').length,
        used_today: tokens.filter(t => {
          const createdAt = new Date(t.created_at);
          return createdAt >= todayStart && t.current_uses > 0;
        }).length,
        expiring_soon: tokens.filter(t => {
          if (t.status !== 'active') return false;
          const expiresAt = new Date(t.expires_at);
          return expiresAt <= oneHourFromNow && expiresAt > now;
        }).length,
      };

      return stats;
    },
    enabled: !!user,
    staleTime: CACHE_TIMES.SHORT, // 1 minute
    gcTime: GC_TIMES.MEDIUM,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });
}

/**
 * Get tokens created per day (for chart)
 */
export function useTokensCreatedPerDay(days: number = 30) {
  const { selectedDealerId } = useDealerFilter();
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.tokensCreatedPerDay(selectedDealerId, days),
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - days);

      let query = supabase
        .from('remote_kiosk_tokens')
        .select('created_at')
        .gte('created_at', daysAgo.toISOString());

      if (selectedDealerId !== 'all') {
        query = query.eq('dealership_id', selectedDealerId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Group by date
      const grouped: Record<string, number> = {};

      data.forEach(token => {
        const date = new Date(token.created_at).toISOString().split('T')[0];
        grouped[date] = (grouped[date] || 0) + 1;
      });

      // Convert to array for chart
      return Object.entries(grouped)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
    },
    enabled: !!user,
    staleTime: CACHE_TIMES.MEDIUM, // 5 minutes
    gcTime: GC_TIMES.LONG,
  });
}

/**
 * Get usage by employee (for chart)
 */
export function useUsageByEmployee(limit: number = 10) {
  const { selectedDealerId } = useDealerFilter();
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.usageByEmployee(selectedDealerId, limit),
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      let query = supabase
        .from('remote_kiosk_tokens')
        .select(`
          employee_id,
          current_uses,
          employee:detail_hub_employees!remote_kiosk_tokens_employee_id_fkey(
            first_name,
            last_name,
            employee_number
          )
        `)
        .gt('current_uses', 0);

      if (selectedDealerId !== 'all') {
        query = query.eq('dealership_id', selectedDealerId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Group by employee and sum uses
      const grouped: Record<string, { name: string; uses: number }> = {};

      data.forEach((token: any) => {
        if (!token.employee) return;

        const employeeName = `${token.employee.first_name} ${token.employee.last_name}`;

        if (!grouped[token.employee_id]) {
          grouped[token.employee_id] = { name: employeeName, uses: 0 };
        }

        grouped[token.employee_id].uses += token.current_uses;
      });

      // Convert to array and sort by usage
      return Object.values(grouped)
        .sort((a, b) => b.uses - a.uses)
        .slice(0, limit);
    },
    enabled: !!user,
    staleTime: CACHE_TIMES.MEDIUM, // 5 minutes
    gcTime: GC_TIMES.LONG,
  });
}

// =====================================================
// MUTATIONS
// =====================================================

/**
 * Revoke a remote kiosk token
 * Marks token as revoked and prevents further use
 */
export function useRevokeToken() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { selectedDealerId } = useDealerFilter();
  const { user } = useAuth();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (params: { tokenId: string; reason?: string }) => {
      if (!user) throw new Error(t('remote_kiosk_management.messages.not_authenticated'));

      const { data, error } = await supabase
        .from('remote_kiosk_tokens')
        .update({
          status: 'revoked',
          revoked_at: new Date().toISOString(),
          revoked_by: user.id,
          revoke_reason: params.reason || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.tokenId)
        .select()
        .single();

      if (error) throw error;
      return data as RemoteKioskToken;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remote_kiosk_tokens'] });
      queryClient.invalidateQueries({ queryKey: ['remote_kiosk_token_stats'] });

      toast({
        title: t('remote_kiosk_management.messages.token_revoked'),
        description: t('remote_kiosk_management.messages.token_revoked_success')
      });
    },
    onError: (error) => {
      toast({
        title: t('remote_kiosk_management.messages.revoke_failed'),
        description: error instanceof Error ? error.message : t('remote_kiosk_management.messages.unknown_error'),
        variant: "destructive"
      });
    }
  });
}

/**
 * Delete a remote kiosk token permanently
 * Admin-only operation
 */
export function useDeleteToken() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { selectedDealerId } = useDealerFilter();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (tokenId: string) => {
      const { data, error } = await supabase
        .from('remote_kiosk_tokens')
        .delete()
        .eq('id', tokenId)
        .select();

      if (error) throw error;

      // Validate that a row was actually deleted (prevents silent RLS failures)
      if (!data || data.length === 0) {
        throw new Error('Failed to delete token. You may not have permission or the token may not exist.');
      }

      return tokenId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['remote_kiosk_tokens'] });
      queryClient.invalidateQueries({ queryKey: ['remote_kiosk_token_stats'] });

      toast({
        title: t('remote_kiosk_management.messages.token_deleted'),
        description: t('remote_kiosk_management.messages.token_deleted_success')
      });
    },
    onError: (error) => {
      toast({
        title: t('remote_kiosk_management.messages.delete_failed'),
        description: error instanceof Error ? error.message : t('remote_kiosk_management.messages.unknown_error'),
        variant: "destructive"
      });
    }
  });
}

/**
 * Batch revoke multiple tokens
 */
export function useBatchRevokeTokens() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (params: { tokenIds: string[]; reason?: string }) => {
      if (!user) throw new Error(t('remote_kiosk_management.messages.not_authenticated'));

      const { data, error } = await supabase
        .from('remote_kiosk_tokens')
        .update({
          status: 'revoked',
          revoked_at: new Date().toISOString(),
          revoked_by: user.id,
          revoke_reason: params.reason || 'Batch revoked',
          updated_at: new Date().toISOString(),
        })
        .in('id', params.tokenIds)
        .select();

      if (error) throw error;
      return data as RemoteKioskToken[];
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['remote_kiosk_tokens'] });
      queryClient.invalidateQueries({ queryKey: ['remote_kiosk_token_stats'] });

      toast({
        title: t('remote_kiosk_management.messages.batch_revoked'),
        description: t('remote_kiosk_management.messages.batch_revoked_success', { count: data.length })
      });
    },
    onError: (error) => {
      toast({
        title: t('remote_kiosk_management.messages.batch_revoke_failed'),
        description: error instanceof Error ? error.message : t('remote_kiosk_management.messages.unknown_error'),
        variant: "destructive"
      });
    }
  });
}

/**
 * Batch delete multiple tokens
 */
export function useBatchDeleteTokens() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (tokenIds: string[]) => {
      const { error } = await supabase
        .from('remote_kiosk_tokens')
        .delete()
        .in('id', tokenIds);

      if (error) throw error;
      return tokenIds;
    },
    onSuccess: (tokenIds) => {
      queryClient.invalidateQueries({ queryKey: ['remote_kiosk_tokens'] });
      queryClient.invalidateQueries({ queryKey: ['remote_kiosk_token_stats'] });

      toast({
        title: t('remote_kiosk_management.messages.batch_deleted'),
        description: t('remote_kiosk_management.messages.batch_deleted_success', { count: tokenIds.length })
      });
    },
    onError: (error) => {
      toast({
        title: t('remote_kiosk_management.messages.batch_delete_failed'),
        description: error instanceof Error ? error.message : t('remote_kiosk_management.messages.unknown_error'),
        variant: "destructive"
      });
    }
  });
}
