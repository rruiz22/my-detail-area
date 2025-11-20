import { useCallback, useState } from 'react';
import { storage } from '@/lib/localStorage';

export interface EmployeePortalFilters {
  searchQuery: string;
  selectedStatus: string;
  selectedRole: string;
  selectedDepartment: string;
  showAdvancedFilters: boolean;
}

const DEFAULT_FILTERS: EmployeePortalFilters = {
  searchQuery: '',
  selectedStatus: 'all',
  selectedRole: 'all',
  selectedDepartment: 'all',
  showAdvancedFilters: false
};

/**
 * Hook for persisting Detail Hub Employee Portal filters
 * Stores filter state in localStorage with 24-hour expiration
 */
export function useEmployeePortalPersistence() {
  const STORAGE_KEY = 'detail_hub_employee_filters';
  const EXPIRATION = 24 * 60 * 60 * 1000; // 24 hours

  // Initialize from localStorage
  const [filters, setFiltersState] = useState<EmployeePortalFilters>(() => {
    const stored = storage.get<EmployeePortalFilters>(
      STORAGE_KEY,
      DEFAULT_FILTERS,
      { expiration: EXPIRATION }
    );
    return stored;
  });

  // Update filters and persist to localStorage
  const setFilters = useCallback((updates: Partial<EmployeePortalFilters>) => {
    setFiltersState(prev => {
      const newFilters = { ...prev, ...updates };

      // Persist to localStorage
      storage.set(STORAGE_KEY, newFilters, { expiration: EXPIRATION });

      return newFilters;
    });
  }, []);

  // Reset filters to defaults
  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
    storage.remove(STORAGE_KEY);
  }, []);

  // Clear search only
  const clearSearch = useCallback(() => {
    setFilters({ searchQuery: '' });
  }, [setFilters]);

  // Clear advanced filters
  const clearAdvancedFilters = useCallback(() => {
    setFilters({
      selectedStatus: 'all',
      selectedRole: 'all',
      selectedDepartment: 'all',
      searchQuery: ''
    });
  }, [setFilters]);

  // Count active filters
  const getActiveFiltersCount = useCallback(() => {
    let count = 0;
    if (filters.searchQuery) count++;
    if (filters.selectedStatus !== 'all') count++;
    if (filters.selectedRole !== 'all') count++;
    if (filters.selectedDepartment !== 'all') count++;
    return count;
  }, [filters]);

  return {
    filters,
    setFilters,
    resetFilters,
    clearSearch,
    clearAdvancedFilters,
    getActiveFiltersCount
  };
}
