import React from 'react';
import { VehicleTable } from './VehicleTable';
import { VehicleDetailPanel } from './VehicleDetailPanel';
import { useGetReadyStore } from '@/hooks/useGetReadyStore';
import { cn } from '@/lib/utils';

interface GetReadySplitContentProps {
  className?: string;
}

export function GetReadySplitContent({ className }: GetReadySplitContentProps) {
  const { splitLayout } = useGetReadyStore();

  if (!splitLayout) {
    return (
      <div className={cn("h-full", className)}>
        <VehicleTable className="h-full" />
      </div>
    );
  }

  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* Upper Panel - Vehicle Table */}
      <div className="flex-1 min-h-0 border-b">
        <VehicleTable className="h-full" />
      </div>

      {/* Lower Panel - Vehicle Detail */}
      <div className="h-96 min-h-0">
        <VehicleDetailPanel className="h-full" />
      </div>
    </div>
  );
}