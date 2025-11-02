import React, { useState, useCallback, useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Calendar, Eye, User, AlertTriangle } from 'lucide-react';
import { Order } from '@/utils/duplicateUtils';
import { formatOrderNumber } from '@/utils/orderUtils';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface DuplicateTooltipProps {
  orders: Order[];
  field: 'stockNumber' | 'vehicleVin';
  value: string;
  children: React.ReactNode;
  onOrderClick?: (order: Order) => void;
  debug?: boolean;
}

const MAX_DISPLAY_ORDERS = 5;

// Simple error logging for development (only for events, not render cycles)
const logError = (message: string, error?: unknown) => {
  if (import.meta.env.DEV) {
    console.error(`❌ [DuplicateTooltip] ${message}`, error || '');
  }
};

export function DuplicateTooltip({
  orders,
  field,
  value,
  children,
  onOrderClick,
  debug = false
}: DuplicateTooltipProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [tooltipError, setTooltipError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile device
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Debug logging removed from render cycle to prevent loops

  // Memoize validation and processing
  const tooltipData = useMemo(() => {
    try {
      // Input validation
      if (!value || !value.trim()) {
        return { shouldShow: false, error: 'Invalid value' };
      }

      if (!Array.isArray(orders)) {
        return { shouldShow: false, error: 'Invalid orders data' };
      }

      // Don't show tooltip if no duplicates
      if (orders.length <= 1) {
        return { shouldShow: false, error: null };
      }

      return { shouldShow: true, error: null };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown validation error';
      logError('Tooltip validation error', error);
      return { shouldShow: false, error: errorMsg };
    }
  }, [orders, value]);

  // Memoize expensive calculations - always called regardless of shouldShow
  const { displayOrders, remainingCount, fieldLabel } = useMemo(() => {
    if (!tooltipData.shouldShow) {
      return {
        displayOrders: [],
        remainingCount: 0,
        fieldLabel: field === 'stockNumber' ? 'Stock Number' : 'VIN'
      };
    }

    const display = orders.slice(0, MAX_DISPLAY_ORDERS);
    const remaining = Math.max(0, orders.length - MAX_DISPLAY_ORDERS);
    const label = field === 'stockNumber' ? 'Stock Number' : 'VIN';

    return {
      displayOrders: display,
      remainingCount: remaining,
      fieldLabel: label
    };
  }, [orders, field, tooltipData.shouldShow]);

  // Optimized event handlers with error handling - always defined
  const handleTooltipOpen = useCallback(() => {
    try {
      setIsOpen(true);
      setTooltipError(null);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to open tooltip';
      setTooltipError(errorMsg);
      logError('Tooltip open error', error);
    }
  }, []);

  const handleTooltipClose = useCallback(() => {
    try {
      setIsOpen(false);
    } catch (error) {
      logError('Tooltip close error', error);
    }
  }, []);

  const handleOrderClick = useCallback((order: Order) => {
    try {
      onOrderClick?.(order);
      setIsOpen(false); // Close tooltip after click
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to handle order click';
      setTooltipError(errorMsg);
      logError('Order click error', { error, orderId: order.id });
    }
  }, [onOrderClick]);

  // Utility functions - always defined
  const formatDate = useCallback((dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Unknown';
    }
  }, []);

  const getStatusColor = useCallback((status: string) => {
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
  }, []);

  const formatStatusText = useCallback((status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return t('orders.status.pending', 'Pending');
      case 'in_progress':
        return t('orders.status.in_progress', 'In Progress');
      case 'in progress':
        return t('orders.status.in_progress', 'In Progress');
      case 'completed':
        return t('orders.status.completed', 'Completed');
      case 'complete':
        return t('orders.status.completed', 'Completed');
      case 'cancelled':
        return t('orders.status.cancelled', 'Cancelled');
      default:
        return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
    }
  }, [t]);

  const getOrderNumber = useCallback((order: Order): string => {
    try {
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
    } catch (error) {
      logError('Order number formatting error', { error, orderId: order.id });
      return `#${order.id.slice(-6)}`;
    }
  }, []);

  // Memoized tooltip content for performance
  const tooltipContent = useMemo(() => {
    try {
      return (
        <div className="w-[500px]">
          {/* Header */}
          <div className="mb-3 pb-2 border-b border-border">
            <p className="font-semibold text-sm text-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Duplicate {fieldLabel}: <span className="font-mono">{value}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {orders.length} orders found
            </p>
          </div>

          {/* Orders table - Inline format */}
          <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar">
            {displayOrders.map((order, index) => (
              <div
                key={`${order.id}-${index}`}
                className="group flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent cursor-pointer transition-all border border-transparent hover:border-accent-foreground"
                onClick={() => handleOrderClick(order)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleOrderClick(order);
                  }
                }}
              >
                {/* Order Number */}
                <div className="font-semibold text-sm text-foreground w-20 flex-shrink-0">
                  {getOrderNumber(order)}
                </div>

                {/* L8V */}
                {field === 'vehicleVin' && order.vehicleVin && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-[10px] text-muted-foreground/60">L8V:</span>
                    <span className="font-mono text-xs font-semibold text-foreground">{order.vehicleVin.slice(-8)}</span>
                  </div>
                )}

                {/* Stock Number */}
                {field === 'stockNumber' && order.stockNumber && (
                  <div className="font-mono text-xs font-semibold text-foreground flex-shrink-0">
                    {order.stockNumber}
                  </div>
                )}

                {/* Date - Show completion date if available, otherwise due date, otherwise created date */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(order.completionDate || order.dueDate || order.createdAt)}</span>
                </div>

                {/* Dealership */}
                {order.dealershipName && (
                  <div className="text-xs text-muted-foreground truncate flex-1 min-w-0">
                    {order.dealershipName}
                  </div>
                )}

                {/* Status Badge */}
                <Badge
                  className={cn("text-[11px] px-2 py-0.5 flex-shrink-0", getStatusColor(order.status))}
                  variant="secondary"
                >
                  {formatStatusText(order.status)}
                </Badge>
              </div>
            ))}

            {remainingCount > 0 && (
              <div className="text-center text-xs text-muted-foreground pt-2 mt-2 border-t border-border">
                <Badge variant="outline" className="text-xs">
                  + {remainingCount} more orders
                </Badge>
              </div>
            )}
          </div>

          <div className="mt-3 pt-2 border-t border-border text-xs text-muted-foreground/80 text-center">
            <div className="flex items-center justify-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              Click any order to view details
            </div>
          </div>
        </div>
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to render tooltip content';
      logError('Tooltip content render error', errorMsg);

      return (
        <div className="max-w-sm p-2">
          <div className="text-xs text-destructive flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Failed to load tooltip content
          </div>
          {debug && (
            <div className="text-xs text-muted-foreground mt-1 font-mono">
              {errorMsg}
            </div>
          )}
        </div>
      );
    }
  }, [displayOrders, remainingCount, fieldLabel, value, orders.length, tooltipError, debug, formatDate, getOrderNumber, getStatusColor, formatStatusText, handleOrderClick]);

  // Enhanced mobile touch handling - always defined
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isMobile && !isOpen) {
      e.preventDefault(); // Prevent default touch behavior
      handleTooltipOpen();

      // Auto-close tooltip after 3 seconds on mobile
      setTimeout(() => {
        setIsOpen(false);
      }, 3000);
    }
  }, [isMobile, isOpen, handleTooltipOpen]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch' && !isOpen) {
      e.preventDefault();
      handleTooltipOpen();
    }
  }, [isOpen, handleTooltipOpen]);

  // Early return after all hooks are defined
  if (!tooltipData.shouldShow) {
    if (tooltipData.error && debug) {
      return (
        <div className="relative inline-block">
          {children}
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-2 h-2 text-white" />
          </div>
        </div>
      );
    }
    return <>{children}</>;
  }

  return (
    <Tooltip
      delayDuration={isMobile ? 0 : 200} // No delay on mobile
      open={isOpen}
      onOpenChange={(open) => {
        if (open) {
          handleTooltipOpen();
        } else {
          handleTooltipClose();
        }
      }}
    >
      <TooltipTrigger asChild>
        <div
          className="inline-block"
          data-tooltip-field={field}
          data-tooltip-value={value}
          data-tooltip-count={orders.length}
          data-is-mobile={isMobile}
          onTouchStart={handleTouchStart}
          onPointerDown={handlePointerDown}
        >
          {children}
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="center"
        className="max-w-none p-4"
        sideOffset={8}
        data-duplicate-tooltip="true"
        data-field={field}
        data-value={value}
        data-orders-count={orders.length}
        onPointerDownOutside={() => setIsOpen(false)}
        onEscapeKeyDown={() => setIsOpen(false)}
      >
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
}
