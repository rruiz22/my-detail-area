import { useMemo } from 'react';
import { usePlatformSettings } from './usePlatformSettings';
import { getCurrentYearInTimezone } from '@/utils/dateUtils';

/**
 * Hook: useCurrentYear
 *
 * Returns the current year based on the platform's configured timezone
 * from Platform Settings (Settings → Platform → General → Timezone).
 *
 * This ensures copyright notices and other year displays are consistent
 * across the entire application using the organization's timezone.
 *
 * USAGE:
 * const currentYear = useCurrentYear();
 * <p>© {currentYear} My Detail Area</p>
 *
 * @returns Current year (e.g., 2025) in the platform's configured timezone
 *
 * @example
 * // Platform timezone set to "America/New_York"
 * // At 11 PM EST on Dec 31, 2024
 * // Result: 2024
 *
 * // At 1 AM EST on Jan 1, 2025
 * // Result: 2025
 */
export function useCurrentYear(): number {
  const { settings } = usePlatformSettings();

  const currentYear = useMemo(() => {
    return getCurrentYearInTimezone(settings.timezone);
  }, [settings.timezone]);

  return currentYear;
}
