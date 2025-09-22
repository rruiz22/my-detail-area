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
import { supabase } from '@/integrations/supabase/client';

// Service data interface
interface OrderService {
  id: string;
  name: string;
  price?: number;
  description?: string;
  category?: string;
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

  // Fetch real service data from dealer_services table
  const { services: processedServices, loading } = useOrderServices(services, dealerId);

  // Check if user can view pricing
  const canViewPrices = showPrices ?? hasPermission('orders', 'view_pricing');

  // Show loading state
  if (loading) {
    return (
      <div className={`text-xs text-muted-foreground ${className}`}>
        Loading services...
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

  // Kanban variant - Service name with + indicator
  if (variant === 'kanban') {
    const serviceCount = processedServices.length;

    if (serviceCount === 0) return null;

    const firstService = processedServices[0];
    const hasMore = serviceCount > 1;

    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge variant="outline" className="flex items-center gap-1 text-xs">
          {getServiceIcon(firstService.name)}
          <span className="font-semibold">{firstService.name}</span>
          {hasMore && (
            <span className="text-muted-foreground">+{serviceCount - 1}</span>
          )}
        </Badge>

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

// Hook to fetch and enrich services data from dealer_services table
export const useOrderServices = (orderServices: string[] | OrderService[] | null, dealerId?: number) => {
  const [enrichedServices, setEnrichedServices] = React.useState<OrderService[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const fetchServiceDetails = async () => {
      if (!orderServices || !Array.isArray(orderServices) || orderServices.length === 0) {
        setEnrichedServices([]);
        return;
      }

      // If already enriched objects
      if (orderServices.length > 0 && typeof orderServices[0] === 'object' && 'name' in orderServices[0]) {
        setEnrichedServices(orderServices as OrderService[]);
        return;
      }

      // Fetch from dealer_services table using IDs
      setLoading(true);
      try {
        const { data: services, error } = await supabase
          .from('dealer_services')
          .select('id, name, description, price, duration')
          .in('id', orderServices as string[]);

        if (error) throw error;

        setEnrichedServices(services || []);
      } catch (error) {
        console.error('Error fetching service details:', error);
        // Fallback to basic display
        setEnrichedServices((orderServices as string[]).map((serviceId, index) => ({
          id: serviceId,
          name: `Service ${index + 1}`,
          price: 0,
          description: null,
          category: 'general'
        })));
      } finally {
        setLoading(false);
      }
    };

    fetchServiceDetails();
  }, [orderServices, dealerId]);

  return { services: enrichedServices, loading };
};