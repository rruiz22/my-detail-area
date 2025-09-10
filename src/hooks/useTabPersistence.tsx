import { useCallback } from 'react';
import { usePersistedState } from './usePersistedState';
import { useInstantTabPersistence, useInstantPersistedState } from './useInstantPersistedState';

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
 * Hook for ultra-responsive tab persistence with instant UI updates
 */
export function useTabPersistence(pageKey: PageKey, dealerId?: string) {
  const config = TAB_CONFIGS[pageKey];
  
  return useInstantTabPersistence(
    config.key,
    config.defaultTab,
    config.validTabs as unknown as string[],
    dealerId
  );
}

/**
 * Hook for view mode persistence (kanban vs table) with instant response
 */
export function useViewModePersistence(pageKey: PageKey) {
  const [viewMode, setViewMode] = useInstantPersistedState(
    `pages.${TAB_CONFIGS[pageKey].key}.viewMode`,
    'kanban' as 'kanban' | 'table',
    {
      validateValue: (value): value is 'kanban' | 'table' => 
        value === 'kanban' || value === 'table'
    }
  );

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
 * Hook for search term persistence with instant response
 */
export function useSearchPersistence(pageKey: PageKey) {
  const [searchTerm, setSearchTerm] = useInstantPersistedState(
    `pages.${TAB_CONFIGS[pageKey].key}.searchTerm`,
    '',
    {
      validateValue: (value): value is string => typeof value === 'string'
    }
  );

  return [searchTerm, setSearchTerm] as const;
}