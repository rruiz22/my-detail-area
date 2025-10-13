/**
 * Services Display Component
 *
 * Reusable component for displaying order services in different formats:
 * - table: Compact multiline format for data tables
 * - modal: Full details with prices for modal view
 * - kanban: Badge format for kanban cards
 */

import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Wrench,
  Car,
  Droplets,
  Settings,
  DollarSign,
  Package,
  List
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePermissionContext } from '@/contexts/PermissionContext';
import { useServices } from '@/contexts/ServicesContext';

// Service data interface
interface OrderService {
  id: string;
  name: string;
  price?: number;
  description?: string;
  duration?: number;
}

interface ServicesDisplayProps {
  services: OrderService[] | string[] | null;
  totalAmount?: number;
  dealerId?: number;
  variant?: 'table' | 'modal' | 'kanban';
  className?: string;
  showPrices?: boolean;
  maxServicesShown?: number;
}

// Helper function to get service icon based on name/category
const getServiceIcon = (serviceName: string) => {
  const name = serviceName.toLowerCase();

  if (name.includes('oil') || name.includes('change')) {
    return <Droplets className="h-4 w-4 text-blue-600" />;
  }
  if (name.includes('brake') || name.includes('pad')) {
    return <Settings className="h-4 w-4 text-red-600" />;
  }
  if (name.includes('inspection') || name.includes('check')) {
    return <Settings className="h-4 w-4 text-green-600" />;
  }
  if (name.includes('wash') || name.includes('clean')) {
    return <Car className="h-4 w-4 text-blue-500" />;
  }

  // Default service icon
  return <Wrench className="h-4 w-4 text-gray-600" />;
};

// Helper function to format currency
const formatPrice = (price: number | null | undefined): string => {
  if (!price || isNaN(price)) return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(price);
};

export function ServicesDisplay({
  services,
  totalAmount,
  dealerId,
  variant = 'table',
  className = '',
  showPrices,
  maxServicesShown = 3
}: ServicesDisplayProps) {
  const { t } = useTranslation();
  const { hasPermission } = usePermissionContext();
  const { getServices, loading: servicesLoading } = useServices();

  // Process services using global cache (instant lookup)
  const processedServices = useMemo(() => {
    if (!services || !Array.isArray(services) || services.length === 0) {
      return [];
    }

    // If already enriched objects
    if (services.length > 0 && typeof services[0] === 'object' && 'name' in services[0]) {
      return services as OrderService[];
    }

    // Lookup from global cache (O(1) per service)
    return getServices(services as string[]);
  }, [services, getServices]);

  // Check if user can view pricing
  const canViewPrices = showPrices ?? hasPermission('orders', 'view_pricing');

  // Show loading state only if global cache is still loading
  if (servicesLoading && processedServices.length === 0) {
    return (
      <div className={`text-xs text-muted-foreground ${className}`}>
        Loading...
      </div>
    );
  }

  if (!processedServices.length) {
    return null;
  }

  // Table variant - Compact multiline with centering
  if (variant === 'table') {
    const displayServices = processedServices.slice(0, maxServicesShown);
    const hasMore = processedServices.length > maxServicesShown;

    return (
      <div className={`space-y-1 text-center ${className}`}>
        {displayServices.map((service, index) => (
          <div key={service.id} className="flex items-center justify-center gap-2 text-sm">
            {getServiceIcon(service.name)}
            <span className="truncate font-semibold">{service.name}</span>
          </div>
        ))}

        {hasMore && (
          <div className="text-xs text-muted-foreground text-center">
            +{processedServices.length - maxServicesShown} more services
          </div>
        )}

      </div>
    );
  }

  // Modal variant - Full details
  if (variant === 'modal') {
    return (
      <Card className={`card-enhanced ${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <List className="h-4 w-4 text-gray-700" />
            {t('orders.services_summary')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {processedServices.map((service, index) => (
            <div key={service.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  {getServiceIcon(service.name)}
                  <div className="flex-1">
                    <div className="font-medium text-sm">{service.name}</div>
                    {service.description && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {service.description}
                      </div>
                    )}
                  </div>
                </div>
                {canViewPrices && service.price && (
                  <div className="text-sm font-mono font-semibold">
                    {formatPrice(service.price)}
                  </div>
                )}
              </div>
              {index < processedServices.length - 1 && (
                <Separator className="mt-3" />
              )}
            </div>
          ))}

          {canViewPrices && totalAmount && (
            <>
              <Separator />
              <div className="flex items-center justify-between pt-2">
                <span className="font-semibold text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  {t('orders.total_amount')}:
                </span>
                <span className="font-bold text-lg font-mono">
                  {formatPrice(totalAmount)}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  // Kanban variant - Show all services as badges
  if (variant === 'kanban') {
    if (processedServices.length === 0) return null;

    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {processedServices.map((service) => (
          <Badge key={service.id} variant="outline" className="flex items-center gap-1 text-xs">
            {getServiceIcon(service.name)}
            <span className="font-semibold">{service.name}</span>
          </Badge>
        ))}

        {canViewPrices && totalAmount && totalAmount > 0 && (
          <Badge variant="outline" className="flex items-center gap-1 text-xs">
            <DollarSign className="h-3 w-3" />
            <span>{formatPrice(totalAmount)}</span>
          </Badge>
        )}
      </div>
    );
  }

  return null;
}