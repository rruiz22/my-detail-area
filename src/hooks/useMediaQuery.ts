import { useState, useEffect } from 'react';

/**
 * Hook to match media queries in React
 * @param query - Media query string (e.g., '(max-width: 768px)')
 * @returns boolean - Whether the media query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    
    // Set initial value
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    
    // Create listener function
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };
    
    // Add listener
    media.addEventListener('change', listener);
    
    // Cleanup
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
}

