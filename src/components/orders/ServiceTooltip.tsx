/**
 * Service Tooltip Component
 *
 * Displays service details (description, price, duration) on hover
 * Similar pattern to DuplicateTooltip for consistency
 * Only visible for system_admin role
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Clock, DollarSign, Info, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import type { DealerService } from '@/contexts/ServicesContext';

interface ServiceTooltipProps {
  service: {
    name: string;
    description?: string;
    price?: number;
    duration?: number;
    category_name?: string;
    category_color?: string;
  };
  children: React.ReactNode;
  showPricing?: boolean;
  disabled?: boolean;
}

// Helper function to format currency
const formatPrice = (price: number | null | undefined): string => {
  if (!price || isNaN(price)) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(price);
};

// Helper function to format duration
const formatDuration = (minutes: number | null | undefined): string => {
  if (!minutes || isNaN(minutes)) return 'N/A';

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} hr${hours > 1 ? 's' : ''}`;
  }

  return `${hours}h ${remainingMinutes}m`;
};

export function ServiceTooltip({
  service,
  children,
  showPricing = true,
  disabled = false,
}: ServiceTooltipProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
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

  // Determine if tooltip should show (only for system_admin)
  const shouldShowTooltip = useMemo(() => {
    if (disabled) return false;

    // Only show tooltip for system_admin role
    const isSystemAdmin = user?.role === 'system_admin' || user?.role === 'admin';
    if (!isSystemAdmin) return false;
    // Show tooltip if there's description, price, or duration
    return !!(
      service.description ||
      (showPricing && service.price) ||
      service.duration
    );
  }, [service, showPricing, disabled, user?.role]);

  // Event handlers
  const handleTooltipOpen = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleTooltipClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Touch handling for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isMobile && !isOpen && shouldShowTooltip) {
      e.preventDefault();
      handleTooltipOpen();

      // Auto-close after 3 seconds on mobile
      setTimeout(() => {
        setIsOpen(false);
      }, 3000);
    }
  }, [isMobile, isOpen, shouldShowTooltip, handleTooltipOpen]);

  // Tooltip content
  const tooltipContent = useMemo(() => {
    return (
      <div className="w-[320px]">
        {/* Header */}
        <div className="mb-2 pb-2 border-b border-border">
          <p className="font-semibold text-sm text-foreground flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-500" />
            {service.name}
          </p>
          {service.category_name && (
            <p className="text-xs text-muted-foreground mt-1">
              {service.category_name}
            </p>
          )}
        </div>

        {/* Description */}
        {service.description && (
          <div className="mb-3">
            <div className="flex items-start gap-2">
              <FileText className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-xs text-foreground leading-relaxed">
                {service.description}
              </p>
            </div>
          </div>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Price */}
          {showPricing && (
            <div className="flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  {t('orders.price', 'Price')}
                </p>
                <p className="text-sm font-semibold text-foreground font-mono">
                  {formatPrice(service.price)}
                </p>
              </div>
            </div>
          )}

          {/* Duration */}
          {service.duration && (
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  {t('orders.duration', 'Duration')}
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {formatDuration(service.duration)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Empty state if no details */}
        {!service.description && !service.price && !service.duration && (
          <div className="text-center py-2">
            <p className="text-xs text-muted-foreground italic">
              {t('orders.no_service_details', 'No additional details available')}
            </p>
          </div>
        )}
      </div>
    );
  }, [service, showPricing, t]);

  // If tooltip shouldn't show, just return children
  if (!shouldShowTooltip) {
    return <>{children}</>;
  }

  return (
    <Tooltip
      delayDuration={isMobile ? 0 : 300}
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
          className="inline-block cursor-default"
          data-tooltip-service={service.name}
          data-is-mobile={isMobile}
          onTouchStart={handleTouchStart}
        >
          {children}
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="center"
        className="max-w-none p-4"
        sideOffset={8}
        data-service-tooltip="true"
        onPointerDownOutside={() => setIsOpen(false)}
        onEscapeKeyDown={() => setIsOpen(false)}
      >
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
}
