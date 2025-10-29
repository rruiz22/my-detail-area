import { useDealershipContext } from '@/contexts/DealershipContext';

// ============================================================================
// RE-EXPORT TYPES FROM CONTEXT
// ============================================================================

export type { Dealership, AppModule } from '@/contexts/DealershipContext';

// ============================================================================
// INTERFACE (UNCHANGED FOR BACKWARD COMPATIBILITY)
// ============================================================================

interface UseAccessibleDealershipsReturn {
  dealerships: Dealership[];
  currentDealership: Dealership | null;
  loading: boolean;
  error: string | null;
  refreshDealerships: () => void;
  filterByModule: (moduleName: AppModule) => Promise<Dealership[]>;
}

// ============================================================================
// SIMPLIFIED HOOK - NOW JUST A PROXY TO CONTEXT
// ============================================================================

/**
 * useAccessibleDealerships - Simplified hook that proxies to DealershipContext
 *
 * MIGRATION NOTES:
 * - This hook maintains EXACT same API as before
 * - All 30+ components using this hook require ZERO changes
 * - Internally, it now consumes centralized DealershipContext
 * - This eliminates 30+ duplicate fetches and 30+ duplicate states
 *
 * BEFORE (Problem):
 * - Each component calling this hook created its own TanStack Query instance
 * - 30 components = 30 fetches + 30 states + 30 effect loops
 * - Massive performance issue and potential race conditions
 *
 * AFTER (Solution):
 * - Single DealershipContext manages ONE fetch + ONE state
 * - All components share same data through context
 * - Zero redundant fetches, zero loops, optimal performance
 *
 * USAGE (No changes required in consuming components):
 * ```tsx
 * const { dealerships, currentDealership, loading } = useAccessibleDealerships();
 * ```
 */
export function useAccessibleDealerships(): UseAccessibleDealershipsReturn {
  // Simply return the context value - that's it!
  // All the complex logic now lives in DealershipProvider
  const context = useDealershipContext();

  console.log('🔗 [useAccessibleDealerships] Hook called, proxying to context');

  return {
    dealerships: context.dealerships,
    currentDealership: context.currentDealership,
    loading: context.loading,
    error: context.error,
    refreshDealerships: context.refreshDealerships,
    filterByModule: context.filterByModule
  };
}

/**
 * IMPORTANT: For components that need to SET the current dealership,
 * they should use useDealershipContext() directly to access setCurrentDealership()
 *
 * Example:
 * ```tsx
 * import { useDealershipContext } from '@/contexts/DealershipContext';
 *
 * const { setCurrentDealership } = useDealershipContext();
 * setCurrentDealership(someDealer);
 * ```
 */
