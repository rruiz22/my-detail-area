import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface SkeletonLoaderProps {
  variant?: 'vehicle-info' | 'schedule-view' | 'qr-code' | 'activity' | 'notes' | 'table';
  className?: string;
  rows?: number;
}

// Memoized skeleton component for performance
export const SkeletonLoader = React.memo(function SkeletonLoader({
  variant = 'vehicle-info',
  className,
  rows = 10
}: SkeletonLoaderProps) {

  const baseSkeletonClass = "bg-muted animate-pulse rounded";
  
  if (variant === 'vehicle-info') {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader className="pb-3">
          <div className={cn(baseSkeletonClass, "h-6 w-32")} />
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Vehicle Details Grid Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                <div className={cn(baseSkeletonClass, "h-4 w-4")} />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className={cn(baseSkeletonClass, "h-3 w-12")} />
                  <div className={cn(baseSkeletonClass, "h-4 w-20")} />
                </div>
              </div>
            ))}
          </div>
          
          {/* VIN Status Skeleton */}
          <div className="pt-3 border-t space-y-2">
            <div className="flex items-center justify-between">
              <div className={cn(baseSkeletonClass, "h-4 w-20")} />
              <div className={cn(baseSkeletonClass, "h-5 w-16")} />
            </div>
            <div className={cn(baseSkeletonClass, "h-3 w-32")} />
          </div>
          
          {/* Preview Skeleton */}
          <div className="pt-3 border-t space-y-2">
            <div className={cn(baseSkeletonClass, "h-4 w-24")} />
            <div className="p-3 bg-muted/50 rounded-lg border border-dashed space-y-2">
              <div className={cn(baseSkeletonClass, "h-4 w-40 mx-auto")} />
              <div className={cn(baseSkeletonClass, "h-3 w-32 mx-auto")} />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (variant === 'schedule-view') {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader className="pb-3">
          <div className={cn(baseSkeletonClass, "h-6 w-36")} />
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Due Date Banner Skeleton */}
          <div className="p-3 rounded-lg bg-muted/30 border">
            <div className="flex items-center gap-2">
              <div className={cn(baseSkeletonClass, "h-4 w-4")} />
              <div className={cn(baseSkeletonClass, "h-4 w-24")} />
            </div>
          </div>
          
          {/* Progress Bar Skeleton */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className={cn(baseSkeletonClass, "h-4 w-28")} />
              <div className={cn(baseSkeletonClass, "h-4 w-8")} />
            </div>
            <div className={cn(baseSkeletonClass, "h-2 w-full")} />
            <div className="flex items-center gap-2">
              <div className={cn(baseSkeletonClass, "h-4 w-4")} />
              <div className={cn(baseSkeletonClass, "h-3 w-20")} />
            </div>
          </div>
          
          {/* Timeline Items Skeleton */}
          <div className="space-y-3">
            <div className={cn(baseSkeletonClass, "h-4 w-16")} />
            {[...Array(3)].map((_, index) => (
              <div key={index} className="flex items-start gap-3 p-2 rounded-lg bg-muted/20">
                <div className={cn(baseSkeletonClass, "h-4 w-4 mt-0.5")} />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className={cn(baseSkeletonClass, "h-3 w-16")} />
                    <div className={cn(baseSkeletonClass, "h-5 w-12")} />
                  </div>
                  <div className={cn(baseSkeletonClass, "h-4 w-24")} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (variant === 'qr-code') {
    return (
      <div className={cn("bg-muted/30 p-4 rounded-lg", className)}>
        <div className="flex items-center gap-2 mb-4">
          <div className={cn(baseSkeletonClass, "h-5 w-5")} />
          <div className={cn(baseSkeletonClass, "h-5 w-32")} />
        </div>
        
        {/* QR Code Display Skeleton */}
        <div className="bg-white p-6 rounded-lg border text-center shadow-md mb-4">
          <div className={cn(baseSkeletonClass, "w-40 h-40 mx-auto mb-4")} />
          <div className={cn(baseSkeletonClass, "h-4 w-32 mx-auto")} />
        </div>
        
        {/* Short Link Skeleton */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
            <div className={cn(baseSkeletonClass, "h-4 w-4")} />
            <div className={cn(baseSkeletonClass, "h-4 w-20")} />
          </div>
          <div className="flex items-center gap-2">
            <div className={cn(baseSkeletonClass, "flex-1 h-8")} />
            <div className={cn(baseSkeletonClass, "h-8 w-8")} />
          </div>
        </div>
        
        {/* Analytics Skeleton */}
        <div className="space-y-2 mb-4">
          <div className={cn(baseSkeletonClass, "h-4 w-24")} />
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-background/50 p-2 rounded space-y-2">
              <div className={cn(baseSkeletonClass, "h-3 w-16 mx-auto")} />
              <div className={cn(baseSkeletonClass, "h-6 w-8 mx-auto")} />
            </div>
            <div className="bg-background/50 p-2 rounded space-y-2">
              <div className={cn(baseSkeletonClass, "h-3 w-16 mx-auto")} />
              <div className={cn(baseSkeletonClass, "h-6 w-8 mx-auto")} />
            </div>
          </div>
        </div>
        
        {/* Action Button Skeleton */}
        <div className={cn(baseSkeletonClass, "h-9 w-full")} />
      </div>
    );
  }
  
  if (variant === 'activity') {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader className="pb-3">
          <div className={cn(baseSkeletonClass, "h-6 w-32")} />
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20">
              <div className={cn(baseSkeletonClass, "h-8 w-8 rounded-full")} />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <div className={cn(baseSkeletonClass, "h-4 w-24")} />
                  <div className={cn(baseSkeletonClass, "h-3 w-16")} />
                </div>
                <div className={cn(baseSkeletonClass, "h-3 w-full")} />
                <div className={cn(baseSkeletonClass, "h-3 w-3/4")} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }
  
  if (variant === 'notes') {
    return (
      <Card className={cn("h-full", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className={cn(baseSkeletonClass, "h-6 w-28")} />
            <div className={cn(baseSkeletonClass, "h-8 w-16")} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className={cn(baseSkeletonClass, "h-4 w-full")} />
            <div className={cn(baseSkeletonClass, "h-4 w-5/6")} />
            <div className={cn(baseSkeletonClass, "h-4 w-4/6")} />
          </div>
          
          <div className="space-y-3">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="p-3 rounded-lg bg-muted/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div className={cn(baseSkeletonClass, "h-4 w-20")} />
                  <div className={cn(baseSkeletonClass, "h-3 w-16")} />
                </div>
                <div className={cn(baseSkeletonClass, "h-3 w-full")} />
                <div className={cn(baseSkeletonClass, "h-3 w-2/3")} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (variant === 'table') {
    return (
      <Card className={cn("border-border shadow-sm", className)}>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-16"><div className={cn(baseSkeletonClass, "h-4 w-4")} /></TableHead>
                <TableHead className="w-[140px]"><div className={cn(baseSkeletonClass, "h-4 w-20")} /></TableHead>
                <TableHead><div className={cn(baseSkeletonClass, "h-4 w-16")} /></TableHead>
                <TableHead><div className={cn(baseSkeletonClass, "h-4 w-20")} /></TableHead>
                <TableHead><div className={cn(baseSkeletonClass, "h-4 w-20")} /></TableHead>
                <TableHead><div className={cn(baseSkeletonClass, "h-4 w-16")} /></TableHead>
                <TableHead><div className={cn(baseSkeletonClass, "h-4 w-16")} /></TableHead>
                <TableHead><div className={cn(baseSkeletonClass, "h-4 w-20")} /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(rows)].map((_, index) => (
                <TableRow key={index} className="border-border">
                  <TableCell className="py-2 text-center">
                    <div className={cn(baseSkeletonClass, "h-4 w-4 mx-auto")} />
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="space-y-1">
                      <div className={cn(baseSkeletonClass, "h-4 w-16 mx-auto")} />
                      <div className={cn(baseSkeletonClass, "h-3 w-24 mx-auto")} />
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="space-y-1">
                      <div className={cn(baseSkeletonClass, "h-4 w-16 mx-auto")} />
                      <div className={cn(baseSkeletonClass, "h-3 w-20 mx-auto")} />
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="space-y-1">
                      <div className={cn(baseSkeletonClass, "h-4 w-24 mx-auto")} />
                      <div className={cn(baseSkeletonClass, "h-3 w-20 mx-auto")} />
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className={cn(baseSkeletonClass, "h-4 w-20 mx-auto")} />
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="space-y-1">
                      <div className={cn(baseSkeletonClass, "h-5 w-20 mx-auto")} />
                      <div className={cn(baseSkeletonClass, "h-3 w-24 mx-auto")} />
                      <div className={cn(baseSkeletonClass, "h-3 w-16 mx-auto")} />
                    </div>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className={cn(baseSkeletonClass, "h-6 w-20 mx-auto rounded-full")} />
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center justify-center gap-1">
                      <div className={cn(baseSkeletonClass, "h-8 w-8")} />
                      <div className={cn(baseSkeletonClass, "h-8 w-8")} />
                      <div className={cn(baseSkeletonClass, "h-8 w-8")} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  // Default skeleton
  return (
    <div className={cn("space-y-4", className)}>
      <div className={cn(baseSkeletonClass, "h-6 w-32")} />
      <div className={cn(baseSkeletonClass, "h-4 w-full")} />
      <div className={cn(baseSkeletonClass, "h-4 w-5/6")} />
      <div className={cn(baseSkeletonClass, "h-4 w-4/6")} />
    </div>
  );
});