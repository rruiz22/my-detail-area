import { useState, useEffect } from 'react';
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

  const fetchDealerships = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error('User not authenticated');
      }

      const { data, error: fetchError } = await supabase.rpc('get_user_accessible_dealers', {
        user_uuid: user.user.id
      });

      if (fetchError) {
        console.error('Error fetching accessible dealerships:', fetchError);
        throw fetchError;
      }

      setDealerships(data || []);
      setCurrentDealership(data?.[0] || null);
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
  };

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
  }, []);

  return {
    dealerships,
    currentDealership,
    loading,
    error,
    refreshDealerships,
    filterByModule
  };
}