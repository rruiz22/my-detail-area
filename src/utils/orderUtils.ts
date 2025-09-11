/**
 * Utility functions for order formatting and manipulation
 */

/**
 * Format order display number with proper spacing
 */
export const formatOrderNumber = (orderNumber: string): string => {
  if (!orderNumber) return '';
  return orderNumber.replace(/-/g, '-');
};

/**
 * Format customer name for display
 */
export const formatCustomerName = (firstName?: string, lastName?: string, fullName?: string): string => {
  if (fullName) return fullName;
  if (firstName && lastName) return `${firstName} ${lastName}`;
  if (firstName) return firstName;
  if (lastName) return lastName;
  return 'Unknown Customer';
};

/**
 * Format vehicle display string
 */
export const formatVehicleDisplay = (
  year?: number | string,
  make?: string,
  model?: string,
  trim?: string
): string => {
  const parts = [year, make, model].filter(Boolean);
  if (parts.length === 0) return '';
  
  const baseInfo = parts.join(' ');
  const trimInfo = trim ? ` (${trim})` : '';
  
  return `${baseInfo}${trimInfo}`;
};

/**
 * Format price for display
 */
export const formatPrice = (amount?: number | string): string => {
  if (!amount) return '$0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(num);
};

/**
 * Format date for display
 */
export const formatDate = (date?: string | Date): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Format datetime for display
 */
export const formatDateTime = (date?: string | Date): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Get order status color
 */
export const getStatusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case 'pending':
      return 'hsl(var(--warning))';
    case 'in_progress':
      return 'hsl(var(--info))';
    case 'completed':
      return 'hsl(var(--success))';
    case 'cancelled':
      return 'hsl(var(--destructive))';
    default:
      return 'hsl(var(--muted-foreground))';
  }
};

/**
 * Get priority color
 */
export const getPriorityColor = (priority: string): string => {
  switch (priority.toLowerCase()) {
    case 'high':
      return 'hsl(var(--destructive))';
    case 'medium':
      return 'hsl(var(--warning))';
    case 'low':
      return 'hsl(var(--success))';
    case 'normal':
    default:
      return 'hsl(var(--muted-foreground))';
  }
};