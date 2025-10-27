/**
 * Integrations Management Hook
 *
 * Provides a centralized interface for managing third-party integrations
 * with automatic caching, real-time updates, and error handling
 *
 * @hook
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from './usePermissions';
import { useToast } from './use-toast';

export type IntegrationType =
  | 'slack'
  | 'webhook'
  | 'email_smtp'
  | 'sms_provider'
  | 'payment_gateway'
  | 'analytics'
  | 'crm'
  | 'custom';

export type IntegrationStatus =
  | 'active'
  | 'inactive'
  | 'error'
  | 'pending_auth'
  | 'revoked';

export interface Integration {
  id: string;
  dealer_id: number;
  integration_type: IntegrationType;
  integration_name: string;
  config: Record<string, any>;
  oauth_scopes?: string[];
  status: IntegrationStatus;
  enabled: boolean;
  last_sync_at?: string;
  last_error?: string;
  error_count: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface RateLimit {
  id: string;
  dealer_id: number;
  endpoint: string;
  limit_per_window: number;
  window_minutes: number;
  request_count: number;
  window_start: string;
  window_end: string;
  last_request_at?: string;
}

export interface AuditLogEntry {
  id: string;
  event_type: string;
  event_category: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  user_id?: string;
  dealer_id?: number;
  integration_id?: string;
  metadata?: Record<string, any>;
  error_message?: string;
  created_at: string;
}

export function useIntegrations() {
  const { enhancedUser } = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const dealerId = enhancedUser?.dealership_id;

  // ================================================
  // FETCH INTEGRATIONS
  // ================================================

  const {
    data: integrations = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['integrations', dealerId],
    queryFn: async () => {
      if (!dealerId) return [];

      const { data, error } = await supabase
        .from('dealer_integrations')
        .select('*')
        .eq('dealer_id', dealerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Integration[];
    },
    enabled: !!dealerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // ================================================
  // GET INTEGRATION BY TYPE
  // ================================================

  const getIntegration = useCallback((type: IntegrationType): Integration | undefined => {
    return integrations.find(i => i.integration_type === type);
  }, [integrations]);

  // ================================================
  // CHECK IF INTEGRATION IS ENABLED
  // ================================================

  const isIntegrationEnabled = useCallback((type: IntegrationType): boolean => {
    const integration = getIntegration(type);
    return integration?.enabled === true && integration?.status === 'active';
  }, [getIntegration]);

  // ================================================
  // UPDATE INTEGRATION
  // ================================================

  const updateIntegrationMutation = useMutation({
    mutationFn: async ({
      id,
      updates
    }: {
      id: string;
      updates: Partial<Integration>;
    }) => {
      const { data, error } = await supabase
        .from('dealer_integrations')
        .update({
          ...updates,
          updated_by: enhancedUser?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', dealerId] });
    },
    onError: (error) => {
      console.error('Failed to update integration:', error);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // ================================================
  // DELETE INTEGRATION
  // ================================================

  const deleteIntegrationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('dealer_integrations')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations', dealerId] });
      toast({
        title: 'Integration Deleted',
        description: 'The integration has been removed successfully'
      });
    },
    onError: (error) => {
      console.error('Failed to delete integration:', error);
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // ================================================
  // TOGGLE INTEGRATION ENABLED/DISABLED
  // ================================================

  const toggleIntegration = useCallback(async (id: string, enabled: boolean) => {
    await updateIntegrationMutation.mutateAsync({
      id,
      updates: { enabled }
    });
  }, [updateIntegrationMutation]);

  // ================================================
  // FETCH RATE LIMITS
  // ================================================

  const {
    data: rateLimits = [],
    isLoading: rateLimitsLoading
  } = useQuery({
    queryKey: ['rate-limits', dealerId],
    queryFn: async () => {
      if (!dealerId) return [];

      const { data, error } = await supabase
        .from('api_rate_limits')
        .select('*')
        .eq('dealer_id', dealerId);

      if (error) throw error;
      return data as RateLimit[];
    },
    enabled: !!dealerId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  // ================================================
  // CHECK RATE LIMIT
  // ================================================

  const checkRateLimit = useCallback((endpoint: string): {
    allowed: boolean;
    remaining: number;
    resetAt: string;
  } => {
    const limit = rateLimits.find(l => l.endpoint === endpoint);

    if (!limit) {
      return { allowed: true, remaining: 100, resetAt: new Date().toISOString() };
    }

    const now = new Date();
    const windowEnd = new Date(limit.window_end);

    // Check if window expired
    if (windowEnd < now) {
      return {
        allowed: true,
        remaining: limit.limit_per_window,
        resetAt: new Date(now.getTime() + limit.window_minutes * 60000).toISOString()
      };
    }

    // Check if limit exceeded
    const remaining = Math.max(0, limit.limit_per_window - limit.request_count);
    const allowed = limit.request_count < limit.limit_per_window;

    return {
      allowed,
      remaining,
      resetAt: limit.window_end
    };
  }, [rateLimits]);

  // ================================================
  // FETCH AUDIT LOGS
  // ================================================

  const {
    data: auditLogs = [],
    isLoading: auditLogsLoading
  } = useQuery({
    queryKey: ['audit-logs', dealerId],
    queryFn: async () => {
      if (!dealerId) return [];

      const { data, error } = await supabase
        .from('security_audit_log')
        .select('*')
        .eq('dealer_id', dealerId)
        .eq('event_category', 'integrations')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as AuditLogEntry[];
    },
    enabled: !!dealerId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // ================================================
  // REAL-TIME SUBSCRIPTION
  // ================================================

  useEffect(() => {
    if (!dealerId) return;

    const channel = supabase
      .channel(`integrations:${dealerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dealer_integrations',
          filter: `dealer_id=eq.${dealerId}`
        },
        () => {
          // Refetch integrations on any change
          queryClient.invalidateQueries({ queryKey: ['integrations', dealerId] });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [dealerId, queryClient]);

  // ================================================
  // RETURN HOOK INTERFACE
  // ================================================

  return {
    // Data
    integrations,
    rateLimits,
    auditLogs,

    // Loading states
    isLoading,
    rateLimitsLoading,
    auditLogsLoading,

    // Error state
    error,

    // Queries
    getIntegration,
    isIntegrationEnabled,
    checkRateLimit,

    // Mutations
    updateIntegration: updateIntegrationMutation.mutateAsync,
    deleteIntegration: deleteIntegrationMutation.mutateAsync,
    toggleIntegration,

    // Mutation states
    isUpdating: updateIntegrationMutation.isPending,
    isDeleting: deleteIntegrationMutation.isPending,

    // Refetch
    refetch
  };
}

/**
 * Hook for managing OAuth state tokens
 */
export function useOAuthState() {
  const { enhancedUser } = usePermissions();

  const createOAuthState = useCallback(async (integrationType: IntegrationType) => {
    if (!enhancedUser?.id || !enhancedUser?.dealership_id) {
      throw new Error('User not authenticated');
    }

    // Generate state token
    const stateData = {
      dealer_id: enhancedUser.dealership_id,
      user_id: enhancedUser.id,
      timestamp: Date.now(),
      nonce: crypto.randomUUID()
    };

    const stateToken = btoa(JSON.stringify(stateData));

    // Store in database
    const { error } = await supabase
      .from('oauth_states')
      .insert({
        state_token: stateToken,
        dealer_id: enhancedUser.dealership_id,
        user_id: enhancedUser.id,
        integration_type: integrationType,
      });

    if (error) throw error;

    return stateToken;
  }, [enhancedUser]);

  return { createOAuthState };
}
