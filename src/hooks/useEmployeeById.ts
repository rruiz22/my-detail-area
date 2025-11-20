/**
 * Employee By ID Hook
 *
 * Fetches a single employee by their UUID
 * Used for face recognition flow to get full employee details after match
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DetailHubEmployee } from './useDetailHubDatabase';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';

export function useEmployeeById(employeeId: string | null) {
  return useQuery({
    queryKey: ['detail-hub', 'employee-by-id', employeeId],
    queryFn: async () => {
      if (!employeeId) {
        return null;
      }

      const { data, error } = await supabase
        .from('detail_hub_employees')
        .select('*')
        .eq('id', employeeId)
        .eq('status', 'active')
        .single();

      if (error) {
        // If employee not found or not active, return null instead of throwing
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data as DetailHubEmployee;
    },
    enabled: !!employeeId,
    staleTime: CACHE_TIMES.MEDIUM, // 5 minutes (standard data)
    gcTime: GC_TIMES.MEDIUM,
  });
}
