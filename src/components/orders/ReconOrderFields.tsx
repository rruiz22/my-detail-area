import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Hash, Package, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ModifiedVehicleInfoBlock } from './ModifiedVehicleInfoBlock';

interface ReconOrderFieldsProps {
  order: {
    stockNumber?: string;
    stock_number?: string;
    service_performer?: string;
    servicePerformer?: string;
    recon_type?: string;
    reconType?: string;
    [key: string]: unknown;
  };
}

// Recon Order specific fields component
// Contains: stock number (same as Sales) + modified vehicle information
// Header shows "Service Performer" instead of "Usuario Asignado"
export const ReconOrderFields = React.memo(function ReconOrderFields({
  order
}: ReconOrderFieldsProps) {
  const { t } = useTranslation();

  const stockInfo = React.useMemo(() => ({
    stockNumber: order.stockNumber || order.stock_number || t('data_table.no_stock'),
    hasStock: !!(order.stockNumber || order.stock_number)
  }), [order.stockNumber, order.stock_number, t]);

  const reconInfo = React.useMemo(() => ({
    servicePerformer: order.service_performer || order.servicePerformer || t('common.not_assigned'),
    reconType: order.recon_type || order.reconType || t('common.not_specified'),
    hasServicePerformer: !!(order.service_performer || order.servicePerformer)
  }), [
    order.service_performer,
    order.servicePerformer,
    order.recon_type,
    order.reconType,
    t
  ]);

  return (
    <div className="space-y-4">
      {/* Recon Information Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <RefreshCw className="h-5 w-5 text-gray-700" />
            {t('recon_orders.recon_information')}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Service Performer Info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
            <RefreshCw className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {t('recon_orders.service_performer')}
              </p>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">
                  {reconInfo.servicePerformer}
                </p>
                <Badge
                  variant={reconInfo.hasServicePerformer ? 'default' : 'outline'}
                  className="text-xs"
                >
                  {reconInfo.hasServicePerformer ? t('common.assigned') : t('common.not_assigned')}
                </Badge>
              </div>
            </div>
          </div>

          {/* Stock Number */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
            <Hash className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {t('common.stock_number')}
              </p>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium font-mono">
                  {stockInfo.stockNumber}
                </p>
                <Badge
                  variant={stockInfo.hasStock ? 'default' : 'outline'}
                  className="text-xs"
                >
                  {stockInfo.hasStock ? t('common.available') : t('common.not_assigned')}
                </Badge>
              </div>
            </div>
          </div>

          {/* Recon Type */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
            <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {t('recon_orders.recon_type')}
              </p>
              <p className="text-sm font-medium">
                {reconInfo.reconType}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modified Vehicle Information */}
      <ModifiedVehicleInfoBlock order={order} />
    </div>
  );
});