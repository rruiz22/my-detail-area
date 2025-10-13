import React from 'react';
import { ModifiedVehicleInfoBlock } from './ModifiedVehicleInfoBlock';

interface ReconOrderFieldsProps {
  order: {
    [key: string]: unknown;
    id: string;
    dealer_id: string | number;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
  };
}

// Recon Order specific fields component
// Contains: Modified vehicle information block
export const ReconOrderFields = React.memo(function ReconOrderFields({
  order
}: ReconOrderFieldsProps) {

  return (
    <div className="space-y-4">
      {/* Modified Vehicle Information */}
      <ModifiedVehicleInfoBlock order={order} />
    </div>
  );
});
