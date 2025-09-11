import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Eye, User } from 'lucide-react';
import { Order } from '@/utils/duplicateUtils';
import { formatOrderNumber } from '@/utils/orderUtils';
import { cn } from '@/lib/utils';

interface DuplicatePopoverProps {
  orders: Order[];
  field: 'stockNumber' | 'vehicleVin';
  value: string;
  children: React.ReactNode;
  onOrderClick?: (order: Order) => void;
}

const MAX_DISPLAY_ORDERS = 8;

export function DuplicatePopover({ 
  orders, 
  field, 
  value, 
  children, 
  onOrderClick 
}: DuplicatePopoverProps) {
  // Don't show popover if no duplicates
  if (orders.length <= 1) {
    return <>{children}</>;
  }
  
  const displayOrders = orders.slice(0, MAX_DISPLAY_ORDERS);
  const remainingCount = Math.max(0, orders.length - MAX_DISPLAY_ORDERS);
  
  const fieldLabel = field === 'stockNumber' ? 'Stock Number' : 'VIN';
  
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Unknown date';
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-warning text-warning-foreground';
      case 'in_progress':
      case 'in progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
      case 'complete':
        return 'bg-success text-success-foreground';
      case 'cancelled':
        return 'bg-destructive text-destructive-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };
  
  const getOrderNumber = (order: Order): string => {
    if (typeof formatOrderNumber === 'function') {
      return formatOrderNumber(order);
    }
    
    // Fallback formatting
    const orderNumber = order.orderNumber || order.customOrderNumber;
    if (orderNumber) return orderNumber;
    
    const orderType = order.order_type || 'sales';
    const prefix = orderType === 'sales' ? 'SA' :
                  orderType === 'service' ? 'SE' :
                  orderType === 'carwash' ? 'CW' : 'RC';
    
    return `${prefix}-${order.id.slice(0, 6).padStart(6, '0')}`;
  };
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <div onMouseEnter={() => {}} className="cursor-pointer">
          {children}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-4 border-b">
          <h4 className="font-semibold text-sm text-foreground">
            Duplicate {fieldLabel}: {value}
          </h4>
          <p className="text-xs text-muted-foreground mt-1">
            {orders.length} orders found with the same {fieldLabel.toLowerCase()}
          </p>
        </div>
        
        <div className="max-h-64 overflow-y-auto">
          {displayOrders.map((order, index) => (
            <div 
              key={order.id}
              className={cn(
                "p-3 border-b last:border-b-0 hover:bg-accent/50 transition-colors",
                onOrderClick && "cursor-pointer"
              )}
              onClick={() => onOrderClick?.(order)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">
                      {getOrderNumber(order)}
                    </span>
                    {onOrderClick && (
                      <Eye className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(order.createdAt)}</span>
                  </div>
                  
                  {order.customerName && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                      <User className="w-3 h-3" />
                      <span className="truncate">{order.customerName}</span>
                    </div>
                  )}
                </div>
                
                <Badge 
                  className={cn("text-xs px-2 py-0.5", getStatusColor(order.status))}
                  variant="secondary"
                >
                  {order.status}
                </Badge>
              </div>
            </div>
          ))}
          
          {remainingCount > 0 && (
            <div className="p-3 text-center text-xs text-muted-foreground bg-muted/30">
              + {remainingCount} more duplicate{remainingCount > 1 ? 's' : ''}
            </div>
          )}
        </div>
        
        <div className="p-3 bg-muted/30 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Click on an order to view details
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}