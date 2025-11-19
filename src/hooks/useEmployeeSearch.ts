/**
 * Employee Search Hook
 *
 * Provides fuzzy search functionality for employees by:
 * - Employee number (exact match priority)
 * - First/Last name (case-insensitive contains)
 * - Phone number
 *
 * Returns only active employees with PIN codes configured
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDealerFilter } from '@/contexts/DealerFilterContext';
import { DetailHubEmployee } from './useDetailHubDatabase';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';

export function useEmployeeSearch(searchQuery: string) {
  const { selectedDealerId } = useDealerFilter();

  return useQuery({
    queryKey: ['detail-hub', 'employee-search', selectedDealerId, searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) {
        return [];
      }

      const normalizedQuery = searchQuery.toLowerCase().trim();

      let query = supabase
        .from('detail_hub_employees')
        .select('*')
        .eq('status', 'active');

      // Filter by dealership
      if (selectedDealerId !== 'all') {
        query = query.eq('dealership_id', selectedDealerId);
      }

      // Search by name, employee number, or phone (combined OR query)
      query = query.or(`first_name.ilike.%${normalizedQuery}%,last_name.ilike.%${normalizedQuery}%,employee_number.ilike.%${normalizedQuery}%,phone.ilike.%${normalizedQuery}%`);

      const { data, error } = await query
        .order('employee_number', { ascending: true })
        .limit(10);

      if (error) throw error;

      return data as DetailHubEmployee[];
    },
    enabled: searchQuery.length >= 2,
    staleTime: CACHE_TIMES.SHORT, // 1 minute (employee data changes occasionally)
    gcTime: GC_TIMES.MEDIUM,
  });
}
