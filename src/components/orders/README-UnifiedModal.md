# Unified Order Detail Modal

## Overview

The `UnifiedOrderDetailModal` is a flexible, modular modal component that handles all 4 order types (Sales, Service, Recon, Car Wash) with type-specific headers and content while maintaining common functionality.

## Features

### ✅ Conditional Headers
- **Sales/Service**: `Dealership - Usuario Asignado` + `Due Date`
- **Recon/CarWash**: `Dealership - Service Performer` + `Date Service Complete`
- **Status Dropdown**: Always positioned in top-right corner

### ✅ Type-Specific Fields
- **Sales**: Stock number + Modified vehicle info
- **Service**: PO + RO + TAG + Modified vehicle info
- **Recon**: Stock number (same as Sales) + Service performer info
- **CarWash**: TAG only (Service without RO/PO) + Service performer info

### ✅ Modified Vehicle Information
- **Removed**: Individual color, year, make, model fields
- **Added**: `vehicle_info` field (shows decoded VIN information)
- **Enhanced**: Full VIN display + Vehicle image preview
- **Maintained**: VIN decode status and stock number

### ✅ Common Blocks (All Types)
- Schedule Time block
- QR Code & Short Link
- Team Communication
- Followers management
- Tasks & Reminders
- Recent Activity
- Public Comments
- Internal Notes

## Usage

```tsx
import { UnifiedOrderDetailModal } from '@/components/orders/UnifiedOrderDetailModal';

// Sales Order Example
<UnifiedOrderDetailModal
  orderType="sales"
  order={{
    id: '1',
    customOrderNumber: 'SALES-12345',
    dealership_name: 'Premium Auto',
    salesperson: 'John Smith',
    customer_name: 'Jane Doe',
    vehicle_info: '2023 Toyota Camry XLE - Decoded from VIN',
    vehicle_vin: '1HGBH41JXMN109186',
    stockNumber: 'STK-001',
    status: 'in_progress',
    dealer_id: '1',
    due_date: '2024-01-15'
  }}
  open={isOpen}
  onClose={() => setIsOpen(false)}
  onStatusChange={handleStatusChange}
/>

// Service Order Example
<UnifiedOrderDetailModal
  orderType="service"
  order={{
    id: '2',
    customOrderNumber: 'SERVICE-67890',
    dealership_name: 'Premium Auto Service',
    salesperson: 'Mike Johnson',
    po: 'PO-2024-001',
    ro: 'RO-2024-001',
    tag: 'TAG-001',
    vehicle_info: '2022 Honda Accord LX - Decoded from VIN',
    vehicle_vin: '1HGCY2F53NA123456',
    status: 'pending',
    dealer_id: '1',
    due_date: '2024-01-20'
  }}
  open={isOpen}
  onClose={() => setIsOpen(false)}
  onStatusChange={handleStatusChange}
/>

// Recon Order Example
<UnifiedOrderDetailModal
  orderType="recon"
  order={{
    id: '3',
    customOrderNumber: 'RECON-11111',
    dealership_name: 'Premium Auto Recon',
    service_performer: 'Dave Martinez',
    stockNumber: 'STK-002',
    vehicle_info: '2021 BMW 3 Series - Decoded from VIN',
    vehicle_vin: 'WBA5A5C50MD123456',
    status: 'completed',
    dealer_id: '1',
    date_service_complete: '2024-01-10'
  }}
  open={isOpen}
  onClose={() => setIsOpen(false)}
  onStatusChange={handleStatusChange}
/>

// Car Wash Order Example
<UnifiedOrderDetailModal
  orderType="carwash"
  order={{
    id: '4',
    customOrderNumber: 'WASH-22222',
    dealership_name: 'Premium Auto Wash',
    service_performer: 'Carlos Rodriguez',
    tag: 'WASH-001',
    vehicle_info: '2020 Mercedes C-Class - Decoded from VIN',
    vehicle_vin: 'WDDWF4HB8LR123456',
    status: 'in_progress',
    dealer_id: '1',
    date_service_complete: '2024-01-12'
  }}
  open={isOpen}
  onClose={() => setIsOpen(false)}
  onStatusChange={handleStatusChange}
/>
```

## Components Structure

```
UnifiedOrderDetailModal.tsx
├── UnifiedOrderHeader (conditional header logic)
├── OrderTypeFields (routes to specific components)
│   ├── SalesOrderFields.tsx
│   ├── ServiceOrderFields.tsx
│   ├── ReconOrderFields.tsx
│   └── CarWashOrderFields.tsx
├── ModifiedVehicleInfoBlock.tsx (used by all field components)
├── ScheduleViewBlock (common)
└── CommonBlocks (QR, followers, tasks, communication, etc.)
```

## Order Data Interface

```typescript
interface OrderData {
  // Core identifiers
  id: string;
  customOrderNumber?: string;
  dealership_name?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
  dealer_id: string | number;

  // Type-specific assignees
  salesperson?: string;          // Sales & Service
  service_performer?: string;    // Recon & Car Wash

  // Type-specific dates
  due_date?: string;                    // Sales & Service
  date_service_complete?: string;       // Recon & Car Wash

  // Vehicle information (modified)
  vehicle_info?: string;         // NEW: Decoded VIN display
  vehicle_vin?: string;          // Full VIN
  vehicle_image?: string;        // NEW: Vehicle image URL

  // Type-specific fields
  stockNumber?: string;          // Sales & Recon
  po?: string;                   // Service only
  ro?: string;                   // Service only
  tag?: string;                  // Service & Car Wash

  // Common fields
  customer_name?: string;
  notes?: string;
  internal_notes?: string;
  // ... other common fields
}
```

## Migration from Existing Modals

### From EnhancedOrderDetailModal
1. Replace `EnhancedOrderDetailModal` imports with `UnifiedOrderDetailModal`
2. Add `orderType` prop based on your order data
3. Update order data structure to include new `vehicle_info` field
4. Remove individual `vehicle_year`, `vehicle_make`, `vehicle_model` if using new format

### From Individual Order Modals
1. Replace `ServiceOrderModal`, `CarWashOrderModal`, etc. with `UnifiedOrderDetailModal`
2. Set appropriate `orderType` prop
3. Maintain existing order data structure (backward compatible)

## Testing

Use the `UnifiedModalTest` component to test all 4 order types:

```tsx
import { UnifiedModalTest } from '@/components/orders/UnifiedModalTest';

export default function TestPage() {
  return <UnifiedModalTest />;
}
```

## Benefits

1. **Consistency**: Same UX patterns across all order types
2. **Maintainability**: Single source of truth for modal logic
3. **Performance**: Lazy loading and memoization built-in
4. **Scalability**: Easy to add new order types
5. **Type Safety**: Full TypeScript support with proper interfaces