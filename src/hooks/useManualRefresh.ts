import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';

/**
 * Custom hook for handling manual refresh operations across order modules
 *
 * Provides consistent refresh behavior with loading states and toast notifications
 *
 * @param refreshFn - Async function to execute for refreshing data
 * @returns Object with handleRefresh function and isRefreshing state
 *
 * @example
 * ```tsx
 * const { handleRefresh, isRefreshing } = useManualRefresh(refreshData);
 *
 * <Button onClick={handleRefresh} disabled={isRefreshing}>
 *   <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
 *   {t('common.refresh')}
 * </Button>
 * ```
 */
export function useManualRefresh(refreshFn: () => Promise<void>) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshFn();
      toast({
        description: t('common.data_refreshed') || 'Data refreshed successfully',
        variant: 'default'
      });
    } catch (error) {
      console.error('Manual refresh failed:', error);
      toast({
        description: t('common.refresh_failed') || 'Failed to refresh data',
        variant: 'destructive'
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshFn, toast, t]);

  return { handleRefresh, isRefreshing };
}
