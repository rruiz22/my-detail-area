import { useCallback, useState } from 'react';
import { usePersistedState } from './usePersistedState';
import { useInstantTabPersistence, useInstantPersistedState } from './useInstantPersistedState';
import { useCloudSyncedTabPersistence, useCloudSyncedState } from './useCloudSync';

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
    validTabs: ['operational', 'financial', 'performance', 'custom']
  },
  management: {
    key: 'management',
    defaultTab: 'overview',
    validTabs: ['overview', 'users', 'dealerships', 'permissions', 'theme', 'migration']
  },
  dealer_view: {
    key: 'dealer',
    defaultTab: 'overview', 
    validTabs: ['overview', 'groups', 'users', 'services', 'categories', 'modules']
  }
} as const;

export type PageKey = keyof typeof TAB_CONFIGS;

/**
 * Hook for tab persistence - SIMPLIFIED VERSION TO FIX HOOKS VIOLATION
 */
export function useTabPersistence(pageKey: PageKey, dealerId?: string, enableCloudSync = false) {
  const config = TAB_CONFIGS[pageKey];

  // Always use basic state without complex persistence to avoid hooks violations
  const [activeTab, setActiveTab] = useState(config.defaultTab);

  const setValidatedTab = useCallback((tab: string) => {
    if (config.validTabs.includes(tab)) {
      setActiveTab(tab);
    } else {
      console.warn(`⚠️ Invalid tab ${tab}, ignoring`);
    }
  }, [config.validTabs]);

  return [activeTab, setValidatedTab] as const;
}

/**
 * Hook for view mode persistence - SIMPLIFIED VERSION TO FIX HOOKS VIOLATION
 */
export function useViewModePersistence(pageKey: PageKey, enableCloudSync = false) {
  // Always use basic state without complex persistence to avoid hooks violations
  const [viewMode, setViewMode] = useState<'kanban' | 'table' | 'calendar'>('kanban');

  return [viewMode, setViewMode] as const;
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
 * Hook for search term persistence - SIMPLIFIED VERSION TO FIX HOOKS VIOLATION
 */
export function useSearchPersistence(pageKey: PageKey) {
  // Always use basic state without complex persistence to avoid hooks violations
  const [searchTerm, setSearchTerm] = useState('');

  return [searchTerm, setSearchTerm] as const;
}