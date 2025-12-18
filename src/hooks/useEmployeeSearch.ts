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

      // When filtering by dealership, we need to include employees who:
      // 1. Have this as their primary dealership, OR
      // 2. Have an active assignment to this dealership
      if (selectedDealerId !== 'all') {
        // First, get all employee IDs that have active assignments to this dealership
        const { data: assignments, error: assignmentError } = await supabase
          .from('detail_hub_employee_assignments')
          .select('employee_id')
          .eq('dealership_id', selectedDealerId)
          .eq('status', 'active');

        if (assignmentError) throw assignmentError;

        const assignedEmployeeIds = assignments?.map(a => a.employee_id) || [];

        // Now query employees with either primary dealership or active assignment
        let query = supabase
          .from('detail_hub_employees')
          .select('*')
          .eq('status', 'active');

        // Use OR condition: primary dealership OR has active assignment
        if (assignedEmployeeIds.length > 0) {
          query = query.or(`dealership_id.eq.${selectedDealerId},id.in.(${assignedEmployeeIds.map(id => `"${id}"`).join(',')})`);
        } else {
          // If no assignments found, just filter by primary dealership
          query = query.eq('dealership_id', selectedDealerId);
        }

        // Search by name, employee number, or phone
        query = query.or(`first_name.ilike.%${normalizedQuery}%,last_name.ilike.%${normalizedQuery}%,employee_number.ilike.%${normalizedQuery}%,phone.ilike.%${normalizedQuery}%`);

        const { data, error } = await query
          .order('employee_number', { ascending: true })
          .limit(10);

        if (error) throw error;

        return data as DetailHubEmployee[];
      } else {
        // When showing all dealerships, no dealership filtering needed
        let query = supabase
          .from('detail_hub_employees')
          .select('*')
          .eq('status', 'active');

        // Search by name, employee number, or phone
        query = query.or(`first_name.ilike.%${normalizedQuery}%,last_name.ilike.%${normalizedQuery}%,employee_number.ilike.%${normalizedQuery}%,phone.ilike.%${normalizedQuery}%`);

        const { data, error } = await query
          .order('employee_number', { ascending: true })
          .limit(10);

        if (error) throw error;

        return data as DetailHubEmployee[];
      }
    },
    enabled: searchQuery.length >= 2,
    staleTime: CACHE_TIMES.SHORT, // 1 minute (employee data changes occasionally)
    gcTime: GC_TIMES.MEDIUM,
  });
}
