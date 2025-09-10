import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { useGetReadyStore, type ReconVehicle } from './useGetReadyStore';

export function useOverviewTable() {
  const { dealerships } = useAccessibleDealerships();
  const { searchTerm, priorityFilter, statusFilter } = useGetReadyStore();
  const dealerId = dealerships.length > 0 ? dealerships[0].id : 5;

  return useQuery({
    queryKey: ['get-ready-overview', dealerId, searchTerm, priorityFilter, statusFilter],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_overview_table', {
        p_dealer_id: dealerId
      });

      if (error) throw error;
      
      let vehicles = data as ReconVehicle[];

      // Apply client-side filters
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        vehicles = vehicles.filter((vehicle) =>
          vehicle.stock_number.toLowerCase().includes(term) ||
          vehicle.vin.toLowerCase().includes(term) ||
          vehicle.short_vin.toLowerCase().includes(term) ||
          `${vehicle.vehicle_year || ''} ${vehicle.vehicle_make || ''} ${vehicle.vehicle_model || ''}`.toLowerCase().includes(term)
        );
      }

      if (priorityFilter && priorityFilter !== 'all') {
        vehicles = vehicles.filter((vehicle) => vehicle.priority === priorityFilter);
      }

      if (statusFilter && statusFilter !== 'all') {
        vehicles = vehicles.filter((vehicle) => vehicle.status === statusFilter);
      }

      return vehicles;
    },
    enabled: !!dealerId,
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 1000 * 60, // 1 minute
  });
}

export function useVehicleDetail(vehicleId: string | null) {
  return useQuery({
    queryKey: ['get-ready-vehicle-detail', vehicleId],
    queryFn: async () => {
      if (!vehicleId) return null;
      
      const { data, error } = await supabase.rpc('get_vehicle_detail', {
        p_vehicle_id: vehicleId
      });

      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!vehicleId,
    staleTime: 1000 * 30, // 30 seconds
  });
}