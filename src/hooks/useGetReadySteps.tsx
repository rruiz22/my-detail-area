import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';

export interface ReconStep {
  id: string;
  name: string;
  description: string | null;
  order_index: number;
  color: string;
  icon: string;
  vehicle_count: number;
  is_default: boolean;
  days_in_step_avg: number;
  days_to_frontline_avg: number;
}

export function useSteps() {
  const { dealerships } = useAccessibleDealerships();
  const dealerId = dealerships.length > 0 ? dealerships[0].id : 5;

  return useQuery({
    queryKey: ['get-ready-steps', dealerId],
    queryFn: async () => {
      // Mock steps data until RPC function is implemented
      const mockSteps: ReconStep[] = [
        {
          id: 'all',
          name: 'All',
          description: 'All vehicles in the reconditioning process',
          order_index: 0,
          color: '#6B7280',
          icon: 'grid',
          vehicle_count: 8,
          is_default: true,
          days_in_step_avg: 5.2,
          days_to_frontline_avg: 12.5
        },
        {
          id: 'inspection',
          name: 'Inspection',
          description: 'Initial vehicle inspection and assessment',
          order_index: 1,
          color: '#3B82F6',
          icon: 'search',
          vehicle_count: 3,
          is_default: false,
          days_in_step_avg: 3.1,
          days_to_frontline_avg: 15.2
        },
        {
          id: 'mechanical',
          name: 'Mechanical',
          description: 'Mechanical repairs and maintenance',
          order_index: 2,
          color: '#10B981',
          icon: 'wrench',
          vehicle_count: 2,
          is_default: false,
          days_in_step_avg: 7.4,
          days_to_frontline_avg: 8.1
        },
        {
          id: 'body_work',
          name: 'Body Work',
          description: 'Body and paint repairs',
          order_index: 3,
          color: '#F59E0B',
          icon: 'hammer',
          vehicle_count: 1,
          is_default: false,
          days_in_step_avg: 4.8,
          days_to_frontline_avg: 6.3
        },
        {
          id: 'detailing',
          name: 'Detailing',
          description: 'Interior and exterior detailing',
          order_index: 4,
          color: '#8B5CF6',
          icon: 'sparkles',
          vehicle_count: 2,
          is_default: false,
          days_in_step_avg: 2.5,
          days_to_frontline_avg: 2.5
        },
        {
          id: 'ready',
          name: 'Ready',
          description: 'Ready for sale',
          order_index: 5,
          color: '#059669',
          icon: 'check',
          vehicle_count: 0,
          is_default: false,
          days_in_step_avg: 0,
          days_to_frontline_avg: 0
        }
      ];

      return mockSteps;
    },
    enabled: !!dealerId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}