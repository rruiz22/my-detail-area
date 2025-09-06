import { Badge } from "@/components/ui/badge";
import { Order } from "@/lib/mockData";

interface StatusBadgeProps {
  status: Order['status'];
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const variants = {
    'Pending': 'bg-pending text-pending-foreground',
    'In Progress': 'bg-warning text-warning-foreground',
    'Complete': 'bg-success text-success-foreground',
    'Cancelled': 'bg-destructive text-destructive-foreground'
  };

  return (
    <Badge className={variants[status]}>
      {status}
    </Badge>
  );
}