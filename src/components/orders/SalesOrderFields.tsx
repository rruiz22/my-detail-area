import React from 'react';
import { ModifiedVehicleInfoBlock } from './ModifiedVehicleInfoBlock';

interface SalesOrderFieldsProps {
  order: {
    [key: string]: unknown;
    id: string;
    dealer_id: string | number;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
  };
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
