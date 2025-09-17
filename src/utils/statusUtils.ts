export function getStatusRowColor(status: string): string {
  const statusColors: Record<string, string> = {
    'pending': 'bg-warning/5 hover:bg-warning/10',
    'in_progress': 'bg-blue/10 hover:bg-blue/15',
    'completed': 'bg-success/5 hover:bg-success/10',
    'cancelled': 'bg-destructive/5 hover:bg-destructive/10',
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