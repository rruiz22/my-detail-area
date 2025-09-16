import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UserSession {
  id: string;
  user_id: string;
  session_token: string;
  ip_address?: unknown;
  user_agent?: string;
  location_info?: any;
  last_activity: string;
  expires_at?: string;
  is_current: boolean;
  created_at: string;
}

export const useUserSessions = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('No authenticated user');

      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('last_activity', { ascending: false });

      if (error) throw error;

      setSessions(data || []);

    } catch (error: any) {
      console.error('Error fetching sessions:', error);
      toast({
        title: t('common.error'),
        description: error.message || 'Error loading sessions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  const terminateSession = async (sessionId: string) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('No authenticated user');

      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', user.id);

      if (error) throw error;

      setSessions(prev => prev.filter(session => session.id !== sessionId));

      // Log activity
      await supabase
        .from('user_activity_log')
        .insert({
          user_id: user.id,
          action_type: 'session_terminated',
          action_description: 'Session terminated manually',
          details: { session_id: sessionId }
        });

      toast({
        title: t('common.success'),
        description: t('profile.session_terminated'),
      });

    } catch (error: any) {
      console.error('Error terminating session:', error);
      toast({
        title: t('common.error'),
        description: error.message || 'Error terminating session',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const terminateAllOtherSessions = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('No authenticated user');

      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .eq('user_id', user.id)
        .neq('is_current', true);

      if (error) throw error;

      setSessions(prev => prev.filter(session => session.is_current));

      // Log activity
      await supabase
        .from('user_activity_log')
        .insert({
          user_id: user.id,
          action_type: 'all_sessions_terminated',
          action_description: 'All other sessions terminated'
        });

      toast({
        title: t('common.success'),
        description: t('profile.all_sessions_terminated'),
      });

    } catch (error: any) {
      console.error('Error terminating sessions:', error);
      toast({
        title: t('common.error'),
        description: error.message || 'Error terminating sessions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return {
    sessions,
    loading,
    terminateSession,
    terminateAllOtherSessions,
    refetch: fetchSessions
  };
};