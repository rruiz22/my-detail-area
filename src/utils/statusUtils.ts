export function getStatusRowColor(status: string): string {
  const statusColors: Record<string, string> = {
    'pending': 'bg-amber-50/50 dark:bg-amber-950/30 hover:bg-amber-50/80 dark:hover:bg-amber-950/50',
    'in_progress': 'bg-blue-50/60 dark:bg-blue-950/30 hover:bg-blue-50/90 dark:hover:bg-blue-950/50',
    'completed': 'bg-green-50/50 dark:bg-green-950/30 hover:bg-green-50/80 dark:hover:bg-green-950/50',
    'cancelled': 'bg-gray-50/50 dark:bg-gray-900/30 hover:bg-gray-50/80 dark:hover:bg-gray-900/50',
  };

  return statusColors[status.toLowerCase()] || 'hover:bg-muted/50 dark:hover:bg-muted/30';
}

export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    'pending': 'text-warning',
    'in_progress': 'text-primary',
    'completed': 'text-success',
    'cancelled': 'text-destructive',
  };
  
  return statusColors[status.toLowerCase()] || 'text-muted-foreground';
}

export function getStatusBorder(status: string): string {
  const statusBorders: Record<string, string> = {
    'pending': 'border-l-warning',
    'in_progress': 'border-l-blue-500',
    'completed': 'border-l-success',  
    'cancelled': 'border-l-destructive',
  };
  
  return statusBorders[status.toLowerCase()] || 'border-l-border';
}