/**
 * Subscription Manager
 *
 * Manages Supabase real-time subscriptions with connection limits and intelligent cleanup.
 * Prevents subscription leaks and enforces business rules about maximum concurrent connections.
 */

import { useCallback, useEffect, useRef } from 'react';
import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { subscriptionLimits } from '@/config/realtimeFeatures';

interface SubscriptionInfo {
  id: string;
  channel: RealtimeChannel;
  priority: 'high' | 'medium' | 'low';
  createdAt: number;
  lastActivity: number;
}

class SubscriptionManager {
  private subscriptions: Map<string, SubscriptionInfo> = new Map();
  private readonly maxConcurrent: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(maxConcurrent: number = subscriptionLimits.maxConcurrent) {
    this.maxConcurrent = maxConcurrent;
    this.startCleanupInterval();
  }

  private startCleanupInterval() {
    // Cleanup stale subscriptions every 30 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleSubscriptions();
    }, 30000);
  }

  private cleanupStaleSubscriptions() {
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000; // 5 minutes

    for (const [id, sub] of this.subscriptions.entries()) {
      if (now - sub.lastActivity > staleThreshold) {
        console.log(`🧹 Cleaning up stale subscription: ${id}`);
        this.removeSubscription(id);
      }
    }
  }

  private makeRoom(priority: 'high' | 'medium' | 'low'): boolean {
    if (this.subscriptions.size < this.maxConcurrent) {
      return true;
    }

    // Find lowest priority subscription to remove
    let candidateForRemoval: [string, SubscriptionInfo] | null = null;
    let lowestPriority: number = priority === 'high' ? 3 : priority === 'medium' ? 2 : 1;

    for (const [id, sub] of this.subscriptions.entries()) {
      const subPriority = sub.priority === 'high' ? 3 : sub.priority === 'medium' ? 2 : 1;

      if (subPriority < lowestPriority) {
        candidateForRemoval = [id, sub];
        lowestPriority = subPriority;
      }
    }

    if (candidateForRemoval) {
      console.log(`🔄 Removing lower priority subscription ${candidateForRemoval[0]} to make room for ${priority} priority`);
      this.removeSubscription(candidateForRemoval[0]);
      return true;
    }

    return false;
  }

  addSubscription(
    id: string,
    channel: RealtimeChannel,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): boolean {
    // Check if subscription already exists
    if (this.subscriptions.has(id)) {
      console.warn(`⚠️ Subscription ${id} already exists`);
      return true;
    }

    // Make room if necessary
    if (!this.makeRoom(priority)) {
      console.error(`❌ Cannot create subscription ${id}: Max concurrent limit reached`);
      return false;
    }

    // Add subscription
    const subscriptionInfo: SubscriptionInfo = {
      id,
      channel,
      priority,
      createdAt: Date.now(),
      lastActivity: Date.now()
    };

    this.subscriptions.set(id, subscriptionInfo);
    console.log(`✅ Added subscription ${id} (${priority} priority). Active: ${this.subscriptions.size}/${this.maxConcurrent}`);

    return true;
  }

  removeSubscription(id: string): void {
    const subscription = this.subscriptions.get(id);
    if (subscription) {
      subscription.channel.unsubscribe();
      this.subscriptions.delete(id);
      console.log(`🗑️ Removed subscription ${id}. Active: ${this.subscriptions.size}/${this.maxConcurrent}`);
    }
  }

  updateActivity(id: string): void {
    const subscription = this.subscriptions.get(id);
    if (subscription) {
      subscription.lastActivity = Date.now();
    }
  }

  getActiveCount(): number {
    return this.subscriptions.size;
  }

  getSubscriptionInfo(id: string): SubscriptionInfo | undefined {
    return this.subscriptions.get(id);
  }

  cleanup(): void {
    // Remove all subscriptions
    for (const [id] of this.subscriptions.entries()) {
      this.removeSubscription(id);
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  getStatus() {
    return {
      active: this.subscriptions.size,
      max: this.maxConcurrent,
      subscriptions: Array.from(this.subscriptions.entries()).map(([id, sub]) => ({
        id,
        priority: sub.priority,
        age: Date.now() - sub.createdAt,
        lastActivity: Date.now() - sub.lastActivity
      }))
    };
  }
}

// Global instance
const globalSubscriptionManager = new SubscriptionManager();

// React hook for subscription management
export const useSubscriptionManager = () => {
  const managerRef = useRef(globalSubscriptionManager);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Don't cleanup global manager on component unmount
      // Only cleanup on app shutdown
    };
  }, []);

  const createSubscription = useCallback((
    id: string,
    channelFactory: () => RealtimeChannel,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): RealtimeChannel | null => {
    try {
      const channel = channelFactory();
      const success = managerRef.current.addSubscription(id, channel, priority);

      if (!success) {
        console.error(`Failed to create subscription ${id}: Resource limit reached`);
        return null;
      }

      return channel;
    } catch (error) {
      console.error(`Error creating subscription ${id}:`, error);
      return null;
    }
  }, []);

  const removeSubscription = useCallback((id: string) => {
    managerRef.current.removeSubscription(id);
  }, []);

  const updateActivity = useCallback((id: string) => {
    managerRef.current.updateActivity(id);
  }, []);

  const getStatus = useCallback(() => {
    return managerRef.current.getStatus();
  }, []);

  return {
    createSubscription,
    removeSubscription,
    updateActivity,
    getStatus,
    isAtLimit: managerRef.current.getActiveCount() >= subscriptionLimits.maxConcurrent
  };
};

// Hook for debugging subscription status
export const useSubscriptionDebugger = () => {
  const { getStatus } = useSubscriptionManager();

  useEffect(() => {
    // Log subscription status every 30 seconds in development
    if (process.env.NODE_ENV === 'development') {
      const interval = setInterval(() => {
        const status = getStatus();
        console.log('📊 Subscription Status:', status);
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [getStatus]);

  return { getStatus };
};