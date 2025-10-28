/**
 * Services Display Component
 *
 * Reusable component for displaying order services in different formats:
 * - table: Compact multiline format for data tables with color badges
 * - modal: Full details with prices for modal view with color badges
 * - kanban: Badge format for kanban cards with color badges
 *
 * Now uses category colors from service_categories table for visual distinction
 */

import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ServiceBadge } from './ServiceBadge';
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
import { useServices, type DealerService } from '@/contexts/ServicesContext';

// Service data interface (legacy support)
interface OrderService {
  id: string;
  name: string;
  price?: number;
  description?: string;
  duration?: number;
  category_color?: string;
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
  const { getService, getServices, loading: servicesLoading } = useServices();

  // Process services using global cache (instant lookup)
  const processedServices = useMemo(() => {
    if (!services || !Array.isArray(services) || services.length === 0) {
      return [];
    }

    // If already enriched objects with type or id field
    if (services.length > 0 && typeof services[0] === 'object' && 'name' in services[0]) {
      // Enrich with category_color from cache if not present
      return (services as any[]).map((service: any) => {
        // If service already has category_color, use it
        if (service.category_color) {
          return service as OrderService;
        }

        // Otherwise, lookup in cache using type (CarWash) or id (Sales/Service/Recon)
        const serviceId = service.type || service.id;
        const cachedService = serviceId ? getService(serviceId) : undefined;

        // Merge cached data (category_color, category_name) with existing data
        return {
          ...service,
          id: serviceId,
          category_color: cachedService?.category_color || service.category_color,
          category_name: cachedService?.category_name || service.category_name,
          color: cachedService?.color || service.color,
        } as OrderService;
      });
    }

    // Lookup from global cache (O(1) per service) - for array of UUIDs
    return getServices(services as string[]);
  }, [services, getServices, getService]);

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

  // Table variant - Compact with color badges
  if (variant === 'table') {
    const displayServices = processedServices.slice(0, maxServicesShown);
    const hasMore = processedServices.length > maxServicesShown;

    return (
      <div className={`space-y-1.5 flex flex-col items-center ${className}`}>
        {displayServices.map((service, index) => (
          <ServiceBadge
            key={(service as any).type || (service as any).id || service.name || `service-${index}`}
            serviceName={service.name}
            color={(service as any).color || (service as any).category_color}
            size="sm"
            showIcon={true}
            description={(service as any).description}
            price={(service as any).price}
            duration={(service as any).duration}
            categoryName={(service as any).category_name}
            showPricing={canViewPrices}
          />
        ))}

        {hasMore && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-gray-300 bg-gray-50 text-gray-600">
            +{processedServices.length - maxServicesShown} more
          </Badge>
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
            <div key={(service as any).type || (service as any).id || service.name || `service-${index}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <ServiceBadge
                    serviceName={service.name}
                    color={(service as any).color || (service as any).category_color}
                    size="md"
                    showIcon={true}
                  />
                  {service.description && (
                    <div className="text-xs text-muted-foreground">
                      {service.description}
                    </div>
                  )}
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

  // Kanban variant - Show all services as color badges
  if (variant === 'kanban') {
    if (processedServices.length === 0) return null;

    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {processedServices.map((service, index) => (
          <ServiceBadge
            key={(service as any).type || (service as any).id || service.name || `service-${index}`}
            serviceName={service.name}
            color={(service as any).color || (service as any).category_color}
            size="sm"
            showIcon={true}
          />
        ))}

        {canViewPrices && totalAmount && totalAmount > 0 && (
          <Badge variant="outline" className="flex items-center gap-1 text-xs border-gray-300 bg-gray-50 text-gray-700">
            <DollarSign className="h-3 w-3" />
            <span>{formatPrice(totalAmount)}</span>
          </Badge>
        )}
      </div>
    );
  }

  return null;
}