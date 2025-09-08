import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';

// Mock the Auth context
vi.mock('@/contexts/AuthContext');
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
  },
}));

const mockUseAuth = useAuth as any;
const mockSupabase = require('@/integrations/supabase/client').supabase;

describe('usePermissions Hook', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
  };

  const mockPermissions = [
    { module: 'dashboard', permission_level: 'read' },
    { module: 'sales_orders', permission_level: 'write' },
    { module: 'users', permission_level: 'admin' },
  ];

  const mockRoles = [
    {
      role_id: 'role-1',
      role_name: 'dealer_salesperson',
      display_name: 'Salesperson',
      user_type: 'dealer',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: mockUser });
  });

  it('should fetch permissions and roles on mount', async () => {
    mockSupabase.rpc
      .mockResolvedValueOnce({ data: mockPermissions, error: null })
      .mockResolvedValueOnce({ data: mockRoles, error: null });

    const { result } = renderHook(() => usePermissions());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.permissions).toEqual(mockPermissions);
    expect(result.current.roles).toEqual(mockRoles);
  });

  it('should check permissions correctly', async () => {
    mockSupabase.rpc
      .mockResolvedValueOnce({ data: mockPermissions, error: null })
      .mockResolvedValueOnce({ data: mockRoles, error: null });

    const { result } = renderHook(() => usePermissions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Test permission levels
    expect(result.current.hasPermission('dashboard', 'read')).toBe(true);
    expect(result.current.hasPermission('dashboard', 'write')).toBe(false);
    expect(result.current.hasPermission('sales_orders', 'read')).toBe(true);
    expect(result.current.hasPermission('sales_orders', 'write')).toBe(true);
    expect(result.current.hasPermission('users', 'admin')).toBe(true);
  });

  it('should handle no user gracefully', async () => {
    mockUseAuth.mockReturnValue({ user: null });

    const { result } = renderHook(() => usePermissions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.permissions).toEqual([]);
    expect(result.current.roles).toEqual([]);
    expect(result.current.hasPermission('dashboard', 'read')).toBe(false);
  });

  it('should handle API errors gracefully', async () => {
    mockSupabase.rpc
      .mockResolvedValueOnce({ data: null, error: { message: 'Permission error' } })
      .mockResolvedValueOnce({ data: null, error: { message: 'Role error' } });

    const { result } = renderHook(() => usePermissions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.permissions).toEqual([]);
    expect(result.current.roles).toEqual([]);
  });

  it('should assign role correctly', async () => {
    mockSupabase.rpc
      .mockResolvedValueOnce({ data: mockPermissions, error: null })
      .mockResolvedValueOnce({ data: mockRoles, error: null })
      .mockResolvedValueOnce({ data: true, error: null });

    const { result } = renderHook(() => usePermissions());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const assignResult = await result.current.assignRole('user-id', 'dealer_manager');
    
    expect(assignResult.success).toBe(true);
    expect(mockSupabase.rpc).toHaveBeenCalledWith('assign_role', {
      target_user_id: 'user-id',
      role_name: 'dealer_manager',
      expires_at: null,
    });
  });
});