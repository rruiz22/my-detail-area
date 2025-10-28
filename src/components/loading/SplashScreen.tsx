/**
 * ✅ PHASE 3.1: Professional Splash Screen Component
 *
 * Enterprise-grade loading screen displayed during app initialization.
 * Provides visual feedback while critical systems load (auth, permissions, translations).
 *
 * Features:
 * - Professional Notion-style design (flat colors, muted palette)
 * - Smooth progress animation (not tied to actual loading for UX)
 * - Loading state messages for user feedback
 * - Responsive design (mobile + desktop)
 * - Accessible (ARIA labels, screen reader friendly)
 */

import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SplashScreenProps {
  /**
   * Optional message to display below the loader
   * Examples: "Loading...", "Authenticating...", "Loading permissions..."
   */
  message?: string;
  /**
   * Whether to show animated progress bar
   * Set to false for indefinite loading states
   */
  showProgress?: boolean;
}

/**
 * Professional splash screen for initial app loading
 * Displays loading animation with optional progress indicators
 *
 * @example
 * <SplashScreen message="Loading your workspace..." showProgress={true} />
 */
export function SplashScreen({ message = 'Loading...', showProgress = true }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!showProgress) return;

    // Simulate smooth progress (not tied to actual loading for better UX)
    // Caps at 90% until real load completes to avoid "stuck at 100%" feeling
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev; // Cap at 90%
        return prev + Math.random() * 10;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [showProgress]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-background"
      role="status"
      aria-live="polite"
      aria-label="Loading application"
    >
      <div className="space-y-6 text-center max-w-md px-4">
        {/* Animated loader icon */}
        <div className="w-16 h-16 mx-auto" aria-hidden="true">
          <Loader2 className="w-full h-full animate-spin text-primary" />
        </div>

        {/* Loading message */}
        {message && (
          <p className="text-sm text-muted-foreground font-medium">
            {message}
          </p>
        )}

        {/* Progress bar (optional) */}
        {showProgress && (
          <div className="w-64 h-1 bg-muted rounded-full overflow-hidden mx-auto">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        )}

        {/* Subtle branding/hint */}
        <p className="text-xs text-muted-foreground/60 mt-8">
          My Detail Area
        </p>
      </div>
    </div>
  );
}
