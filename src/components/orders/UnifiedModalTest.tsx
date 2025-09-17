import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UnifiedOrderDetailModal } from './UnifiedOrderDetailModal';

// Test component to verify the unified modal works with all 4 order types
export const UnifiedModalTest = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentOrderType, setCurrentOrderType] = useState<'sales' | 'service' | 'recon' | 'carwash'>('sales');

  // Mock order data for testing
  const mockOrderData = {
    sales: {
      id: '1',
      customOrderNumber: 'SALES-12345',
      dealership_name: 'Premium Auto Dealership',
      salesperson: 'John Smith',
      customer_name: 'Jane Doe',
      vehicle_info: '2023 Toyota Camry XLE - Decoded from VIN',
      vehicle_vin: '1HGBH41JXMN109186',
      stockNumber: 'STK-001',
      status: 'in_progress' as const,
      dealer_id: '1',
      due_date: '2024-01-15',
      notes: 'Customer prefers afternoon delivery',
      vehicle_image: 'https://example.com/camry.jpg'
    },
    service: {
      id: '2',
      customOrderNumber: 'SERVICE-67890',
      dealership_name: 'Premium Auto Service',
      salesperson: 'Mike Johnson',
      customer_name: 'Bob Wilson',
      vehicle_info: '2022 Honda Accord LX - Decoded from VIN',
      vehicle_vin: '1HGCY2F53NA123456',
      po: 'PO-2024-001',
      ro: 'RO-2024-001',
      tag: 'TAG-001',
      status: 'pending' as const,
      dealer_id: '1',
      due_date: '2024-01-20',
      notes: 'Oil change and brake inspection',
      vehicle_image: 'https://example.com/accord.jpg'
    },
    recon: {
      id: '3',
      customOrderNumber: 'RECON-11111',
      dealership_name: 'Premium Auto Recon',
      service_performer: 'Dave Martinez',
      customer_name: 'Alice Brown',
      vehicle_info: '2021 BMW 3 Series - Decoded from VIN',
      vehicle_vin: 'WBA5A5C50MD123456',
      stockNumber: 'STK-002',
      status: 'completed' as const,
      dealer_id: '1',
      date_service_complete: '2024-01-10',
      recon_type: 'Interior Detail',
      notes: 'Complete interior reconditioning',
      vehicle_image: 'https://example.com/bmw.jpg'
    },
    carwash: {
      id: '4',
      customOrderNumber: 'WASH-22222',
      dealership_name: 'Premium Auto Wash',
      service_performer: 'Carlos Rodriguez',
      customer_name: 'Tom Green',
      vehicle_info: '2020 Mercedes C-Class - Decoded from VIN',
      vehicle_vin: 'WDDWF4HB8LR123456',
      tag: 'WASH-001',
      is_waiter: true,
      service_type: 'Premium Wash & Wax',
      status: 'in_progress' as const,
      dealer_id: '1',
      date_service_complete: '2024-01-12',
      notes: 'Customer waiting - priority service',
      vehicle_image: 'https://example.com/mercedes.jpg'
    }
  };

  const handleOpenModal = (orderType: 'sales' | 'service' | 'recon' | 'carwash') => {
    setCurrentOrderType(orderType);
    setIsOpen(true);
  };

  const handleCloseModal = () => {
    setIsOpen(false);
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    console.log(`Status change for order ${orderId}: ${newStatus}`);
    // In real implementation, this would update the order in the database
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Unified Order Detail Modal Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              onClick={() => handleOpenModal('sales')}
              variant="outline"
              className="h-20 flex flex-col gap-2"
            >
              <span className="font-semibold">Sales Order</span>
              <span className="text-xs text-muted-foreground">Stock + VIN</span>
            </Button>

            <Button
              onClick={() => handleOpenModal('service')}
              variant="outline"
              className="h-20 flex flex-col gap-2"
            >
              <span className="font-semibold">Service Order</span>
              <span className="text-xs text-muted-foreground">PO + RO + TAG</span>
            </Button>

            <Button
              onClick={() => handleOpenModal('recon')}
              variant="outline"
              className="h-20 flex flex-col gap-2"
            >
              <span className="font-semibold">Recon Order</span>
              <span className="text-xs text-muted-foreground">Stock + Service Performer</span>
            </Button>

            <Button
              onClick={() => handleOpenModal('carwash')}
              variant="outline"
              className="h-20 flex flex-col gap-2"
            >
              <span className="font-semibold">Car Wash</span>
              <span className="text-xs text-muted-foreground">TAG + Service Performer</span>
            </Button>
          </div>

          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <h3 className="font-semibold mb-2">Test Features:</h3>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Different headers for Sales/Service vs Recon/CarWash</li>
              <li>• Type-specific fields (Stock, PO/RO/TAG, Service Performer)</li>
              <li>• Modified vehicle info (no individual year/make/model)</li>
              <li>• Vehicle image display in preview</li>
              <li>• Status dropdown in top-right corner</li>
              <li>• Consistent layout with all common blocks</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Unified Modal */}
      <UnifiedOrderDetailModal
        orderType={currentOrderType}
        order={mockOrderData[currentOrderType]}
        open={isOpen}
        onClose={handleCloseModal}
        onStatusChange={handleStatusChange}
        isLoadingData={false}
      />
    </div>
  );
};