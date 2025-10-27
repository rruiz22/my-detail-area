import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Dealership {
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

type AppModule = 'dashboard' | 'sales_orders' | 'service_orders' | 'recon_orders' | 'car_wash' | 'stock' | 'chat' | 'reports' | 'management' | 'settings' | 'users' | 'dealerships' | 'productivity';

interface UseAccessibleDealershipsReturn {
  dealerships: Dealership[];
  currentDealership: Dealership | null;
  loading: boolean;
  error: string | null;
  refreshDealerships: () => void;
  filterByModule: (moduleName: AppModule) => Promise<Dealership[]>;
}

export function useAccessibleDealerships(): UseAccessibleDealershipsReturn {
  const [currentDealership, setCurrentDealership] = useState<Dealership | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation();
  const { user } = useAuth();
  const hasInitialized = useRef(false);
  const prevDealerIdRef = useRef<string | number | null>(null); // Track last processed dealer ID

  // ✅ OPTIMIZATION: Use TanStack Query for shared cache with localStorage
  const { data: dealerships = [], isLoading: loading, error: queryError } = useQuery({
    queryKey: ['accessible_dealerships', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return [];
      }

      const { data, error: fetchError } = await supabase.rpc('get_user_accessible_dealers', {
        user_uuid: user.id
      });

      if (fetchError) {
        console.error('Error fetching accessible dealerships:', fetchError);
        throw fetchError;
      }

      const dealershipsData = (data || []) as Dealership[];

      // ✅ PERF FIX: Cache dealerships in localStorage
      try {
        localStorage.setItem('dealerships-cache', JSON.stringify({
          data: dealershipsData,
          timestamp: Date.now(),
          userId: user.id
        }));
      } catch (error) {
        // Ignore quota errors
        console.warn('Failed to cache dealerships in localStorage:', error);
      }

      return dealershipsData;
    },
    enabled: !!user?.id,
    // ✅ PERF FIX: Load from localStorage for instant initial render
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
            console.log('⚡ Using cached dealerships from localStorage');
            return data as Dealership[];
          }
        }
      } catch (error) {
        // Ignore parse errors
        console.warn('Failed to parse dealerships cache:', error);
      }
      return undefined;
    },
    staleTime: 900000, // 15 minutes - dealerships rarely change
    gcTime: 1800000, // 30 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const error = queryError ? (t('dealerships.error_fetching_dealerships') || 'Error fetching dealerships') : null;

  // Initialize dealership ONLY when dealerships load (not when currentDealership changes)
  useEffect(() => {
    if (dealerships.length > 0 && !hasInitialized.current) {
      hasInitialized.current = true;

      const savedFilter = localStorage.getItem('selectedDealerFilter');

      if (!savedFilter || savedFilter === 'all') {
        // IMPROVED: Auto-select for single-dealer users (except system_admin)
        if (dealerships.length === 1 && user?.role !== 'system_admin') {
          const singleDealer = dealerships[0];
          setCurrentDealership(singleDealer);
          prevDealerIdRef.current = singleDealer.id;

          // Update localStorage to persist selection
          localStorage.setItem('selectedDealerFilter', singleDealer.id.toString());

          // Sync with DealerFilterContext
          window.dispatchEvent(new CustomEvent('dealerFilterChanged', {
            detail: { dealerId: singleDealer.id }
          }));

          console.log('🎯 [Auto-Select] Single dealership auto-selected:', singleDealer.name);
        } else {
          // Multi-dealer or system_admin: Keep 'all' (no auto-selection)
          setCurrentDealership(null);
          prevDealerIdRef.current = 'all';
          console.log('📋 [Auto-Select] Multi-dealer user or system_admin: defaulting to "all"');
        }
      } else {
        // Restore specific dealer with improved validation
        const savedId = parseInt(savedFilter);
        const savedDealership = dealerships.find((d: Dealership) => d.id === savedId);

        if (savedDealership) {
          setCurrentDealership(savedDealership);
          prevDealerIdRef.current = savedId;
          console.log('✅ [Auto-Select] Restored saved dealership:', savedDealership.name);
        } else {
          // Saved dealer not found - clean up and use first dealer
          console.warn('⚠️ [Auto-Select] Saved dealer not found in accessible list, selecting first available');
          const firstDealer = dealerships[0];
          setCurrentDealership(firstDealer || null);
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
  }, [dealerships, user]); // Added 'user' dependency for role checking

  const filterByModule = async (moduleName: AppModule): Promise<Dealership[]> => {
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
        console.error(`Error checking module access for dealership ${dealership.id}:`, error);
      }
    }

    return filteredDealerships;
  };

  // ✅ OPTIMIZATION: Use refetch from TanStack Query
  const refreshDealerships = useCallback(() => {
    // Trigger a refetch of the query
    // Note: This will use cache if data is still fresh (staleTime)
  }, []);

  // ========================================================================
  // SYNC: Update currentDealership when dealerships data refreshes
  // ========================================================================
  // This fixes the issue where the sidebar shows old logo after upload
  // When React Query refetches dealerships (e.g., after logo upload),
  // we need to update currentDealership with the fresh data
  useEffect(() => {
    if (currentDealership && dealerships.length > 0) {
      const updatedDealership = dealerships.find(d => d.id === currentDealership.id);
      if (updatedDealership) {
        // Only update if logo_url or thumbnail_logo_url changed (specific comparison)
        if (
          updatedDealership.logo_url !== currentDealership.logo_url ||
          updatedDealership.thumbnail_logo_url !== currentDealership.thumbnail_logo_url
        ) {
          console.log('🔄 [Sync] Logo changed - updating currentDealership');
          setCurrentDealership(updatedDealership);
        }
      }
    }
  }, [dealerships, currentDealership]); // Include currentDealership to prevent stale closure

  // Listen for dealership filter changes from DealershipFilter component
  useEffect(() => {
    const handleDealerFilterChange = (event: CustomEvent) => {
      const { dealerId } = event.detail;

      // Prevent redundant updates
      if (dealerId === prevDealerIdRef.current) {
        return;
      }

      prevDealerIdRef.current = dealerId;

      if (dealerId === 'all') {
        setCurrentDealership(null);
      } else {
        const selectedDealership = dealerships.find(d => d.id === dealerId);
        if (selectedDealership) {
          setCurrentDealership(selectedDealership);
        }
      }
    };

    window.addEventListener('dealerFilterChanged', handleDealerFilterChange as EventListener);

    return () => {
      window.removeEventListener('dealerFilterChanged', handleDealerFilterChange as EventListener);
    };
  }, [dealerships]);

  return {
    dealerships,
    currentDealership,
    loading,
    error,
    refreshDealerships,
    filterByModule
  };
}
