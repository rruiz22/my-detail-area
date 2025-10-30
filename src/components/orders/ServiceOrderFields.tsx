import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Tag, Wrench } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ModifiedVehicleInfoBlock } from './ModifiedVehicleInfoBlock';
import { ServicesDisplay } from './ServicesDisplay';

interface ServiceOrderFieldsProps {
  order: {
    po?: string;
    purchase_order?: string;
    ro?: string;
    repair_order?: string;
    tag?: string;
    [key: string]: unknown;
    id: string;
    dealer_id: string | number;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
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
      <Card className="shadow-sm border-border/60">
        <CardHeader className="pb-4 bg-gradient-to-br from-background to-muted/20">
          <CardTitle className="flex items-center gap-2.5 text-base">
            <div className="p-2 rounded-lg bg-primary/10">
              <Wrench className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold">{t('service_orders.service_information')}</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          {/* PO, RO, TAG inline */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {serviceInfo.map((info, index) => {
              const Icon = info.icon;
              return (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-background to-muted/30 border border-border/50 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                      {info.label}
                    </p>
                    <p className="text-sm font-bold text-foreground font-mono truncate">
                      {info.value}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Services/Work Requested */}
          {order.services && Array.isArray(order.services) && order.services.length > 0 && (
            <div className="pt-4 border-t border-border">
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Wrench className="h-3.5 w-3.5" />
                  {t('orders.services')} ({order.services.length})
                </p>
                <ServicesDisplay
                  services={order.services}
                  variant="kanban"
                  showPrices={false}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modified Vehicle Information */}
      <ModifiedVehicleInfoBlock order={order} />
    </div>
  );
});
