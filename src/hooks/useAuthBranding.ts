import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook: useAuthBranding
 *
 * Loads customizable branding for the authentication page
 *
 * FEATURES:
 * - Fetches from system_settings (public read, no auth required)
 * - localStorage cache (24h) for performance
 * - Fallbacks to default values
 * - Auto-refresh on window focus
 *
 * USAGE:
 * const branding = useAuthBranding();
 * // Returns: { logo_url, title, tagline, enabled }
 */

export interface AuthBranding {
  logo_url: string | null;
  title: string;
  tagline: string;
  enabled: boolean;
}

const DEFAULT_BRANDING: AuthBranding = {
  logo_url: null,
  title: 'My Detail Area',
  tagline: 'Dealership Operations Platform',
  enabled: true
};

const CACHE_KEY = 'auth_branding_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export function useAuthBranding() {
  const [branding, setBranding] = useState<AuthBranding>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);

  const fetchBranding = async () => {
    try {
      // Try cache first
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached);
          const age = Date.now() - timestamp;

          if (age < CACHE_DURATION) {
            setBranding({ ...DEFAULT_BRANDING, ...data });
            setLoading(false);
            return;
          }
        } catch (e) {
          // Invalid cache, continue to fetch
          localStorage.removeItem(CACHE_KEY);
        }
      }

      // Fetch from Supabase (public read, no auth required)
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'auth_page_branding')
        .eq('is_public', true)
        .single();

      if (error) {
        console.error('[Auth Branding] Failed to fetch:', error);
        setBranding(DEFAULT_BRANDING);
        setLoading(false);
        return;
      }

      if (data?.setting_value) {
        const brandingData = data.setting_value as AuthBranding;

        // Merge with defaults to ensure all fields exist
        const mergedBranding = {
          ...DEFAULT_BRANDING,
          ...brandingData
        };

        setBranding(mergedBranding);

        // Cache for 24 hours
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({
            data: mergedBranding,
            timestamp: Date.now()
          }));
        } catch (e) {
          console.warn('[Auth Branding] Failed to cache:', e);
        }
      } else {
        setBranding(DEFAULT_BRANDING);
      }

      setLoading(false);
    } catch (error) {
      console.error('[Auth Branding] Unexpected error:', error);
      setBranding(DEFAULT_BRANDING);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranding();

    // Refresh on window focus (for when admin updates branding)
    const handleFocus = () => {
      // Clear cache and refetch
      localStorage.removeItem(CACHE_KEY);
      fetchBranding();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  return { branding, loading };
}

/**
 * Hook: useInvalidateAuthBrandingCache
 *
 * Used by SystemBrandingEditor to invalidate cache after saving
 */
export function useInvalidateAuthBrandingCache() {
  return () => {
    localStorage.removeItem(CACHE_KEY);
  };
}
