import { useCallback, useState } from 'react';
import { storage } from '@/lib/localStorage';

export type DateFilter = 'today' | 'this_week' | 'last_week' | 'custom';

export interface TimecardFilters {
  dateFilter: DateFilter;
  customDateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  searchQuery: string;
  selectedEmployeeId: string;
  selectedStatus: string;
  selectedMethod: string;
  selectedApprovalStatus: string; // 'all' | 'pending' | 'approved' | 'rejected'
  showAdvancedFilters: boolean;
}

const DEFAULT_FILTERS: TimecardFilters = {
  dateFilter: 'today',
  customDateRange: {
    from: undefined,
    to: undefined
  },
  searchQuery: '',
  selectedEmployeeId: 'all',
  selectedStatus: 'all',
  selectedMethod: 'all',
  selectedApprovalStatus: 'all',
  showAdvancedFilters: false
};

/**
 * Hook for persisting Detail Hub Timecard filters
 * Stores filter state in localStorage with 24-hour expiration
 */
export function useTimecardPersistence() {
  const STORAGE_KEY = 'detail_hub_timecard_filters';
  const EXPIRATION = 24 * 60 * 60 * 1000; // 24 hours

  // Initialize from localStorage
  const [filters, setFiltersState] = useState<TimecardFilters>(() => {
    const stored = storage.get<TimecardFilters>(
      STORAGE_KEY,
      DEFAULT_FILTERS,
      { expiration: EXPIRATION }
    );

    // Convert date strings back to Date objects
    if (stored.customDateRange.from && typeof stored.customDateRange.from === 'string') {
      stored.customDateRange.from = new Date(stored.customDateRange.from);
    }
    if (stored.customDateRange.to && typeof stored.customDateRange.to === 'string') {
      stored.customDateRange.to = new Date(stored.customDateRange.to);
    }

    // Migrate old localStorage data: ensure new fields have default values
    // This handles cases where localStorage has old data without the new fields
    if (stored.selectedApprovalStatus === undefined) {
      stored.selectedApprovalStatus = 'all';
    }

    return stored;
  });

  // Update filters and persist to localStorage
  const setFilters = useCallback((updates: Partial<TimecardFilters>) => {
    setFiltersState(prev => {
      const newFilters = { ...prev, ...updates };

      // Persist to localStorage (dates are automatically serialized to ISO strings)
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
      selectedEmployeeId: 'all',
      selectedStatus: 'all',
      selectedMethod: 'all',
      selectedApprovalStatus: 'all',
      searchQuery: ''
    });
  }, [setFilters]);

  // Count active filters
  const getActiveFiltersCount = useCallback(() => {
    let count = 0;
    if (filters.searchQuery) count++;
    if (filters.selectedEmployeeId !== 'all') count++;
    if (filters.selectedStatus !== 'all') count++;
    if (filters.selectedMethod !== 'all') count++;
    // Handle backwards compatibility: undefined should be treated as 'all'
    if (filters.selectedApprovalStatus && filters.selectedApprovalStatus !== 'all') count++;
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
