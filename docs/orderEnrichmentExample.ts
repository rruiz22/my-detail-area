/**
 * Example Integration of Order Enrichment Service
 *
 * This file demonstrates how to integrate the orderEnrichment service
 * into a typical order management hook (e.g., useServiceOrderManagement.ts)
 *
 * @module examples/orderEnrichmentIntegration
 */

import { supabase } from '@/integrations/supabase/client';
import {
  enrichOrdersArray,
  createUserDisplayName,
  type EnrichmentLookups,
  type EnrichedOrder
} from '@/services/orderEnrichment';

// ==================== EXAMPLE 1: Basic Integration ====================

/**
 * Example: Fetching and enriching orders in a polling query
 * This pattern is used in all order management hooks
 */
async function fetchAndEnrichOrders() {
  // Step 1: Fetch orders from database
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*, order_comments(count)')
    .eq('order_type', 'service')
    .order('created_at', { ascending: false });

  if (ordersError) throw ordersError;

  // Step 2: Fetch lookup data in parallel (3 queries instead of N×3)
  const [dealershipsRes, profilesRes, groupsRes] = await Promise.all([
    supabase.from('dealerships').select('id, name, city, state'),
    supabase.from('profiles').select('id, first_name, last_name, email'),
    supabase.from('dealer_groups').select('id, name')
  ]);

  // Step 3: Build lookup maps with O(1) access
  const lookups: EnrichmentLookups = {
    dealerships: new Map(
      dealershipsRes.data?.map(d => [
        d.id,
        { name: d.name, city: d.city || '', state: d.state || '' }
      ]) || []
    ),
    users: new Map(
      profilesRes.data?.map(u => [
        u.id,
        { name: createUserDisplayName(u), email: u.email }
      ]) || []
    ),
    groups: new Map(
      groupsRes.data?.map(g => [g.id, { name: g.name }]) || []
    )
  };

  // Step 4: Enrich all orders with O(1) lookups
  const enrichedOrders = enrichOrdersArray(orders || [], lookups);

  return enrichedOrders;
}

// ==================== EXAMPLE 2: Integration in React Hook ====================

/**
 * Example: useServiceOrderManagement hook with enrichment service
 * Shows complete integration pattern with React Query
 */
import { useOrderPolling } from '@/hooks/useSmartPolling';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useMemo } from 'react';

export function useServiceOrderManagementExample() {
  const { user } = useAuth();
  const { enhancedUser } = usePermissions();

  // Smart polling query with enrichment service
  const serviceOrdersPollingQuery = useOrderPolling(
    ['orders', 'service'],
    async () => {
      if (!user || !enhancedUser) return [];

      // Fetch orders with dealer filtering
      let ordersQuery = supabase
        .from('orders')
        .select('*, order_comments(count)')
        .eq('order_type', 'service')
        .order('created_at', { ascending: false });

      // Apply dealer filtering (multi-tenant)
      if (enhancedUser.dealership_id !== null) {
        ordersQuery = ordersQuery.eq('dealer_id', enhancedUser.dealership_id);
      }

      const { data: orders, error } = await ordersQuery;
      if (error) throw error;

      // ✅ NEW: Batch fetch lookup data
      const [dealershipsRes, profilesRes, groupsRes] = await Promise.all([
        supabase.from('dealerships').select('id, name'),
        supabase.from('profiles').select('id, first_name, last_name, email'),
        supabase.from('dealer_groups').select('id, name')
      ]);

      // ✅ NEW: Create lookup maps
      const lookups: EnrichmentLookups = {
        dealerships: new Map(
          dealershipsRes.data?.map(d => [d.id, { name: d.name }]) || []
        ),
        users: new Map(
          profilesRes.data?.map(u => [
            u.id,
            { name: createUserDisplayName(u), email: u.email }
          ]) || []
        ),
        groups: new Map(
          groupsRes.data?.map(g => [g.id, { name: g.name }]) || []
        )
      };

      // ✅ NEW: Enrich orders with single function call
      const enrichedOrders = enrichOrdersArray(orders || [], lookups);

      return enrichedOrders;
    },
    !!(user && enhancedUser)
  );

  // Derive enriched orders from polling data
  const enrichedOrders = useMemo(
    () => serviceOrdersPollingQuery.data || [],
    [serviceOrdersPollingQuery.data]
  );

  return {
    orders: enrichedOrders,
    loading: serviceOrdersPollingQuery.isLoading,
    error: serviceOrdersPollingQuery.error
  };
}

// ==================== EXAMPLE 3: Advanced Usage with Type Guards ====================

import { isEnrichedOrder, hasCompleteLookups } from '@/services/orderEnrichment';

/**
 * Example: Advanced usage with runtime type checking
 * Useful for validating data in complex workflows
 */
function processOrderWithTypeChecks(order: unknown) {
  // Runtime validation with type guard
  if (!isEnrichedOrder(order)) {
    console.error('Order has not been enriched with lookup data');
    return;
  }

  // TypeScript now knows these fields exist
  console.log(`Dealership: ${order.dealershipName}`);
  console.log(`Assigned to: ${order.assignedTo}`);
  console.log(`Due time: ${order.dueTime || 'No due date'}`);
  console.log(`Comments: ${order.comments || 0}`);
}

/**
 * Example: Validate lookups before enrichment
 */
function validateAndEnrichOrders(orders: any[], lookups: Partial<EnrichmentLookups>) {
  // Ensure lookups are complete before enrichment
  if (!hasCompleteLookups(lookups)) {
    throw new Error('Incomplete lookup maps provided');
  }

  // TypeScript now knows lookups is complete
  return enrichOrdersArray(orders, lookups);
}

// ==================== EXAMPLE 4: Performance Monitoring ====================

/**
 * Example: Monitor enrichment performance
 * Useful for tracking improvements after migration
 */
async function fetchAndEnrichOrdersWithMetrics() {
  const startTime = performance.now();

  // Fetch orders
  const ordersStartTime = performance.now();
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('order_type', 'service');
  const ordersEndTime = performance.now();
  console.log(`Orders query: ${(ordersEndTime - ordersStartTime).toFixed(2)}ms`);

  // Fetch lookups
  const lookupsStartTime = performance.now();
  const [dealershipsRes, profilesRes, groupsRes] = await Promise.all([
    supabase.from('dealerships').select('id, name'),
    supabase.from('profiles').select('id, first_name, last_name, email'),
    supabase.from('dealer_groups').select('id, name')
  ]);
  const lookupsEndTime = performance.now();
  console.log(`Lookups query: ${(lookupsEndTime - lookupsStartTime).toFixed(2)}ms`);

  // Build lookup maps
  const mapsStartTime = performance.now();
  const lookups: EnrichmentLookups = {
    dealerships: new Map(
      dealershipsRes.data?.map(d => [d.id, { name: d.name }]) || []
    ),
    users: new Map(
      profilesRes.data?.map(u => [
        u.id,
        { name: createUserDisplayName(u), email: u.email }
      ]) || []
    ),
    groups: new Map(
      groupsRes.data?.map(g => [g.id, { name: g.name }]) || []
    )
  };
  const mapsEndTime = performance.now();
  console.log(`Map creation: ${(mapsEndTime - mapsStartTime).toFixed(2)}ms`);

  // Enrich orders
  const enrichStartTime = performance.now();
  const enrichedOrders = enrichOrdersArray(orders || [], lookups);
  const enrichEndTime = performance.now();
  console.log(`Enrichment: ${(enrichEndTime - enrichStartTime).toFixed(2)}ms`);

  const totalTime = performance.now() - startTime;
  console.log(`Total time: ${totalTime.toFixed(2)}ms`);
  console.log(`Average per order: ${(totalTime / (orders?.length || 1)).toFixed(2)}ms`);

  return enrichedOrders;
}

// ==================== EXAMPLE 5: Error Handling ====================

/**
 * Example: Robust error handling with fallbacks
 * Ensures app continues working even if lookups fail
 */
async function fetchAndEnrichOrdersWithErrorHandling() {
  try {
    // Fetch orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .eq('order_type', 'service');

    if (ordersError) {
      console.error('Failed to fetch orders:', ordersError);
      return [];
    }

    // Fetch lookups with error handling for each table
    const [dealershipsRes, profilesRes, groupsRes] = await Promise.allSettled([
      supabase.from('dealerships').select('id, name'),
      supabase.from('profiles').select('id, first_name, last_name, email'),
      supabase.from('dealer_groups').select('id, name')
    ]);

    // Build lookup maps with fallbacks
    const lookups: EnrichmentLookups = {
      dealerships: new Map(
        dealershipsRes.status === 'fulfilled'
          ? dealershipsRes.value.data?.map(d => [d.id, { name: d.name }]) || []
          : []
      ),
      users: new Map(
        profilesRes.status === 'fulfilled'
          ? profilesRes.value.data?.map(u => [
              u.id,
              { name: createUserDisplayName(u), email: u.email }
            ]) || []
          : []
      ),
      groups:
        groupsRes.status === 'fulfilled'
          ? new Map(groupsRes.value.data?.map(g => [g.id, { name: g.name }]) || [])
          : undefined
    };

    // Log any lookup failures
    if (dealershipsRes.status === 'rejected') {
      console.warn('Failed to fetch dealerships:', dealershipsRes.reason);
    }
    if (profilesRes.status === 'rejected') {
      console.warn('Failed to fetch user profiles:', profilesRes.reason);
    }
    if (groupsRes.status === 'rejected') {
      console.warn('Failed to fetch dealer groups:', groupsRes.reason);
    }

    // Enrich orders (will use 'Unknown' for missing lookups)
    const enrichedOrders = enrichOrdersArray(orders || [], lookups);

    return enrichedOrders;
  } catch (error) {
    console.error('Critical error in order enrichment:', error);
    return [];
  }
}

// ==================== EXAMPLE 6: Custom Enrichment Logic ====================

import { enrichOrderWithLookups } from '@/services/orderEnrichment';

/**
 * Example: Extend enrichment with custom business logic
 * Adds additional computed fields beyond standard enrichment
 */
function enrichOrderWithCustomLogic(
  order: any,
  lookups: EnrichmentLookups
): EnrichedOrder & { isOverdue: boolean; priorityScore: number } {
  // Apply standard enrichment
  const enrichedOrder = enrichOrderWithLookups(order, lookups);

  // Add custom business logic
  const isOverdue =
    enrichedOrder.due_date &&
    new Date(enrichedOrder.due_date) < new Date() &&
    enrichedOrder.status !== 'completed';

  const priorityScore =
    enrichedOrder.priority === 'urgent'
      ? 3
      : enrichedOrder.priority === 'high'
      ? 2
      : enrichedOrder.priority === 'normal'
      ? 1
      : 0;

  return {
    ...enrichedOrder,
    isOverdue,
    priorityScore
  };
}

// ==================== EXAMPLE 7: Testing ====================

import { describe, it, expect, vi } from 'vitest';

describe('Order Enrichment Integration', () => {
  it('should enrich orders with dealership and user data', async () => {
    // Mock Supabase responses
    const mockOrders = [
      { id: '1', dealer_id: 5, assigned_group_id: 'user-123', order_type: 'service' }
    ];

    const mockLookups: EnrichmentLookups = {
      dealerships: new Map([[5, { name: 'Test Dealer' }]]),
      users: new Map([['user-123', { name: 'John Doe', email: 'john@example.com' }]]),
      groups: new Map()
    };

    const enriched = enrichOrdersArray(mockOrders, mockLookups);

    expect(enriched).toHaveLength(1);
    expect(enriched[0].dealershipName).toBe('Test Dealer');
    expect(enriched[0].assignedTo).toBe('John Doe');
  });

  it('should handle missing lookup data gracefully', () => {
    const mockOrders = [{ id: '1', dealer_id: 999, assigned_group_id: null }];

    const mockLookups: EnrichmentLookups = {
      dealerships: new Map(), // Empty - dealer not found
      users: new Map()
    };

    const enriched = enrichOrdersArray(mockOrders, mockLookups);

    expect(enriched[0].dealershipName).toBe('Unknown Dealer');
    expect(enriched[0].assignedTo).toBe('Unassigned');
  });

  it('should format due time correctly', () => {
    const mockOrders = [
      { id: '1', dealer_id: 5, due_date: '2025-01-15T14:30:00Z' }
    ];

    const mockLookups: EnrichmentLookups = {
      dealerships: new Map([[5, { name: 'Test' }]]),
      users: new Map()
    };

    const enriched = enrichOrdersArray(mockOrders, mockLookups);

    expect(enriched[0].dueTime).toMatch(/\d{2}:\d{2}\s(AM|PM)/);
  });
});

// ==================== EXPORT EXAMPLES ====================

export {
  fetchAndEnrichOrders,
  useServiceOrderManagementExample,
  processOrderWithTypeChecks,
  validateAndEnrichOrders,
  fetchAndEnrichOrdersWithMetrics,
  fetchAndEnrichOrdersWithErrorHandling,
  enrichOrderWithCustomLogic
};
