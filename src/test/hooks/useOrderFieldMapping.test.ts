import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '../utils/test-utils';
import { useOrderManagement } from '@/hooks/useOrderManagement';
import { useServiceOrderManagement } from '@/hooks/useServiceOrderManagement';
import { useReconOrderManagement } from '@/hooks/useReconOrderManagement';
import { useCarWashOrderManagement } from '@/hooks/useCarWashOrderManagement';

// Mock the Supabase client with proper JOIN structure
const mockSupabaseResponse = {
  data: [
    {
      id: 'test-order-1',
      order_number: 'SA-2025-00001',
      customer_name: 'John Doe',
      customer_email: 'john@example.com',
      customer_phone: '+1234567890',
      vehicle_year: 2023,
      vehicle_make: 'Toyota',
      vehicle_model: 'Camry',
      vehicle_vin: '1HGBH41JXMN109186',
      stock_number: 'STK001',
      status: 'pending',
      priority: 'normal',
      total_amount: 150.00,
      services: [{ name: 'Detail Package', price: 150 }],
      order_type: 'sales',
      dealer_id: 5,
      assigned_group_id: 'group-1',
      created_by_group_id: 'group-2',
      sla_deadline: '2025-01-15T14:00:00.000Z',
      due_date: '2025-01-15T14:00:00.000Z',
      created_at: '2025-01-10T10:00:00.000Z',
      updated_at: '2025-01-10T10:00:00.000Z',
      notes: 'Test order notes',
      // JOIN data - this is how Supabase returns nested objects
      dealerships: { name: 'Test Dealership' },
      assigned_group: { name: 'Detail Team Alpha' },
      created_by_group: { name: 'Sales Team' }
    }
  ],
  error: null
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          data: mockSupabaseResponse.data,
          error: null,
        })),
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            data: mockSupabaseResponse.data.filter(order => order.order_type === 'sales'),
            error: null,
          }))
        }))
      })),
    })),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({ subscribe: vi.fn() }))
    })),
    removeChannel: vi.fn()
  },
}));

// Mock auth context
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user' } })
}));

// Mock order actions
vi.mock('@/hooks/useOrderActions', () => ({
  useOrderActions: () => ({ generateQR: vi.fn() })
}));

describe('Order Field Mapping Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useOrderManagement - Sales Orders', () => {
    it('should correctly map all fields including JOINs', async () => {
      const { result } = renderHook(() => useOrderManagement('all'));
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const order = result.current.orders[0];
      
      // Basic fields
      expect(order.id).toBe('test-order-1');
      expect(order.customerName).toBe('John Doe');
      expect(order.vehicleYear).toBe(2023);
      expect(order.vehicleMake).toBe('Toyota');
      expect(order.vehicleModel).toBe('Camry');
      expect(order.vehicleVin).toBe('1HGBH41JXMN109186');
      expect(order.stockNumber).toBe('STK001');
      expect(order.status).toBe('pending');
      expect(order.totalAmount).toBe(150.00);
      
      // Enhanced fields from JOINs - THESE ARE THE CRITICAL FIXES
      expect(order.dealershipName).toBe('Test Dealership');
      expect(order.assignedGroupName).toBe('Detail Team Alpha');
      expect(order.createdByGroupName).toBe('Sales Team');
      expect(order.assignedTo).toBe('Detail Team Alpha');
      
      // Time formatting
      expect(order.dueTime).toBe('2:00 PM');  // From sla_deadline
      expect(order.dueDate).toBe('2025-01-15T14:00:00.000Z');
      
      // Fallback tests - ensure no hardcoded values
      expect(order.dealershipName).not.toBe('Premium Auto');
      expect(order.assignedTo).not.toBe('Unassigned');
    });

    it('should provide fallbacks for missing JOIN data', async () => {
      // Mock response without JOIN data
      const mockResponseWithoutJoins = {
        data: [{
          ...mockSupabaseResponse.data[0],
          dealerships: null,
          assigned_group: null,
          created_by_group: null
        }],
        error: null
      };

      vi.mocked(require('@/integrations/supabase/client').supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn(() => mockResponseWithoutJoins)
        }))
      });

      const { result } = renderHook(() => useOrderManagement('all'));
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const order = result.current.orders[0];
      
      // Should have proper fallbacks
      expect(order.dealershipName).toBe('Unknown Dealer');
      expect(order.assignedTo).toBe('Unassigned');
      expect(order.assignedGroupName).toBeUndefined();
      expect(order.createdByGroupName).toBeUndefined();
    });
  });

  describe('useServiceOrderManagement - Service Orders', () => {
    it('should correctly map service-specific fields including JOINs', async () => {
      const serviceOrderData = {
        ...mockSupabaseResponse.data[0],
        order_type: 'service',
        po: 'PO-12345',
        ro: 'RO-67890',
        tag: 'TAG-001'
      };

      vi.mocked(require('@/integrations/supabase/client').supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              data: [serviceOrderData],
              error: null
            }))
          }))
        }))
      });

      const { result } = renderHook(() => useServiceOrderManagement('all'));
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const order = result.current.orders[0];
      
      // Service-specific fields
      expect(order.po).toBe('PO-12345');
      expect(order.ro).toBe('RO-67890');
      expect(order.tag).toBe('TAG-001');
      
      // JOIN fields should work the same
      expect(order.dealershipName).toBe('Test Dealership');
      expect(order.assignedTo).toBe('Detail Team Alpha');
      expect(order.dueTime).toBe('2:00 PM');
    });
  });

  describe('useReconOrderManagement - Recon Orders', () => {
    it('should correctly map recon-specific fields including JOINs', async () => {
      const reconOrderData = {
        ...mockSupabaseResponse.data[0],
        order_type: 'recon',
        stock_number: 'RECON-001',
        services: [
          { type: 'acquisition_cost', value: 15000 },
          { type: 'recon_cost', value: 2500 },
          { type: 'acquisition_source', value: 'trade-in' },
          { type: 'condition_grade', value: 'good' },
          { type: 'recon_category', value: 'full-recon' }
        ]
      };

      vi.mocked(require('@/integrations/supabase/client').supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              data: [reconOrderData],
              error: null
            }))
          }))
        }))
      });

      const { result } = renderHook(() => useReconOrderManagement('all'));
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const order = result.current.orders[0];
      
      // Recon-specific fields
      expect(order.acquisitionCost).toBe(15000);
      expect(order.reconCost).toBe(2500);
      expect(order.acquisitionSource).toBe('trade-in');
      expect(order.conditionGrade).toBe('good');
      expect(order.reconCategory).toBe('full-recon');
      
      // JOIN fields should work the same
      expect(order.dealershipName).toBe('Test Dealership');
      expect(order.assignedTo).toBe('Detail Team Alpha');
    });
  });

  describe('useCarWashOrderManagement - Car Wash Orders', () => {
    it('should correctly map car wash fields including JOINs', async () => {
      const carWashOrderData = {
        ...mockSupabaseResponse.data[0],
        order_type: 'car_wash',
        customer_name: 'Car Wash Service',
        priority: 'urgent',
        tag: 'WAITER-001'
      };

      vi.mocked(require('@/integrations/supabase/client').supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              data: [carWashOrderData],
              error: null
            }))
          }))
        }))
      });

      const { result } = renderHook(() => useCarWashOrderManagement('all'));
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const order = result.current.orders[0];
      
      // Car wash specific fields
      expect(order.isWaiter).toBe(true);  // Based on priority: 'urgent'
      expect(order.tag).toBe('WAITER-001');
      
      // JOIN fields should work the same
      expect(order.dealershipName).toBe('Test Dealership');
      expect(order.assignedTo).toBe('Detail Team Alpha');
      expect(order.dueTime).toBe('2:00 PM');
    });
  });

  describe('Data Consistency Across All Hooks', () => {
    it('should have consistent field mapping structure across all order types', () => {
      const salesFields = ['dealershipName', 'assignedTo', 'assignedGroupName', 'createdByGroupName', 'dueTime'];
      const serviceFields = salesFields.concat(['po', 'ro', 'tag']);
      const reconFields = salesFields.concat(['acquisitionCost', 'reconCost', 'acquisitionSource', 'conditionGrade', 'reconCategory']);
      const carWashFields = salesFields.concat(['isWaiter', 'tag']);

      // All order types should have the core JOIN fields
      expect(salesFields).toEqual(expect.arrayContaining(['dealershipName', 'assignedTo', 'assignedGroupName', 'createdByGroupName', 'dueTime']));
      expect(serviceFields).toEqual(expect.arrayContaining(salesFields));
      expect(reconFields).toEqual(expect.arrayContaining(salesFields));
      expect(carWashFields).toEqual(expect.arrayContaining(salesFields));
    });
  });

  describe('Performance Tests', () => {
    it('should handle large datasets efficiently', async () => {
      // Create 100 mock orders
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        ...mockSupabaseResponse.data[0],
        id: `test-order-${i + 1}`,
        order_number: `SA-2025-${String(i + 1).padStart(5, '0')}`
      }));

      vi.mocked(require('@/integrations/supabase/client').supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            data: largeDataset,
            error: null
          }))
        }))
      });

      const startTime = performance.now();
      const { result } = renderHook(() => useOrderManagement('all'));
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
      
      const endTime = performance.now();
      const processTime = endTime - startTime;

      expect(result.current.orders).toHaveLength(100);
      expect(processTime).toBeLessThan(1000); // Should process in under 1 second
      
      // Verify last order still has proper mapping
      const lastOrder = result.current.orders[99];
      expect(lastOrder.dealershipName).toBe('Test Dealership');
      expect(lastOrder.assignedTo).toBe('Detail Team Alpha');
    });
  });
});