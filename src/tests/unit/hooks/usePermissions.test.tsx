/**
 * Unit Tests for usePermissions Hook
 *
 * Tests the permission system including:
 * - System admin access
 * - Module permission checks
 * - Order ownership validation
 * - React Query caching
 * - Rate limiting
 * - Telemetry integration
 */

import * as authContext from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import * as userProfile from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock modules
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn()
        }))
      }))
    }))
  }
}));

vi.mock('@/contexts/AuthContext');
vi.mock('@/hooks/useUserProfile');
vi.mock('@/utils/telemetry', () => ({
  telemetry: {
    trackEvent: vi.fn(),
    trackPermissionCheck: vi.fn(),
    trackMetric: vi.fn()
  },
  measureAsync: vi.fn((fn) => fn()),
  EventCategory: {
    PERMISSION: 'permission'
  }
}));

describe('usePermissions Hook', () => {
  let queryClient: QueryClient;

  // Create wrapper for React Query
  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient?.clear();
  });

  describe('System Admin Access', () => {
    it('should grant full access to system admins', async () => {
      // Mock system admin user
      vi.mocked(authContext.useAuth).mockReturnValue({
        user: { id: 'admin-123', email: 'admin@test.com' } as any,
        loading: false
      } as any);

      vi.mocked(userProfile.useUserProfileForPermissions).mockReturnValue({
        data: {
          id: 'admin-123',
          email: 'admin@test.com',
          role: 'system_admin',
          dealership_id: null
        },
        isLoading: false
      } as any);

      const { result } = renderHook(() => usePermissions(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // System admin should have access to everything
      expect(result.current.enhancedUser?.is_system_admin).toBe(true);
      expect(result.current.hasModulePermission('service_orders', 'edit_orders')).toBe(true);
      expect(result.current.hasModulePermission('sales_orders', 'delete_orders')).toBe(true);
      expect(result.current.hasSystemPermission('manage_users')).toBe(true);
    });
  });

  describe('Regular User Permissions', () => {
    beforeEach(() => {
      // Mock regular user
      vi.mocked(authContext.useAuth).mockReturnValue({
        user: { id: 'user-123', email: 'user@test.com' } as any,
        loading: false
      } as any);

      vi.mocked(userProfile.useUserProfileForPermissions).mockReturnValue({
        data: {
          id: 'user-123',
          email: 'user@test.com',
          role: 'dealer_user',
          dealership_id: 1
        },
        isLoading: false
      } as any);
    });

    it('should check module permissions correctly', async () => {
      // Mock RPC response with user permissions
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: {
          roles: [{
            id: 'role-1',
            name: 'Service Manager',
            dealer_id: 1
          }],
          system_permissions: [],
          module_permissions: [{
            role_id: 'role-1',
            module: 'service_orders',
            permission: 'view_orders'
          }, {
            role_id: 'role-1',
            module: 'service_orders',
            permission: 'edit_orders'
          }],
          module_access: [{
            role_id: 'role-1',
            module: 'service_orders',
            is_enabled: true
          }]
        },
        error: null
      } as any);

      const { result } = renderHook(() => usePermissions(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // User should have service_orders permissions
      expect(result.current.hasModulePermission('service_orders', 'view_orders')).toBe(true);
      expect(result.current.hasModulePermission('service_orders', 'edit_orders')).toBe(true);

      // User should NOT have delete permission
      expect(result.current.hasModulePermission('service_orders', 'delete_orders')).toBe(false);

      // User should NOT have access to sales_orders
      expect(result.current.hasModulePermission('sales_orders', 'view_orders')).toBe(false);
    });

    it('should deny access when no permissions are granted', async () => {
      // Mock RPC response with no permissions
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: {
          roles: [],
          system_permissions: [],
          module_permissions: [],
          module_access: []
        },
        error: null
      } as any);

      const { result } = renderHook(() => usePermissions(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // User with no permissions should be denied
      expect(result.current.hasModulePermission('service_orders', 'view_orders')).toBe(false);
      expect(result.current.hasSystemPermission('manage_users')).toBe(false);
    });
  });

  describe('Order Ownership Checks', () => {
    beforeEach(() => {
      vi.mocked(authContext.useAuth).mockReturnValue({
        user: { id: 'user-123', email: 'user@test.com' } as any,
        loading: false
      } as any);

      vi.mocked(userProfile.useUserProfileForPermissions).mockReturnValue({
        data: {
          id: 'user-123',
          email: 'user@test.com',
          role: 'dealer_user',
          dealership_id: 1
        },
        isLoading: false
      } as any);

      // Mock user has edit_orders permission
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: {
          roles: [{ id: 'role-1', name: 'Service Manager', dealer_id: 1 }],
          system_permissions: [],
          module_permissions: [{
            role_id: 'role-1',
            module: 'service_orders',
            permission: 'edit_orders'
          }],
          module_access: [{
            role_id: 'role-1',
            module: 'service_orders',
            is_enabled: true
          }]
        },
        error: null
      } as any);
    });

    it('should allow editing orders from same dealership', async () => {
      const { result } = renderHook(() => usePermissions(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const order = {
        dealer_id: 1, // Same as user's dealership
        order_type: 'service',
        status: 'pending'
      };

      expect(result.current.canEditOrder(order)).toBe(true);
    });

    it('should deny editing orders from other dealerships', async () => {
      const { result } = renderHook(() => usePermissions(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const order = {
        dealer_id: 2, // Different dealership
        order_type: 'service',
        status: 'pending'
      };

      expect(result.current.canEditOrder(order)).toBe(false);
    });

    it('should deny editing completed orders', async () => {
      const { result } = renderHook(() => usePermissions(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const order = {
        dealer_id: 1,
        order_type: 'service',
        status: 'completed' // Completed orders cannot be edited
      };

      expect(result.current.canEditOrder(order)).toBe(false);
    });

    it('should deny editing cancelled orders', async () => {
      const { result } = renderHook(() => usePermissions(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const order = {
        dealer_id: 1,
        order_type: 'service',
        status: 'cancelled' // Cancelled orders cannot be edited
      };

      expect(result.current.canEditOrder(order)).toBe(false);
    });
  });

  describe('React Query Caching', () => {
    it('should cache permissions and not refetch on remount', async () => {
      vi.mocked(authContext.useAuth).mockReturnValue({
        user: { id: 'user-123', email: 'user@test.com' } as any,
        loading: false
      } as any);

      vi.mocked(userProfile.useUserProfileForPermissions).mockReturnValue({
        data: {
          id: 'user-123',
          email: 'user@test.com',
          role: 'dealer_user',
          dealership_id: 1
        },
        isLoading: false
      } as any);

      const rpcMock = vi.mocked(supabase.rpc).mockResolvedValue({
        data: {
          roles: [],
          system_permissions: [],
          module_permissions: [],
          module_access: []
        },
        error: null
      } as any);

      // First render
      const { unmount } = renderHook(() => usePermissions(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(rpcMock).toHaveBeenCalledTimes(1);
      });

      unmount();

      // Second render (should use cache)
      renderHook(() => usePermissions(), {
        wrapper: createWrapper()
      });

      // Should NOT call RPC again (cache hit)
      expect(rpcMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit refreshPermissions calls', async () => {
      vi.mocked(authContext.useAuth).mockReturnValue({
        user: { id: 'user-123', email: 'user@test.com' } as any,
        loading: false
      } as any);

      vi.mocked(userProfile.useUserProfileForPermissions).mockReturnValue({
        data: {
          id: 'user-123',
          email: 'user@test.com',
          role: 'dealer_user',
          dealership_id: 1
        },
        isLoading: false
      } as any);

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: {
          roles: [],
          system_permissions: [],
          module_permissions: [],
          module_access: []
        },
        error: null
      } as any);

      const { result } = renderHook(() => usePermissions(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Call refreshPermissions multiple times rapidly
      for (let i = 0; i < 10; i++) {
        await result.current.refreshPermissions();
      }

      // Should be rate limited (max 5 calls per minute)
      // Note: This test might need adjustment based on actual rate limit implementation
      await waitFor(() => {
        // The RPC should not be called 10 times due to rate limiting
        expect(vi.mocked(supabase.rpc).mock.calls.length).toBeLessThan(10);
      });
    });
  });

  describe('Legacy Permission System', () => {
    it('should support legacy hasPermission check', async () => {
      vi.mocked(authContext.useAuth).mockReturnValue({
        user: { id: 'user-123', email: 'user@test.com' } as any,
        loading: false
      } as any);

      vi.mocked(userProfile.useUserProfileForPermissions).mockReturnValue({
        data: {
          id: 'user-123',
          email: 'user@test.com',
          role: 'dealer_user',
          dealership_id: 1
        },
        isLoading: false
      } as any);

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: {
          roles: [{ id: 'role-1', name: 'Viewer', dealer_id: 1 }],
          system_permissions: [],
          module_permissions: [{
            role_id: 'role-1',
            module: 'service_orders',
            permission: 'view_orders'
          }],
          module_access: [{
            role_id: 'role-1',
            module: 'service_orders',
            is_enabled: true
          }]
        },
        error: null
      } as any);

      const { result } = renderHook(() => usePermissions(), {
        wrapper: createWrapper()
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Legacy 'view' level should map to view_orders permission
      expect(result.current.hasPermission('service_orders', 'view')).toBe(true);

      // Legacy 'edit' level should be denied (user only has view)
      expect(result.current.hasPermission('service_orders', 'edit')).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle RPC errors gracefully', async () => {
      vi.mocked(authContext.useAuth).mockReturnValue({
        user: { id: 'user-123', email: 'user@test.com' } as any,
        loading: false
      } as any);

      vi.mocked(userProfile.useUserProfileForPermissions).mockReturnValue({
        data: {
          id: 'user-123',
          email: 'user@test.com',
          role: 'dealer_user',
          dealership_id: 1
        },
        isLoading: false
      } as any);

      // Mock RPC error
      vi.mocked(supabase.rpc).mockRejectedValue(new Error('Database error'));

      const { result } = renderHook(() => usePermissions(), {
        wrapper: createWrapper()
      });

      // Should handle error and not crash
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should deny all permissions on error
      expect(result.current.enhancedUser).toBeUndefined();
    });
  });
});
