import type { ApprovalFiltersState } from '@/types/approvals';
import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';

interface ApprovalFiltersStore extends ApprovalFiltersState {
  setDateRange: (range: ApprovalFiltersState['dateRange']) => void;
  setStatuses: (statuses: ApprovalFiltersState['statuses']) => void;
  setApprovers: (approvers: string[]) => void;
  setCostRange: (range: ApprovalFiltersState['costRange']) => void;
  setWorkTypes: (workTypes: string[]) => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sortBy: ApprovalFiltersState['sortBy']) => void;
  setSortOrder: (order: ApprovalFiltersState['sortOrder']) => void;
  setPageSize: (size: ApprovalFiltersState['pageSize']) => void;
  setCurrentPage: (page: number) => void;
  resetFilters: () => void;
}

const getDefaultDateRange = (): ApprovalFiltersState['dateRange'] => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 90); // Default to 90 days

  return {
    from,
    to,
    preset: '90d'
  };
};

/**
 * Custom storage that properly handles Date serialization/deserialization
 * Fixes: TypeError: filters.dateRange.from.toISOString is not a function
 *
 * Problem: JSON.stringify converts Date objects to ISO strings, but JSON.parse
 * doesn't automatically convert them back to Date objects.
 *
 * Solution: Custom deserializer that detects ISO date strings and converts
 * them back to Date objects on load from localStorage.
 */
const dateAwareStorage: StateStorage = {
  getItem: (name: string) => {
    const str = localStorage.getItem(name);
    if (!str) return null;

    try {
      const parsed = JSON.parse(str);

      // Deserialize dateRange if present
      if (parsed.state?.dateRange) {
        const { dateRange } = parsed.state;

        // Check if dates are already Date objects (shouldn't happen but be defensive)
        const fromIsDate = dateRange.from instanceof Date;
        const toIsDate = dateRange.to instanceof Date;

        // Convert ISO strings back to Date objects
        if (!fromIsDate && dateRange.from && typeof dateRange.from === 'string') {
          const fromDate = new Date(dateRange.from);
          // Validate the date is valid
          if (!isNaN(fromDate.getTime())) {
            dateRange.from = fromDate;
          } else {
            // Invalid date, reset to default
            console.warn('[ApprovalFilters] Invalid "from" date in storage, resetting to defaults');
            parsed.state.dateRange = getDefaultDateRange();
          }
        } else if (!fromIsDate) {
          // Not a string and not a Date? Reset
          console.warn('[ApprovalFilters] Corrupted "from" date in storage, resetting to defaults');
          parsed.state.dateRange = getDefaultDateRange();
        }

        if (!toIsDate && dateRange.to && typeof dateRange.to === 'string') {
          const toDate = new Date(dateRange.to);
          // Validate the date is valid
          if (!isNaN(toDate.getTime())) {
            dateRange.to = toDate;
          } else {
            // Invalid date, reset to default
            console.warn('[ApprovalFilters] Invalid "to" date in storage, resetting to defaults');
            parsed.state.dateRange = getDefaultDateRange();
          }
        } else if (!toIsDate) {
          // Not a string and not a Date? Reset
          console.warn('[ApprovalFilters] Corrupted "to" date in storage, resetting to defaults');
          parsed.state.dateRange = getDefaultDateRange();
        }
      } else {
        // No dateRange at all, initialize with defaults
        if (!parsed.state) {
          parsed.state = {};
        }
        parsed.state.dateRange = getDefaultDateRange();
      }

      return JSON.stringify(parsed);
    } catch (error) {
      console.error('[ApprovalFilters] Error deserializing from localStorage, clearing corrupted data:', error);
      // Clear corrupted data
      localStorage.removeItem(name);
      return null;
    }
  },

  setItem: (name: string, value: string) => {
    try {
      localStorage.setItem(name, value);
    } catch (error) {
      console.error('[ApprovalFilters] Error saving to localStorage:', error);
    }
  },

  removeItem: (name: string) => {
    try {
      localStorage.removeItem(name);
    } catch (error) {
      console.error('[ApprovalFilters] Error removing from localStorage:', error);
    }
  }
};

const defaultState: ApprovalFiltersState = {
  dateRange: getDefaultDateRange(),
  statuses: ['pending', 'approved', 'rejected'],
  approvers: [],
  costRange: {
    min: 0,
    max: 100000
  },
  workTypes: [],
  searchQuery: '',
  sortBy: 'date',
  sortOrder: 'desc',
  pageSize: 25,
  currentPage: 1
};

export const useApprovalFilters = create<ApprovalFiltersStore>()(
  persist(
    (set) => ({
      ...defaultState,

      setDateRange: (range) => set({ dateRange: range, currentPage: 1 }),

      setStatuses: (statuses) => set({ statuses, currentPage: 1 }),

      setApprovers: (approvers) => set({ approvers, currentPage: 1 }),

      setCostRange: (range) => set({ costRange: range, currentPage: 1 }),

      setWorkTypes: (workTypes) => set({ workTypes, currentPage: 1 }),

      setSearchQuery: (query) => set({ searchQuery: query, currentPage: 1 }),

      setSortBy: (sortBy) => set({ sortBy }),

      setSortOrder: (order) => set({ sortOrder: order }),

      setPageSize: (size) => set({ pageSize: size, currentPage: 1 }),

      setCurrentPage: (page) => set({ currentPage: page }),

      resetFilters: () => set({ ...defaultState, dateRange: getDefaultDateRange() })
    }),
    {
      name: 'approval-filters-storage',
      storage: createJSONStorage(() => dateAwareStorage),
      partialize: (state) => ({
        // Only persist non-transient filters
        dateRange: state.dateRange,
        pageSize: state.pageSize,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder
      })
    }
  )
);
