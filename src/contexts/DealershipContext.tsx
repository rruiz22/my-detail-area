import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as logger from '@/utils/logger';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface Dealership {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  website: string;
  status: string;
  subscription_plan: string;
  logo_url?: string | null;
  thumbnail_logo_url?: string | null;
}

export type AppModule =
  | 'dashboard'
  | 'sales_orders'
  | 'service_orders'
  | 'recon_orders'
  | 'car_wash'
  | 'stock'
  | 'chat'
  | 'reports'
  | 'management'
  | 'settings'
  | 'users'
  | 'dealerships'
  | 'productivity';

interface DealershipContextType {
  // State
  dealerships: Dealership[];
  currentDealership: Dealership | null;
  loading: boolean;
  error: string | null;

  // Actions
  setCurrentDealership: (dealer: Dealership | null) => void;
  refreshDealerships: () => void;
  filterByModule: (moduleName: AppModule) => Promise<Dealership[]>;
}

// ============================================================================
// CONTEXT CREATION
// ============================================================================

const DealershipContext = createContext<DealershipContextType | undefined>(undefined);

// ============================================================================
// CUSTOM HOOK FOR CONSUMING CONTEXT
// ============================================================================

export const useDealershipContext = () => {
  const context = useContext(DealershipContext);
  if (context === undefined) {
    throw new Error('useDealershipContext must be used within a DealershipProvider');
  }
  return context;
};

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

interface DealershipProviderProps {
  children: React.ReactNode;
}

/**
 * DealershipProvider - Enterprise-grade centralized dealership management
 *
 * ARCHITECTURE:
 * - Single source of truth for dealership data across entire app
 * - Eliminates 30+ duplicate fetch instances from useAccessibleDealerships
 * - TanStack Query for automatic caching and synchronization
 * - localStorage persistence for instant initial render
 * - Event-driven synchronization with DealerFilterContext
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - 15-minute cache window (dealerships rarely change)
 * - Initial data from localStorage for 0ms load time
 * - Memoized values to prevent unnecessary re-renders
 * - Ref-based change tracking to prevent loops
 *
 * DEPENDENCIES:
 * - Requires AuthContext (user.id for RPC calls)
 * - Must be placed AFTER AuthProvider in App.tsx
 * - Integrates with DealerFilterContext via CustomEvents
 */
export const DealershipProvider: React.FC<DealershipProviderProps> = ({ children }) => {
  // ============================================================================
  // HOOKS & DEPENDENCIES
  // ============================================================================

  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [currentDealership, setCurrentDealershipState] = useState<Dealership | null>(null);

  // Refs for tracking state to prevent infinite loops
  const prevDealerIdRef = useRef<string | number | null>(null);
  const hasInitialized = useRef(false);
  const isMountedRef = useRef(true);

  // Track mount state for cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ============================================================================
  // DATA FETCHING WITH TANSTACK QUERY
  // ============================================================================

  const {
    data: dealerships = [],
    isLoading: loading,
    error: queryError
  } = useQuery({
    queryKey: ['accessible_dealerships', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        logger.dev('⏭️ [DealershipContext] No user ID, skipping fetch');
        return [];
      }

      logger.dev('🔄 [DealershipContext] Fetching dealerships for user:', user.id);

      const { data, error: fetchError } = await supabase.rpc('get_user_accessible_dealers', {
        user_uuid: user.id
      });

      if (fetchError) {
        console.error('❌ [DealershipContext] Error fetching dealerships:', fetchError);
        throw fetchError;
      }

      const dealershipsData = (data || []) as Dealership[];
      logger.dev('✅ [DealershipContext] Fetched dealerships:', dealershipsData.length);

      // Cache in localStorage for instant subsequent loads
      try {
        localStorage.setItem('dealerships-cache', JSON.stringify({
          data: dealershipsData,
          timestamp: Date.now(),
          userId: user.id
        }));
        logger.dev('💾 [DealershipContext] Cached dealerships in localStorage');
      } catch (error) {
        console.warn('⚠️ [DealershipContext] Failed to cache in localStorage:', error);
      }

      return dealershipsData;
    },
    enabled: !!user?.id,
    // Load from localStorage for instant initial render
    initialData: () => {
      if (!user?.id) return undefined;

      try {
        const cached = localStorage.getItem('dealerships-cache');
        if (cached) {
          const { data, timestamp, userId } = JSON.parse(cached);
          // Use cache if less than 15 minutes old AND same user
          if (
            userId === user.id &&
            Date.now() - timestamp < 15 * 60 * 1000
          ) {
            logger.dev('⚡ [DealershipContext] Using cached dealerships');
            return data as Dealership[];
          }
        }
      } catch (error) {
        console.warn('⚠️ [DealershipContext] Failed to parse cache:', error);
      }
      return undefined;
    },
    staleTime: 900000, // 15 minutes
    gcTime: 1800000, // 30 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const error = queryError
    ? (t('dealerships.error_fetching_dealerships') || 'Error fetching dealerships')
    : null;

  // ============================================================================
  // DEALERSHIP SELECTION INITIALIZATION
  // ============================================================================

  // Memoize dealership IDs to stabilize dependency
  const dealershipIds = useMemo(
    () => dealerships.map(d => d.id).sort((a, b) => a - b).join(','),
    [dealerships]
  );

  // Initialize dealership selection on mount
  useEffect(() => {
    if (!isMountedRef.current) return;

    if (dealerships.length > 0 && !hasInitialized.current && user) {
      hasInitialized.current = true;
      logger.dev('🎯 [DealershipContext] Initializing dealership selection');

      const savedFilter = localStorage.getItem('selectedDealerFilter');

      if (!savedFilter || savedFilter === 'all') {
        // Auto-select for single-dealer users (except system_admin)
        if (dealerships.length === 1 && user.role !== 'system_admin') {
          const singleDealer = dealerships[0];
          setCurrentDealershipState(singleDealer);
          prevDealerIdRef.current = singleDealer.id;

          localStorage.setItem('selectedDealerFilter', singleDealer.id.toString());
          window.dispatchEvent(new CustomEvent('dealerFilterChanged', {
            detail: { dealerId: singleDealer.id }
          }));

          logger.dev('✅ [DealershipContext] Auto-selected single dealership:', singleDealer.name);
        } else {
          // Multi-dealer or system_admin: Keep 'all'
          setCurrentDealershipState(null);
          prevDealerIdRef.current = 'all';
          logger.dev('📋 [DealershipContext] Multi-dealer user, defaulting to "all"');
        }
      } else {
        // Restore specific dealer
        const savedId = parseInt(savedFilter);
        const savedDealership = dealerships.find((d: Dealership) => d.id === savedId);

        if (savedDealership) {
          setCurrentDealershipState(savedDealership);
          prevDealerIdRef.current = savedId;
          logger.dev('✅ [DealershipContext] Restored saved dealership:', savedDealership.name);
        } else {
          // Saved dealer not found - use first dealer
          console.warn('⚠️ [DealershipContext] Saved dealer not found, using first');
          const firstDealer = dealerships[0];
          setCurrentDealershipState(firstDealer || null);
          prevDealerIdRef.current = firstDealer?.id || null;

          if (firstDealer) {
            localStorage.setItem('selectedDealerFilter', firstDealer.id.toString());
            window.dispatchEvent(new CustomEvent('dealerFilterChanged', {
              detail: { dealerId: firstDealer.id }
            }));
          }
        }
      }
    }
  }, [dealershipIds, user?.role]); // Only re-run if IDs change

  // ============================================================================
  // LOGO SYNCHRONIZATION
  // ============================================================================

  // Sync currentDealership when logo URLs change
  useEffect(() => {
    if (!isMountedRef.current) return;

    if (currentDealership && dealerships.length > 0) {
      const updatedDealership = dealerships.find(d => d.id === currentDealership.id);
      if (updatedDealership) {
        // Only update if logo URLs changed
        if (
          updatedDealership.logo_url !== currentDealership.logo_url ||
          updatedDealership.thumbnail_logo_url !== currentDealership.thumbnail_logo_url
        ) {
          logger.dev('🔄 [DealershipContext] Logo changed, updating currentDealership');
          setCurrentDealershipState(updatedDealership);
        }
      }
    }
  }, [
    dealerships.length,
    currentDealership?.id,
    currentDealership?.logo_url,
    currentDealership?.thumbnail_logo_url
  ]);

  // ============================================================================
  // EVENT LISTENER FOR DEALER FILTER CHANGES
  // ============================================================================

  useEffect(() => {
    if (!isMountedRef.current) return;

    const handleDealerFilterChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { dealerId } = customEvent.detail;

      logger.dev('🔔 [DealershipContext] dealerFilterChanged event:', {
        dealerId,
        prevId: prevDealerIdRef.current
      });

      // Prevent redundant updates
      if (dealerId === prevDealerIdRef.current) {
        logger.dev('⏭️ [DealershipContext] Skipping redundant update');
        return;
      }

      prevDealerIdRef.current = dealerId;

      if (dealerId === 'all') {
        logger.dev('🔄 [DealershipContext] Setting to null (all dealers)');
        setCurrentDealershipState(null);
      } else {
        const selectedDealership = dealerships.find(d => d.id === dealerId);
        if (selectedDealership) {
          logger.dev('✅ [DealershipContext] Setting dealership:', selectedDealership.name);
          setCurrentDealershipState(selectedDealership);
        } else {
          console.warn('⚠️ [DealershipContext] Dealer not found:', dealerId);
        }
      }
    };

    window.addEventListener('dealerFilterChanged', handleDealerFilterChange);

    return () => {
      window.removeEventListener('dealerFilterChanged', handleDealerFilterChange);
    };
  }, [dealerships]);

  // ============================================================================
  // CONTEXT ACTIONS
  // ============================================================================

  /**
   * Manually set current dealership
   * This is exposed but typically changes come through events
   */
  const setCurrentDealership = useCallback((dealer: Dealership | null) => {
    if (!isMountedRef.current) return;

    logger.dev('🔧 [DealershipContext] setCurrentDealership called:', dealer?.name || 'null');
    setCurrentDealershipState(dealer);
    prevDealerIdRef.current = dealer?.id || 'all';

    // Update localStorage
    try {
      localStorage.setItem('selectedDealerFilter', dealer ? dealer.id.toString() : 'all');
    } catch (error) {
      console.warn('⚠️ [DealershipContext] Failed to save to localStorage:', error);
    }
  }, []);

  /**
   * Invalidate and refetch dealerships
   */
  const refreshDealerships = useCallback(() => {
    if (!isMountedRef.current) return;

    logger.dev('🔄 [DealershipContext] Refreshing dealerships');
    queryClient.invalidateQueries({ queryKey: ['accessible_dealerships', user?.id] });
  }, [queryClient, user?.id]);

  /**
   * Filter dealerships by module access
   */
  const filterByModule = useCallback(async (moduleName: AppModule): Promise<Dealership[]> => {
    if (!isMountedRef.current) return [];

    logger.dev('🔍 [DealershipContext] Filtering by module:', moduleName);
    const filteredDealerships: Dealership[] = [];

    for (const dealership of dealerships) {
      try {
        const { data: hasAccess } = await supabase.rpc('dealership_has_module_access', {
          p_dealer_id: dealership.id,
          p_module: moduleName
        });

        if (hasAccess) {
          filteredDealerships.push(dealership);
        }
      } catch (error) {
        console.error(
          `❌ [DealershipContext] Error checking module access for ${dealership.id}:`,
          error
        );
      }
    }

    logger.dev('✅ [DealershipContext] Filtered dealerships:', filteredDealerships.length);
    return filteredDealerships;
  }, [dealerships]);

  // ============================================================================
  // MEMOIZED CONTEXT VALUE
  // ============================================================================

  const contextValue = useMemo<DealershipContextType>(() => ({
    dealerships,
    currentDealership,
    loading,
    error,
    setCurrentDealership,
    refreshDealerships,
    filterByModule
  }), [
    dealerships,
    currentDealership,
    loading,
    error,
    setCurrentDealership,
    refreshDealerships,
    filterByModule
  ]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <DealershipContext.Provider value={contextValue}>
      {children}
    </DealershipContext.Provider>
  );
};
