/**
 * ✅ FIX #12: Error Boundary for Permission System
 *
 * Catches errors in permission checks and displays graceful fallback
 * instead of crashing the entire application.
 *
 * Features:
 * - Catches permission-related errors
 * - Displays user-friendly error message
 * - Provides recovery options
 * - Logs errors for debugging
 */

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface PermissionBoundaryProps {
  children: React.ReactNode;
}

/**
 * Error fallback component for permission system errors
 */
const PermissionErrorFallback: React.FC<{ resetErrorBoundary: () => void }> = ({ resetErrorBoundary }) => {
  const { t, i18n } = useTranslation();

  // Helper function to get translation with fallback
  const getTranslation = (key: string, fallback: string) => {
    const translation = t(key);
    // If translation is the same as the key, it means translation not found
    return translation === key ? fallback : translation;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-lg w-full">
        <CardContent className="pt-12 pb-8 text-center space-y-6">
          <AlertTriangle className="h-16 w-16 mx-auto text-amber-500" />

          <div className="space-y-2">
            <CardTitle className="text-red-600 mb-2">
          {getTranslation('errors.permission_system_error', 'Permission System Error')}
        </CardTitle>
        <CardDescription>
          {getTranslation('common.access_denied', 'You don\'t have permission to access this resource.')}
        </CardDescription>
          </div>

          <div className="bg-muted p-4 rounded-md text-sm text-left">
            <p className="font-semibold mb-2">
              What you can do:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Try refreshing the page</li>
              <li>Clear your browser cache</li>
              <li>Contact your system administrator if the problem persists</li>
            </ul>
          </div>



          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={resetErrorBoundary}
              variant="default"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              {getTranslation('common.try_again', 'Try Again')}
            </Button>

            <Button
              onClick={() => window.location.href = '/dashboard'}
              variant="outline"
              className="gap-2"
            >
              <Home className="h-4 w-4" />
              {getTranslation('common.back_to_dashboard', 'Back to Dashboard')}
            </Button>
          </div>

          {import.meta.env.DEV && (
            <details className="text-left">
              <summary className="cursor-pointer text-sm font-semibold text-muted-foreground hover:text-foreground">
                Technical Details (Dev Only)
              </summary>
              <div className="mt-2 p-3 bg-muted rounded-md text-xs font-mono">
                <p>Check the browser console for detailed error information.</p>
              </div>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Permission Boundary Component
 *
 * Wraps permission-related components to catch and handle errors gracefully.
 *
 * Usage:
 * ```tsx
 * <PermissionBoundary>
 *   <PermissionProvider>
 *     <YourApp />
 *   </PermissionProvider>
 * </PermissionBoundary>
 * ```
 */
export const PermissionBoundary: React.FC<PermissionBoundaryProps> = ({ children }) => {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log to console for debugging
    console.error('🚨 Permission System Error:', error);
    console.error('Error Info:', errorInfo);

    // In production, you might want to send this to an error tracking service
    if (!import.meta.env.DEV) {
      // Example: Sentry, LogRocket, etc.
      // Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
    }
  };

  return (
    <ErrorBoundary
      fallback={(resetErrorBoundary) => (
        <PermissionErrorFallback resetErrorBoundary={resetErrorBoundary} />
      )}
      onError={handleError}
    >
      {children}
    </ErrorBoundary>
  );
};

export default PermissionBoundary;
