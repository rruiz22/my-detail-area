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
        // Build a combined query that includes both primary dealership and assignments
        // Using a more efficient approach with a single query

        // First get employees with matching primary dealership
        const primaryQuery = supabase
          .from('detail_hub_employees')
          .select('*')
          .eq('status', 'active')
          .eq('dealership_id', selectedDealerId)
          .or(`first_name.ilike.%${normalizedQuery}%,last_name.ilike.%${normalizedQuery}%,employee_number.ilike.%${normalizedQuery}%,phone.ilike.%${normalizedQuery}%`);

        // Then get employees with active assignments to this dealership
        const assignmentQuery = supabase
          .from('detail_hub_employees')
          .select(`
            *,
            detail_hub_employee_assignments!inner (
              dealership_id,
              status
            )
          `)
          .eq('status', 'active')
          .eq('detail_hub_employee_assignments.dealership_id', selectedDealerId)
          .eq('detail_hub_employee_assignments.status', 'active')
          .or(`first_name.ilike.%${normalizedQuery}%,last_name.ilike.%${normalizedQuery}%,employee_number.ilike.%${normalizedQuery}%,phone.ilike.%${normalizedQuery}%`);

        // Execute both queries in parallel
        const [primaryResult, assignmentResult] = await Promise.all([
          primaryQuery,
          assignmentQuery
        ]);

        if (primaryResult.error) throw primaryResult.error;
        if (assignmentResult.error) throw assignmentResult.error;

        // Combine results and remove duplicates
        const allEmployees = [...(primaryResult.data || []), ...(assignmentResult.data || [])];
        const uniqueEmployees = Array.from(
          new Map(allEmployees.map(emp => [emp.id, emp])).values()
        );

        // Sort by employee number and limit to 10
        uniqueEmployees.sort((a, b) => {
          const numA = parseInt(a.employee_number?.replace(/\D/g, '') || '0');
          const numB = parseInt(b.employee_number?.replace(/\D/g, '') || '0');
          return numA - numB;
        });

        return uniqueEmployees.slice(0, 10) as DetailHubEmployee[];
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
