/**
 * Typed Event Bus for Order Events
 * Provides type-safe event emission and subscription
 */

type EventMap = {
  orderStatusChanged: { orderId: string; newStatus: string; orderType?: string };
  orderStatusUpdated: { orderId: string; newStatus: string; timestamp: number };
  orderUpdated: { orderId: string; updates: any; timestamp: number };
  orderCreated: { orderId: string; orderType: string };
  orderDeleted: { orderId: string; orderType: string };
  inventoryUpdated: { dealerId: number; vehicleCount: number; removedCount: number };
};

class TypedEventEmitter {
  private listeners: Map<keyof EventMap, Set<Function>> = new Map();

  /**
   * Subscribe to an event
   * Returns an unsubscribe function
   */
  on<K extends keyof EventMap>(event: K, handler: (data: EventMap[K]) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    // Return unsubscribe function
    return () => this.off(event, handler);
  }

  /**
   * Subscribe to an event (alias for on)
   * Returns an unsubscribe function
   */
  subscribe<K extends keyof EventMap>(event: K, handler: (data: EventMap[K]) => void): () => void {
    return this.on(event, handler);
  }

  /**
   * Unsubscribe from an event
   */
  off<K extends keyof EventMap>(event: K, handler: (data: EventMap[K]) => void): void {
    this.listeners.get(event)?.delete(handler);
  }

  /**
   * Emit an event to all subscribers
   */
  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    this.listeners.get(event)?.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    });
  }

  /**
   * Remove all listeners for an event (or all events if no event specified)
   */
  removeAllListeners(event?: keyof EventMap): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get listener count for debugging
   */
  listenerCount(event: keyof EventMap): number {
    return this.listeners.get(event)?.size || 0;
  }
}

// Export singleton instance
export const orderEvents = new TypedEventEmitter();

// Export type for external use
export type { EventMap as OrderEventMap };
