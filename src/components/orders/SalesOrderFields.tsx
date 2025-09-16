import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Hash, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ModifiedVehicleInfoBlock } from './ModifiedVehicleInfoBlock';

interface SalesOrderFieldsProps {
  order: {
    stockNumber?: string;
    stock_number?: string;
    [key: string]: unknown;
  };
}

// Sales Order specific fields component
// Contains: stock number + modified vehicle information
export const SalesOrderFields = React.memo(function SalesOrderFields({
  order
}: SalesOrderFieldsProps) {
  const { t } = useTranslation();

  const stockInfo = React.useMemo(() => ({
    stockNumber: order.stockNumber || order.stock_number || t('data_table.no_stock'),
    hasStock: !!(order.stockNumber || order.stock_number)
  }), [order.stockNumber, order.stock_number, t]);

  return (
    <div className="space-y-4">
      {/* Stock Information Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5 text-primary" />
            {t('sales_orders.stock_information')}
          </CardTitle>
        </CardHeader>

        <CardContent>
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
        </CardContent>
      </Card>

      {/* Modified Vehicle Information */}
      <ModifiedVehicleInfoBlock order={order} />
    </div>
  );
});