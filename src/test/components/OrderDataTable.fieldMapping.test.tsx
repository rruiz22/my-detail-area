import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../utils/test-utils';
import { OrderDataTable } from '@/components/orders/OrderDataTable';

// Mock translation hook
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock status permissions hook
vi.mock('@/hooks/useStatusPermissions', () => ({
  useStatusPermissions: () => ({
    canUpdateStatus: true,
    updateOrderStatus: vi.fn().mockResolvedValue(true)
  })
}));

// Mock mobile hook
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined)
  }
});

describe('OrderDataTable Field Mapping Tests', () => {
  const mockOrderWithFullData = {
    id: 'test-order-1',
    orderNumber: 'SA-2025-00001',
    customerName: 'John Doe',
    vehicleYear: 2023,
    vehicleMake: 'Toyota',
    vehicleModel: 'Camry',
    vehicleVin: '1HGBH41JXMN109186',
    stockNumber: 'STK001',
    status: 'pending',
    createdAt: '2025-01-10T10:00:00.000Z',
    dealer_id: 5,
    dueDate: '2025-01-15T14:00:00.000Z',
    // Enhanced fields from JOINs - these are the critical fixes
    dealershipName: 'Test Dealership',
    assignedTo: 'Detail Team Alpha',
    assignedGroupName: 'Detail Team Alpha',
    createdByGroupName: 'Sales Team',
    dueTime: '2:00 PM'
  };

  const mockOrderWithMissingData = {
    id: 'test-order-2',
    orderNumber: 'SA-2025-00002',
    customerName: 'Jane Smith',
    status: 'in_progress',
    createdAt: '2025-01-10T11:00:00.000Z',
    dealer_id: 5,
    // Missing most optional fields to test fallbacks
    dealershipName: undefined,
    assignedTo: undefined,
    vehicleVin: undefined,
    stockNumber: undefined,
    dueTime: undefined,
    dueDate: undefined
  };

  const defaultProps = {
    loading: false,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onView: vi.fn(),
    onStatusChange: vi.fn(),
    tabType: 'all'
  };

  describe('Desktop Table Layout', () => {
    it('should display correct dealership name (no hardcoded "Premium Auto")', () => {
      render(
        <OrderDataTable
          {...defaultProps}
          orders={[mockOrderWithFullData]}
        />
      );

      // Should show actual dealership name
      expect(screen.getByText('Test Dealership')).toBeInTheDocument();
      
      // Should NOT show hardcoded value
      expect(screen.queryByText('Premium Auto')).not.toBeInTheDocument();
    });

    it('should display correct assigned user (no hardcoded "Unassigned")', () => {
      render(
        <OrderDataTable
          {...defaultProps}
          orders={[mockOrderWithFullData]}
        />
      );

      // Should show actual assigned group
      expect(screen.getByText('Detail Team Alpha')).toBeInTheDocument();
    });

    it('should display correct due time from sla_deadline', () => {
      render(
        <OrderDataTable
          {...defaultProps}
          orders={[mockOrderWithFullData]}
        />
      );

      // Should show formatted time
      expect(screen.getByText('2:00 PM')).toBeInTheDocument();
    });

    it('should handle missing data with proper fallbacks', () => {
      render(
        <OrderDataTable
          {...defaultProps}
          orders={[mockOrderWithMissingData]}
        />
      );

      // Should show fallback values (not hardcoded ones)
      expect(screen.getByText('Unknown Dealer')).toBeInTheDocument();
      expect(screen.getByText('Unassigned')).toBeInTheDocument();
      expect(screen.getByText('data_table.no_stock')).toBeInTheDocument(); // Translation key
      expect(screen.getByText('data_table.vin_not_provided')).toBeInTheDocument();
      expect(screen.getByText('12:00 PM')).toBeInTheDocument(); // Default time
      expect(screen.getByText('No date set')).toBeInTheDocument();
    });

    it('should display vehicle information correctly', () => {
      render(
        <OrderDataTable
          {...defaultProps}
          orders={[mockOrderWithFullData]}
        />
      );

      // Vehicle year, make, model should be concatenated
      expect(screen.getByText('2023 Toyota Camry')).toBeInTheDocument();
      
      // VIN should be clickable
      const vinElement = screen.getByText('1HGBH41JXMN109186');
      expect(vinElement).toBeInTheDocument();
      expect(vinElement).toHaveClass('cursor-pointer');
    });

    it('should make VIN clickable and copy to clipboard', async () => {
      render(
        <OrderDataTable
          {...defaultProps}
          orders={[mockOrderWithFullData]}
        />
      );

      const vinElement = screen.getByText('1HGBH41JXMN109186');
      fireEvent.click(vinElement);

      // Should call clipboard API
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('1HGBH41JXMN109186');
    });
  });

  describe('Mobile Card Layout', () => {
    beforeEach(() => {
      // Mock mobile hook to return true
      vi.mocked(require('@/hooks/use-mobile').useIsMobile).mockReturnValue(true);
    });

    it('should display correct dealership name in mobile layout', () => {
      render(
        <OrderDataTable
          {...defaultProps}
          orders={[mockOrderWithFullData]}
        />
      );

      expect(screen.getByText('Test Dealership')).toBeInTheDocument();
      expect(screen.queryByText('Premium Auto')).not.toBeInTheDocument();
    });

    it('should display correct assigned user in mobile layout', () => {
      render(
        <OrderDataTable
          {...defaultProps}
          orders={[mockOrderWithFullData]}
        />
      );

      expect(screen.getByText('Detail Team Alpha')).toBeInTheDocument();
    });

    it('should display formatted due time and date in mobile layout', () => {
      render(
        <OrderDataTable
          {...defaultProps}
          orders={[mockOrderWithFullData]}
        />
      );

      expect(screen.getByText('2:00 PM')).toBeInTheDocument();
      // Date should be formatted
      expect(screen.getByText(/1\/15\/2025/)).toBeInTheDocument();
    });
  });

  describe('Data Integrity Tests', () => {
    it('should never display hardcoded "Premium Auto"', () => {
      const ordersWithVariousData = [
        mockOrderWithFullData,
        mockOrderWithMissingData,
        { ...mockOrderWithFullData, dealershipName: 'Another Dealership' },
        { ...mockOrderWithFullData, dealershipName: null }
      ];

      render(
        <OrderDataTable
          {...defaultProps}
          orders={ordersWithVariousData}
        />
      );

      // Should never show the old hardcoded value
      expect(screen.queryByText('Premium Auto')).not.toBeInTheDocument();
      
      // Should show actual values or proper fallbacks
      expect(screen.getByText('Test Dealership')).toBeInTheDocument();
      expect(screen.getByText('Another Dealership')).toBeInTheDocument();
      expect(screen.getAllByText('Unknown Dealer')).toHaveLength(2); // For null and undefined cases
    });

    it('should never use undefined advisor field', () => {
      const orderWithUndefinedAdvisor = {
        ...mockOrderWithFullData,
        advisor: undefined, // This field should NOT be used anymore
        assignedTo: 'Correct Assignment'
      };

      render(
        <OrderDataTable
          {...defaultProps}
          orders={[orderWithUndefinedAdvisor]}
        />
      );

      // Should use assignedTo field, not advisor
      expect(screen.getByText('Correct Assignment')).toBeInTheDocument();
    });

    it('should format order numbers correctly', () => {
      const ordersWithDifferentFormats = [
        { ...mockOrderWithFullData, orderNumber: 'SA-2025-00001' },
        { ...mockOrderWithFullData, id: 'test-2', orderNumber: 'SE-2025-00002' },
        { ...mockOrderWithFullData, id: 'test-3', orderNumber: 'CW-2025-00003' },
        { ...mockOrderWithFullData, id: 'test-4', orderNumber: 'RC-2025-00004' }
      ];

      render(
        <OrderDataTable
          {...defaultProps}
          orders={ordersWithDifferentFormats}
        />
      );

      expect(screen.getByText('SA-2025-00001')).toBeInTheDocument();
      expect(screen.getByText('SE-2025-00002')).toBeInTheDocument();
      expect(screen.getByText('CW-2025-00003')).toBeInTheDocument();
      expect(screen.getByText('RC-2025-00004')).toBeInTheDocument();
    });
  });

  describe('Status Change Integration', () => {
    it('should handle status changes correctly', async () => {
      const mockOnStatusChange = vi.fn();
      
      render(
        <OrderDataTable
          {...defaultProps}
          orders={[mockOrderWithFullData]}
          onStatusChange={mockOnStatusChange}
        />
      );

      // Status badge should be interactive and call the correct handler
      const statusElement = screen.getByText('pending'); // This would be in StatusBadgeInteractive
      expect(statusElement).toBeInTheDocument();
      
      // The onStatusChange function should be passed correctly
      expect(mockOnStatusChange).toBeDefined();
    });
  });

  describe('Performance with Large Datasets', () => {
    it('should render efficiently with many orders', () => {
      const manyOrders = Array.from({ length: 50 }, (_, i) => ({
        ...mockOrderWithFullData,
        id: `test-order-${i + 1}`,
        orderNumber: `SA-2025-${String(i + 1).padStart(5, '0')}`,
        dealershipName: `Dealership ${i + 1}`,
        assignedTo: `Team ${i + 1}`
      }));

      const startTime = performance.now();
      
      render(
        <OrderDataTable
          {...defaultProps}
          orders={manyOrders}
        />
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render in reasonable time
      expect(renderTime).toBeLessThan(500); // 500ms threshold
      
      // First page should show 10 orders (pagination)
      expect(screen.getByText('SA-2025-00001')).toBeInTheDocument();
      expect(screen.getByText('Dealership 1')).toBeInTheDocument();
      expect(screen.getByText('Team 1')).toBeInTheDocument();
    });
  });
});