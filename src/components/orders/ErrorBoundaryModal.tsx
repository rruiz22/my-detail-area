import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundaryModal extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error to monitoring service
    console.error('Modal component error:', error, errorInfo);
    
    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // Report to performance monitoring
    if (window.performance?.mark) {
      window.performance.mark('modal-error');
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI for development
      if (process.env.NODE_ENV === 'development') {
        return (
          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-red-700 text-sm">
                <AlertTriangle className="h-4 w-4" />
                Component Error
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-red-600">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleRetry}
                className="text-red-700 border-red-300 hover:bg-red-100"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
              {this.state.errorInfo && (
                <details className="mt-2">
                  <summary className="text-xs text-red-500 cursor-pointer">
                    Error Details
                  </summary>
                  <pre className="text-xs text-red-500 mt-1 whitespace-pre-wrap">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        );
      }

      // Production error UI - clean and minimal
      return (
        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="flex items-center justify-center p-4">
            <div className="text-center space-y-2">
              <AlertTriangle className="h-5 w-5 text-gray-400 mx-auto" />
              <p className="text-sm text-gray-600">
                Unable to load this section
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleRetry}
                className="text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// HOC version for functional components
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundaryModal fallback={fallback}>
      <Component {...props} />
    </ErrorBoundaryModal>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}