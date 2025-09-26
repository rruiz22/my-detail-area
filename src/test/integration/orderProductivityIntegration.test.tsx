import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { OrderTasksSection } from '@/components/orders/OrderTasksSection';
import { ProductivityTodos } from '@/components/productivity/ProductivityTodos';
import { useProductivityTodos } from '@/hooks/useProductivityTodos';
import { useOrderContext } from '@/hooks/useOrderContext';

// Mock the hooks
vi.mock('@/hooks/useProductivityTodos');
vi.mock('@/hooks/useOrderContext');
vi.mock('@/contexts/AuthContext');
vi.mock('@/hooks/useAccessibleDealerships');

const mockTodos = [
  {
    id: '1',
    title: 'Follow up with customer',
    description: 'Contact customer about delivery date',
    priority: 'high',
    status: 'pending',
    category: 'customer_service',
    order_id: 'ORDER-001',
    dealer_id: 1,
    created_by: 'user1',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    due_date: '2024-01-20T15:00:00Z',
    completed_at: null
  },
  {
    id: '2',
    title: 'Process final payment',
    description: 'Complete payment and generate invoice',
    priority: 'urgent',
    status: 'in_progress',
    category: 'finance',
    order_id: 'ORDER-001',
    dealer_id: 1,
    created_by: 'user1',
    created_at: '2024-01-15T11:00:00Z',
    updated_at: '2024-01-15T11:00:00Z',
    due_date: '2024-01-18T17:00:00Z',
    completed_at: null
  },
  {
    id: '3',
    title: 'General task without order',
    description: 'This task is not linked to any order',
    priority: 'medium',
    status: 'pending',
    category: 'general',
    order_id: null,
    dealer_id: 1,
    created_by: 'user1',
    created_at: '2024-01-15T12:00:00Z',
    updated_at: '2024-01-15T12:00:00Z',
    due_date: null,
    completed_at: null
  }
];

const mockOrderData = {
  id: 'ORDER-001',
  customOrderNumber: 'SALES-001234',
  customerName: 'John Doe',
  customerEmail: 'john@example.com',
  vehicleMake: 'Toyota',
  vehicleModel: 'Camry',
  vehicleYear: 2024,
  status: 'in_progress',
  createdAt: '2024-01-15T09:00:00Z',
  totalAmount: 25000
};

const mockUseProductivityTodos = {
  todos: mockTodos,
  loading: false,
  error: null,
  createTodo: vi.fn(),
  updateTodo: vi.fn(),
  deleteTodo: vi.fn(),
  toggleTodoStatus: vi.fn(),
  refetch: vi.fn()
};

const mockUseOrderContext = {
  orderData: mockOrderData,
  loading: false,
  error: null
};

describe('Order-Productivity Integration', () => {
  beforeEach(() => {
    vi.mocked(useProductivityTodos).mockReturnValue(mockUseProductivityTodos);
    vi.mocked(useOrderContext).mockReturnValue(mockUseOrderContext);
  });

  const renderWithRouter = (component: React.ReactElement) => {
    return render(
      <BrowserRouter>
        {component}
      </BrowserRouter>
    );
  };

  describe('OrderTasksSection', () => {
    it('displays order-specific tasks correctly', () => {
      renderWithRouter(
        <OrderTasksSection
          orderId="ORDER-001"
          orderNumber="SALES-001234"
          customerName="John Doe"
        />
      );

      expect(screen.getByText('Tasks & Reminders')).toBeInTheDocument();
      expect(screen.getByText('Follow up with customer')).toBeInTheDocument();
      expect(screen.getByText('Process final payment')).toBeInTheDocument();
      expect(screen.queryByText('General task without order')).not.toBeInTheDocument();
    });

    it('shows customer context information', () => {
      renderWithRouter(
        <OrderTasksSection
          orderId="ORDER-001"
          orderNumber="SALES-001234"
          customerName="John Doe"
        />
      );

      expect(screen.getByText(/Customer:/)).toBeInTheDocument();
      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
      expect(screen.getByText(/Order:/)).toBeInTheDocument();
      expect(screen.getByText(/#SALES-001234/)).toBeInTheDocument();
    });

    it('displays progress summary correctly', () => {
      renderWithRouter(
        <OrderTasksSection
          orderId="ORDER-001"
          orderNumber="SALES-001234"
          customerName="John Doe"
        />
      );

      expect(screen.getByText('2 pending')).toBeInTheDocument();
      expect(screen.getByText('0 completed')).toBeInTheDocument();
    });

    it('opens create task dialog with order context', async () => {
      renderWithRouter(
        <OrderTasksSection
          orderId="ORDER-001"
          orderNumber="SALES-001234"
          customerName="John Doe"
        />
      );

      const addButton = screen.getByText('Add Task');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Create Task for Order #SALES-001234')).toBeInTheDocument();
      });
    });

    it('shows task templates in create dialog', async () => {
      renderWithRouter(
        <OrderTasksSection
          orderId="ORDER-001"
          orderNumber="SALES-001234"
          customerName="John Doe"
        />
      );

      const addButton = screen.getByText('Add Task');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Quick Templates')).toBeInTheDocument();
        expect(screen.getByText('Follow up with customer')).toBeInTheDocument();
        expect(screen.getByText('Schedule delivery appointment')).toBeInTheDocument();
      });
    });

    it('creates task with order_id when submitted', async () => {
      const mockCreateTodo = vi.fn();
      vi.mocked(useProductivityTodos).mockReturnValue({
        ...mockUseProductivityTodos,
        createTodo: mockCreateTodo
      });

      renderWithRouter(
        <OrderTasksSection
          orderId="ORDER-001"
          orderNumber="SALES-001234"
          customerName="John Doe"
        />
      );

      const addButton = screen.getByText('Add Task');
      fireEvent.click(addButton);

      await waitFor(() => {
        const titleInput = screen.getByLabelText('Task Title');
        fireEvent.change(titleInput, { target: { value: 'New test task' } });

        const submitButton = screen.getByText('Create Task');
        fireEvent.click(submitButton);
      });

      expect(mockCreateTodo).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New test task',
          order_id: 'ORDER-001'
        })
      );
    });

    it('displays "View All" link when tasks exist', () => {
      renderWithRouter(
        <OrderTasksSection
          orderId="ORDER-001"
          orderNumber="SALES-001234"
          customerName="John Doe"
        />
      );

      const viewAllLink = screen.getByText('View All');
      expect(viewAllLink).toBeInTheDocument();
      expect(viewAllLink.closest('a')).toHaveAttribute('href', '/productivity?order=ORDER-001');
    });
  });

  describe('ProductivityTodos with Order Filter', () => {
    it('shows order context when filtered by order', () => {
      // Mock URLSearchParams to simulate order filter
      const mockSearchParams = new URLSearchParams('?order=ORDER-001');
      vi.spyOn(URLSearchParams.prototype, 'get').mockImplementation((key) => {
        return key === 'order' ? 'ORDER-001' : null;
      });

      renderWithRouter(<ProductivityTodos />);

      expect(screen.getByText(/Tasks for Order #SALES-001234/)).toBeInTheDocument();
      expect(screen.getByText(/Customer: John Doe/)).toBeInTheDocument();
      expect(screen.getByText(/Vehicle: 2024 Toyota Camry/)).toBeInTheDocument();
    });

    it('filters todos by order_id when order filter is active', () => {
      const mockSearchParams = new URLSearchParams('?order=ORDER-001');
      vi.spyOn(URLSearchParams.prototype, 'get').mockImplementation((key) => {
        return key === 'order' ? 'ORDER-001' : null;
      });

      renderWithRouter(<ProductivityTodos />);

      // Should only show order-linked tasks
      expect(screen.getByText('Follow up with customer')).toBeInTheDocument();
      expect(screen.getByText('Process final payment')).toBeInTheDocument();
      expect(screen.queryByText('General task without order')).not.toBeInTheDocument();
    });

    it('shows order links for tasks when not filtered by order', () => {
      vi.spyOn(URLSearchParams.prototype, 'get').mockImplementation(() => null);

      renderWithRouter(<ProductivityTodos />);

      const orderLinks = screen.getAllByText(/Order #ORDER-001/);
      expect(orderLinks.length).toBeGreaterThan(0);

      orderLinks.forEach(link => {
        expect(link.closest('a')).toHaveAttribute('href', '/productivity?order=ORDER-001');
      });
    });

    it('creates task with order_id when order filter is active', async () => {
      const mockCreateTodo = vi.fn();
      vi.mocked(useProductivityTodos).mockReturnValue({
        ...mockUseProductivityTodos,
        createTodo: mockCreateTodo
      });

      const mockSearchParams = new URLSearchParams('?order=ORDER-001');
      vi.spyOn(URLSearchParams.prototype, 'get').mockImplementation((key) => {
        return key === 'order' ? 'ORDER-001' : null;
      });

      renderWithRouter(<ProductivityTodos />);

      const createButton = screen.getByText('Create Todo');
      fireEvent.click(createButton);

      await waitFor(() => {
        const titleInput = screen.getByLabelText('Title');
        fireEvent.change(titleInput, { target: { value: 'Filtered task' } });

        const submitButton = screen.getByText('Create');
        fireEvent.click(submitButton);
      });

      expect(mockCreateTodo).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Filtered task',
          order_id: 'ORDER-001'
        })
      );
    });
  });

  describe('Deep Linking and Navigation', () => {
    it('supports deep linking from order details to productivity view', () => {
      const mockSearchParams = new URLSearchParams('?order=ORDER-001');
      vi.spyOn(URLSearchParams.prototype, 'get').mockImplementation((key) => {
        return key === 'order' ? 'ORDER-001' : null;
      });

      renderWithRouter(<ProductivityTodos />);

      expect(screen.getByText(/Tasks for Order #SALES-001234/)).toBeInTheDocument();

      const clearFilterButton = screen.getByRole('button', { name: /clear filter/i });
      expect(clearFilterButton).toBeInTheDocument();
    });

    it('allows navigation back to order details', () => {
      const mockSearchParams = new URLSearchParams('?order=ORDER-001');
      vi.spyOn(URLSearchParams.prototype, 'get').mockImplementation((key) => {
        return key === 'order' ? 'ORDER-001' : null;
      });

      renderWithRouter(<ProductivityTodos />);

      const viewOrderButton = screen.getByText('View Order');
      expect(viewOrderButton.closest('a')).toHaveAttribute('href', '/orders');
    });
  });

  describe('Task Templates for Orders', () => {
    it('provides dealership-specific task templates', async () => {
      renderWithRouter(
        <OrderTasksSection
          orderId="ORDER-001"
          orderNumber="SALES-001234"
          customerName="John Doe"
        />
      );

      const addButton = screen.getByText('Add Task');
      fireEvent.click(addButton);

      await waitFor(() => {
        // Check for dealership-specific templates
        expect(screen.getByText('Follow up with customer')).toBeInTheDocument();
        expect(screen.getByText('Schedule delivery appointment')).toBeInTheDocument();
        expect(screen.getByText('Process final payment')).toBeInTheDocument();
        expect(screen.getByText('Request customer review')).toBeInTheDocument();
        expect(screen.getByText('Schedule vehicle inspection')).toBeInTheDocument();
        expect(screen.getByText('Prepare delivery documentation')).toBeInTheDocument();
      });
    });

    it('auto-fills task details when template is selected', async () => {
      renderWithRouter(
        <OrderTasksSection
          orderId="ORDER-001"
          orderNumber="SALES-001234"
          customerName="John Doe"
        />
      );

      const addButton = screen.getByText('Add Task');
      fireEvent.click(addButton);

      await waitFor(() => {
        const templateSelect = screen.getByDisplayValue('Select a template or create custom');
        fireEvent.change(templateSelect, { target: { value: '0' } }); // First template

        const titleInput = screen.getByLabelText('Task Title');
        expect(titleInput).toHaveValue('Follow up with customer');

        const descriptionInput = screen.getByLabelText('Description');
        expect(descriptionInput).toHaveValue('Contact customer for status update and next steps');
      });
    });
  });
});

describe('Integration Error Handling', () => {
  it('handles missing order data gracefully', () => {
    vi.mocked(useOrderContext).mockReturnValue({
      orderData: null,
      loading: false,
      error: 'Order not found'
    });

    const mockSearchParams = new URLSearchParams('?order=INVALID-ORDER');
    vi.spyOn(URLSearchParams.prototype, 'get').mockImplementation((key) => {
      return key === 'order' ? 'INVALID-ORDER' : null;
    });

    renderWithRouter(<ProductivityTodos />);

    expect(screen.getByText(/Tasks for Order #INVALID-ORDER/)).toBeInTheDocument();
    // Should still work even without order data
  });

  it('handles productivity service errors gracefully', () => {
    vi.mocked(useProductivityTodos).mockReturnValue({
      ...mockUseProductivityTodos,
      loading: false,
      error: 'Failed to load todos',
      todos: []
    });

    renderWithRouter(
      <OrderTasksSection
        orderId="ORDER-001"
        orderNumber="SALES-001234"
        customerName="John Doe"
      />
    );

    expect(screen.getByText('No tasks created for this order yet')).toBeInTheDocument();
  });
});