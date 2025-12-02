/**
 * Order Mock Data Factory
 *
 * CONSERVATIVE: Extends existing mockOrder from test-utils.tsx
 * Creates realistic test data for Sales Orders module
 *
 * Usage:
 * import { createMockOrder, createMockService } from '@/test/factories/orderFactory';
 *
 * const order = createMockOrder({ status: 'completed', vehicleVin: '1HGCM82633A123456' });
 */

import { Order, OrderService } from '@/hooks/useOrderManagement';

/**
 * Create a mock OrderService
 */
export function createMockService(overrides?: Partial<OrderService>): OrderService {
  return {
    id: '1',
    name: 'New Delivery',
    price: 495,
    description: 'Full vehicle delivery preparation',
    ...overrides
  };
}

/**
 * Create a mock Sales Order with realistic data
 * CAUTIOUS: Uses Partial<Order> to allow any field override
 */
export function createMockOrder(overrides?: Partial<Order>): Order {
  const baseOrder: Order = {
    // Core identifiers
    id: 'test-order-1',
    orderNumber: 'SA-001',
    order_number: 'SA-001',

    // Customer information
    customerName: 'John Doe',
    customerEmail: 'john.doe@example.com',
    customerPhone: '+1-555-0123',

    // Vehicle information
    vehicleVin: '1HGCM82633A123456',
    vehicleYear: 2023,
    vehicleMake: 'Honda',
    vehicleModel: 'Accord',
    vehicleInfo: '2023 Honda Accord',
    stockNumber: 'B36054',

    // Order management
    status: 'pending',
    priority: 'normal',
    orderType: 'sales',
    order_type: 'sales',

    // Dates
    createdAt: new Date('2025-12-02T10:00:00Z').toISOString(),
    updatedAt: new Date('2025-12-02T10:00:00Z').toISOString(),
    dueDate: new Date('2025-12-02T15:00:00Z').toISOString(),

    // Financial
    totalAmount: 495,
    total_amount: 495,
    services: [createMockService()],

    // Assignment
    assignedTo: 'Test User',
    assignedGroupName: 'Sales Team',
    dealer_id: 1,
    dealershipName: 'Test Dealership',

    // QR Code
    shortLink: 'https://mda.to/ABC12',
    qrCodeUrl: 'data:image/png;base64,mock-qr',
    qrGenerationStatus: 'completed',

    // Collaboration
    comments: 0,
    notes: ''
  };

  return {
    ...baseOrder,
    ...overrides
  };
}

/**
 * Create multiple mock orders with variations
 */
export function createMockOrders(count: number, baseOverrides?: Partial<Order>): Order[] {
  return Array.from({ length: count }, (_, index) =>
    createMockOrder({
      ...baseOverrides,
      id: `test-order-${index + 1}`,
      orderNumber: `SA-${String(index + 1).padStart(3, '0')}`,
      order_number: `SA-${String(index + 1).padStart(3, '0')}`,
      vehicleVin: `1HGCM82633A${String(index + 100000).slice(-6)}`,
      stockNumber: `B3${String(index + 6000)}`
    })
  );
}

/**
 * Create mock order with specific status
 */
export function createPendingOrder(overrides?: Partial<Order>): Order {
  return createMockOrder({ status: 'pending', ...overrides });
}

export function createInProgressOrder(overrides?: Partial<Order>): Order {
  return createMockOrder({ status: 'in_progress', ...overrides });
}

export function createCompletedOrder(overrides?: Partial<Order>): Order {
  return createMockOrder({
    status: 'completed',
    completedAt: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    ...overrides
  });
}

export function createCancelledOrder(overrides?: Partial<Order>): Order {
  return createMockOrder({ status: 'cancelled', ...overrides });
}

/**
 * Create mock order with duplicate VIN
 */
export function createDuplicateVinOrders(vin: string = '1HGCM82633A123456'): Order[] {
  return [
    createMockOrder({
      id: 'order-1',
      vehicleVin: vin,
      services: [createMockService({ id: '1', name: 'New Delivery' })]
    }),
    createMockOrder({
      id: 'order-2',
      vehicleVin: vin,
      services: [createMockService({ id: '2', name: 'Simoniz' })]
    })
  ];
}

/**
 * Create mock order with same VIN + same service (should trigger alert)
 */
export function createDuplicateVinServiceOrders(
  vin: string = '1HGCM82633A123456',
  serviceId: string = '1'
): Order[] {
  return [
    createMockOrder({
      id: 'order-1',
      orderNumber: 'SA-100',
      vehicleVin: vin,
      services: [createMockService({ id: serviceId, name: 'New Delivery' })]
    }),
    createMockOrder({
      id: 'order-2',
      orderNumber: 'SA-101',
      vehicleVin: vin,
      services: [createMockService({ id: serviceId, name: 'New Delivery' })]
    })
  ];
}
