import { useEffect, useRef, useState } from 'react';

/**
 * Hook that debounces a callback function
 * @param callback - Function to debounce
 * @param delay - Delay in milliseconds
 * @param dependencies - Dependencies array (like useEffect)
 */
export function useDebounce(
  callback: () => void,
  delay: number,
  dependencies: React.DependencyList
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      callback();
    }, delay);

    // Cleanup on unmount or dependency change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Hook that returns a debounced value
 * @param value - Value to debounce
 * @param delay - Delay in milliseconds
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
