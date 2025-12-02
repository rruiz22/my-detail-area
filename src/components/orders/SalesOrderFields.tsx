import React from 'react';
import { ModifiedVehicleInfoBlock } from './ModifiedVehicleInfoBlock';
import { Order } from '@/hooks/useOrderManagement';

// ✅ IMPROVED: Use explicit Order type instead of [key: string]: unknown
interface SalesOrderFieldsProps {
  order: Pick<Order, 'id' | 'dealer_id' | 'status'> & Partial<Omit<Order, 'id' | 'dealer_id' | 'status'>>;
}

// Sales Order specific fields component
// Contains: modified vehicle information
export const SalesOrderFields = React.memo(function SalesOrderFields({
  order
}: SalesOrderFieldsProps) {

  return (
    <div className="space-y-4">
      {/* Modified Vehicle Information */}
      <ModifiedVehicleInfoBlock order={order} />
    </div>
  );
});
