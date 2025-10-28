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
import { ReactNode } from 'react';
import { SplashScreen } from './SplashScreen';

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
  const translationsReady = useTranslationsReady();

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
