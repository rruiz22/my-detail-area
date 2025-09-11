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
      // Mock data for Get Ready module until RPC functions are implemented
      const mockVehicles: ReconVehicle[] = [
        {
          id: '1',
          stock_number: 'STK001',
          vin: '1HGBH41JXMN109186',
          short_vin: '109186',
          vehicle_year: 2023,
          vehicle_make: 'Honda',
          vehicle_model: 'Civic',
          vehicle_trim: 'LX',
          current_step_name: 'Inspection',
          current_step_color: '#3B82F6',
          current_step_order: 1,
          status: 'in_progress',
          priority: 'high',
          days_in_step: '5 days',
          media_count: 3,
          work_item_counts: {
            pending: 2,
            in_progress: 1,
            completed: 3
          },
          notes_preview: 'Needs detail work for inspection completion',
          retail_value: 28500,
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '2',
          stock_number: 'STK002',
          vin: '2HGBH41JXMN109187',
          short_vin: '109187',
          vehicle_year: 2022,
          vehicle_make: 'Toyota',
          vehicle_model: 'Camry',
          vehicle_trim: 'LE',
          current_step_name: 'Mechanical',
          current_step_color: '#10B981',
          current_step_order: 2,
          status: 'pending',
          priority: 'medium',
          days_in_step: '12 days',
          media_count: 1,
          work_item_counts: {
            pending: 4,
            in_progress: 0,
            completed: 1
          },
          notes_preview: 'Oil change required, brake inspection needed',
          retail_value: 24800,
          created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '3',
          stock_number: 'STK003',
          vin: '3HGBH41JXMN109188',
          short_vin: '109188',
          vehicle_year: 2024,
          vehicle_make: 'Ford',
          vehicle_model: 'F-150',
          vehicle_trim: 'XLT',
          current_step_name: 'Detail',
          current_step_color: '#8B5CF6',
          current_step_order: 3,
          status: 'in_progress',
          priority: 'low',
          days_in_step: '2 days',
          media_count: 8,
          work_item_counts: {
            pending: 0,
            in_progress: 2,
            completed: 8
          },
          notes_preview: 'Interior detail in progress, exterior complete',
          retail_value: 45200,
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      let vehicles = mockVehicles;

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
      
      // Mock detailed vehicle data until RPC function is implemented
      const mockDetail = {
        id: vehicleId,
        stock_number: `STK${vehicleId.padStart(3, '0')}`,
        vin: `1HGBH41JXMN10918${vehicleId}`,
        short_vin: `10918${vehicleId}`,
        vehicle_year: 2023,
        vehicle_make: 'Honda',
        vehicle_model: 'Civic',
        trim: 'LX',
        mileage: 25000,
        color: 'White',
        priority: 'high',
        status: 'in_progress',
        step_name: 'Inspection',
        step_color: '#3B82F6',
        days_in_inventory: 5,
        estimated_completion: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Needs detail work',
        location: 'Bay 3',
        technician: 'John Doe',
        work_orders: [
          {
            id: '1',
            description: 'Oil change',
            status: 'completed',
            completed_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: '2', 
            description: 'Detail interior',
            status: 'in_progress',
            started_at: new Date().toISOString()
          }
        ]
      };

      return mockDetail;
    },
    enabled: !!vehicleId,
    staleTime: 1000 * 30, // 30 seconds
  });
}