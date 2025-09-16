import { lazy, Suspense, ComponentType } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

interface LazyComponentWrapperProps {
  component: () => Promise<{ default: ComponentType<any> }>;
  fallback?: React.ReactNode;
  props?: Record<string, any>;
}

const DefaultFallback = () => (
  <Card className="w-full">
    <CardContent className="p-6">
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-64 w-full" />
        <div className="flex space-x-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export function LazyComponentWrapper({
  component,
  fallback = <DefaultFallback />,
  props = {}
}: LazyComponentWrapperProps) {
  const LazyComponent = lazy(component);

  return (
    <Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

// Predefined lazy loaders for common heavy components
export const LazyAnalyticsWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<DefaultFallback />}>
    {children}
  </Suspense>
);

export const LazyChartsWrapper = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <div className="h-64 w-full bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-gray-600 rounded-full mx-auto" />
              <p className="text-sm text-gray-500">Loading chart...</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  }>
    {children}
  </Suspense>
);