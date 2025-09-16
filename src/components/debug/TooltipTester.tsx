import React from 'react';
import { DuplicateTooltip } from '@/components/ui/duplicate-tooltip';
import { Badge } from '@/components/ui/badge';

// Mock order data with intentional duplicates for testing
const mockTestOrders = [
  {
    id: "test1",
    stockNumber: "DUPLICATE-STOCK",
    vehicleVin: "1HGCM82633A123456",
    dealer_id: 1,
    status: "pending",
    createdAt: "2024-01-01T10:00:00Z",
    vehicleYear: 2024,
    vehicleMake: "Honda",
    vehicleModel: "Civic",
    orderNumber: "SA-001"
  },
  {
    id: "test2", 
    stockNumber: "DUPLICATE-STOCK", // INTENTIONAL DUPLICATE
    vehicleVin: "2HGCM82633A123457",
    dealer_id: 1,
    status: "in_progress",
    createdAt: "2024-01-02T10:00:00Z",
    vehicleYear: 2024,
    vehicleMake: "Toyota",
    vehicleModel: "Camry",
    orderNumber: "SA-002"
  },
  {
    id: "test3",
    stockNumber: "UNIQUE-STOCK",
    vehicleVin: "1HGCM82633A123456", // INTENTIONAL VIN DUPLICATE
    dealer_id: 1,
    status: "completed",
    createdAt: "2024-01-03T10:00:00Z",
    vehicleYear: 2024,
    vehicleMake: "Honda",
    vehicleModel: "Accord",
    orderNumber: "SA-003"
  }
];

export function TooltipTester() {
  const handleOrderClick = (order: Record<string, unknown>) => {
    console.log('Order clicked:', order);
    alert(`Clicked order: ${order.orderNumber}`);
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Tooltip Testing Dashboard</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Debug Information</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Total Test Orders:</strong> {mockTestOrders.length}</p>
            <p><strong>Expected Stock Duplicates:</strong> DUPLICATE-STOCK (2 orders)</p>
            <p><strong>Expected VIN Duplicates:</strong> 1HGCM82633A123456 (2 orders)</p>
            <p><strong>Instructions:</strong> Hover over the elements below. Check browser console for debug output.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {mockTestOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg shadow p-4">
              <div className="space-y-3">
                <div>
                  <Badge variant="outline">{order.orderNumber}</Badge>
                  <Badge className="ml-2" variant="secondary">{order.status}</Badge>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Stock Number</label>
                    <DuplicateTooltip
                      orders={mockTestOrders.filter(o => 
                        o.stockNumber === order.stockNumber && 
                        o.dealer_id === order.dealer_id
                      )}
                      field="stockNumber"
                      value={order.stockNumber}
                      onOrderClick={handleOrderClick}
                    >
                      <div className="text-sm font-semibold text-blue-600 cursor-pointer hover:bg-blue-50 p-2 rounded">
                        {order.stockNumber}
                      </div>
                    </DuplicateTooltip>
                  </div>
                  
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">VIN</label>
                    <DuplicateTooltip
                      orders={mockTestOrders.filter(o => 
                        o.vehicleVin === order.vehicleVin && 
                        o.dealer_id === order.dealer_id
                      )}
                      field="vehicleVin"
                      value={order.vehicleVin}
                      onOrderClick={handleOrderClick}
                    >
                      <div className="text-xs font-mono text-gray-600 cursor-pointer hover:bg-gray-50 p-2 rounded">
                        {order.vehicleVin}
                      </div>
                    </DuplicateTooltip>
                  </div>
                </div>

                <div className="text-sm text-gray-600">
                  <div>{order.vehicleYear} {order.vehicleMake} {order.vehicleModel}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">Testing Instructions:</h3>
          <ol className="text-sm text-yellow-700 space-y-1">
            <li>1. Open browser developer tools (F12)</li>
            <li>2. Go to the Console tab</li>
            <li>3. Hover over the blue stock numbers and gray VIN numbers above</li>
            <li>4. Look for debug messages in the console</li>
            <li>5. Tooltips should appear for "DUPLICATE-STOCK" and the repeated VIN</li>
          </ol>
        </div>
      </div>
    </div>
  );
}