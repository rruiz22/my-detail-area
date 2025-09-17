import { useState, useEffect, useCallback } from 'react';

interface KanbanPreferences {
  collapsedColumns: string[];
  cardDensity: 'compact' | 'normal' | 'comfortable';
  showDueDates: boolean;
  showPriority: boolean;
  showAssignee: boolean;
  autoRefresh: boolean;
}

const DEFAULT_PREFERENCES: KanbanPreferences = {
  collapsedColumns: [],
  cardDensity: 'normal',
  showDueDates: true,
  showPriority: true,
  showAssignee: true,
  autoRefresh: true,
};

const STORAGE_KEY = 'kanban_preferences_sales_orders';

export function useKanbanPreferences() {
  const [preferences, setPreferences] = useState<KanbanPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      }
    } catch (error) {
      console.warn('Failed to load kanban preferences:', error);
      setPreferences(DEFAULT_PREFERENCES);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save preferences to localStorage with debouncing
  const savePreferences = useCallback((newPreferences: KanbanPreferences) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPreferences));
      setPreferences(newPreferences);
    } catch (error) {
      console.warn('Failed to save kanban preferences:', error);
    }
  }, []);

  // Individual setters for different preference types
  const toggleColumnCollapsed = useCallback((columnId: string) => {
    setPreferences(prev => {
      const newCollapsed = prev.collapsedColumns.includes(columnId)
        ? prev.collapsedColumns.filter(id => id !== columnId)
        : [...prev.collapsedColumns, columnId];

      const newPreferences = { ...prev, collapsedColumns: newCollapsed };
      savePreferences(newPreferences);
      return newPreferences;
    });
  }, [savePreferences]);

  const setCardDensity = useCallback((density: KanbanPreferences['cardDensity']) => {
    setPreferences(prev => {
      const newPreferences = { ...prev, cardDensity: density };
      savePreferences(newPreferences);
      return newPreferences;
    });
  }, [savePreferences]);

  const togglePreference = useCallback((key: keyof Omit<KanbanPreferences, 'collapsedColumns' | 'cardDensity'>) => {
    setPreferences(prev => {
      const newPreferences = { ...prev, [key]: !prev[key] };
      savePreferences(newPreferences);
      return newPreferences;
    });
  }, [savePreferences]);

  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
    savePreferences(DEFAULT_PREFERENCES);
  }, [savePreferences]);

  // Helper function to check if column is collapsed
  const isColumnCollapsed = useCallback((columnId: string) => {
    return preferences.collapsedColumns.includes(columnId);
  }, [preferences.collapsedColumns]);

  // Get card styles based on density preference
  const getCardDensityStyles = useCallback(() => {
    switch (preferences.cardDensity) {
      case 'compact':
        return 'p-2 space-y-1';
      case 'comfortable':
        return 'p-4 space-y-3';
      default:
        return 'p-3 space-y-2';
    }
  }, [preferences.cardDensity]);

  return {
    preferences,
    isLoading,
    toggleColumnCollapsed,
    setCardDensity,
    togglePreference,
    resetPreferences,
    isColumnCollapsed,
    getCardDensityStyles,
  };
}