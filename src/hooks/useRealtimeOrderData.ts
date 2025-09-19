/**
 * Real-time Order Data Hook
 *
 * Efficient real-time subscription management for order modal data.
 * Handles connection lifecycle, subscription batching, and data synchronization
 * with intelligent reconnection and error recovery.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { OrderAttachment, OrderComment, OrderActivity, OrderFollower } from '@/types/order';

interface RealtimeConfig {
  enabled: boolean;
  reconnectAttempts: number;
  reconnectDelay: number;
  heartbeatInterval: number;
  batchUpdates: boolean;
  batchDelay: number;
}

interface RealtimeUpdate {
  table: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  record: any;
  oldRecord?: any;
  timestamp: number;
}

interface RealtimeMetrics {
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  subscriptionCount: number;
  updateCount: number;
  errorCount: number;
  lastUpdate?: number;
  lastError?: string;
  reconnectAttempts: number;
}

interface RealtimeHandlers {
  onAttachmentChange?: (attachment: OrderAttachment, eventType: string) => void;
  onCommentChange?: (comment: OrderComment, eventType: string) => void;
  onActivityChange?: (activity: OrderActivity, eventType: string) => void;
  onFollowerChange?: (follower: OrderFollower, eventType: string) => void;
  onConnectionChange?: (status: RealtimeMetrics['connectionStatus']) => void;
  onError?: (error: string) => void;
}

const DEFAULT_CONFIG: RealtimeConfig = {
  enabled: true,
  reconnectAttempts: 5,
  reconnectDelay: 2000,
  heartbeatInterval: 30000,
  batchUpdates: true,
  batchDelay: 100
};

/**
 * Real-time subscription hook for order modal data
 */
export function useRealtimeOrderData(
  orderId: string | null,
  handlers: RealtimeHandlers,
  config: Partial<RealtimeConfig> = {}
) {
  const [metrics, setMetrics] = useState<RealtimeMetrics>({
    connectionStatus: 'disconnected',
    subscriptionCount: 0,
    updateCount: 0,
    errorCount: 0,
    reconnectAttempts: 0
  });

  const configRef = useRef<RealtimeConfig>({ ...DEFAULT_CONFIG, ...config });
  const channelRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const updateBatchRef = useRef<RealtimeUpdate[]>([]);
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  // Update handlers when metrics change
  const updateMetrics = useCallback((updates: Partial<RealtimeMetrics>) => {
    setMetrics(prev => {
      const newMetrics = { ...prev, ...updates };

      // Notify connection status changes
      if (updates.connectionStatus && handlers.onConnectionChange) {
        handlers.onConnectionChange(updates.connectionStatus);
      }

      return newMetrics;
    });
  }, [handlers.onConnectionChange]);

  // Process batched updates
  const processBatchedUpdates = useCallback(() => {
    if (updateBatchRef.current.length === 0) return;

    const updates = [...updateBatchRef.current];
    updateBatchRef.current = [];

    // Group updates by table for efficient processing
    const groupedUpdates = updates.reduce((acc, update) => {
      if (!acc[update.table]) acc[update.table] = [];
      acc[update.table].push(update);
      return acc;
    }, {} as Record<string, RealtimeUpdate[]>);

    // Process each table's updates
    Object.entries(groupedUpdates).forEach(([table, tableUpdates]) => {
      tableUpdates.forEach(update => {
        handleRealtimeChange(table, update.eventType, update.record, update.oldRecord);
      });
    });

    updateMetrics({ updateCount: metrics.updateCount + updates.length });
  }, [metrics.updateCount, updateMetrics]);

  // Handle individual real-time changes
  const handleRealtimeChange = useCallback((
    table: string,
    eventType: string,
    newRecord: any,
    oldRecord?: any
  ) => {
    try {
      switch (table) {
        case 'order_attachments':
          if (handlers.onAttachmentChange) {
            handlers.onAttachmentChange(newRecord as OrderAttachment, eventType);
          }
          break;

        case 'order_comments':
          if (handlers.onCommentChange) {
            // Enrich comment with user data if available
            const enrichedComment = {
              ...newRecord,
              user_name: newRecord.user_name || 'System User'
            } as OrderComment;
            handlers.onCommentChange(enrichedComment, eventType);
          }
          break;

        case 'order_activities':
          if (handlers.onActivityChange) {
            handlers.onActivityChange(newRecord as OrderActivity, eventType);
          }
          break;

        case 'order_followers':
          if (handlers.onFollowerChange) {
            handlers.onFollowerChange(newRecord as OrderFollower, eventType);
          }
          break;

        default:
          console.warn('Unhandled real-time table update:', table);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error processing real-time update';
      console.error('Real-time update processing error:', errorMessage);

      updateMetrics({
        errorCount: metrics.errorCount + 1,
        lastError: errorMessage
      });

      if (handlers.onError) {
        handlers.onError(errorMessage);
      }
    }
  }, [handlers, metrics.errorCount, updateMetrics]);

  // Add update to batch or process immediately
  const addToBatch = useCallback((
    table: string,
    eventType: 'INSERT' | 'UPDATE' | 'DELETE',
    record: any,
    oldRecord?: any
  ) => {
    const update: RealtimeUpdate = {
      table,
      eventType,
      record,
      oldRecord,
      timestamp: Date.now()
    };

    if (configRef.current.batchUpdates) {
      updateBatchRef.current.push(update);

      // Clear existing batch timeout
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }

      // Set new batch timeout
      batchTimeoutRef.current = setTimeout(() => {
        processBatchedUpdates();
      }, configRef.current.batchDelay);
    } else {
      // Process immediately
      handleRealtimeChange(table, eventType, record, oldRecord);
      updateMetrics({ updateCount: metrics.updateCount + 1 });
    }
  }, [handleRealtimeChange, processBatchedUpdates, metrics.updateCount, updateMetrics]);

  // Create real-time subscription
  const createSubscription = useCallback(async () => {
    if (!orderId || !configRef.current.enabled) return;

    try {
      updateMetrics({ connectionStatus: 'connecting' });

      // Create channel with unique name
      const channelName = `order-realtime-${orderId}-${Date.now()}`;
      const channel = supabase.channel(channelName);

      // Subscribe to order attachments
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_attachments',
          filter: `order_id=eq.${orderId}`
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          addToBatch(
            'order_attachments',
            payload.eventType,
            payload.new,
            payload.old
          );
        }
      );

      // Subscribe to order comments
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_comments',
          filter: `order_id=eq.${orderId}`
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          addToBatch(
            'order_comments',
            payload.eventType,
            payload.new,
            payload.old
          );
        }
      );

      // Subscribe to order activities (if table exists)
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_activities',
          filter: `order_id=eq.${orderId}`
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          addToBatch(
            'order_activities',
            payload.eventType,
            payload.new,
            payload.old
          );
        }
      );

      // Subscribe to order followers (if table exists)
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_followers',
          filter: `order_id=eq.${orderId}`
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          addToBatch(
            'order_followers',
            payload.eventType,
            payload.new,
            payload.old
          );
        }
      );

      // Handle channel status changes
      channel.on('system', {}, (payload) => {
        switch (payload.type) {
          case 'connected':
            updateMetrics({
              connectionStatus: 'connected',
              subscriptionCount: 4, // Number of table subscriptions
              lastUpdate: Date.now()
            });
            reconnectAttemptsRef.current = 0;
            startHeartbeat();
            break;

          case 'disconnected':
            updateMetrics({ connectionStatus: 'disconnected' });
            stopHeartbeat();
            scheduleReconnect();
            break;

          case 'error':
            const errorMessage = payload.message || 'Unknown connection error';
            updateMetrics({
              connectionStatus: 'error',
              errorCount: metrics.errorCount + 1,
              lastError: errorMessage
            });

            if (handlers.onError) {
              handlers.onError(errorMessage);
            }

            scheduleReconnect();
            break;
        }
      });

      // Subscribe to the channel
      const status = await channel.subscribe();

      if (status === 'SUBSCRIBED') {
        channelRef.current = channel;
        console.log('Real-time subscription established for order:', orderId);
      } else {
        throw new Error(`Subscription failed with status: ${status}`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown subscription error';
      console.error('Real-time subscription error:', errorMessage);

      updateMetrics({
        connectionStatus: 'error',
        errorCount: metrics.errorCount + 1,
        lastError: errorMessage
      });

      if (handlers.onError) {
        handlers.onError(errorMessage);
      }

      scheduleReconnect();
    }
  }, [orderId, addToBatch, handlers.onError, metrics.errorCount, updateMetrics]);

  // Start heartbeat to monitor connection
  const startHeartbeat = useCallback(() => {
    stopHeartbeat(); // Clear any existing heartbeat

    heartbeatTimeoutRef.current = setInterval(() => {
      if (channelRef.current) {
        // Simple heartbeat - just check if channel is still active
        const now = Date.now();
        if (metrics.lastUpdate && now - metrics.lastUpdate > configRef.current.heartbeatInterval * 2) {
          // No updates for too long, might be disconnected
          console.warn('Real-time connection seems stale, attempting reconnect');
          scheduleReconnect();
        }
      }
    }, configRef.current.heartbeatInterval);
  }, [metrics.lastUpdate]);

  // Stop heartbeat
  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearInterval(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  // Schedule reconnection with exponential backoff
  const scheduleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= configRef.current.reconnectAttempts) {
      console.error('Max reconnection attempts reached');
      updateMetrics({ connectionStatus: 'error' });
      return;
    }

    // Clear existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    const delay = configRef.current.reconnectDelay * Math.pow(2, reconnectAttemptsRef.current);
    reconnectAttemptsRef.current++;

    updateMetrics({ reconnectAttempts: reconnectAttemptsRef.current });

    console.log(`Scheduling reconnect attempt ${reconnectAttemptsRef.current} in ${delay}ms`);

    reconnectTimeoutRef.current = setTimeout(() => {
      disconnect();
      createSubscription();
    }, delay);
  }, [updateMetrics]);

  // Disconnect from real-time
  const disconnect = useCallback(() => {
    // Clear all timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
      batchTimeoutRef.current = null;
    }

    stopHeartbeat();

    // Process any remaining batched updates
    if (updateBatchRef.current.length > 0) {
      processBatchedUpdates();
    }

    // Remove channel subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    updateMetrics({
      connectionStatus: 'disconnected',
      subscriptionCount: 0
    });
  }, [stopHeartbeat, processBatchedUpdates, updateMetrics]);

  // Force reconnection
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    disconnect();
    createSubscription();
  }, [disconnect, createSubscription]);

  // Update configuration
  const updateConfig = useCallback((newConfig: Partial<RealtimeConfig>) => {
    configRef.current = { ...configRef.current, ...newConfig };

    // Reconnect if enabled status changed
    if (newConfig.enabled !== undefined) {
      if (newConfig.enabled) {
        createSubscription();
      } else {
        disconnect();
      }
    }
  }, [createSubscription, disconnect]);

  // Set up subscription when orderId changes
  useEffect(() => {
    if (orderId && configRef.current.enabled) {
      createSubscription();
    }

    return () => {
      disconnect();
    };
  }, [orderId, createSubscription, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    metrics,
    reconnect,
    disconnect,
    updateConfig,
    isConnected: metrics.connectionStatus === 'connected',
    isConnecting: metrics.connectionStatus === 'connecting',
    hasError: metrics.connectionStatus === 'error'
  };
}