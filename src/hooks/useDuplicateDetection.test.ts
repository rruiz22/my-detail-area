import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDuplicateDetection, useDealerDuplicateDetection } from './useDuplicateDetection';

// Mock Order interface for testing
interface TestOrder {
  id: string;
  stockNumber?: string;
  vehicleVin?: string;
  dealer_id?: number;
}

describe('useDuplicateDetection', () => {
  beforeEach(() => {
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should detect stock number duplicates', async () => {
    const orders: TestOrder[] = [
      { id: '1', stockNumber: 'ABC123', dealer_id: 1 },
      { id: '2', stockNumber: 'ABC123', dealer_id: 1 },
      { id: '3', stockNumber: 'XYZ789', dealer_id: 1 }
    ];

    const { result } = renderHook(() => useDuplicateDetection(orders));

    // Wait for debounce
    vi.advanceTimersByTime(300);
    await waitFor(() => {
      expect(result.current.isCalculating).toBe(false);
    });

    // Check stock duplicates
    expect(result.current.stockDuplicates.size).toBe(2);
    expect(result.current.stockDuplicates.get('1')).toBe(2);
    expect(result.current.stockDuplicates.get('2')).toBe(2);
    expect(result.current.stockDuplicates.has('3')).toBe(false);
  });

  it('should detect VIN duplicates', async () => {
    const orders: TestOrder[] = [
      { id: '1', vehicleVin: '1HGBH41JXMN109186', dealer_id: 1 },
      { id: '2', vehicleVin: '1HGBH41JXMN109186', dealer_id: 1 },
      { id: '3', vehicleVin: '1HGBH41JXMN109999', dealer_id: 1 }
    ];

    const { result } = renderHook(() => useDuplicateDetection(orders));

    vi.advanceTimersByTime(300);
    await waitFor(() => {
      expect(result.current.isCalculating).toBe(false);
    });

    expect(result.current.vinDuplicates.size).toBe(2);
    expect(result.current.vinDuplicates.get('1')).toBe(2);
    expect(result.current.vinDuplicates.get('2')).toBe(2);
    expect(result.current.vinDuplicates.has('3')).toBe(false);
  });

  it('should handle case-insensitive stock numbers', async () => {
    const orders: TestOrder[] = [
      { id: '1', stockNumber: 'abc123', dealer_id: 1 },
      { id: '2', stockNumber: 'ABC123', dealer_id: 1 },
      { id: '3', stockNumber: 'AbC123', dealer_id: 1 }
    ];

    const { result } = renderHook(() => useDuplicateDetection(orders));

    vi.advanceTimersByTime(300);
    await waitFor(() => {
      expect(result.current.isCalculating).toBe(false);
    });

    expect(result.current.stockDuplicates.size).toBe(3);
    expect(result.current.stockDuplicates.get('1')).toBe(3);
  });

  it('should normalize VINs by removing spaces and hyphens', async () => {
    const orders: TestOrder[] = [
      { id: '1', vehicleVin: '1HGBH41JXMN109186', dealer_id: 1 },
      { id: '2', vehicleVin: '1HG-BH41-JXM-N109186', dealer_id: 1 },
      { id: '3', vehicleVin: '1HG BH41 JXM N109186', dealer_id: 1 }
    ];

    const { result } = renderHook(() => useDuplicateDetection(orders));

    vi.advanceTimersByTime(300);
    await waitFor(() => {
      expect(result.current.isCalculating).toBe(false);
    });

    expect(result.current.vinDuplicates.size).toBe(3);
    expect(result.current.vinDuplicates.get('1')).toBe(3);
  });

  it('should separate duplicates by dealer_id', async () => {
    const orders: TestOrder[] = [
      { id: '1', stockNumber: 'ABC123', dealer_id: 1 },
      { id: '2', stockNumber: 'ABC123', dealer_id: 1 },
      { id: '3', stockNumber: 'ABC123', dealer_id: 2 },
      { id: '4', stockNumber: 'ABC123', dealer_id: 2 }
    ];

    const { result } = renderHook(() => useDuplicateDetection(orders));

    vi.advanceTimersByTime(300);
    await waitFor(() => {
      expect(result.current.isCalculating).toBe(false);
    });

    // All 4 orders have duplicates, but separated by dealer
    expect(result.current.stockDuplicates.size).toBe(4);

    // Orders 1 & 2 are duplicates of each other (dealer 1)
    const order1Duplicates = result.current.stockDuplicateOrders.get('1');
    expect(order1Duplicates?.length).toBe(2);
    expect(order1Duplicates?.some(o => o.id === '2')).toBe(true);

    // Orders 3 & 4 are duplicates of each other (dealer 2)
    const order3Duplicates = result.current.stockDuplicateOrders.get('3');
    expect(order3Duplicates?.length).toBe(2);
    expect(order3Duplicates?.some(o => o.id === '4')).toBe(true);
  });

  it('should debounce rapid order changes', async () => {
    const orders1: TestOrder[] = [
      { id: '1', stockNumber: 'ABC123', dealer_id: 1 }
    ];

    const { result, rerender } = renderHook(
      ({ orders }) => useDuplicateDetection(orders),
      { initialProps: { orders: orders1 } }
    );

    // Should be calculating initially
    expect(result.current.isCalculating).toBe(true);

    // Rapid updates
    const orders2 = [...orders1, { id: '2', stockNumber: 'ABC123', dealer_id: 1 }];
    rerender({ orders: orders2 });

    // Still calculating (debounce not complete)
    expect(result.current.isCalculating).toBe(true);

    // Complete debounce
    vi.advanceTimersByTime(300);
    await waitFor(() => {
      expect(result.current.isCalculating).toBe(false);
    });

    // Should have detected duplicates
    expect(result.current.stockDuplicates.size).toBe(2);
  });

  it('should cache results for identical order sets', async () => {
    const orders: TestOrder[] = [
      { id: '1', stockNumber: 'ABC123', dealer_id: 1 },
      { id: '2', stockNumber: 'ABC123', dealer_id: 1 }
    ];

    const { result, rerender } = renderHook(
      ({ orders }) => useDuplicateDetection(orders),
      { initialProps: { orders } }
    );

    vi.advanceTimersByTime(300);
    await waitFor(() => {
      expect(result.current.isCalculating).toBe(false);
    });

    const firstCalculation = result.current;

    // Rerender with same orders
    rerender({ orders: [...orders] });
    vi.advanceTimersByTime(300);
    await waitFor(() => {
      expect(result.current.isCalculating).toBe(false);
    });

    // Should return cached result (same Maps)
    expect(result.current).toBe(firstCalculation);
  });

  it('should provide accurate stats', async () => {
    const orders: TestOrder[] = [
      { id: '1', stockNumber: 'ABC123', vehicleVin: 'VIN111', dealer_id: 1 },
      { id: '2', stockNumber: 'ABC123', vehicleVin: 'VIN111', dealer_id: 1 },
      { id: '3', stockNumber: 'XYZ789', vehicleVin: 'VIN222', dealer_id: 1 },
      { id: '4', stockNumber: 'XYZ789', vehicleVin: 'VIN222', dealer_id: 1 }
    ];

    const { result } = renderHook(() => useDuplicateDetection(orders));

    vi.advanceTimersByTime(300);
    await waitFor(() => {
      expect(result.current.isCalculating).toBe(false);
    });

    expect(result.current.stats.stockDuplicateOrders).toBe(4);
    expect(result.current.stats.vinDuplicateOrders).toBe(4);
    expect(result.current.stats.calculationTime).toMatch(/^\d+(\.\d+)?ms$/);
  });

  it('should ignore empty stock numbers and VINs', async () => {
    const orders: TestOrder[] = [
      { id: '1', stockNumber: '', vehicleVin: '', dealer_id: 1 },
      { id: '2', stockNumber: '   ', vehicleVin: '   ', dealer_id: 1 },
      { id: '3', stockNumber: 'ABC123', vehicleVin: 'VIN111', dealer_id: 1 }
    ];

    const { result } = renderHook(() => useDuplicateDetection(orders));

    vi.advanceTimersByTime(300);
    await waitFor(() => {
      expect(result.current.isCalculating).toBe(false);
    });

    expect(result.current.stockDuplicates.size).toBe(0);
    expect(result.current.vinDuplicates.size).toBe(0);
  });
});

describe('useDealerDuplicateDetection', () => {
  beforeEach(() => {
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should filter orders by dealer_id', async () => {
    const orders: TestOrder[] = [
      { id: '1', stockNumber: 'ABC123', dealer_id: 1 },
      { id: '2', stockNumber: 'ABC123', dealer_id: 1 },
      { id: '3', stockNumber: 'ABC123', dealer_id: 2 }
    ];

    const { result } = renderHook(() => useDealerDuplicateDetection(orders, 1));

    vi.advanceTimersByTime(300);
    await waitFor(() => {
      expect(result.current.isCalculating).toBe(false);
    });

    // Should only detect duplicates for dealer 1
    expect(result.current.stockDuplicates.size).toBe(2);
    expect(result.current.stockDuplicates.has('1')).toBe(true);
    expect(result.current.stockDuplicates.has('2')).toBe(true);
    expect(result.current.stockDuplicates.has('3')).toBe(false);
  });

  it('should handle string dealer_id', async () => {
    const orders: TestOrder[] = [
      { id: '1', stockNumber: 'ABC123', dealer_id: 1 },
      { id: '2', stockNumber: 'ABC123', dealer_id: 1 }
    ];

    const { result } = renderHook(() => useDealerDuplicateDetection(orders, '1'));

    vi.advanceTimersByTime(300);
    await waitFor(() => {
      expect(result.current.isCalculating).toBe(false);
    });

    expect(result.current.stockDuplicates.size).toBe(2);
  });

  it('should return all orders when no dealer_id provided', async () => {
    const orders: TestOrder[] = [
      { id: '1', stockNumber: 'ABC123', dealer_id: 1 },
      { id: '2', stockNumber: 'ABC123', dealer_id: 2 }
    ];

    const { result } = renderHook(() => useDealerDuplicateDetection(orders));

    vi.advanceTimersByTime(300);
    await waitFor(() => {
      expect(result.current.isCalculating).toBe(false);
    });

    // Should not detect duplicates (different dealers)
    expect(result.current.stockDuplicates.size).toBe(0);
  });
});

describe('Performance', () => {
  beforeEach(() => {
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle large datasets efficiently', async () => {
    // Generate 1000 orders with some duplicates
    const orders: TestOrder[] = Array.from({ length: 1000 }, (_, i) => ({
      id: `order-${i}`,
      stockNumber: `STOCK-${Math.floor(i / 10)}`, // 100 groups of 10 duplicates
      vehicleVin: `VIN${String(Math.floor(i / 10)).padStart(17, '0')}`,
      dealer_id: Math.floor(i / 100) // 10 dealers with 100 orders each
    }));

    const startTime = performance.now();
    const { result } = renderHook(() => useDuplicateDetection(orders));

    vi.advanceTimersByTime(300);
    await waitFor(() => {
      expect(result.current.isCalculating).toBe(false);
    });
    const endTime = performance.now();

    const calculationTime = endTime - startTime;

    // Should complete within reasonable time (accounting for test overhead)
    expect(calculationTime).toBeLessThan(500); // 500ms max for 1000 orders in test environment

    // Verify correctness
    expect(result.current.stockDuplicates.size).toBeGreaterThan(0);
    expect(result.current.stats.stockDuplicateOrders).toBe(1000); // All orders have duplicates
  });

  it('should benefit from caching on repeated calls', async () => {
    const orders: TestOrder[] = Array.from({ length: 500 }, (_, i) => ({
      id: `order-${i}`,
      stockNumber: `STOCK-${Math.floor(i / 10)}`,
      dealer_id: 1
    }));

    const { result, rerender } = renderHook(
      ({ orders }) => useDuplicateDetection(orders),
      { initialProps: { orders } }
    );

    // First calculation
    vi.advanceTimersByTime(300);
    await waitFor(() => {
      expect(result.current.isCalculating).toBe(false);
    });

    const firstResult = result.current;

    // Second call with same orders (should use cache)
    rerender({ orders: [...orders] });
    vi.advanceTimersByTime(300);
    await waitFor(() => {
      expect(result.current.isCalculating).toBe(false);
    });

    // Should return same cached object
    expect(result.current).toBe(firstResult);
  });
});
