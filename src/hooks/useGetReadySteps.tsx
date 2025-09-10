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
}

export function useSteps() {
  const { dealerships } = useAccessibleDealerships();
  const dealerId = dealerships.length > 0 ? dealerships[0].id : 5;

  return useQuery({
    queryKey: ['get-ready-steps', dealerId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_steps_with_counts', {
        p_dealer_id: dealerId
      });

      if (error) throw error;
      return data as ReconStep[];
    },
    enabled: !!dealerId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}