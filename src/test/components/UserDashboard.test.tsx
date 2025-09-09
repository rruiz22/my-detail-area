import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { UserDashboard } from '@/components/users/UserDashboard';
import { AuthProvider } from '@/contexts/AuthContext';
import i18n from '@/lib/i18n';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          is: vi.fn(() => ({
            gt: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      }))
    })),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null }))
  }
}));

// Mock hooks
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

vi.mock('@/hooks/useUserAudit', () => ({
  useUserAudit: () => ({
    auditEvents: [],
    loading: false,
    fetchAuditEvents: vi.fn(),
    logAuditEvent: vi.fn(),
    exportAuditLog: vi.fn(),
    pagination: { page: 1, limit: 50, total: 0 },
    setPagination: vi.fn()
  })
}));

// Mock child components
vi.mock('@/components/users/UserStatsCards', () => ({
  UserStatsCards: ({ stats }: any) => (
    <div data-testid="user-stats-cards">
      Total Users: {stats?.totalUsers || 0}
    </div>
  )
}));

vi.mock('@/components/users/UnifiedUserManagement', () => ({
  UnifiedUserManagement: () => (
    <div data-testid="unified-user-management">User Management</div>
  )
}));

vi.mock('@/components/users/UserActivityFeed', () => ({
  UserActivityFeed: () => (
    <div data-testid="user-activity-feed">Activity Feed</div>
  )
}));

vi.mock('@/components/users/UserAnalytics', () => ({
  UserAnalytics: () => (
    <div data-testid="user-analytics">Analytics</div>
  )
}));

vi.mock('@/components/users/UserAuditLog', () => ({
  UserAuditLog: () => (
    <div data-testid="user-audit-log">Audit Log</div>
  )
}));

vi.mock('@/components/invitations/InvitationManagement', () => ({
  InvitationManagement: () => (
    <div data-testid="invitation-management">Invitations</div>
  )
}));

vi.mock('@/components/permissions/AdvancedPermissionManager', () => ({
  AdvancedPermissionManager: () => (
    <div data-testid="permission-manager">Permissions</div>
  )
}));

vi.mock('@/components/permissions/PermissionGuard', () => ({
  PermissionGuard: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="permission-guard">{children}</div>
  )
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    user_metadata: {},
    app_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString()
  };

  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <AuthProvider value={{ 
          user: mockUser, 
          session: { 
            user: mockUser, 
            access_token: 'fake-token',
            token_type: 'bearer',
            expires_in: 3600,
            expires_at: Date.now() + 3600000,
            refresh_token: 'fake-refresh'
          }, 
          loading: false, 
          signOut: vi.fn() 
        }}>
          {children}
        </AuthProvider>
      </I18nextProvider>
    </QueryClientProvider>
  );
};

describe('UserDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders user dashboard with main components', async () => {
    render(
      <TestWrapper>
        <UserDashboard />
      </TestWrapper>
    );

    expect(screen.getByText('User Management')).toBeInTheDocument();
    expect(screen.getByTestId('permission-guard')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByTestId('user-stats-cards')).toBeInTheDocument();
    });
  });

  it('displays all navigation tabs', async () => {
    render(
      <TestWrapper>
        <UserDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Users')).toBeInTheDocument();
      expect(screen.getByText('Invitations')).toBeInTheDocument();
      expect(screen.getByText('Permissions')).toBeInTheDocument();
      expect(screen.getByText('Activity')).toBeInTheDocument();
      expect(screen.getByText('Analytics')).toBeInTheDocument();
      expect(screen.getByText('Audit Log')).toBeInTheDocument();
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });
  });

  it('switches between tabs correctly', async () => {
    render(
      <TestWrapper>
        <UserDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Users')).toBeInTheDocument();
    });

    // Click on Users tab
    fireEvent.click(screen.getByText('Users'));
    await waitFor(() => {
      expect(screen.getByTestId('unified-user-management')).toBeInTheDocument();
    });

    // Click on Analytics tab
    fireEvent.click(screen.getByText('Analytics'));
    await waitFor(() => {
      expect(screen.getByTestId('user-analytics')).toBeInTheDocument();
    });

    // Click on Audit Log tab
    fireEvent.click(screen.getByText('Audit Log'));
    await waitFor(() => {
      expect(screen.getByTestId('user-audit-log')).toBeInTheDocument();
    });
  });

  it('handles refresh functionality', async () => {
    render(
      <TestWrapper>
        <UserDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });

    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    // Should show loading state temporarily
    expect(refreshButton).toBeInTheDocument();
  });

  it('displays export functionality for admins', async () => {
    render(
      <TestWrapper>
        <UserDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      const exportButton = screen.queryByText('Export Report');
      // Button should be present if user has admin permissions
      expect(exportButton).toBeInTheDocument();
    });
  });

  it('shows role distribution in overview tab', async () => {
    render(
      <TestWrapper>
        <UserDashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Role Distribution')).toBeInTheDocument();
      expect(screen.getByText('Dealership Distribution')).toBeInTheDocument();
    });
  });

  it('handles loading state appropriately', () => {
    // Mock loading state
    vi.mocked(require('@/hooks/useUserAudit').useUserAudit).mockReturnValue({
      auditEvents: [],
      loading: true,
      fetchAuditEvents: vi.fn(),
      logAuditEvent: vi.fn(),
      exportAuditLog: vi.fn(),
      pagination: { page: 1, limit: 50, total: 0 },
      setPagination: vi.fn()
    });

    render(
      <TestWrapper>
        <UserDashboard />
      </TestWrapper>
    );

    // Should show loading skeleton
    expect(screen.getByText('User Management')).toBeInTheDocument();
  });

  it('renders invitation management tab', async () => {
    render(
      <TestWrapper>
        <UserDashboard />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Invitations'));
    
    await waitFor(() => {
      expect(screen.getByTestId('invitation-management')).toBeInTheDocument();
    });
  });

  it('renders permission management tab', async () => {
    render(
      <TestWrapper>
        <UserDashboard />
      </TestWrapper>
    );

    fireEvent.click(screen.getByText('Permissions'));
    
    await waitFor(() => {
      expect(screen.getByTestId('permission-manager')).toBeInTheDocument();
    });
  });

  it('handles error states gracefully', async () => {
    // Mock error state
    vi.mocked(require('@/integrations/supabase/client').supabase.from).mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          is: () => ({
            gt: () => Promise.resolve({ data: null, error: { message: 'Test error' } })
          })
        })
      })
    }));

    render(
      <TestWrapper>
        <UserDashboard />
      </TestWrapper>
    );

    // Component should still render despite errors
    expect(screen.getByText('User Management')).toBeInTheDocument();
  });
});