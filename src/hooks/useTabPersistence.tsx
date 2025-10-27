import { useCallback, useState } from 'react';
import { usePersistedState } from './usePersistedState';

/**
 * Tab persistence configurations for different pages
 */
export const TAB_CONFIGS = {
  sales_orders: {
    key: 'sales',
    defaultTab: 'dashboard',
    validTabs: ['dashboard', 'today', 'tomorrow', 'pending', 'in_process', 'week', 'all', 'services', 'deleted']
  },
  service_orders: {
    key: 'service',
    defaultTab: 'dashboard',
    validTabs: ['dashboard', 'today', 'tomorrow', 'pending', 'in_process', 'week', 'all', 'services', 'deleted']
  },
  recon_orders: {
    key: 'recon',
    defaultTab: 'dashboard',
    validTabs: ['dashboard', 'today', 'tomorrow', 'pending', 'in_process', 'week', 'all', 'services', 'deleted']
  },
  car_wash: {
    key: 'carwash',
    defaultTab: 'today',
    validTabs: ['dashboard', 'today', 'tomorrow', 'pending', 'in_process', 'week', 'all', 'services', 'deleted']
  },
  reports: {
    key: 'reports',
    defaultTab: 'operational',
    validTabs: ['operational', 'financial', 'invoices', 'export']
  },
  management: {
    key: 'management',
    defaultTab: 'overview',
    validTabs: ['overview', 'users', 'dealerships', 'permissions', 'theme', 'migration']
  },
  admin_dashboard: {
    key: 'admin',
    defaultTab: 'dealerships',
    validTabs: ['dealerships', 'users', 'reports', 'system']
  },
  settings: {
    key: 'settings',
    defaultTab: 'profile',
    validTabs: ['platform', 'profile', 'notifications', 'dealership', 'integrations']
  },
  dealer_view: {
    key: 'dealer',
    defaultTab: 'overview',
    validTabs: ['overview', 'groups', 'users', 'invitations', 'services', 'categories', 'modules']
  },
  get_ready: {
    key: 'get_ready',
    defaultTab: 'overview',
    validTabs: ['overview', 'details', 'approvals', 'vendors', 'reports', 'setup']
  },
  profile: {
    key: 'profile',
    defaultTab: 'personal',
    validTabs: ['personal', 'security', 'notifications', 'activity', 'privacy']
  },
  stock: {
    key: 'stock',
    defaultTab: 'inventory',
    validTabs: ['inventory', 'analytics', 'dms_config', 'sync_history']
  }
} as const;

export type PageKey = keyof typeof TAB_CONFIGS;

/**
 * Hook for tab persistence with real localStorage support
 */
export function useTabPersistence(pageKey: PageKey, dealerId?: string, enableCloudSync = false) {
  const config = TAB_CONFIGS[pageKey];
  const storageKey = `${pageKey}_activeTab`;

  // Initialize from localStorage or default
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored && config.validTabs.includes(stored)) {
        return stored;
      }
    } catch (error) {
      console.warn('Failed to read tab from localStorage:', error);
    }
    return config.defaultTab;
  });

  const setValidatedTab = useCallback((tab: string) => {
    if (config.validTabs.includes(tab)) {
      setActiveTab(tab);
      // Save to localStorage
      try {
        localStorage.setItem(storageKey, tab);
      } catch (error) {
        console.warn('Failed to save tab to localStorage:', error);
      }
    } else {
      console.warn(`⚠️ Invalid tab ${tab}, ignoring`);
    }
  }, [config.validTabs, storageKey]);

  return [activeTab, setValidatedTab] as const;
}

/**
 * Hook for view mode persistence with real localStorage support
 */
export function useViewModePersistence(pageKey: PageKey, enableCloudSync = false) {
  const storageKey = `${pageKey}_viewMode`;

  // Initialize from localStorage or default to table
  const [viewMode, setViewMode] = useState<'kanban' | 'table' | 'calendar'>(() => {
    try {
      const stored = localStorage.getItem(storageKey) as 'kanban' | 'table' | 'calendar';
      if (stored && ['kanban', 'table', 'calendar'].includes(stored)) {
        return stored;
      }
    } catch (error) {
      console.warn('Failed to read view mode from localStorage:', error);
    }
    return 'table'; // Default to table for better UX
  });

  const setPersistedViewMode = useCallback((mode: 'kanban' | 'table' | 'calendar') => {
    setViewMode(mode);
    // Save to localStorage
    try {
      localStorage.setItem(storageKey, mode);
    } catch (error) {
      console.warn('Failed to save view mode to localStorage:', error);
    }
  }, [storageKey]);

  return [viewMode, setPersistedViewMode] as const;
}

/**
 * Hook for filter persistence
 */
export function useFilterPersistence<T extends Record<string, any>>(
  pageKey: PageKey,
  defaultFilters: T
) {
  const [filters, setFilters] = usePersistedState(
    `pages.${TAB_CONFIGS[pageKey].key}.filters`,
    defaultFilters,
    {
      expiration: 24 * 60 * 60 * 1000, // 24 hours
      onError: (error) => console.warn(`Filter persistence error for ${pageKey}:`, error)
    }
  );

  return [filters, setFilters] as const;
}

/**
 * Hook for search term persistence with TTL (1 hour expiration)
 */
export function useSearchPersistence(pageKey: PageKey) {
  const storageKey = `${pageKey}_searchTerm`;
  const TTL = 60 * 60 * 1000; // 1 hour in milliseconds

  // Initialize from localStorage with TTL check
  const [searchTerm, setSearchTerm] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        const now = Date.now();
        if (data.timestamp && (now - data.timestamp) < TTL) {
          return data.value || '';
        } else {
          // Expired, remove from storage
          localStorage.removeItem(storageKey);
        }
      }
    } catch (error) {
      console.warn('Failed to read search term from localStorage:', error);
    }
    return '';
  });

  const setPersistedSearchTerm = useCallback((term: string) => {
    setSearchTerm(term);
    // Save to localStorage with timestamp
    try {
      if (term.trim()) {
        const data = {
          value: term,
          timestamp: Date.now()
        };
        localStorage.setItem(storageKey, JSON.stringify(data));
      } else {
        // Remove if empty
        localStorage.removeItem(storageKey);
      }
    } catch (error) {
      console.warn('Failed to save search term to localStorage:', error);
    }
  }, [storageKey]);

  return [searchTerm, setPersistedSearchTerm] as const;
}

/**
 * Hook for pagination persistence (page number)
 */
export function usePaginationPersistence(pageKey: PageKey) {
  const storageKey = `${pageKey}_currentPage`;

  // Initialize from localStorage or default to 1
  const [currentPage, setCurrentPage] = useState(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const page = parseInt(stored, 10);
        if (page > 0) {
          return page;
        }
      }
    } catch (error) {
      console.warn('Failed to read pagination from localStorage:', error);
    }
    return 1; // Default to first page
  });

  const setPersistedPage = useCallback((page: number) => {
    if (page > 0) {
      setCurrentPage(page);
      // Save to localStorage
      try {
        localStorage.setItem(storageKey, page.toString());
      } catch (error) {
        console.warn('Failed to save pagination to localStorage:', error);
      }
    }
  }, [storageKey]);

  return [currentPage, setPersistedPage] as const;
}
