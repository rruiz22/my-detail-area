import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCallback } from 'react';
import { logger } from '@/utils/logger';

/**
 * CAUTION: This hook manages audit logging for changes to completed/cancelled orders
 * All changes are permanently logged for compliance and security purposes
 */
export function useOrderChangeAudit() {
  const { user } = useAuth();

  /**
   * Log a field change to the audit table
   * This function calls a database function that validates permissions and creates an audit record
   *
   * @param orderId - UUID of the order being modified
   * @param fieldName - Name of the field being changed (e.g., 'po', 'ro', 'tag', 'due_date')
   * @param oldValue - Previous value of the field (null if empty)
   * @param newValue - New value of the field (null if clearing)
   * @param reason - Optional reason for the change
   * @returns Audit record ID if successful, null if failed
   */
  const logFieldChange = useCallback(async (
    orderId: string,
    fieldName: string,
    oldValue: string | null | undefined,
    newValue: string | null | undefined,
    reason?: string
  ): Promise<string | null> => {
    // CAUTION: Validate we have a user
    if (!user) {
      logger.warn('[AUDIT] Cannot log order change: No user context', { orderId, fieldName });
      return null;
    }

    // CAUTION: Don't log if values haven't actually changed
    const normalizedOldValue = oldValue || null;
    const normalizedNewValue = newValue || null;

    if (normalizedOldValue === normalizedNewValue) {
      logger.info('[AUDIT] Skipping audit log: Values are identical', {
        orderId,
        fieldName,
        value: normalizedOldValue
      });
      return null;
    }

    try {
      logger.info('[AUDIT] Logging field change for completed/cancelled order', {
        orderId,
        fieldName,
        oldValue: normalizedOldValue,
        newValue: normalizedNewValue,
        userId: user.id,
        reason
      });

      // CAUTION: Call the database function with proper error handling
      const { data, error } = await supabase.rpc('log_order_field_change', {
        p_order_id: orderId,
        p_field_name: fieldName,
        p_old_value: normalizedOldValue,
        p_new_value: normalizedNewValue,
        p_reason: reason || null
      });

      if (error) {
        logger.error('[AUDIT] Failed to log order field change', error, {
          orderId,
          fieldName,
          userId: user.id,
          errorCode: error.code,
          errorMessage: error.message
        });

        // CAUTION: Don't throw - audit failures shouldn't block the update
        // But we should track that the audit failed
        console.error('⚠️  AUDIT LOG FAILED:', {
          orderId,
          fieldName,
          error: error.message
        });

        return null;
      }

      logger.info('[AUDIT] Successfully logged order field change', {
        orderId,
        fieldName,
        auditId: data,
        userId: user.id
      });

      return data as string;
    } catch (error) {
      logger.error('[AUDIT] Unexpected error in logFieldChange', error as Error, {
        orderId,
        fieldName,
        userId: user.id
      });

      // CAUTION: Log to console for visibility but don't block the operation
      console.error('⚠️  AUDIT LOG ERROR:', error);

      return null;
    }
  }, [user]);

  /**
   * Log multiple field changes in a single operation
   * Useful when updating multiple fields at once
   *
   * @param orderId - UUID of the order being modified
   * @param changes - Array of field changes
   * @param reason - Optional reason for the changes
   * @returns Array of audit record IDs
   */
  const logMultipleFieldChanges = useCallback(async (
    orderId: string,
    changes: Array<{
      fieldName: string;
      oldValue: string | null | undefined;
      newValue: string | null | undefined;
    }>,
    reason?: string
  ): Promise<string[]> => {
    if (!user) {
      logger.warn('[AUDIT] Cannot log multiple changes: No user context', {
        orderId,
        changeCount: changes.length
      });
      return [];
    }

    const auditIds: string[] = [];

    // CAUTION: Log each change individually for granular tracking
    for (const change of changes) {
      const auditId = await logFieldChange(
        orderId,
        change.fieldName,
        change.oldValue,
        change.newValue,
        reason
      );

      if (auditId) {
        auditIds.push(auditId);
      }
    }

    logger.info('[AUDIT] Logged multiple field changes', {
      orderId,
      changeCount: changes.length,
      successCount: auditIds.length,
      userId: user.id
    });

    return auditIds;
  }, [user, logFieldChange]);

  /**
   * Check if audit logging is required for an order based on its status
   *
   * @param orderStatus - Current status of the order
   * @returns true if audit logging should be performed
   */
  const shouldAuditChanges = useCallback((orderStatus: string): boolean => {
    // CAUTION: Only audit changes to completed or cancelled orders
    const auditableStatuses = ['completed', 'cancelled'];
    return auditableStatuses.includes(orderStatus);
  }, []);

  return {
    logFieldChange,
    logMultipleFieldChanges,
    shouldAuditChanges
  };
}