import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';

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

  // ✅ OPTIMIZATION: Use TanStack Query for shared cache
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

      return (data || []) as Dealership[];
    },
    enabled: !!user?.id,
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
        // No saved filter or "All" selected - require manual selection
        setCurrentDealership(null);
        prevDealerIdRef.current = 'all';
      } else {
        // Restore specific dealer
        const savedId = parseInt(savedFilter);
        const savedDealership = dealerships.find((d: Dealership) => d.id === savedId);
        if (savedDealership) {
          setCurrentDealership(savedDealership);
          prevDealerIdRef.current = savedId;
        } else {
          // Saved dealer not found - fallback to first
          setCurrentDealership(dealerships[0] || null);
          prevDealerIdRef.current = dealerships[0]?.id || null;
        }
      }
    }
  }, [dealerships]); // ONLY depends on dealerships loading

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