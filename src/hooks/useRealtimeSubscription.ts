import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

/**
 * Generic hook for Supabase real-time subscriptions
 * Automatically invalidates query cache on database changes
 */
export function useRealtimeSubscription(config: {
  table: string;
  filter?: string;
  filterValue?: string;
  queryKeysToInvalidate: string[][];
  onEvent?: () => void;  // Optional callback for custom invalidation
  enabled?: boolean;
}) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (config.enabled === false) return;

    // Build filter if provided
    const filterConfig = config.filter && config.filterValue
      ? { filter: `${config.filter}=eq.${config.filterValue}` }
      : {};

    // Subscribe to changes
    const channel = supabase
      .channel(`${config.table}-changes`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: config.table,
          ...filterConfig,
        },
        (payload) => {
          console.log(`✅ [Real-time] ${config.table} changed:`, payload.eventType);

          // Invalidate all specified query keys
          config.queryKeysToInvalidate.forEach((queryKey) => {
            queryClient.invalidateQueries({ queryKey });
          });

          // Call optional custom callback
          if (config.onEvent) {
            config.onEvent();
          }
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      supabase.removeChannel(channel);
    };
  }, [
    config.table,
    config.filter,
    config.filterValue,
    config.enabled,
    queryClient,
  ]);
}
