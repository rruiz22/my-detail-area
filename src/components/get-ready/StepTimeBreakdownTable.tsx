import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StepTimeRow {
  step_id: string;
  step_name: string;
  avgDays: number;
  count: number;
  color?: string;
}

interface StepTimeBreakdownTableProps {
  stepStats: StepTimeRow[];
  periodLabel: string;
  onStepClick?: (stepId: string) => void;
}

export function StepTimeBreakdownTable({
  stepStats,
  periodLabel,
  onStepClick
}: StepTimeBreakdownTableProps) {
  // Sort by average days (descending) - longest times first
  const sortedSteps = [...stepStats].sort((a, b) => b.avgDays - a.avgDays);

  if (sortedSteps.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No step data available for {periodLabel}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          All Steps Breakdown - {periodLabel}
        </h3>
        <span className="text-xs text-muted-foreground">
          {sortedSteps.length} steps total
        </span>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Step Name</TableHead>
              <TableHead className="text-right w-[25%]">Avg Time</TableHead>
              <TableHead className="text-right w-[20%]">Vehicles</TableHead>
              <TableHead className="text-right w-[15%]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedSteps.map((step) => {
              // Determine status based on average days
              const getStepStatus = (avgDays: number) => {
                if (avgDays > 7) return { label: 'Slow', variant: 'destructive' as const };
                if (avgDays > 4) return { label: 'Normal', variant: 'secondary' as const };
                return { label: 'Fast', variant: 'default' as const };
              };

              const status = getStepStatus(step.avgDays);

              return (
                <TableRow
                  key={step.step_id}
                  className={cn(
                    "cursor-pointer hover:bg-muted/50 transition-colors",
                    onStepClick && "cursor-pointer"
                  )}
                  onClick={() => onStepClick?.(step.step_id)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: step.color || '#6B7280' }}
                      />
                      <span className="font-medium">{step.step_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-mono font-semibold">
                      {step.avgDays.toFixed(1)}
                      <span className="text-muted-foreground ml-1">days</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline">{step.count}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={status.variant} className="text-xs">
                      {status.label}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Summary Footer */}
      <div className="flex items-center justify-between px-2 py-1 bg-muted/30 rounded text-xs text-muted-foreground">
        <span>
          Total vehicles processed: <strong>{sortedSteps.reduce((sum, s) => sum + s.count, 0)}</strong>
        </span>
        <span>
          Overall average: <strong>{(sortedSteps.reduce((sum, s) => sum + (s.avgDays * s.count), 0) / sortedSteps.reduce((sum, s) => sum + s.count, 0)).toFixed(1)} days</strong>
        </span>
      </div>
    </div>
  );
}
