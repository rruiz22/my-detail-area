import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

/**
 * OrderViewLoadingFallback Component
 *
 * Enterprise-grade loading skeleton for lazy-loaded order view components.
 * Matches the layout of OrderDataTable, OrderKanbanBoard, and SmartDashboard.
 *
 * Design: Notion-style with muted gray palette, no gradients
 * Performance: Lightweight placeholder to minimize layout shift
 * Accessibility: Aria labels for screen readers
 */

interface OrderViewLoadingFallbackProps {
  /** View type to optimize skeleton layout */
  viewType?: 'table' | 'kanban' | 'dashboard' | 'calendar';
}

export function OrderViewLoadingFallback({ viewType = 'table' }: OrderViewLoadingFallbackProps) {
  // Development logging for code splitting performance tracking
  if (import.meta.env.DEV) {
    console.log(`[CodeSplit] Loading ${viewType} view component...`);
  }

  // Render different skeletons based on view type for optimal UX
  switch (viewType) {
    case 'kanban':
      return (
        <div className="space-y-4" role="status" aria-label="Loading kanban view">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* 4 columns for kanban board */}
            {Array.from({ length: 4 }).map((_, colIndex) => (
              <div key={colIndex} className="space-y-3">
                {/* Column header */}
                <Skeleton className="h-10 w-full" />

                {/* Cards in column */}
                {Array.from({ length: 3 }).map((_, cardIndex) => (
                  <Card key={cardIndex} className="card-enhanced">
                    <CardHeader className="pb-3">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2 mt-2" />
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                      <Skeleton className="h-8 w-full mt-3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ))}
          </div>
        </div>
      );

    case 'dashboard':
      return (
        <div className="space-y-6" role="status" aria-label="Loading dashboard view">
          {/* Stats cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Card key={index} className="card-enhanced">
                <CardHeader className="pb-3">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-16 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="card-enhanced">
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
            <Card className="card-enhanced">
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      );

    case 'calendar':
      return (
        <div className="space-y-4" role="status" aria-label="Loading calendar view">
          <Card className="card-enhanced">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <Skeleton className="h-6 w-32" />
              <div className="flex gap-2">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-24" />
              </div>
            </CardHeader>
            <CardContent>
              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-2">
                {/* Day headers */}
                {Array.from({ length: 7 }).map((_, index) => (
                  <Skeleton key={`header-${index}`} className="h-8 w-full" />
                ))}
                {/* Calendar days */}
                {Array.from({ length: 35 }).map((_, index) => (
                  <Skeleton key={`day-${index}`} className="h-24 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      );

    case 'table':
    default:
      return (
        <div className="space-y-4" role="status" aria-label="Loading table view">
          <Card className="card-enhanced">
            <CardHeader className="pb-3">
              {/* Table header skeleton */}
              <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-48" />
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-32" />
                  <Skeleton className="h-9 w-32" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Table rows skeleton */}
              <div className="space-y-3">
                {/* Header row */}
                <div className="grid grid-cols-6 gap-4 pb-3 border-b">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton key={`th-${index}`} className="h-5 w-full" />
                  ))}
                </div>

                {/* Data rows */}
                {Array.from({ length: 8 }).map((_, rowIndex) => (
                  <div key={rowIndex} className="grid grid-cols-6 gap-4 py-3">
                    {Array.from({ length: 6 }).map((_, colIndex) => (
                      <Skeleton key={`td-${rowIndex}-${colIndex}`} className="h-5 w-full" />
                    ))}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      );
  }
}
