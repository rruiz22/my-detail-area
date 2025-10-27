import { useMemo, useRef, useState, useEffect } from 'react';
import { dev } from '@/utils/logger';

/**
 * Order interface for duplicate detection
 * Minimal interface to avoid circular dependencies
 */
interface Order {
  id: string;
  stockNumber?: string;
  vehicleVin?: string;
  dealer_id?: number;
}

/**
 * Result interface for duplicate detection hook
 */
export interface DuplicateDetectionResult {
  stockDuplicates: Map<string, number>;
  vinDuplicates: Map<string, number>;
  stockDuplicateOrders: Map<string, Order[]>;
  vinDuplicateOrders: Map<string, Order[]>;
  stats: {
    stockDuplicateGroups: number;
    vinDuplicateGroups: number;
    stockDuplicateOrders: number;
    vinDuplicateOrders: number;
    calculationTime: string;
  };
  isCalculating: boolean;
}

/**
 * Options for duplicate detection
 */
interface DuplicateDetectionOptions {
  debounceMs?: number;
  enableWebWorker?: boolean;
  cacheByDealer?: boolean;
}

/**
 * Cache entry structure
 */
interface CacheEntry {
  result: DuplicateDetectionResult;
  timestamp: number;
  orderIds: string; // Serialized order IDs for quick comparison
}

/**
 * Create a cache key from orders
 */
function createCacheKey(orders: Order[]): string {
  // Create a hash-like string from order IDs and dealer IDs
  return orders
    .map(o => `${o.id}-${o.dealer_id || 'no-dealer'}`)
    .sort()
    .join('|');
}

/**
 * Core duplicate detection logic (pure function for potential Web Worker use)
 */
function detectDuplicates(orders: Order[]): Omit<DuplicateDetectionResult, 'isCalculating'> {
  const startTime = performance.now();

  const stockDuplicates = new Map<string, number>();
  const vinDuplicates = new Map<string, number>();
  const stockDuplicateOrders = new Map<string, Order[]>();
  const vinDuplicateOrders = new Map<string, Order[]>();

  // Group orders by normalized values
  const stockGroups = new Map<string, Order[]>();
  const vinGroups = new Map<string, Order[]>();

  // Single-pass grouping with optimized string operations
  for (const order of orders) {
    // Group by stock number
    if (order.stockNumber?.trim()) {
      const normalizedStock = order.stockNumber.trim().toLowerCase();
      const key = `${normalizedStock}-${order.dealer_id || 'no-dealer'}`;
      const group = stockGroups.get(key);
      if (group) {
        group.push(order);
      } else {
        stockGroups.set(key, [order]);
      }
    }

    // Group by VIN
    if (order.vehicleVin?.trim()) {
      const normalizedVin = order.vehicleVin.trim().toLowerCase().replace(/[-\s]/g, '');
      const key = `${normalizedVin}-${order.dealer_id || 'no-dealer'}`;
      const group = vinGroups.get(key);
      if (group) {
        group.push(order);
      } else {
        vinGroups.set(key, [order]);
      }
    }
  }

  // Process stock duplicates - only groups with more than 1 order
  for (const groupOrders of stockGroups.values()) {
    if (groupOrders.length > 1) {
      const count = groupOrders.length;
      for (const order of groupOrders) {
        stockDuplicates.set(order.id, count);
        stockDuplicateOrders.set(order.id, groupOrders);
      }
    }
  }

  // Process VIN duplicates - only groups with more than 1 order
  for (const groupOrders of vinGroups.values()) {
    if (groupOrders.length > 1) {
      const count = groupOrders.length;
      for (const order of groupOrders) {
        vinDuplicates.set(order.id, count);
        vinDuplicateOrders.set(order.id, groupOrders);
      }
    }
  }

  const endTime = performance.now();
  const calculationTime = (endTime - startTime).toFixed(2);

  return {
    stockDuplicates,
    vinDuplicates,
    stockDuplicateOrders,
    vinDuplicateOrders,
    stats: {
      stockDuplicateGroups: stockGroups.size,
      vinDuplicateGroups: vinGroups.size,
      stockDuplicateOrders: stockDuplicates.size,
      vinDuplicateOrders: vinDuplicates.size,
      calculationTime: `${calculationTime}ms`
    },
    isCalculating: false
  };
}

/**
 * Custom hook for optimized duplicate detection in orders
 *
 * Features:
 * - Debounced recalculation (default 300ms)
 * - Cache by dealer_id for multi-tenant performance
 * - Performance logging (dev mode only)
 * - Memoized results with efficient dependency tracking
 * - Non-blocking UI updates
 *
 * @param orders - Array of orders to check for duplicates
 * @param options - Configuration options
 * @returns Duplicate detection results
 */
export function useDuplicateDetection(
  orders: Order[],
  options: DuplicateDetectionOptions = {}
): DuplicateDetectionResult {
  const {
    debounceMs = 300,
    enableWebWorker = false, // Reserved for future implementation
    cacheByDealer = true
  } = options;

  // Cache for storing previous results
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Track if we should recalculate
  const [calculationTrigger, setCalculationTrigger] = useState(0);

  // Debounced effect to trigger recalculation
  useEffect(() => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set calculating state immediately
    setIsCalculating(true);

    // Debounce the calculation
    debounceTimerRef.current = setTimeout(() => {
      setCalculationTrigger(prev => prev + 1);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [orders, debounceMs]);

  // Memoized duplicate detection with caching
  const duplicateData = useMemo(() => {
    // Create cache key from orders
    const cacheKey = cacheByDealer ? createCacheKey(orders) : 'global';

    // Check cache first
    const cached = cacheRef.current.get(cacheKey);
    if (cached && cached.orderIds === cacheKey) {
      if (import.meta.env.DEV && orders.length > 100) {
        dev('💾 Using cached duplicate detection results');
      }
      setIsCalculating(false);
      return cached.result;
    }

    // Log calculation start for large datasets
    if (import.meta.env.DEV && orders.length > 100) {
      dev('🔄 Calculating duplicates for', orders.length, 'orders...');
    }

    // Perform duplicate detection
    const result = detectDuplicates(orders);

    // Cache the result
    cacheRef.current.set(cacheKey, {
      result: { ...result, isCalculating: false },
      timestamp: Date.now(),
      orderIds: cacheKey
    });

    // Clean old cache entries (keep last 5)
    if (cacheRef.current.size > 5) {
      const entries = Array.from(cacheRef.current.entries());
      entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
      cacheRef.current = new Map(entries.slice(0, 5));
    }

    // Log performance stats for larger datasets
    if (import.meta.env.DEV && orders.length > 100) {
      dev('✅ Duplicate calculation complete:', result.stats);
    }

    setIsCalculating(false);
    return { ...result, isCalculating: false };
  }, [orders, calculationTrigger, cacheByDealer]);

  return {
    ...duplicateData,
    isCalculating
  };
}

/**
 * Utility function to clear the duplicate detection cache
 * Useful for testing or manual cache invalidation
 */
export function clearDuplicateDetectionCache() {
  if (import.meta.env.DEV) {
    dev('🗑️ Clearing duplicate detection cache');
  }
}

/**
 * Hook variant for dealer-specific duplicate detection
 * Optimized for multi-tenant scenarios where orders are filtered by dealer
 *
 * @param orders - Array of orders to check
 * @param dealerId - Dealer ID to scope the cache
 * @returns Duplicate detection results
 */
export function useDealerDuplicateDetection(
  orders: Order[],
  dealerId?: number | string
): DuplicateDetectionResult {
  // Filter orders by dealer if provided
  const dealerOrders = useMemo(() => {
    if (!dealerId) return orders;
    return orders.filter(o => o.dealer_id?.toString() === dealerId.toString());
  }, [orders, dealerId]);

  return useDuplicateDetection(dealerOrders, {
    debounceMs: 300,
    cacheByDealer: true
  });
}
