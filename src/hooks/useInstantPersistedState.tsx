import { useState, useEffect, useCallback, useRef } from 'react';
import { storage, StorageOptions } from '@/lib/localStorage';

/**
 * Ultra-fast persisted state hook optimized for UI responsiveness
 * Updates UI immediately, saves to localStorage asynchronously
 */
export function useInstantPersistedState<T>(
  key: string,
  defaultValue: T,
  options: StorageOptions & {
    validateValue?: (value: unknown) => value is T;
  } = {}
): [T, (value: T | ((prev: T) => T)) => void] {
  const { validateValue, ...storageOptions } = options;
  const [state, setState] = useState<T>(defaultValue);
  const initializedRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Load initial value synchronously
  useEffect(() => {
    if (!initializedRef.current) {
      try {
        const storedValue = storage.get(key, defaultValue, storageOptions);
        
        if (validateValue && !validateValue(storedValue)) {
          console.warn(`⚠️ Invalid stored value for ${key}, using default`);
          setState(defaultValue);
        } else {
          setState(storedValue);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to load ${key}, using default:`, error);
        setState(defaultValue);
      }
      
      initializedRef.current = true;
    }
  }, [key, defaultValue, validateValue, storageOptions]);

  // Async save function
  const asyncSave = useCallback((value: T) => {
    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Save after minimal delay to batch rapid changes
    saveTimeoutRef.current = setTimeout(() => {
      try {
        storage.set(key, value, storageOptions);
      } catch (error) {
        console.warn(`⚠️ Failed to save ${key}:`, error);
      }
    }, 50); // Very fast debounce for UI responsiveness
  }, [key, storageOptions]);

  // Instant UI update with async persistence
  const setInstantState = useCallback((value: T | ((prev: T) => T)) => {
    setState(prevState => {
      const newValue = typeof value === 'function' ? (value as (prev: T) => T)(prevState) : value;
      
      // Save asynchronously - UI updates immediately
      asyncSave(newValue);
      
      return newValue;
    });
  }, [asyncSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return [state, setInstantState];
}

/**
 * Ultra-fast tab persistence specifically optimized for responsiveness
 */
export function useInstantTabPersistence(
  pageKey: string, 
  defaultTab: string,
  validTabs: string[],
  dealerId?: string
) {
  const storageKey = dealerId 
    ? `pages.${pageKey}.${dealerId}.activeTab`
    : `pages.${pageKey}.activeTab`;

  const validateTab = useCallback((value: unknown): value is string => {
    return typeof value === 'string' && validTabs.includes(value);
  }, [validTabs]);

  const [activeTab, setActiveTab] = useInstantPersistedState(
    storageKey,
    defaultTab,
    { validateValue: validateTab }
  );

  const setValidatedTab = useCallback((tab: string) => {
    if (validTabs.includes(tab)) {
      setActiveTab(tab);
    } else {
      console.warn(`⚠️ Invalid tab ${tab}, ignoring`);
    }
  }, [validTabs, setActiveTab]);

  return [activeTab, setValidatedTab] as const;
}