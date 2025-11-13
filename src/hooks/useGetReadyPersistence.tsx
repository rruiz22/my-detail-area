import { useCallback, useState, useEffect } from 'react';

/**
 * Get Ready Module - LocalStorage Persistence
 * Persists user preferences for filters, view mode, and sidebar state
 * Enterprise-grade with validation and error handling
 */

const STORAGE_KEYS = {
  VIEW_MODE: 'get_ready_viewMode',
  SEARCH_QUERY: 'get_ready_searchQuery',
  SELECTED_PRIORITY: 'get_ready_selectedPriority',
  SORT_BY: 'get_ready_sortBy',
  SORT_ORDER: 'get_ready_sortOrder',
  SIDEBAR_COLLAPSED: 'get_ready_sidebarCollapsed',
} as const;

const SEARCH_TTL = 60 * 60 * 1000; // 1 hour expiration for search

/**
 * Hook for Get Ready view mode persistence (table | grid)
 */
export function useGetReadyViewMode() {
  const [viewMode, setViewMode] = useState<'table' | 'grid'>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.VIEW_MODE);
      if (stored && ['table', 'grid'].includes(stored)) {
        return stored as 'table' | 'grid';
      }
    } catch (error) {
      console.warn('Failed to read view mode from localStorage:', error);
    }
    return 'table'; // Default
  });

  const setPersistedViewMode = useCallback((mode: 'table' | 'grid') => {
    setViewMode(mode);
    try {
      localStorage.setItem(STORAGE_KEYS.VIEW_MODE, mode);
    } catch (error) {
      console.warn('Failed to save view mode to localStorage:', error);
    }
  }, []);

  return [viewMode, setPersistedViewMode] as const;
}

/**
 * Hook for Get Ready search query persistence with TTL
 */
export function useGetReadySearchQuery() {
  const [searchQuery, setSearchQuery] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SEARCH_QUERY);
      if (stored) {
        const data = JSON.parse(stored);
        const now = Date.now();
        if (data.timestamp && (now - data.timestamp) < SEARCH_TTL) {
          return data.value || '';
        } else {
          // Expired, remove
          localStorage.removeItem(STORAGE_KEYS.SEARCH_QUERY);
        }
      }
    } catch (error) {
      console.warn('Failed to read search query from localStorage:', error);
    }
    return '';
  });

  const setPersistedSearchQuery = useCallback((query: string) => {
    setSearchQuery(query);
    try {
      if (query.trim()) {
        const data = {
          value: query,
          timestamp: Date.now()
        };
        localStorage.setItem(STORAGE_KEYS.SEARCH_QUERY, JSON.stringify(data));
      } else {
        localStorage.removeItem(STORAGE_KEYS.SEARCH_QUERY);
      }
    } catch (error) {
      console.warn('Failed to save search query to localStorage:', error);
    }

    // ✅ Dispatch custom event for cross-component synchronization
    window.dispatchEvent(new CustomEvent('getReadySearchChanged', {
      detail: { searchQuery: query }
    }));
  }, []);

  // ✅ Listen for search changes from other components
  useEffect(() => {
    const handleSearchChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      const newQuery = customEvent.detail?.searchQuery;
      if (newQuery !== undefined && newQuery !== searchQuery) {
        setSearchQuery(newQuery);
      }
    };

    window.addEventListener('getReadySearchChanged', handleSearchChange);
    return () => window.removeEventListener('getReadySearchChanged', handleSearchChange);
  }, [searchQuery]);

  return [searchQuery, setPersistedSearchQuery] as const;
}

/**
 * Hook for Get Ready priority filter persistence
 */
export function useGetReadyPriorityFilter() {
  const [selectedPriority, setSelectedPriority] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SELECTED_PRIORITY);
      if (stored && ['all', 'low', 'normal', 'medium', 'high', 'urgent'].includes(stored)) {
        return stored;
      }
    } catch (error) {
      console.warn('Failed to read priority filter from localStorage:', error);
    }
    return 'all';
  });

  const setPersistedPriority = useCallback((priority: string) => {
    setSelectedPriority(priority);
    try {
      localStorage.setItem(STORAGE_KEYS.SELECTED_PRIORITY, priority);
    } catch (error) {
      console.warn('Failed to save priority filter to localStorage:', error);
    }
  }, []);

  return [selectedPriority, setPersistedPriority] as const;
}

/**
 * Hook for Get Ready sort preferences persistence
 */
export function useGetReadySortPreferences() {
  const [sortBy, setSortBy] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SORT_BY);
      if (stored) return stored;
    } catch (error) {
      console.warn('Failed to read sort by from localStorage:', error);
    }
    return 'days_in_step';
  });

  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SORT_ORDER);
      if (stored && ['asc', 'desc'].includes(stored)) {
        return stored as 'asc' | 'desc';
      }
    } catch (error) {
      console.warn('Failed to read sort order from localStorage:', error);
    }
    return 'desc';
  });

  const setPersistedSortBy = useCallback((sort: string) => {
    setSortBy(sort);
    try {
      localStorage.setItem(STORAGE_KEYS.SORT_BY, sort);
    } catch (error) {
      console.warn('Failed to save sort by to localStorage:', error);
    }
  }, []);

  const setPersistedSortOrder = useCallback((order: 'asc' | 'desc') => {
    setSortOrder(order);
    try {
      localStorage.setItem(STORAGE_KEYS.SORT_ORDER, order);
    } catch (error) {
      console.warn('Failed to save sort order to localStorage:', error);
    }
  }, []);

  return { sortBy, setSortBy: setPersistedSortBy, sortOrder, setSortOrder: setPersistedSortOrder };
}

/**
 * Hook for Get Ready sidebar collapse state persistence
 */
export function useGetReadySidebarState() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED);
      if (stored) {
        return stored === 'true';
      }
    } catch (error) {
      console.warn('Failed to read sidebar state from localStorage:', error);
    }
    return false; // Default expanded
  });

  const setPersistedSidebarCollapsed = useCallback((collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
    try {
      localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, collapsed.toString());
    } catch (error) {
      console.warn('Failed to save sidebar state to localStorage:', error);
    }
  }, []);

  return [sidebarCollapsed, setPersistedSidebarCollapsed] as const;
}

/**
 * Utility function to clear all Get Ready localStorage
 */
export function clearGetReadyStorage() {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    console.log('🧹 Cleared all Get Ready localStorage');
    return true;
  } catch (error) {
    console.error('Failed to clear Get Ready localStorage:', error);
    return false;
  }
}

/**
 * One-time cleanup for legacy workflow filter
 * Automatically removes old workflow filter data from localStorage
 */
export function cleanupLegacyWorkflowFilter() {
  try {
    const legacyKey = 'get_ready_selectedWorkflow';
    if (localStorage.getItem(legacyKey)) {
      localStorage.removeItem(legacyKey);
      console.log('🧹 Removed legacy workflow filter from localStorage');
    }
  } catch (error) {
    console.warn('Failed to cleanup legacy workflow filter:', error);
  }
}
