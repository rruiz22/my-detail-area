import { Badge } from "@/components/ui/badge";
import { Order } from "@/lib/mockData";
import { useTranslation } from "react-i18next";

interface StatusBadgeProps {
  status: Order['status'];
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useTranslation();

  const variants = {
    'Pending': 'bg-warning text-warning-foreground',
    'In Progress': 'bg-blue-100 text-blue-800',
    'Complete': 'bg-success text-success-foreground',
    'Cancelled': 'bg-destructive text-destructive-foreground'
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'Pending': return t('common.status.pending');
      case 'In Progress': return t('common.status.in_progress');
      case 'Complete': return t('common.status.complete');
      case 'Cancelled': return t('common.status.cancelled');
      default: return status;
    }
  };

  return (
    <Badge className={`${variants[status]} px-3 py-1.5`}>
      {getStatusText(status)}
    </Badge>
  );
}