/**
 * CacheDebugger Component
 *
 * Temporary debugging component to visualize cache state in real-time.
 *
 * HOW TO USE:
 * 1. Import this component in any page where you want to debug cache
 * 2. Add <CacheDebugger /> to the JSX
 * 3. You'll see a floating debug panel showing cache state
 * 4. REMOVE THIS COMPONENT BEFORE PRODUCTION DEPLOY
 */

import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  forceInvalidateAllPermissionCache,
  getPermissionCacheStats
} from '@/utils/permissionSerialization';
import { useQueryClient } from '@tanstack/react-query';
import { Bug, RefreshCw, Trash2, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

export const CacheDebugger: React.FC = () => {
  const { user } = useAuth();
  const { permissions, isLoading } = usePermissions();
  const queryClient = useQueryClient();

  const [isOpen, setIsOpen] = useState(false);
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [localStorageKeys, setLocalStorageKeys] = useState<string[]>([]);
  const [sessionStorageKeys, setSessionStorageKeys] = useState<string[]>([]);

  // Refresh cache stats every 2 seconds
  useEffect(() => {
    if (!isOpen || !user) return;

    const refreshStats = () => {
      // Get cache stats
      const stats = getPermissionCacheStats(user.id);
      setCacheStats(stats);

      // Get localStorage keys
      const lsKeys = Object.keys(localStorage).filter(key =>
        key.includes('permission') ||
        key.includes('cache') ||
        key.includes('profile') ||
        key.includes('dealership')
      );
      setLocalStorageKeys(lsKeys);

      // Get sessionStorage keys
      const ssKeys = Object.keys(sessionStorage);
      setSessionStorageKeys(ssKeys);
    };

    refreshStats();
    const interval = setInterval(refreshStats, 2000);

    return () => clearInterval(interval);
  }, [isOpen, user]);

  const handleClearCache = () => {
    forceInvalidateAllPermissionCache();
    queryClient.invalidateQueries();
    console.log('🧹 Cache manually cleared via CacheDebugger');
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: ['user-permissions', user?.id]
    });
    console.log('🔄 Permissions refetched via CacheDebugger');
  };

  if (!user) return null;

  return (
    <>
      {/* Floating Debug Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 z-50 rounded-full p-4 shadow-lg"
          variant="secondary"
          title="Open Cache Debugger"
        >
          <Bug className="h-5 w-5" />
        </Button>
      )}

      {/* Debug Panel */}
      {isOpen && (
        <Card className="fixed bottom-4 right-4 z-50 w-96 max-h-[80vh] overflow-auto shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bug className="h-4 w-4" />
              Cache Debugger
            </CardTitle>
            <Button
              onClick={() => setIsOpen(false)}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* User Info */}
            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground">User</div>
              <div className="text-sm font-mono">{user.email}</div>
              <div className="text-xs font-mono text-muted-foreground">
                {user.id}
              </div>
            </div>

            {/* Permissions State */}
            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground">
                Permissions State
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={isLoading ? 'secondary' : 'default'}>
                  {isLoading ? 'Loading...' : 'Loaded'}
                </Badge>
                {permissions && (
                  <span className="text-xs text-muted-foreground">
                    {Object.keys(permissions.systemPermissions || {}).length} system,{' '}
                    {Object.keys(permissions.modulePermissions || {}).length} module
                  </span>
                )}
              </div>
            </div>

            {/* Cache Stats */}
            {cacheStats && (
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground">
                  Cache Stats
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Exists:</span>
                    <Badge variant={cacheStats.exists ? 'default' : 'secondary'}>
                      {cacheStats.exists ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  {cacheStats.exists && (
                    <>
                      <div className="flex justify-between">
                        <span>Age:</span>
                        <span className="font-mono">
                          {Math.floor(cacheStats.age / 1000)}s
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Expired:</span>
                        <Badge variant={cacheStats.isExpired ? 'destructive' : 'default'}>
                          {cacheStats.isExpired ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Version:</span>
                        <span className="font-mono">{cacheStats.version}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>User Match:</span>
                        <Badge
                          variant={cacheStats.isForCurrentUser ? 'default' : 'destructive'}
                        >
                          {cacheStats.isForCurrentUser ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* LocalStorage Keys */}
            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground">
                LocalStorage ({localStorageKeys.length} keys)
              </div>
              {localStorageKeys.length === 0 ? (
                <Badge variant="outline" className="text-xs">
                  Clean
                </Badge>
              ) : (
                <div className="space-y-1">
                  {localStorageKeys.map((key) => (
                    <div
                      key={key}
                      className="text-xs font-mono bg-muted px-2 py-1 rounded"
                    >
                      {key}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* SessionStorage Keys */}
            <div className="space-y-1">
              <div className="text-xs font-semibold text-muted-foreground">
                SessionStorage ({sessionStorageKeys.length} keys)
              </div>
              {sessionStorageKeys.length === 0 ? (
                <Badge variant="outline" className="text-xs">
                  Clean
                </Badge>
              ) : (
                <div className="space-y-1">
                  {sessionStorageKeys.slice(0, 5).map((key) => (
                    <div
                      key={key}
                      className="text-xs font-mono bg-muted px-2 py-1 rounded truncate"
                    >
                      {key}
                    </div>
                  ))}
                  {sessionStorageKeys.length > 5 && (
                    <div className="text-xs text-muted-foreground">
                      ...and {sessionStorageKeys.length - 5} more
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleRefresh}
                size="sm"
                variant="outline"
                className="flex-1"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
              <Button
                onClick={handleClearCache}
                size="sm"
                variant="destructive"
                className="flex-1"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear Cache
              </Button>
            </div>

            <div className="text-xs text-muted-foreground border-t pt-2">
              ⚠️ This is a debug component. Remove before production deploy.
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};
