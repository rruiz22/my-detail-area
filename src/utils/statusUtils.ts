export function getStatusRowColor(status: string): string {
  const statusColors: Record<string, string> = {
    'pending': 'bg-amber-50/50 hover:bg-amber-50/80',
    'in_progress': 'bg-blue-50/60 hover:bg-blue-50/90',
    'completed': 'bg-green-50/50 hover:bg-green-50/80',
    'cancelled': 'bg-gray-50/50 hover:bg-gray-50/80',
  };

  return statusColors[status.toLowerCase()] || 'hover:bg-muted/50';
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