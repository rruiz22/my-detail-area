/**
 * Permission Audit Trail Utilities
 *
 * Helper functions to log permission changes to the audit trail.
 * All changes are automatically logged to the permission_audit_trail table.
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from './logger';

export type AuditActionType =
  | 'role_created'
  | 'role_updated'
  | 'role_deleted'
  | 'role_assigned'
  | 'role_unassigned'
  | 'permission_granted'
  | 'permission_revoked'
  | 'module_enabled'
  | 'module_disabled'
  | 'system_permission_granted'
  | 'system_permission_revoked';

export type AuditTargetType = 'role' | 'user' | 'module' | 'permission';

export interface AuditLogOptions {
  actorId: string;
  actionType: AuditActionType;
  targetType: AuditTargetType;
  targetId?: string;
  targetName?: string;
  dealerId?: number;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

/**
 * Log a permission change to the audit trail
 */
export async function logPermissionChange(options: AuditLogOptions): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc('log_permission_change', {
      p_actor_id: options.actorId,
      p_action_type: options.actionType,
      p_target_type: options.targetType,
      p_target_id: options.targetId || null,
      p_target_name: options.targetName || null,
      p_dealer_id: options.dealerId || null,
      p_old_value: options.oldValue || null,
      p_new_value: options.newValue || null,
      p_reason: options.reason || null,
      p_ip_address: options.ipAddress || null,
      p_user_agent: options.userAgent || navigator?.userAgent || null,
      p_session_id: options.sessionId || null
    });

    if (error) {
      logger.dev('❌ Failed to log permission change:', error);
      return null;
    }

    logger.dev('✅ Permission change logged:', {
      auditId: data,
      actionType: options.actionType,
      targetName: options.targetName
    });

    return data;
  } catch (error) {
    logger.dev('💥 Error logging permission change:', error);
    return null;
  }
}

/**
 * Get audit logs for a specific user
 */
export async function getUserAuditLogs(userId: string, limit = 50) {
  const { data, error } = await supabase
    .from('permission_audit_trail')
    .select('*')
    .or(`actor_id.eq.${userId},target_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    logger.dev('❌ Failed to fetch user audit logs:', error);
    return [];
  }

  return data || [];
}

/**
 * Get audit logs for a specific dealership
 */
export async function getDealershipAuditLogs(dealerId: number, limit = 100) {
  const { data, error } = await supabase
    .from('permission_audit_trail')
    .select('*')
    .eq('dealer_id', dealerId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    logger.dev('❌ Failed to fetch dealership audit logs:', error);
    return [];
  }

  return data || [];
}

/**
 * Get recent audit logs (system admins only)
 */
export async function getRecentAuditLogs(limit = 100) {
  const { data, error } = await supabase
    .from('permission_audit_log_summary')
    .select('*')
    .limit(limit);

  if (error) {
    logger.dev('❌ Failed to fetch recent audit logs:', error);
    return [];
  }

  return data || [];
}

/**
 * Search audit logs by action type
 */
export async function searchAuditLogsByAction(
  actionType: AuditActionType,
  dealerId?: number,
  limit = 50
) {
  let query = supabase
    .from('permission_audit_trail')
    .select('*')
    .eq('action_type', actionType)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (dealerId) {
    query = query.eq('dealer_id', dealerId);
  }

  const { data, error } = await query;

  if (error) {
    logger.dev('❌ Failed to search audit logs:', error);
    return [];
  }

  return data || [];
}

/**
 * Get audit logs for a specific date range
 */
export async function getAuditLogsByDateRange(
  startDate: Date,
  endDate: Date,
  dealerId?: number
) {
  let query = supabase
    .from('permission_audit_trail')
    .select('*')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: false });

  if (dealerId) {
    query = query.eq('dealer_id', dealerId);
  }

  const { data, error } = await query;

  if (error) {
    logger.dev('❌ Failed to fetch audit logs by date range:', error);
    return [];
  }

  return data || [];
}

/**
 * Get audit statistics for a dealership
 */
export async function getAuditStatistics(dealerId?: number) {
  let query = supabase
    .from('permission_audit_trail')
    .select('action_type, created_at');

  if (dealerId) {
    query = query.eq('dealer_id', dealerId);
  }

  const { data, error } = await query;

  if (error) {
    logger.dev('❌ Failed to fetch audit statistics:', error);
    return {
      totalChanges: 0,
      changesByAction: {},
      recentActivity: []
    };
  }

  // Calculate statistics
  const changesByAction = (data || []).reduce((acc: Record<string, number>, log: any) => {
    acc[log.action_type] = (acc[log.action_type] || 0) + 1;
    return acc;
  }, {});

  return {
    totalChanges: data?.length || 0,
    changesByAction,
    recentActivity: data?.slice(0, 10) || []
  };
}
