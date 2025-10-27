import { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

/**
 * OrderViewErrorBoundary Component
 *
 * Enterprise-grade error boundary for lazy-loaded order view components.
 * Catches errors during code splitting and provides graceful recovery.
 *
 * Features:
 * - Catches chunk loading errors
 * - Provides retry mechanism
 * - Logs errors for debugging
 * - Notion-style design system
 */

interface OrderViewErrorBoundaryProps {
  children: ReactNode;
  viewType?: string;
}

interface OrderViewErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class OrderViewErrorBoundary extends Component<
  OrderViewErrorBoundaryProps,
  OrderViewErrorBoundaryState
> {
  constructor(props: OrderViewErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): OrderViewErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error for debugging
    console.error('[ErrorBoundary] Component error caught:', {
      viewType: this.props.viewType,
      error: error.message,
      componentStack: errorInfo.componentStack,
    });

    this.setState({
      error,
      errorInfo,
    });

    // In production, you might want to send this to an error tracking service
    if (import.meta.env.PROD) {
      // Example: Sentry.captureException(error, { extra: errorInfo });
    }
  }

  handleRetry = (): void => {
    // Reset error state to retry rendering
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = (): void => {
    // Full page reload to clear any cached module errors
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const isChunkError =
        this.state.error?.message.includes('Failed to fetch') ||
        this.state.error?.message.includes('Loading chunk');

      return (
        <Card className="card-enhanced border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              Failed to Load View Component
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-700">
                {isChunkError
                  ? 'Failed to load the view component. This might be due to a network issue or an outdated cache.'
                  : 'An error occurred while rendering the view component.'}
              </p>

              {import.meta.env.DEV && this.state.error && (
                <details className="mt-2 text-xs text-gray-600">
                  <summary className="cursor-pointer font-medium">
                    Error Details (Development Only)
                  </summary>
                  <pre className="mt-2 rounded bg-gray-100 p-2 overflow-auto max-h-40">
                    {this.state.error.message}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleRetry}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>

              {isChunkError && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={this.handleReload}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reload Page
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}
