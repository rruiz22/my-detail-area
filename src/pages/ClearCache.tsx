/**
 * Clear Cache Page
 *
 * Dedicated page for cache management with advanced options.
 * Accessible via /clearcache route.
 *
 * Features:
 * - Quick cache clear (permissions, profile, queries)
 * - Full cache clear (all storage, service workers, IndexedDB)
 * - Cache statistics and diagnostics
 * - Individual cache category clearing
 */

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { clearAllCaches, clearAllCachesAggressive, clearAllCachesSelective } from '@/utils/cacheManagement';
import { forceInvalidateAllPermissionCache } from '@/utils/permissionSerialization';
import { useQueryClient } from '@tanstack/react-query';
import {
  RefreshCw,
  Trash2,
  Database,
  HardDrive,
  Layers,
  Shield,
  User,
  AlertCircle,
  CheckCircle2,
  Info,
  Zap,
  Package,
  FileText,
} from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface CacheStats {
  localStorage: number;
  sessionStorage: number;
  queryCache: number;
  serviceWorkers: number;
  cacheStorages: number;
}

export default function ClearCache() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isClearing, setIsClearing] = useState(false);
  const [cacheStats, setCacheStats] = useState<CacheStats>({
    localStorage: 0,
    sessionStorage: 0,
    queryCache: 0,
    serviceWorkers: 0,
    cacheStorages: 0,
  });

  // 🔴 FIX #1: Guard to prevent multiple executions of auto-clear
  const hasExecutedAutoRef = useRef(false);

  // 🔴 FIX #4: Anti-loop detection with sessionStorage counter
  useEffect(() => {
    // Detect infinite loop by counting attempts
    const loopCounter = sessionStorage.getItem('clearcache_attempts') || '0';
    const attempts = parseInt(loopCounter, 10);

    if (attempts > 3) {
      console.error('🔴 LOOP DETECTED: Too many clear cache attempts (>3)');
      sessionStorage.removeItem('clearcache_attempts');
      // Force navigation to root without parameters
      window.location.replace('/');
      return;
    }

    sessionStorage.setItem('clearcache_attempts', String(attempts + 1));

    // Reset counter after successful navigation (5 seconds)
    const resetTimer = setTimeout(() => {
      sessionStorage.removeItem('clearcache_attempts');
    }, 5000);

    return () => clearTimeout(resetTimer);
  }, []);

  // Auto-clear on mount if ?auto=true query param is present
  useEffect(() => {
    // 🔴 FIX #1: Guard to prevent multiple executions
    if (hasExecutedAutoRef.current) {
      console.log('⚠️ Auto-clear already executed, skipping');
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    const autoMode = searchParams.get('auto');

    if (autoMode === 'true' || autoMode === 'quick' || autoMode === 'full') {
      hasExecutedAutoRef.current = true; // Mark as executed

      if (autoMode === 'full') {
        // Auto-trigger full clear
        handleFullClear();
      } else {
        // Auto-trigger quick clear
        handleQuickClear();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Load cache statistics
  useEffect(() => {
    async function loadStats() {
      try {
        // localStorage size (approximate)
        const localStorageSize = new Blob(Object.values(localStorage)).size;

        // sessionStorage size (approximate)
        const sessionStorageSize = new Blob(Object.values(sessionStorage)).size;

        // Query cache size
        const queryCacheSize = queryClient.getQueryCache().getAll().length;

        // Service workers
        const serviceWorkers = 'serviceWorker' in navigator
          ? (await navigator.serviceWorker.getRegistrations()).length
          : 0;

        // Cache storages
        const cacheStorages = 'caches' in window
          ? (await caches.keys()).length
          : 0;

        setCacheStats({
          localStorage: Math.round(localStorageSize / 1024), // KB
          sessionStorage: Math.round(sessionStorageSize / 1024), // KB
          queryCache: queryCacheSize,
          serviceWorkers,
          cacheStorages,
        });
      } catch (error) {
        console.error('Error loading cache stats:', error);
      }
    }

    loadStats();
  }, [queryClient]);

  const handleQuickClear = async () => {
    setIsClearing(true);

    try {
      // 🔴 FIX #5: Only show toasts if NOT in auto-clear mode
      const searchParams = new URLSearchParams(window.location.search);
      const isAuto = searchParams.get('auto');

      if (!isAuto) {
        toast({
          title: t('cache.clearing_quick', 'Quick Clear in Progress'),
          description: t('cache.clearing_quick_desc', 'Clearing permissions, profile, and queries...'),
          duration: 2000,
        });
      }

      await clearAllCachesSelective(queryClient);

      if (!isAuto) {
        toast({
          title: '✅ ' + t('cache.cleared_title', 'Cache Cleared'),
          description: t('cache.cleared_desc', 'All caches cleared. Redirecting...'),
          duration: 2000,
        });
      }

      // clearAllCachesSelective() already redirects automatically
    } catch (error) {
      console.error('Error clearing cache:', error);

      // Only show error if NOT auto-mode
      const isAuto = new URLSearchParams(window.location.search).get('auto');
      if (!isAuto) {
        toast({
          title: t('common.error'),
          description: t('cache.error_clearing', 'Failed to clear cache. Please try again.'),
          variant: 'destructive',
        });
      }

      // 🔴 FIX #5: Redirect to root even on error to break potential loop
      setTimeout(() => {
        window.location.replace('/');
      }, 500);
    }
  };

  const handleFullClear = async () => {
    setIsClearing(true);

    try {
      // 🔴 FIX #5: Only show toasts if NOT in auto-clear mode
      const searchParams = new URLSearchParams(window.location.search);
      const isAuto = searchParams.get('auto') === 'full';

      if (!isAuto) {
        toast({
          title: t('cache.clearing_full', 'Full Clear in Progress'),
          description: t('cache.clearing_full_desc', 'Clearing ALL storage, service workers, and databases...'),
          duration: 2000,
        });
      }

      await clearAllCachesAggressive();

      if (!isAuto) {
        toast({
          title: '✅ ' + t('cache.cleared_title', 'Cache Cleared'),
          description: t('cache.cleared_desc', 'All caches cleared. Redirecting...'),
          duration: 2000,
        });
      }

      // clearAllCachesAggressive() already redirects automatically
    } catch (error) {
      console.error('Error clearing cache:', error);

      // Only show error if NOT auto-mode
      const isAuto = new URLSearchParams(window.location.search).get('auto') === 'full';
      if (!isAuto) {
        toast({
          title: t('common.error'),
          description: t('cache.error_clearing', 'Failed to clear cache. Please try again.'),
          variant: 'destructive',
        });
      }

      // 🔴 FIX #5: Redirect to root even on error to break potential loop
      setTimeout(() => {
        window.location.replace('/');
      }, 500);
    }
  };

  const handlePermissionsOnly = async () => {
    try {
      toast({
        title: t('cache.clearing_permissions', 'Clearing Permissions Cache'),
        description: t('cache.clearing_permissions_desc', 'Invalidating permission cache...'),
        duration: 1500,
      });

      forceInvalidateAllPermissionCache();
      await queryClient.invalidateQueries({ queryKey: ['permissions'] });
      await queryClient.invalidateQueries({ queryKey: ['user'] });

      toast({
        title: '✅ ' + t('cache.permissions_cleared', 'Permissions Cleared'),
        description: t('cache.permissions_cleared_desc', 'Permission cache invalidated. Refresh to see changes.'),
        duration: 3000,
      });
    } catch (error) {
      console.error('Error clearing permissions:', error);
      toast({
        title: t('common.error'),
        description: t('cache.error_clearing', 'Failed to clear permissions cache.'),
        variant: 'destructive',
      });
    }
  };

  const handleQueriesOnly = async () => {
    try {
      toast({
        title: t('cache.clearing_queries', 'Clearing Query Cache'),
        description: t('cache.clearing_queries_desc', 'Resetting TanStack Query cache...'),
        duration: 1500,
      });

      await queryClient.resetQueries();

      toast({
        title: '✅ ' + t('cache.queries_cleared', 'Queries Cleared'),
        description: t('cache.queries_cleared_desc', 'Query cache reset successfully.'),
        duration: 3000,
      });

      // Reload stats
      const queryCacheSize = queryClient.getQueryCache().getAll().length;
      setCacheStats(prev => ({ ...prev, queryCache: queryCacheSize }));
    } catch (error) {
      console.error('Error clearing queries:', error);
      toast({
        title: t('common.error'),
        description: t('cache.error_clearing', 'Failed to clear query cache.'),
        variant: 'destructive',
      });
    }
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <div className="container max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          {t('cache.page_title', 'Cache Management')}
        </h1>
        <p className="text-muted-foreground">
          {t('cache.page_description', 'Clear application caches to fix UI issues, refresh permissions, or free up storage.')}
        </p>
      </div>

      {/* Info Alert */}
      <Card className="mb-6 border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-blue-900">
                {t('cache.info_title', 'When to Clear Cache?')}
              </p>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>{t('cache.info_1', 'Role or permission changes not reflecting')}</li>
                <li>{t('cache.info_2', 'User profile information appears outdated')}</li>
                <li>{t('cache.info_3', 'UI behaving unexpectedly after updates')}</li>
                <li>{t('cache.info_4', 'Service worker conflicts or navigation errors')}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cache Statistics */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            {t('cache.stats_title', 'Cache Statistics')}
          </CardTitle>
          <CardDescription>
            {t('cache.stats_description', 'Current cache usage and storage information')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <HardDrive className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-xs text-muted-foreground">{t('cache.localStorage', 'localStorage')}</p>
                <p className="text-lg font-semibold">{cacheStats.localStorage} KB</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Package className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-xs text-muted-foreground">{t('cache.sessionStorage', 'sessionStorage')}</p>
                <p className="text-lg font-semibold">{cacheStats.sessionStorage} KB</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Layers className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-xs text-muted-foreground">{t('cache.queryCache', 'Query Cache')}</p>
                <p className="text-lg font-semibold">{cacheStats.queryCache} {t('cache.queries', 'queries')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Zap className="h-8 w-8 text-amber-600" />
              <div>
                <p className="text-xs text-muted-foreground">{t('cache.serviceWorkers', 'Service Workers')}</p>
                <p className="text-lg font-semibold">{cacheStats.serviceWorkers} {t('cache.active', 'active')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <FileText className="h-8 w-8 text-indigo-600" />
              <div>
                <p className="text-xs text-muted-foreground">{t('cache.cacheStorage', 'Cache Storage')}</p>
                <p className="text-lg font-semibold">{cacheStats.cacheStorages} {t('cache.caches', 'caches')}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Quick Clear */}
        <Card className="border-emerald-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-700">
              <RefreshCw className="h-5 w-5" />
              {t('cache.quick_clear', 'Quick Clear')}
              <Badge variant="secondary" className="ml-auto">
                {t('cache.recommended', 'Recommended')}
              </Badge>
            </CardTitle>
            <CardDescription>
              {t('cache.quick_clear_desc', 'Clear permissions, profile, and query cache. Safe for regular use.')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 mb-4 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                {t('cache.quick_clear_1', 'Permission and role cache')}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                {t('cache.quick_clear_2', 'User profile cache')}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                {t('cache.quick_clear_3', 'TanStack Query cache')}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                {t('cache.quick_clear_4', 'Service Worker caches')}
              </li>
            </ul>
            <Button
              onClick={handleQuickClear}
              disabled={isClearing}
              className="w-full bg-emerald-600 hover:bg-emerald-700"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isClearing ? 'animate-spin' : ''}`} />
              {isClearing
                ? t('cache.clearing', 'Clearing...')
                : t('cache.quick_clear_button', 'Quick Clear Cache')}
            </Button>
          </CardContent>
        </Card>

        {/* Full Clear */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <Trash2 className="h-5 w-5" />
              {t('cache.full_clear', 'Full Clear')}
              <Badge variant="destructive" className="ml-auto">
                {t('cache.aggressive', 'Aggressive')}
              </Badge>
            </CardTitle>
            <CardDescription>
              {t('cache.full_clear_desc', 'Nuclear option: clear ALL storage, including saved settings and preferences.')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 mb-4 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                {t('cache.full_clear_1', 'All localStorage and sessionStorage')}
              </li>
              <li className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                {t('cache.full_clear_2', 'All Service Workers and caches')}
              </li>
              <li className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                {t('cache.full_clear_3', 'All IndexedDB databases')}
              </li>
              <li className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                {t('cache.full_clear_4', 'All saved preferences and settings')}
              </li>
            </ul>
            <Button
              onClick={handleFullClear}
              disabled={isClearing}
              variant="destructive"
              className="w-full"
            >
              <Trash2 className={`h-4 w-4 mr-2 ${isClearing ? 'animate-spin' : ''}`} />
              {isClearing
                ? t('cache.clearing', 'Clearing...')
                : t('cache.full_clear_button', 'Full Clear (Nuclear)')}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Selective Clearing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            {t('cache.selective_clear', 'Selective Clearing')}
          </CardTitle>
          <CardDescription>
            {t('cache.selective_clear_desc', 'Clear specific cache categories individually for targeted fixes.')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button
              onClick={handlePermissionsOnly}
              variant="outline"
              className="justify-start"
            >
              <Shield className="h-4 w-4 mr-2" />
              {t('cache.clear_permissions', 'Permissions Only')}
            </Button>

            <Button
              onClick={handleQueriesOnly}
              variant="outline"
              className="justify-start"
            >
              <Database className="h-4 w-4 mr-2" />
              {t('cache.clear_queries', 'Query Cache Only')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator className="my-8" />

      {/* Back Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleBackToDashboard}
          variant="ghost"
          className="gap-2"
        >
          {t('cache.back_dashboard', 'Back to Dashboard')}
        </Button>
      </div>
    </div>
  );
}
