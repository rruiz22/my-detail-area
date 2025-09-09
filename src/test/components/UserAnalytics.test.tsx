import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { UserAnalytics } from '@/components/users/UserAnalytics';
import i18n from '@/lib/i18n';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock hooks
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

// Mock recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  Bar: () => <div data-testid="bar" />,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        {children}
      </I18nextProvider>
    </QueryClientProvider>
  );
};

describe('UserAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock URL.createObjectURL and document.createElement for export functionality
    global.URL.createObjectURL = vi.fn(() => 'blob:url');
    global.URL.revokeObjectURL = vi.fn();
    global.document.createElement = vi.fn(() => ({
      href: '',
      download: '',
      click: vi.fn()
    })) as any;
  });

  it('renders analytics dashboard with key metrics', async () => {
    render(
      <TestWrapper>
        <UserAnalytics dealerId={5} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('User Analytics')).toBeInTheDocument();
      expect(screen.getByText('Comprehensive user insights and metrics')).toBeInTheDocument();
    });

    // Check for key metric cards
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('Active This Month')).toBeInTheDocument();
    expect(screen.getByText('New This Month')).toBeInTheDocument();
    expect(screen.getByText('Avg Session')).toBeInTheDocument();
    expect(screen.getByText('Retention Rate')).toBeInTheDocument();
  });

  it('displays all analytics tabs', async () => {
    render(
      <TestWrapper>
        <UserAnalytics dealerId={5} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('User Growth')).toBeInTheDocument();
      expect(screen.getByText('Role Distribution')).toBeInTheDocument();
      expect(screen.getByText('Departments')).toBeInTheDocument();
      expect(screen.getByText('Comparison')).toBeInTheDocument();
    });
  });

  it('switches between analytics tabs correctly', async () => {
    render(
      <TestWrapper>
        <UserAnalytics dealerId={5} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('User Growth Trends')).toBeInTheDocument();
    });

    // Switch to Role Distribution tab
    fireEvent.click(screen.getByText('Role Distribution'));
    await waitFor(() => {
      expect(screen.getByText('Role Statistics')).toBeInTheDocument();
    });

    // Switch to Departments tab
    fireEvent.click(screen.getByText('Departments'));
    await waitFor(() => {
      expect(screen.getByText('Department Distribution')).toBeInTheDocument();
    });

    // Switch to Comparison tab
    fireEvent.click(screen.getByText('Comparison'));
    await waitFor(() => {
      expect(screen.getByText('Dealership Comparison')).toBeInTheDocument();
    });
  });

  it('handles time range selection', async () => {
    render(
      <TestWrapper>
        <UserAnalytics dealerId={5} />
      </TestWrapper>
    );

    await waitFor(() => {
      // Should show default time range selector
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  it('handles export functionality', async () => {
    const mockClick = vi.fn();
    global.document.createElement = vi.fn(() => ({
      href: '',
      download: '',
      click: mockClick
    })) as any;

    render(
      <TestWrapper>
        <UserAnalytics dealerId={5} />
      </TestWrapper>
    );

    await waitFor(() => {
      const exportButton = screen.getByText('Export');
      fireEvent.click(exportButton);
    });

    await waitFor(() => {
      expect(mockClick).toHaveBeenCalled();
    });
  });

  it('displays metric values correctly', async () => {
    render(
      <TestWrapper>
        <UserAnalytics dealerId={5} />
      </TestWrapper>
    );

    await waitFor(() => {
      // Check for specific metric values from mock data
      expect(screen.getByText('82')).toBeInTheDocument(); // Total users
      expect(screen.getByText('76')).toBeInTheDocument(); // Active this month
      expect(screen.getByText('8')).toBeInTheDocument(); // New this month
      expect(screen.getByText('45m')).toBeInTheDocument(); // Avg session
      expect(screen.getByText('89%')).toBeInTheDocument(); // Retention rate
    });
  });

  it('shows growth indicators', async () => {
    render(
      <TestWrapper>
        <UserAnalytics dealerId={5} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('+12%')).toBeInTheDocument();
      expect(screen.getByText('vs last period')).toBeInTheDocument();
    });
  });

  it('renders charts correctly', async () => {
    render(
      <TestWrapper>
        <UserAnalytics dealerId={5} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });
  });

  it('displays role distribution data', async () => {
    render(
      <TestWrapper>
        <UserAnalytics dealerId={5} />
      </TestWrapper>
    );

    // Switch to role distribution tab
    fireEvent.click(screen.getByText('Role Distribution'));

    await waitFor(() => {
      expect(screen.getByText('Dealer Admin')).toBeInTheDocument();
      expect(screen.getByText('Sales Manager')).toBeInTheDocument();
      expect(screen.getByText('Service Advisor')).toBeInTheDocument();
      expect(screen.getByText('Detail Staff')).toBeInTheDocument();
      expect(screen.getByText('Viewer')).toBeInTheDocument();
    });
  });

  it('shows dealership comparison', async () => {
    render(
      <TestWrapper>
        <UserAnalytics dealerId={5} />
      </TestWrapper>
    );

    // Switch to comparison tab
    fireEvent.click(screen.getByText('Comparison'));

    await waitFor(() => {
      expect(screen.getByText('Main Location')).toBeInTheDocument();
      expect(screen.getByText('North Branch')).toBeInTheDocument();
      expect(screen.getByText('South Branch')).toBeInTheDocument();
      expect(screen.getByText('West Branch')).toBeInTheDocument();
    });
  });

  it('handles loading state', () => {
    render(
      <TestWrapper>
        <UserAnalytics dealerId={5} />
      </TestWrapper>
    );

    // Should show loading skeleton initially
    expect(screen.getByText('User Analytics')).toBeInTheDocument();
  });

  it('displays badges and status indicators', async () => {
    render(
      <TestWrapper>
        <UserAnalytics dealerId={5} />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Excellent')).toBeInTheDocument();
    });
  });
});