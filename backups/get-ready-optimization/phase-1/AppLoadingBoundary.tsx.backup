/**
 * ✅ PHASE 3.2: Global Application Loading Boundary
 *
 * This component ensures ALL critical systems are ready before rendering the app.
 * Prevents "Access Denied" flash by waiting for:
 * 1. Authentication state (user session)
 * 2. User profile data
 * 3. User permissions (from custom roles)
 * 4. Translations (i18n ready)
 *
 * Enterprise-grade loading strategy:
 * - Shows professional SplashScreen during initialization
 * - Provides specific loading messages for each system
 * - Handles errors gracefully
 * - Zero flash of incorrect content
 *
 * @example
 * <AppLoadingBoundary>
 *   <BrowserRouter>
 *     <AppRoutes />
 *   </BrowserRouter>
 * </AppLoadingBoundary>
 */

import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useTranslationsReady } from '@/hooks/useTranslationsReady';
import { ReactNode, useEffect, useState } from 'react';
import { SplashScreen } from './SplashScreen';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Info } from 'lucide-react';
import { detectPrivateMode, getPrivateModeMessage } from '@/utils/detectPrivateMode';

interface AppLoadingBoundaryProps {
  children: ReactNode;
}

/**
 * Global loading boundary that ensures all critical systems are ready
 * before rendering the application.
 *
 * Loading sequence:
 * 1. Auth loading → "Authenticating..."
 * 2. Translations loading → "Loading translations..."
 * 3. Permissions loading (if user exists) → "Loading permissions..."
 * 4. All ready → Render children
 *
 * This component is the KEY to eliminating the "Access Denied" flash.
 */
export function AppLoadingBoundary({ children }: AppLoadingBoundaryProps) {
  const { user, loading: authLoading } = useAuth();
  const { enhancedUser, loading: permissionsLoading } = usePermissions();
  const { ready: translationsReady, error: translationsError } = useTranslationsReady();

  // 🔴 CRITICAL FIX: Detect private/incognito mode
  const [isPrivateMode, setIsPrivateMode] = useState(false);
  const [privateModeChecked, setPrivateModeChecked] = useState(false);

  useEffect(() => {
    detectPrivateMode().then((detected) => {
      setIsPrivateMode(detected);
      setPrivateModeChecked(true);
    });
  }, []);

  // 🔴 CRITICAL FIX: Handle translation load errors
  if (translationsError) {
    const privateModeMsg = getPrivateModeMessage('en'); // Default to English for error screen

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="flex justify-center">
            <div className="rounded-full bg-destructive/10 p-4">
              <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              Translation Loading Failed
            </h1>
            <p className="text-muted-foreground">
              We couldn't load the application translations. This might be due to a network issue or cached content.
            </p>
          </div>

          {/* 🔴 CRITICAL FIX: Show private mode warning if detected */}
          {privateModeChecked && isPrivateMode && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="font-semibold text-amber-900 text-sm">
                    {privateModeMsg.title}
                  </h3>
                  <p className="text-xs text-amber-800">
                    {privateModeMsg.description}
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="space-y-3">
            <Button
              onClick={() => window.location.reload()}
              className="w-full"
              size="lg"
            >
              <RefreshCw className="mr-2 h-5 w-5" />
              Refresh Page
            </Button>

            {/* 🔴 CRITICAL FIX: Direct access to clear cache without needing Ctrl+Del (mobile-friendly) */}
            <Button
              onClick={() => {
                // 🔴 FIX #2: Prevent circular redirect loop
                if (window.location.pathname === '/clearcache') {
                  console.warn('⚠️ Already on /clearcache, forcing hard reload to root instead');
                  window.location.replace('/');
                  return;
                }
                window.location.href = '/clearcache?auto=full';
              }}
              variant="outline"
              className="w-full"
              size="lg"
            >
              Clear Cache & Reset
            </Button>

            <p className="text-xs text-muted-foreground">
              If refreshing doesn't work, try clearing cache. This will reset all app data but fix loading issues.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ✅ CRITICAL: Determine what we're waiting for
  const isAuthenticating = authLoading;
  const isLoadingTranslations = !translationsReady;
  const isLoadingPermissions = user && (permissionsLoading || !enhancedUser);

  // Debug logging (dev only)
  if (import.meta.env.DEV) {
    console.log('🔍 [AppLoadingBoundary] State:', {
      authLoading,
      hasUser: !!user,
      permissionsLoading,
      hasEnhancedUser: !!enhancedUser,
      translationsReady,
      isAuthenticating,
      isLoadingTranslations,
      isLoadingPermissions,
      timestamp: new Date().toISOString()
    });
  }

  // Determine loading message based on what's blocking
  let loadingMessage = 'Loading...';

  if (isAuthenticating) {
    loadingMessage = 'Authenticating...';
  } else if (isLoadingTranslations) {
    loadingMessage = 'Loading translations...';
  } else if (isLoadingPermissions) {
    loadingMessage = 'Loading permissions...';
  }

  // Show splash screen if ANY critical system is not ready
  const showSplashScreen = isAuthenticating || isLoadingTranslations || isLoadingPermissions;

  if (showSplashScreen) {
    if (import.meta.env.DEV) {
      console.log(`⏳ [AppLoadingBoundary] Showing splash: ${loadingMessage}`);
    }
    return <SplashScreen message={loadingMessage} showProgress={true} />;
  }

  // ✅ ALL SYSTEMS READY - Render app
  if (import.meta.env.DEV) {
    console.log('✅ [AppLoadingBoundary] All systems ready, rendering app');
  }

  return <>{children}</>;
}
