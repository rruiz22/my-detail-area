import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { OrderData } from '@/types/order';

interface ScheduleUpdate {
  id: string;
  due_date?: string;
  status?: string;
  estimated_completion?: string;
  assigned_to?: string;
  updated_at: string;
}

interface UseRealtimeScheduleOptions {
  orderId: string;
  enabled?: boolean;
  onScheduleUpdate?: (update: ScheduleUpdate) => void;
}

export function useRealtimeSchedule({
  orderId,
  enabled = true,
  onScheduleUpdate
}: UseRealtimeScheduleOptions) {
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Handle real-time schedule updates
  const handleScheduleChange = useCallback((payload: any) => {
    const { new: newData } = payload;

    if (newData && newData.id === orderId) {
      const scheduleUpdate: ScheduleUpdate = {
        id: newData.id,
        due_date: newData.due_date,
        status: newData.status,
        estimated_completion: newData.estimated_completion,
        assigned_to: newData.assigned_to,
        updated_at: newData.updated_at
      };

      setLastUpdate(new Date().toISOString());
      onScheduleUpdate?.(scheduleUpdate);

      console.log('📅 Schedule update received:', {
        orderId: newData.id,
        changes: {
          due_date: newData.due_date,
          status: newData.status,
          updated_at: newData.updated_at
        }
      });
    }
  }, [orderId, onScheduleUpdate]);

  // Setup real-time subscription
  useEffect(() => {
    if (!enabled || !orderId) return;

    console.log('📡 Setting up real-time schedule subscription for order:', orderId);

    const channel = supabase
      .channel(`schedule_updates_${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`
        },
        handleScheduleChange
      )
      .subscribe((status) => {
        console.log('📡 Schedule subscription status:', status);

        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setConnectionError(null);
        } else if (status === 'CHANNEL_ERROR') {
          setIsConnected(false);
          setConnectionError('Failed to connect to real-time updates');
        } else if (status === 'TIMED_OUT') {
          setIsConnected(false);
          setConnectionError('Connection timed out');
        }
      });

    // Cleanup subscription
    return () => {
      console.log('🔌 Cleaning up schedule subscription for order:', orderId);
      supabase.removeChannel(channel);
      setIsConnected(false);
    };
  }, [orderId, enabled, handleScheduleChange]);

  // Heartbeat to monitor connection health
  useEffect(() => {
    if (!enabled || !isConnected) return;

    const heartbeat = setInterval(() => {
      // Simple ping to check if connection is still alive
      if (supabase.realtime.channels.length === 0) {
        setIsConnected(false);
        setConnectionError('Connection lost');
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(heartbeat);
  }, [enabled, isConnected]);

  return {
    isConnected,
    connectionError,
    lastUpdate,
    // Manual refresh function for when real-time fails
    refreshConnection: useCallback(() => {
      setConnectionError(null);
      // Re-trigger the effect by toggling enabled state
    }, [])
  };
}