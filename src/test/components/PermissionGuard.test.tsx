import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '../utils/test-utils';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { usePermissions } from '@/hooks/usePermissions';

// Mock the usePermissions hook
vi.mock('@/hooks/usePermissions');

const mockUsePermissions = usePermissions as any;

describe('PermissionGuard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state when permissions are loading', () => {
    mockUsePermissions.mockReturnValue({
      hasPermission: vi.fn(),
      loading: true,
    });

    const { container } = render(
      <PermissionGuard module="dashboard" permission="read">
        <div>Protected Content</div>
      </PermissionGuard>
    );

    const loadingElement = container.querySelector('.animate-pulse');
    expect(loadingElement).toBeInTheDocument();
  });

  it('renders children when user has required permission', () => {
    mockUsePermissions.mockReturnValue({
      hasPermission: vi.fn().mockReturnValue(true),
      loading: false,
    });

    const { getByText } = render(
      <PermissionGuard module="dashboard" permission="read">
        <div>Protected Content</div>
      </PermissionGuard>
    );

    expect(getByText('Protected Content')).toBeInTheDocument();
  });

  it('renders fallback when user lacks permission', () => {
    mockUsePermissions.mockReturnValue({
      hasPermission: vi.fn().mockReturnValue(false),
      loading: false,
    });

    const { getByText, queryByText } = render(
      <PermissionGuard 
        module="dashboard" 
        permission="admin" 
        fallback={<div>Access Denied</div>}
      >
        <div>Protected Content</div>
      </PermissionGuard>
    );

    expect(getByText('Access Denied')).toBeInTheDocument();
    expect(queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders nothing when no fallback and no permission', () => {
    mockUsePermissions.mockReturnValue({
      hasPermission: vi.fn().mockReturnValue(false),
      loading: false,
    });

    const { container } = render(
      <PermissionGuard module="dashboard" permission="admin">
        <div>Protected Content</div>
      </PermissionGuard>
    );

    expect(container.firstChild).toBeNull();
  });

  it('checks permission with correct parameters', () => {
    const mockHasPermission = vi.fn().mockReturnValue(true);
    mockUsePermissions.mockReturnValue({
      hasPermission: mockHasPermission,
      loading: false,
    });

    render(
      <PermissionGuard module="sales_orders" permission="write">
        <div>Protected Content</div>
      </PermissionGuard>
    );

    expect(mockHasPermission).toHaveBeenCalledWith('sales_orders', 'write');
  });
});