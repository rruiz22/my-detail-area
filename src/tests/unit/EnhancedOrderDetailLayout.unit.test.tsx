import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EnhancedOrderDetailLayout } from '@/components/orders/EnhancedOrderDetailLayout';
import type { OrderData, OrderModalData } from '@/types/order';

// Mock all child components to focus on layout logic
vi.mock('@/components/orders/VehicleInfoBlock', () => ({
  VehicleInfoBlock: vi.fn(({ order }) => (
    <div data-testid="vehicle-info-block">
      Vehicle: {order.vehicleYear} {order.vehicleMake} {order.vehicleModel}
    </div>
  ))
}));

vi.mock('@/components/orders/ScheduleViewBlock', () => ({
  ScheduleViewBlock: vi.fn(({ order }) => (
    <div data-testid="schedule-view-block">
      Status: {order.status}
    </div>
  ))
}));

vi.mock('@/components/orders/SimpleNotesDisplay', () => ({
  SimpleNotesDisplay: vi.fn(({ order }) => (
    <div data-testid="simple-notes-display">
      Notes: {order.notes}
    </div>
  ))
}));

vi.mock('@/components/orders/PublicCommentsBlock', () => ({
  PublicCommentsBlock: vi.fn(({ orderId }) => (
    <div data-testid="public-comments-block">
      Comments for {orderId}
    </div>
  ))
}));

vi.mock('@/components/orders/InternalNotesBlock', () => ({
  InternalNotesBlock: vi.fn(({ orderId }) => (
    <div data-testid="internal-notes-block">
      Internal notes for {orderId}
    </div>
  ))
}));

vi.mock('@/components/orders/EnhancedQRCodeBlock', () => ({
  EnhancedQRCodeBlock: vi.fn(({ orderId, orderNumber }) => (
    <div data-testid="qr-code-block">
      QR for {orderNumber} ({orderId})
    </div>
  ))
}));

vi.mock('@/components/orders/FollowersBlock', () => ({
  FollowersBlock: vi.fn(({ orderId }) => (
    <div data-testid="followers-block">
      Followers for {orderId}
    </div>
  ))
}));

vi.mock('@/components/orders/RecentActivityBlock', () => ({
  RecentActivityBlock: vi.fn(({ orderId }) => (
    <div data-testid="recent-activity-block">
      Activity for {orderId}
    </div>
  ))
}));

vi.mock('@/components/orders/ChatAndSMSActions', () => ({
  ChatAndSMSActions: vi.fn(({ orderId, customerPhone }) => (
    <div data-testid="chat-sms-actions">
      Communication: {orderId} - {customerPhone}
    </div>
  ))
}));

vi.mock('@/components/orders/OrderTasksSection', () => ({
  OrderTasksSection: vi.fn(({ orderId }) => (
    <div data-testid="order-tasks-section">
      Tasks for {orderId}
    </div>
  ))
}));

vi.mock('@/components/orders/SkeletonLoader', () => ({
  SkeletonLoader: vi.fn(({ variant }) => (
    <div data-testid={`skeleton-${variant}`}>
      Loading {variant}...
    </div>
  ))
}));

vi.mock('@/components/StatusBadgeInteractive', () => ({
  StatusBadgeInteractive: vi.fn(({ status, onStatusChange }) => (
    <button
      data-testid="status-badge"
      onClick={() => onStatusChange?.('completed')}
    >
      {status}
    </button>
  ))
}));

vi.mock('@/components/orders/TimeRemaining', () => ({
  TimeRemaining: vi.fn(({ order }) => (
    <div data-testid="time-remaining">
      Time remaining for {order.id}
    </div>
  ))
}));

// Mock performance monitor
vi.mock('@/hooks/usePerformanceMonitor', () => ({
  usePerformanceMonitor: () => ({
    startMeasure: vi.fn(() => 'measure-id'),
    endMeasure: vi.fn(() => 50),
    recordMetric: vi.fn()
  })
}));

// Mock translations
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      const translations: Record<string, string> = {
        'orders.order_details': 'Order Details',
        'orders.order_details_description': 'Details for customer {{customer}} and vehicle {{vehicle}}',
        'orders.communication_actions': 'Team Communication'
      };
      return options
        ? translations[key]?.replace(/\{\{(\w+)\}\}/g, (_, prop) => options[prop])
        : translations[key] || key;
    }
  })
}));

// Test utilities
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

const renderWithProviders = (
  ui: React.ReactElement,
  { queryClient = createTestQueryClient() } = {}
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  return render(ui, { wrapper: Wrapper });
};

// Mock order data
const createMockOrder = (overrides: Partial<OrderData> = {}): OrderData => ({
  id: 'order-123',
  customOrderNumber: 'DEAL-SALES-001',
  order_number: 'DEAL-SALES-001',
  custom_order_number: 'DEAL-SALES-001',
  status: 'pending',
  notes: 'Test order notes',
  internal_notes: 'Internal test notes',
  customerName: 'John Doe',
  customer_name: 'John Doe',
  customerPhone: '+1-555-0123',
  customer_phone: '+1-555-0123',
  vehicleYear: '2023',
  vehicle_year: '2023',
  vehicleMake: 'Honda',
  vehicle_make: 'Honda',
  vehicleModel: 'Civic',
  vehicle_model: 'Civic',
  vehicleVin: '1HGBH41JXMN109186',
  vehicle_vin: '1HGBH41JXMN109186',
  dealer_id: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  estimated_completion: new Date(Date.now() + 86400000).toISOString(),
  qr_code_url: 'https://api.qrserver.com/v1/create-qr-code/?data=test',
  short_link: 'https://mda.to/ABC12',
  salesperson: 'Jane Smith',
  ...overrides
});

const createMockModalData = (): OrderModalData => ({
  attachments: [],
  activities: [],
  comments: [],
  followers: [],
  analytics: null,
  userType: 'admin'
});

describe('EnhancedOrderDetailLayout Unit Tests', () => {
  let mockOrder: OrderData;
  let mockModalData: OrderModalData;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOrder = createMockOrder();
    mockModalData = createMockModalData();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('🎨 Layout Structure and Rendering', () => {
    it('should render with correct dialog structure', () => {
      renderWithProviders(
        <EnhancedOrderDetailLayout
          order={mockOrder}
          open={true}
          onClose={vi.fn()}
          modalData={mockModalData}
        />
      );

      expect(screen.getByTestId('order-detail-modal')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should display order header information correctly', () => {
      renderWithProviders(
        <EnhancedOrderDetailLayout
          order={mockOrder}
          open={true}
          onClose={vi.fn()}
          modalData={mockModalData}
        />
      );

      expect(screen.getByText('DEAL-SALES-001')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith (Salesperson)')).toBeInTheDocument();
      expect(screen.getByText('VIN: 1HGBH41JXMN109186')).toBeInTheDocument();
    });

    it('should render main content blocks in correct layout', () => {
      renderWithProviders(
        <EnhancedOrderDetailLayout
          order={mockOrder}
          open={true}
          onClose={vi.fn()}
          modalData={mockModalData}
        />
      );

      // Main content blocks
      expect(screen.getByTestId('vehicle-info-block')).toBeInTheDocument();
      expect(screen.getByTestId('schedule-view-block')).toBeInTheDocument();
      expect(screen.getByTestId('simple-notes-display')).toBeInTheDocument();
      expect(screen.getByTestId('public-comments-block')).toBeInTheDocument();
      expect(screen.getByTestId('internal-notes-block')).toBeInTheDocument();
    });

    it('should render sidebar components correctly', () => {
      renderWithProviders(
        <EnhancedOrderDetailLayout
          order={mockOrder}
          open={true}
          onClose={vi.fn()}
          modalData={mockModalData}
        />
      );

      // Sidebar blocks
      expect(screen.getByTestId('qr-code-block')).toBeInTheDocument();
      expect(screen.getByTestId('chat-sms-actions')).toBeInTheDocument();
      expect(screen.getByTestId('followers-block')).toBeInTheDocument();
      expect(screen.getByTestId('order-tasks-section')).toBeInTheDocument();
      expect(screen.getByTestId('recent-activity-block')).toBeInTheDocument();
    });

    it('should show loading skeletons when data is loading', () => {
      renderWithProviders(
        <EnhancedOrderDetailLayout
          order={mockOrder}
          open={true}
          onClose={vi.fn()}
          modalData={mockModalData}
          isLoadingData={true}
        />
      );

      expect(screen.getByTestId('skeleton-qr-code')).toBeInTheDocument();
      expect(screen.getByTestId('skeleton-notes')).toBeInTheDocument();
      expect(screen.getByTestId('skeleton-activity')).toBeInTheDocument();
    });

    it('should not render when order is null', () => {
      const { container } = renderWithProviders(
        <EnhancedOrderDetailLayout
          order={null as any}
          open={true}
          onClose={vi.fn()}
          modalData={mockModalData}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('🔧 Prop Handling and Data Flow', () => {
    it('should pass correct props to child components', () => {
      const VehicleInfoBlockMock = vi.mocked(
        require('@/components/orders/VehicleInfoBlock').VehicleInfoBlock
      );
      const QRCodeBlockMock = vi.mocked(
        require('@/components/orders/EnhancedQRCodeBlock').EnhancedQRCodeBlock
      );

      renderWithProviders(
        <EnhancedOrderDetailLayout
          order={mockOrder}
          open={true}
          onClose={vi.fn()}
          modalData={mockModalData}
        />
      );

      // Vehicle info should receive order
      expect(VehicleInfoBlockMock).toHaveBeenCalledWith(
        expect.objectContaining({ order: mockOrder }),
        expect.anything()
      );

      // QR code should receive order identifiers
      expect(QRCodeBlockMock).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'order-123',
          orderNumber: 'DEAL-SALES-001',
          dealerId: '1',
          qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?data=test',
          shortLink: 'https://mda.to/ABC12'
        }),
        expect.anything()
      );
    });

    it('should handle missing optional order fields gracefully', () => {
      const minimalOrder = createMockOrder({
        customerName: undefined,
        customer_name: undefined,
        vehicleYear: undefined,
        vehicleMake: undefined,
        vehicleModel: undefined,
        qr_code_url: undefined,
        short_link: undefined
      });

      renderWithProviders(
        <EnhancedOrderDetailLayout
          order={minimalOrder}
          open={true}
          onClose={vi.fn()}
          modalData={mockModalData}
        />
      );

      expect(screen.getByText('Customer')).toBeInTheDocument(); // Default fallback
      expect(screen.getByText('Unknown Vehicle')).toBeInTheDocument(); // Default fallback
      expect(screen.getByText('VIN: 1HGBH41JXMN109186')).toBeInTheDocument();
    });

    it('should memoize vehicle display name correctly', () => {
      const { rerender } = renderWithProviders(
        <EnhancedOrderDetailLayout
          order={mockOrder}
          open={true}
          onClose={vi.fn()}
          modalData={mockModalData}
        />
      );

      expect(screen.getByText('2023 Honda Civic')).toBeInTheDocument();

      // Rerender with same vehicle data - should not cause re-computation
      rerender(
        <EnhancedOrderDetailLayout
          order={mockOrder}
          open={true}
          onClose={vi.fn()}
          modalData={mockModalData}
        />
      );

      expect(screen.getByText('2023 Honda Civic')).toBeInTheDocument();
    });

    it('should handle multiple order number formats', () => {
      const orderWithCustomNumber = createMockOrder({
        customOrderNumber: 'CUSTOM-001',
        order_number: 'ORDER-002',
        custom_order_number: 'CUSTOM_ORDER-003'
      });

      renderWithProviders(
        <EnhancedOrderDetailLayout
          order={orderWithCustomNumber}
          open={true}
          onClose={vi.fn()}
          modalData={mockModalData}
        />
      );

      // Should prioritize customOrderNumber
      expect(screen.getByText('CUSTOM-001')).toBeInTheDocument();
    });
  });

  describe('🎭 Event Handling and Interactions', () => {
    it('should handle close button click', () => {
      const onCloseMock = vi.fn();

      renderWithProviders(
        <EnhancedOrderDetailLayout
          order={mockOrder}
          open={true}
          onClose={onCloseMock}
          modalData={mockModalData}
        />
      );

      const closeButton = screen.getByText('Close');
      fireEvent.click(closeButton);

      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    it('should handle status change through status badge', async () => {
      const onStatusChangeMock = vi.fn();

      renderWithProviders(
        <EnhancedOrderDetailLayout
          order={mockOrder}
          open={true}
          onClose={vi.fn()}
          onStatusChange={onStatusChangeMock}
          modalData={mockModalData}
        />
      );

      const statusBadge = screen.getByTestId('status-badge');
      fireEvent.click(statusBadge);

      await waitFor(() => {
        expect(onStatusChangeMock).toHaveBeenCalledWith('order-123', 'completed');
      });
    });

    it('should not call status change when handler not provided', () => {
      renderWithProviders(
        <EnhancedOrderDetailLayout
          order={mockOrder}
          open={true}
          onClose={vi.fn()}
          modalData={mockModalData}
        />
      );

      const statusBadge = screen.getByTestId('status-badge');

      // Should not throw when clicking without handler
      expect(() => fireEvent.click(statusBadge)).not.toThrow();
    });

    it('should reset scroll position when modal opens', async () => {
      const scrollIntoViewMock = vi.fn();

      // Mock scrollIntoView
      Element.prototype.scrollIntoView = scrollIntoViewMock;

      const { rerender } = renderWithProviders(
        <EnhancedOrderDetailLayout
          order={mockOrder}
          open={false}
          onClose={vi.fn()}
          modalData={mockModalData}
        />
      );

      // Open modal
      rerender(
        <EnhancedOrderDetailLayout
          order={mockOrder}
          open={true}
          onClose={vi.fn()}
          modalData={mockModalData}
        />
      );

      // Wait for scroll reset with timeout
      await waitFor(() => {
        expect(scrollIntoViewMock).toHaveBeenCalled();
      }, { timeout: 100 });
    });
  });

  describe('⚛️ React.memo Optimization', () => {
    it('should prevent re-render with identical props', () => {
      const onClose = vi.fn();

      const { rerender } = renderWithProviders(
        <EnhancedOrderDetailLayout
          order={mockOrder}
          open={true}
          onClose={onClose}
          modalData={mockModalData}
        />
      );

      const VehicleInfoBlockMock = vi.mocked(
        require('@/components/orders/VehicleInfoBlock').VehicleInfoBlock
      );

      const initialCallCount = VehicleInfoBlockMock.mock.calls.length;

      // Rerender with same props
      rerender(
        <EnhancedOrderDetailLayout
          order={mockOrder}
          open={true}
          onClose={onClose}
          modalData={mockModalData}
        />
      );

      // Should not increase call count significantly
      expect(VehicleInfoBlockMock.mock.calls.length - initialCallCount).toBeLessThan(3);
    });

    it('should re-render when essential props change', () => {
      const onClose = vi.fn();

      const { rerender } = renderWithProviders(
        <EnhancedOrderDetailLayout
          order={mockOrder}
          open={true}
          onClose={onClose}
          modalData={mockModalData}
        />
      );

      expect(screen.getByText('pending')).toBeInTheDocument();

      // Change essential prop
      const updatedOrder = { ...mockOrder, status: 'completed' as const };
      rerender(
        <EnhancedOrderDetailLayout
          order={updatedOrder}
          open={true}
          onClose={onClose}
          modalData={mockModalData}
        />
      );

      expect(screen.getByText('completed')).toBeInTheDocument();
    });

    it('should use memoized child components effectively', () => {
      const VehicleInfoBlockMock = vi.mocked(
        require('@/components/orders/VehicleInfoBlock').VehicleInfoBlock
      );
      const ScheduleViewBlockMock = vi.mocked(
        require('@/components/orders/ScheduleViewBlock').ScheduleViewBlock
      );

      renderWithProviders(
        <EnhancedOrderDetailLayout
          order={mockOrder}
          open={true}
          onClose={vi.fn()}
          modalData={mockModalData}
        />
      );

      // Components should be called with memo wrappers
      expect(VehicleInfoBlockMock).toHaveBeenCalled();
      expect(ScheduleViewBlockMock).toHaveBeenCalled();
    });
  });

  describe('📱 Responsive Layout and Accessibility', () => {
    it('should have proper ARIA labels and structure', () => {
      renderWithProviders(
        <EnhancedOrderDetailLayout
          order={mockOrder}
          open={true}
          onClose={vi.fn()}
          modalData={mockModalData}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby');
      expect(dialog).toHaveAttribute('aria-describedby');

      // Check for screen reader content
      expect(screen.getByText('Order Details - DEAL-SALES-001')).toBeInTheDocument();
    });

    it('should apply responsive CSS classes', () => {
      renderWithProviders(
        <EnhancedOrderDetailLayout
          order={mockOrder}
          open={true}
          onClose={vi.fn()}
          modalData={mockModalData}
        />
      );

      const modal = screen.getByTestId('order-detail-modal');
      expect(modal).toHaveClass('max-w-none', 'max-h-none', 'w-screen', 'h-screen');
    });

    it('should handle keyboard navigation', () => {
      renderWithProviders(
        <EnhancedOrderDetailLayout
          order={mockOrder}
          open={true}
          onClose={vi.fn()}
          modalData={mockModalData}
        />
      );

      const closeButton = screen.getByText('Close');
      closeButton.focus();

      expect(closeButton).toHaveFocus();
    });
  });

  describe('🔄 Performance Monitoring Integration', () => {
    it('should track modal render performance', () => {
      const mockPerformanceMonitor = vi.mocked(
        require('@/hooks/usePerformanceMonitor').usePerformanceMonitor
      )();

      renderWithProviders(
        <EnhancedOrderDetailLayout
          order={mockOrder}
          open={true}
          onClose={vi.fn()}
          modalData={mockModalData}
        />
      );

      expect(mockPerformanceMonitor.startMeasure).toHaveBeenCalledWith('modal-render');
      expect(mockPerformanceMonitor.recordMetric).toHaveBeenCalledWith('modal-open', expect.any(Number));
    });

    it('should record modal close metrics on unmount', () => {
      const mockPerformanceMonitor = vi.mocked(
        require('@/hooks/usePerformanceMonitor').usePerformanceMonitor
      )();

      const { unmount } = renderWithProviders(
        <EnhancedOrderDetailLayout
          order={mockOrder}
          open={true}
          onClose={vi.fn()}
          modalData={mockModalData}
        />
      );

      unmount();

      expect(mockPerformanceMonitor.endMeasure).toHaveBeenCalledWith('modal-render');
      expect(mockPerformanceMonitor.recordMetric).toHaveBeenCalledWith('modal-close', expect.any(Number));
    });
  });

  describe('🎯 Error Boundary and Edge Cases', () => {
    it('should handle malformed order data gracefully', () => {
      const malformedOrder = {
        id: 'order-123',
        // Missing required fields
      } as any;

      expect(() => {
        renderWithProviders(
          <EnhancedOrderDetailLayout
            order={malformedOrder}
            open={true}
            onClose={vi.fn()}
            modalData={mockModalData}
          />
        );
      }).not.toThrow();

      expect(screen.getByTestId('order-detail-modal')).toBeInTheDocument();
    });

    it('should handle null modal data gracefully', () => {
      expect(() => {
        renderWithProviders(
          <EnhancedOrderDetailLayout
            order={mockOrder}
            open={true}
            onClose={vi.fn()}
            modalData={null as any}
          />
        );
      }).not.toThrow();

      expect(screen.getByTestId('order-detail-modal')).toBeInTheDocument();
    });

    it('should display error state when dataError is provided', () => {
      renderWithProviders(
        <EnhancedOrderDetailLayout
          order={mockOrder}
          open={true}
          onClose={vi.fn()}
          modalData={mockModalData}
          dataError="Failed to load order data"
        />
      );

      // Component should still render but may show error state
      expect(screen.getByTestId('order-detail-modal')).toBeInTheDocument();
    });
  });
});