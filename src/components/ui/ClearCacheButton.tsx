/**
 * ClearCacheButton Component
 *
 * Simple button to clear all permission and profile caches.
 * Use this when role changes don't reflect immediately.
 *
 * TEMPORARY: Can be removed once cache invalidation is more robust.
 */

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { clearAllCachesSelective } from '@/utils/cacheManagement';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

export const ClearCacheButton: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isClearing, setIsClearing] = useState(false);

  const handleClearCache = async () => {
    setIsClearing(true);

    try {
      // Show success toast before clearing
      toast({
        title: '✅ ' + t('cache.cleared_title', { defaultValue: 'Cache Cleared' }),
        description: t('cache.cleared_desc', {
          defaultValue: 'All caches cleared. Redirecting to dashboard...'
        }),
        duration: 2000,
      });

      // Use unified cache management utility (selective mode for manual clearing)
      await clearAllCachesSelective(queryClient);

    } catch (error) {
      console.error('Error clearing cache:', error);
      toast({
        title: t('common.error'),
        description: t('cache.error_clearing', {
          defaultValue: 'Failed to clear cache. Please try again.'
        }),
        variant: 'destructive',
      });
      setIsClearing(false);
    }
  };

  return (
    <Button
      onClick={handleClearCache}
      disabled={isClearing}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${isClearing ? 'animate-spin' : ''}`} />
      {isClearing
        ? t('cache.clearing', { defaultValue: 'Clearing...' })
        : t('cache.clear_button', { defaultValue: 'Clear Cache' })}
    </Button>
  );
};
