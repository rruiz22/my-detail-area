import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AuditEvent {
  id: string;
  event_type: 'user_created' | 'user_updated' | 'user_deleted' | 'role_assigned' | 'invitation_sent' | 'membership_created';
  entity_type: 'user' | 'invitation' | 'membership' | 'role';
  entity_id: string;
  user_id: string;
  metadata: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  user_email?: string;
  affected_user_email?: string;
}

export const useUserAudit = (dealerId?: number) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0
  });

  const fetchAuditEvents = async (filters?: {
    eventType?: string;
    entityType?: string;
    userId?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('user_audit_log')
        .select(`
          *,
          profiles!user_id(email),
          affected_profiles:profiles!entity_id(email)
        `)
        .order('created_at', { ascending: false })
        .range(
          (pagination.page - 1) * pagination.limit,
          pagination.page * pagination.limit - 1
        );

      if (dealerId) {
        query = query.eq('dealer_id', dealerId);
      }

      if (filters?.eventType) {
        query = query.eq('event_type', filters.eventType);
      }

      if (filters?.entityType) {
        query = query.eq('entity_type', filters.entityType);
      }

      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }

      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      const formattedEvents: AuditEvent[] = (data || []).map((event: any) => ({
        id: event.id,
        event_type: event.event_type,
        entity_type: event.entity_type,
        entity_id: event.entity_id,
        user_id: event.user_id,
        metadata: event.metadata || {},
        ip_address: event.ip_address,
        user_agent: event.user_agent,
        created_at: event.created_at,
        user_email: event.profiles?.email,
        affected_user_email: event.affected_profiles?.email
      }));

      setAuditEvents(formattedEvents);
      setPagination(prev => ({
        ...prev,
        total: count || 0
      }));

    } catch (error: any) {
      console.error('Error fetching audit events:', error);
      toast({
        title: t('common.error'),
        description: error.message || 'Error loading audit events',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const logAuditEvent = async (event: Omit<AuditEvent, 'id' | 'created_at' | 'user_email' | 'affected_user_email'>) => {
    try {
      const { error } = await supabase
        .from('user_audit_log')
        .insert({
          event_type: event.event_type,
          entity_type: event.entity_type,
          entity_id: event.entity_id,
          user_id: event.user_id,
          metadata: event.metadata,
          ip_address: event.ip_address,
          user_agent: event.user_agent,
          dealer_id: dealerId
        });

      if (error) throw error;
      
      // Refresh audit events after logging
      await fetchAuditEvents();
      
    } catch (error: any) {
      console.error('Error logging audit event:', error);
    }
  };

  const exportAuditLog = async (filters?: {
    eventType?: string;
    entityType?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    try {
      let query = supabase
        .from('user_audit_log')
        .select(`
          *,
          profiles!user_id(email, first_name, last_name),
          affected_profiles:profiles!entity_id(email, first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (dealerId) {
        query = query.eq('dealer_id', dealerId);
      }

      if (filters?.eventType) {
        query = query.eq('event_type', filters.eventType);
      }

      if (filters?.entityType) {
        query = query.eq('entity_type', filters.entityType);
      }

      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Convert to CSV
      const csvContent = [
        ['Date', 'Event Type', 'Entity Type', 'User', 'Entity', 'Details', 'IP Address'].join(','),
        ...(data || []).map((event: any) => [
          new Date(event.created_at).toLocaleString(),
          event.event_type,
          event.entity_type,
          event.profiles?.email || 'Unknown',
          event.affected_profiles?.email || event.entity_id,
          JSON.stringify(event.metadata || {}),
          event.ip_address || 'N/A'
        ].join(','))
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-audit-log-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: t('common.success'),
        description: 'Audit log exported successfully',
      });

    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message || 'Error exporting audit log',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchAuditEvents();
  }, [pagination.page, dealerId]);

  return {
    auditEvents,
    loading,
    pagination,
    fetchAuditEvents,
    logAuditEvent,
    exportAuditLog,
    setPagination
  };
};