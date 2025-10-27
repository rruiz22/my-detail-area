import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SecurityAuditLog } from '@/types/settings';

/**
 * Hook: useAuditLog
 *
 * Manages security audit log viewing with comprehensive filtering.
 *
 * FEATURES:
 * - Read security_audit_log table with multiple filter options
 * - Real-time updates via automatic refetch (30-second interval)
 * - Pagination support (client-side with configurable limit)
 * - Type-safe filter interface
 * - RLS enforced (system_admin only)
 *
 * USAGE:
 * const { logs, isLoading, error, refetch } = useAuditLog({
 *   eventType: 'login',
 *   severity: 'critical',
 *   startDate: '2025-01-01T00:00:00',
 *   endDate: '2025-12-31T23:59:59',
 * });
 */

export interface AuditLogFilters {
  eventType?: string;
  eventCategory?: string;
  severity?: string;
  userId?: string;
  dealerId?: number;
  startDate?: string; // ISO 8601 format
  endDate?: string; // ISO 8601 format
  success?: boolean;
  limit?: number; // Default: 100
}

export interface UseAuditLogOptions extends AuditLogFilters {
  refetchInterval?: number; // milliseconds, default: 30000 (30s)
  enabled?: boolean; // default: true
}

export function useAuditLog(options: UseAuditLogOptions = {}) {
  const {
    eventType,
    eventCategory,
    severity,
    userId,
    dealerId,
    startDate,
    endDate,
    success,
    limit = 100,
    refetchInterval = 30000,
    enabled = true,
  } = options;

  const {
    data: logs,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: [
      'security-audit-log',
      eventType,
      eventCategory,
      severity,
      userId,
      dealerId,
      startDate,
      endDate,
      success,
      limit,
    ],
    queryFn: async () => {
      let query = supabase
        .from('security_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      // Apply filters
      if (eventType && eventType !== 'all') {
        query = query.eq('event_type', eventType);
      }

      if (eventCategory && eventCategory !== 'all') {
        query = query.eq('event_category', eventCategory);
      }

      if (severity && severity !== 'all') {
        query = query.eq('severity', severity);
      }

      if (userId) {
        query = query.eq('user_id', userId);
      }

      if (dealerId) {
        query = query.eq('dealer_id', dealerId);
      }

      if (startDate) {
        query = query.gte('created_at', startDate);
      }

      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      if (success !== undefined) {
        query = query.eq('success', success);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[Audit Log] Query failed:', error);
        throw error;
      }

      return (data || []) as SecurityAuditLog[];
    },
    refetchInterval, // Auto-refresh for real-time updates
    enabled, // Can be disabled for conditional fetching
    staleTime: 10 * 1000, // 10 seconds
    retry: 2,
  });

  return {
    logs: logs || [],
    isLoading,
    error,
    refetch,
    isFetching,
  };
}

/**
 * Hook: useAuditLogStats
 *
 * Provides aggregated statistics for the audit log dashboard.
 *
 * USAGE:
 * const { stats, isLoading } = useAuditLogStats({ dealerId: 1 });
 */
export interface AuditLogStats {
  total_events: number;
  events_today: number;
  critical_events: number;
  failed_operations: number;
  unique_users: number;
  event_types: Record<string, number>;
  severity_distribution: Record<string, number>;
}

export function useAuditLogStats(filters: { dealerId?: number } = {}) {
  const { dealerId } = filters;

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['security-audit-log-stats', dealerId],
    queryFn: async () => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      // Fetch all logs for statistics (limit to recent 1000)
      let query = supabase
        .from('security_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (dealerId) {
        query = query.eq('dealer_id', dealerId);
      }

      const { data: logs, error } = await query;

      if (error) {
        console.error('[Audit Log Stats] Query failed:', error);
        throw error;
      }

      if (!logs || logs.length === 0) {
        return {
          total_events: 0,
          events_today: 0,
          critical_events: 0,
          failed_operations: 0,
          unique_users: 0,
          event_types: {},
          severity_distribution: {},
        };
      }

      // Calculate statistics
      const uniqueUsers = new Set(logs.map((log) => log.user_id).filter(Boolean));
      const eventTypeCounts: Record<string, number> = {};
      const severityCounts: Record<string, number> = {};

      let eventsToday = 0;
      let criticalEvents = 0;
      let failedOperations = 0;

      logs.forEach((log) => {
        // Count by event type
        eventTypeCounts[log.event_type] = (eventTypeCounts[log.event_type] || 0) + 1;

        // Count by severity
        severityCounts[log.severity] = (severityCounts[log.severity] || 0) + 1;

        // Events today
        if (log.created_at >= todayStart) {
          eventsToday++;
        }

        // Critical events
        if (log.severity === 'critical') {
          criticalEvents++;
        }

        // Failed operations
        if (!log.success) {
          failedOperations++;
        }
      });

      return {
        total_events: logs.length,
        events_today: eventsToday,
        critical_events: criticalEvents,
        failed_operations: failedOperations,
        unique_users: uniqueUsers.size,
        event_types: eventTypeCounts,
        severity_distribution: severityCounts,
      } as AuditLogStats;
    },
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000, // Refetch every minute
  });

  return {
    stats,
    isLoading,
    error,
  };
}
