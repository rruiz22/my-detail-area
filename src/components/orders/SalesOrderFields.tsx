import React from 'react';
import { ModifiedVehicleInfoBlock } from './ModifiedVehicleInfoBlock';

interface SalesOrderFieldsProps {
  order: {
    [key: string]: unknown;
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
