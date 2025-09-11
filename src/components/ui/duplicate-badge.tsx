import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Copy } from "lucide-react";
import { DuplicateMatch, getDuplicateCount, hasHighRiskDuplicates } from "@/utils/duplicateUtils";

interface DuplicateBadgeProps {
  duplicates: DuplicateMatch[];
  className?: string;
}

export function DuplicateBadge({ duplicates, className }: DuplicateBadgeProps) {
  if (!duplicates || duplicates.length === 0) {
    return null;
  }

  const count = getDuplicateCount(duplicates);
  const isHighRisk = hasHighRiskDuplicates(duplicates);

  return (
    <Badge
      variant={isHighRisk ? "destructive" : "secondary"}
      className={`gap-1 ${className}`}
    >
      {isHighRisk ? (
        <AlertTriangle className="h-3 w-3" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
      {count} duplicate{count > 1 ? 's' : ''}
    </Badge>
  );
}