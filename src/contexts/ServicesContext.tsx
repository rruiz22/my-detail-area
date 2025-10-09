/**
 * Services Context
 *
 * Provides global cache for dealer services to prevent N+1 query problem
 * Pre-fetches all dealer services and provides instant lookup
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';

export interface DealerService {
  id: string;
  name: string;
  description?: string;
  price?: number;
  duration?: number;
  dealer_id: number;
}

interface ServicesContextType {
  servicesCache: Map<string, DealerService>;
  loading: boolean;
  error: string | null;
  getService: (serviceId: string) => DealerService | undefined;
  getServices: (serviceIds: string[]) => DealerService[];
  refreshServices: () => Promise<void>;
}

const ServicesContext = createContext<ServicesContextType | undefined>(undefined);

export const useServices = () => {
  const context = useContext(ServicesContext);
  if (!context) {
    throw new Error('useServices must be used within ServicesProvider');
  }
  return context;
};

export const ServicesProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [servicesCache, setServicesCache] = useState<Map<string, DealerService>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all services for user's dealerships
  const fetchServices = useCallback(async () => {
    if (!user) {
      logger.dev('No user, skipping services fetch');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      logger.dev('Fetching all dealer services for cache');

      // Get user's dealerships
      const { data: memberships } = await supabase
        .from('dealer_memberships')
        .select('dealer_id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      const dealerIds = memberships?.map(m => m.dealer_id) || [];

      if (dealerIds.length === 0) {
        logger.warn('No dealer memberships found, loading all services');
        // Fallback: load all services (for system admin)
        const { data: allServices, error: servicesError } = await supabase
          .from('dealer_services')
          .select('id, name, description, price, duration, dealer_id');

        if (servicesError) throw servicesError;

        const cache = new Map(
          (allServices || []).map(service => [service.id, service])
        );

        setServicesCache(cache);
        logger.success('Services cache loaded (all dealerships)', { count: cache.size });
        return;
      }

      // Fetch services for user's dealerships
      const { data: services, error: servicesError } = await supabase
        .from('dealer_services')
        .select('id, name, description, price, duration, dealer_id')
        .in('dealer_id', dealerIds);

      if (servicesError) throw servicesError;

      // Create Map cache for O(1) lookup
      const cache = new Map(
        (services || []).map(service => [service.id, service])
      );

      setServicesCache(cache);
      logger.success('Services cache loaded', { count: cache.size, dealerIds });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch services';
      logger.error('Services cache fetch failed', err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial fetch on mount
  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  // Helper: Get single service
  const getService = useCallback((serviceId: string): DealerService | undefined => {
    return servicesCache.get(serviceId);
  }, [servicesCache]);

  // Helper: Get multiple services
  const getServices = useCallback((serviceIds: string[]): DealerService[] => {
    return serviceIds
      .map(id => servicesCache.get(id))
      .filter((service): service is DealerService => service !== undefined);
  }, [servicesCache]);

  const value: ServicesContextType = {
    servicesCache,
    loading,
    error,
    getService,
    getServices,
    refreshServices: fetchServices
  };

  return (
    <ServicesContext.Provider value={value}>
      {children}
    </ServicesContext.Provider>
  );
};
