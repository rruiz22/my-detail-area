import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
  const [dealerships, setDealerships] = useState<Dealership[]>([]);
  const [currentDealership, setCurrentDealership] = useState<Dealership | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

  const fetchDealerships = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        // Gracefully handle no authenticated user - don't throw error
        setDealerships([]);
        setCurrentDealership(null);
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase.rpc('get_user_accessible_dealers', {
        user_uuid: session.user.id
      });

      if (fetchError) {
        console.error('Error fetching accessible dealerships:', fetchError);
        throw fetchError;
      }

      setDealerships(data || []);

      // Check if there's a saved filter in localStorage
      const savedFilter = localStorage.getItem('selectedDealerFilter');
      if (savedFilter && savedFilter !== 'all' && data) {
        const savedId = parseInt(savedFilter);
        const savedDealership = data.find((d: Dealership) => d.id === savedId);
        if (savedDealership) {
          setCurrentDealership(savedDealership);
          console.log('🏢 [useAccessibleDealerships] Restored saved dealership:', savedDealership.name);
        } else {
          setCurrentDealership(data[0] || null);
        }
      } else {
        setCurrentDealership(data?.[0] || null);
      }
    } catch (err) {
      console.error('Error in fetchDealerships:', err);
      const errorMessage = t('dealerships.error_fetching_dealerships') || 'Error fetching dealerships';
      setError(errorMessage);
      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

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

  const refreshDealerships = () => {
    fetchDealerships();
  };

  useEffect(() => {
    fetchDealerships();
  }, [fetchDealerships]);

  // Listen for dealership filter changes from DealershipFilter component
  useEffect(() => {
    const handleDealerFilterChange = (event: CustomEvent) => {
      const { dealerId } = event.detail;

      if (dealerId === 'all') {
        // When "All Dealerships" is selected, use the first dealership
        setCurrentDealership(dealerships[0] || null);
        console.log('🏢 [useAccessibleDealerships] Filter changed to "All Dealerships"');
      } else {
        // Find and set the specific dealership
        const selectedDealership = dealerships.find(d => d.id === dealerId);
        if (selectedDealership) {
          setCurrentDealership(selectedDealership);
          console.log('🏢 [useAccessibleDealerships] Filter changed to:', selectedDealership.name);
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