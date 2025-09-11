import { Badge } from "@/components/ui/badge";
import { Order } from "@/lib/mockData";

interface StatusBadgeProps {
  status: Order['status'];
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const variants = {
    'Pending': 'bg-warning text-warning-foreground',
    'In Progress': 'bg-blue-100 text-blue-800',
    'Complete': 'bg-success text-success-foreground',
    'Cancelled': 'bg-destructive text-destructive-foreground'
  };

  return (
    <Badge className={`${variants[status]} px-3 py-1.5`}>
      {status}
    </Badge>
  );
}