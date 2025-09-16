import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Hash, Wrench, FileText, Tag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ModifiedVehicleInfoBlock } from './ModifiedVehicleInfoBlock';

interface ServiceOrderFieldsProps {
  order: {
    po?: string;
    purchase_order?: string;
    ro?: string;
    repair_order?: string;
    tag?: string;
    [key: string]: unknown;
  };
}

// Service Order specific fields component
// Contains: PO, RO, TAG + modified vehicle information
export const ServiceOrderFields = React.memo(function ServiceOrderFields({
  order
}: ServiceOrderFieldsProps) {
  const { t } = useTranslation();

  const serviceInfo = React.useMemo(() => [
    {
      icon: FileText,
      label: 'PO',
      fullLabel: t('service_orders.purchase_order'),
      value: order.po || order.purchase_order || t('common.not_assigned'),
      hasValue: !!(order.po || order.purchase_order)
    },
    {
      icon: Wrench,
      label: 'RO',
      fullLabel: t('service_orders.repair_order'),
      value: order.ro || order.repair_order || t('common.not_assigned'),
      hasValue: !!(order.ro || order.repair_order)
    },
    {
      icon: Tag,
      label: 'TAG',
      fullLabel: t('service_orders.tag'),
      value: order.tag || t('common.not_assigned'),
      hasValue: !!order.tag
    }
  ], [
    order.po,
    order.purchase_order,
    order.ro,
    order.repair_order,
    order.tag,
    t
  ]);

  return (
    <div className="space-y-4">
      {/* Service Information Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wrench className="h-5 w-5 text-primary" />
            {t('service_orders.service_information')}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {serviceInfo.map((info, index) => {
            const Icon = info.icon;
            return (
              <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      {info.label}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      ({info.fullLabel})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium font-mono">
                      {info.value}
                    </p>
                    <Badge
                      variant={info.hasValue ? 'default' : 'outline'}
                      className="text-xs"
                    >
                      {info.hasValue ? t('common.assigned') : t('common.not_assigned')}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Modified Vehicle Information */}
      <ModifiedVehicleInfoBlock order={order} />
    </div>
  );
});