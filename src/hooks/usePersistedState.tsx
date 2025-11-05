import { useState, useEffect, useRef, useCallback } from 'react';
import { storage, StorageOptions } from '@/lib/localStorage';

/**
 * Custom hook for state that persists to localStorage
 * Enterprise-grade with debouncing and error handling
 */
export function usePersistedState<T>(
  key: string,
  defaultValue: T,
  options: StorageOptions & { 
    debounceMs?: number;
    onError?: (error: Error) => void;
    validateValue?: (value: unknown) => value is T;
  } = {}
): [T, (value: T | ((prev: T) => T)) => void, { 
  isLoading: boolean; 
  error: string | null; 
  clear: () => void;
}] {
  const {
    debounceMs = 100,
    onError,
    validateValue,
    ...storageOptions
  } = options;

  // Load initial value synchronously
  const [state, setState] = useState<T>(() => {
    try {
      const storedValue = storage.get(key, defaultValue, storageOptions);

      // Validate if validator provided
      if (validateValue && !validateValue(storedValue)) {
        console.warn(`⚠️ Invalid stored value for ${key}, using default`);
        return defaultValue;
      }

      return storedValue;
    } catch (err) {
      const errorMsg = `Failed to load persisted state for ${key}`;
      console.error(errorMsg, err);
      onError?.(err instanceof Error ? err : new Error(errorMsg));
      return defaultValue;
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<NodeJS.Timeout>();
  const mountedRef = useRef(true);

  // Debounced save function
  const debouncedSave = useCallback((value: T) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      
      try {
        const success = storage.set(key, value, storageOptions);
        if (!success) {
          throw new Error('Storage operation failed');
        }
        setError(null);
      } catch (err) {
        const errorMsg = `Failed to persist state for ${key}`;
        console.error(errorMsg, err);
        setError(errorMsg);
        onError?.(err instanceof Error ? err : new Error(errorMsg));
      }
    }, debounceMs);
  }, [key, debounceMs, onError, storageOptions]);

  // Enhanced setState with immediate UI update, debounced persistence
  const setPersistedState = useCallback((value: T | ((prev: T) => T)) => {
    setState(prevState => {
      const newValue = typeof value === 'function' ? (value as (prev: T) => T)(prevState) : value;
      
      // Immediate UI update, persistence happens in background
      // This ensures responsive UI while localStorage writes are debounced
      debouncedSave(newValue);
      
      return newValue;
    });
  }, [debouncedSave]);

  // Clear function
  const clear = useCallback(() => {
    storage.remove(key, storageOptions);
    setState(defaultValue);
    setError(null);
  }, [key, defaultValue, storageOptions]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return [state, setPersistedState, { isLoading, error, clear }];
}

/**
 * Hook specifically for tab persistence with validation
 */
export function usePersistedTab(
  pageKey: string, 
  defaultTab: string,
  validTabs: string[]
): [string, (tab: string) => void] {
  
  const validateTab = useCallback((value: unknown): value is string => {
    return typeof value === 'string' && validTabs.includes(value);
  }, [validTabs]);

  const [activeTab, setActiveTab] = usePersistedState(
    `pages.${pageKey}.activeTab`,
    defaultTab,
    {
      validateValue: validateTab,
      onError: (error) => console.warn(`Tab persistence error for ${pageKey}:`, error)
    }
  );

  const setValidatedTab = useCallback((tab: string) => {
    if (validTabs.includes(tab)) {
      setActiveTab(tab);
    } else {
      console.warn(`⚠️ Invalid tab ${tab} for page ${pageKey}, using default`);
      setActiveTab(defaultTab);
    }
  }, [validTabs, defaultTab, pageKey, setActiveTab]);

  return [activeTab, setValidatedTab];
}