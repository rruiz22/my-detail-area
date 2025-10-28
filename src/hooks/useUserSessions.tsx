import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ✅ PERFORMANCE FIX: Use React Query for automatic caching
  const { data: sessions = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['user_sessions', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('last_activity', { ascending: false });

      if (error) throw error;

      return data || [];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes cache
  });

  const terminateSession = async (sessionId: string) => {
    try {
      if (!user) throw new Error('No authenticated user');

      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', user.id);

      if (error) throw error;

      // ✅ Invalidate cache to refetch sessions
      queryClient.invalidateQueries({ queryKey: ['user_sessions', user.id] });

      // Log activity (non-blocking)
      supabase
        .from('user_activity_log')
        .insert({
          user_id: user.id,
          action_type: 'session_terminated',
          action_description: 'Session terminated manually',
          details: { session_id: sessionId }
        })
        .then(() => {})
        .catch(err => console.error('Failed to log activity:', err));

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
    }
  };

  const terminateAllOtherSessions = async () => {
    try {
      if (!user) throw new Error('No authenticated user');

      const { error } = await supabase
        .from('user_sessions')
        .delete()
        .eq('user_id', user.id)
        .neq('is_current', true);

      if (error) throw error;

      // ✅ Invalidate cache to refetch sessions
      queryClient.invalidateQueries({ queryKey: ['user_sessions', user.id] });

      // Log activity (non-blocking)
      supabase
        .from('user_activity_log')
        .insert({
          user_id: user.id,
          action_type: 'all_sessions_terminated',
          action_description: 'All other sessions terminated'
        })
        .then(() => {})
        .catch(err => console.error('Failed to log activity:', err));

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
    }
  };

  return {
    sessions,
    loading,
    terminateSession,
    terminateAllOtherSessions,
    refetch
  };
};