/**
 * Security Tests for usePermissions Hook
 *
 * CRITICAL: These tests validate the fail-closed security model
 * where users should NOT have access to modules/permissions
 * unless explicitly granted.
 *
 * Bug History:
 * - v1.3.15: Fixed critical bug where unconfigured modules were
 *   granted by default (fail-open), allowing privilege escalation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePermissions } from '../usePermissions';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfileForPermissions } from '../useUserProfile';

// Mock dependencies
vi.mock('@/contexts/AuthContext');
vi.mock('../useUserProfile');
vi.mock('@/integrations/supabase/client');

describe('usePermissions - Security Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('Fail-Closed Security Model', () => {
    it('should DENY access to unconfigured modules (fail-closed)', async () => {
      // Arrange: User with partial role_module_access configuration
      const mockUser = { id: 'user-123', email: 'advisor@test.com' };
      const mockProfile = {
        id: 'user-123',
        email: 'advisor@test.com',
        role: 'user',
        dealership_id: 1,
        allowed_modules: []
      };

      vi.mocked(useAuth).mockReturnValue({
        user: mockUser,
        loading: false
      } as any);

      vi.mocked(useUserProfileForPermissions).mockReturnValue({
        data: mockProfile,
        isLoading: false
      } as any);

      // Mock RPC response with ONLY sales_orders configured
      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({
          data: [{
            roles: [{
              id: 'role-123',
              role_name: 'sales_advisor',
              display_name: 'Sales Advisor',
              dealer_id: 1
            }],
            system_permissions: [],
            module_permissions: [
              // User has delete_orders permission in sales_orders
              { role_id: 'role-123', module: 'sales_orders', permission_key: 'delete_orders' }
            ],
            module_access: [
              // Only sales_orders is configured
              { role_id: 'role-123', module: 'sales_orders', is_enabled: true }
              // ⚠️ service_orders, recon_orders, car_wash are NOT configured
            ],
            allowed_modules: []
          }],
          error: null
        })
      };

      // Act
      const { result } = renderHook(() => usePermissions(), { wrapper });

      await waitFor(() => expect(result.current.loading).toBe(false));

      // Assert: CRITICAL SECURITY CHECKS

      // ✅ Should ALLOW delete_orders on configured module
      expect(result.current.hasModulePermission('sales_orders', 'delete_orders')).toBe(true);

      // 🔒 Should DENY delete_orders on unconfigured modules (fail-closed)
      expect(result.current.hasModulePermission('service_orders', 'delete_orders')).toBe(false);
      expect(result.current.hasModulePermission('recon_orders', 'delete_orders')).toBe(false);
      expect(result.current.hasModulePermission('car_wash', 'delete_orders')).toBe(false);

      // 🔒 Should DENY canDeleteOrder for unconfigured order types
      const salesOrder = { dealer_id: 1, order_type: 'sales' };
      const serviceOrder = { dealer_id: 1, order_type: 'service' };
      const reconOrder = { dealer_id: 1, order_type: 'recon' };
      const carwashOrder = { dealer_id: 1, order_type: 'carwash' };

      expect(result.current.canDeleteOrder(salesOrder)).toBe(true);  // ✅ Configured
      expect(result.current.canDeleteOrder(serviceOrder)).toBe(false); // 🔒 Unconfigured
      expect(result.current.canDeleteOrder(reconOrder)).toBe(false);   // 🔒 Unconfigured
      expect(result.current.canDeleteOrder(carwashOrder)).toBe(false); // 🔒 Unconfigured
    });

    it('should DENY all access when no module_access configuration exists', async () => {
      // Arrange: User with role but NO role_module_access entries
      const mockUser = { id: 'user-456', email: 'newuser@test.com' };
      const mockProfile = {
        id: 'user-456',
        email: 'newuser@test.com',
        role: 'user',
        dealership_id: 1,
        allowed_modules: []
      };

      vi.mocked(useAuth).mockReturnValue({
        user: mockUser,
        loading: false
      } as any);

      vi.mocked(useUserProfileForPermissions).mockReturnValue({
        data: mockProfile,
        isLoading: false
      } as any);

      // Mock RPC response with permissions but NO module_access
      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({
          data: [{
            roles: [{
              id: 'role-456',
              role_name: 'incomplete_role',
              display_name: 'Incomplete Role',
              dealer_id: 1
            }],
            system_permissions: [],
            module_permissions: [
              { role_id: 'role-456', module: 'sales_orders', permission_key: 'delete_orders' }
            ],
            module_access: [], // ⚠️ NO configuration at all
            allowed_modules: []
          }],
          error: null
        })
      };

      // Act
      const { result } = renderHook(() => usePermissions(), { wrapper });

      await waitFor(() => expect(result.current.loading).toBe(false));

      // Assert: CRITICAL - Should DENY ALL access (fail-closed)
      expect(result.current.hasModulePermission('sales_orders', 'delete_orders')).toBe(false);
      expect(result.current.hasModulePermission('service_orders', 'delete_orders')).toBe(false);
      expect(result.current.hasModulePermission('recon_orders', 'delete_orders')).toBe(false);

      // Should DENY canDeleteOrder for all order types
      expect(result.current.canDeleteOrder({ dealer_id: 1, order_type: 'sales' })).toBe(false);
      expect(result.current.canDeleteOrder({ dealer_id: 1, order_type: 'service' })).toBe(false);
    });

    it('should respect explicitly disabled modules', async () => {
      // Arrange: User with module explicitly disabled
      const mockUser = { id: 'user-789', email: 'limited@test.com' };
      const mockProfile = {
        id: 'user-789',
        email: 'limited@test.com',
        role: 'user',
        dealership_id: 1,
        allowed_modules: []
      };

      vi.mocked(useAuth).mockReturnValue({
        user: mockUser,
        loading: false
      } as any);

      vi.mocked(useUserProfileForPermissions).mockReturnValue({
        data: mockProfile,
        isLoading: false
      } as any);

      // Mock RPC response with explicitly disabled module
      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({
          data: [{
            roles: [{
              id: 'role-789',
              role_name: 'limited_user',
              display_name: 'Limited User',
              dealer_id: 1
            }],
            system_permissions: [],
            module_permissions: [
              { role_id: 'role-789', module: 'sales_orders', permission_key: 'view_orders' },
              { role_id: 'role-789', module: 'sales_orders', permission_key: 'delete_orders' }
            ],
            module_access: [
              { role_id: 'role-789', module: 'sales_orders', is_enabled: false } // ⚠️ Explicitly disabled
            ],
            allowed_modules: []
          }],
          error: null
        })
      };

      // Act
      const { result } = renderHook(() => usePermissions(), { wrapper });

      await waitFor(() => expect(result.current.loading).toBe(false));

      // Assert: Should DENY access to explicitly disabled module
      expect(result.current.hasModulePermission('sales_orders', 'view_orders')).toBe(false);
      expect(result.current.hasModulePermission('sales_orders', 'delete_orders')).toBe(false);
      expect(result.current.canDeleteOrder({ dealer_id: 1, order_type: 'sales' })).toBe(false);
    });
  });

  describe('System Admin Bypass', () => {
    it('should grant full access to system_admin regardless of configuration', async () => {
      // Arrange: System admin user
      const mockUser = { id: 'admin-123', email: 'admin@test.com' };
      const mockProfile = {
        id: 'admin-123',
        email: 'admin@test.com',
        role: 'system_admin',
        dealership_id: null,
        allowed_modules: []
      };

      vi.mocked(useAuth).mockReturnValue({
        user: mockUser,
        loading: false
      } as any);

      vi.mocked(useUserProfileForPermissions).mockReturnValue({
        data: mockProfile,
        isLoading: false
      } as any);

      // Act
      const { result } = renderHook(() => usePermissions(), { wrapper });

      await waitFor(() => expect(result.current.loading).toBe(false));

      // Assert: System admin should have ALL permissions
      expect(result.current.enhancedUser?.is_system_admin).toBe(true);

      // Should have access to all modules
      expect(result.current.hasModulePermission('sales_orders', 'delete_orders')).toBe(true);
      expect(result.current.hasModulePermission('service_orders', 'delete_orders')).toBe(true);
      expect(result.current.hasModulePermission('recon_orders', 'delete_orders')).toBe(true);
      expect(result.current.hasModulePermission('car_wash', 'delete_orders')).toBe(true);

      // Should be able to delete all order types
      expect(result.current.canDeleteOrder({ dealer_id: 1, order_type: 'sales' })).toBe(true);
      expect(result.current.canDeleteOrder({ dealer_id: 1, order_type: 'service' })).toBe(true);
      expect(result.current.canDeleteOrder({ dealer_id: 1, order_type: 'recon' })).toBe(true);
      expect(result.current.canDeleteOrder({ dealer_id: 1, order_type: 'carwash' })).toBe(true);

      // Should have all system permissions
      expect(result.current.hasSystemPermission('manage_all_settings')).toBe(true);
      expect(result.current.hasSystemPermission('manage_users')).toBe(true);
      expect(result.current.hasSystemPermission('manage_dealerships')).toBe(true);
    });
  });

  describe('Regression Tests - Bug v1.3.15', () => {
    it('should NOT grant delete_orders to users without the permission (regression test)', async () => {
      // This test specifically validates the bug fix in v1.3.15
      // Previous bug: Users could delete orders even without permission checkbox

      const mockUser = { id: 'user-bug', email: 'bugtest@test.com' };
      const mockProfile = {
        id: 'user-bug',
        email: 'bugtest@test.com',
        role: 'user',
        dealership_id: 1,
        allowed_modules: []
      };

      vi.mocked(useAuth).mockReturnValue({
        user: mockUser,
        loading: false
      } as any);

      vi.mocked(useUserProfileForPermissions).mockReturnValue({
        data: mockProfile,
        isLoading: false
      } as any);

      // Mock: User has view/edit permissions but NOT delete_orders
      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({
          data: [{
            roles: [{
              id: 'role-bug',
              role_name: 'sales_advisor',
              display_name: 'Sales Advisor',
              dealer_id: 1
            }],
            system_permissions: [],
            module_permissions: [
              { role_id: 'role-bug', module: 'sales_orders', permission_key: 'view_orders' },
              { role_id: 'role-bug', module: 'sales_orders', permission_key: 'edit_orders' }
              // ⚠️ NO delete_orders permission
            ],
            module_access: [
              { role_id: 'role-bug', module: 'sales_orders', is_enabled: true }
            ],
            allowed_modules: []
          }],
          error: null
        })
      };

      // Act
      const { result } = renderHook(() => usePermissions(), { wrapper });

      await waitFor(() => expect(result.current.loading).toBe(false));

      // Assert: CRITICAL - Should NOT have delete permission
      expect(result.current.hasModulePermission('sales_orders', 'view_orders')).toBe(true);
      expect(result.current.hasModulePermission('sales_orders', 'edit_orders')).toBe(true);
      expect(result.current.hasModulePermission('sales_orders', 'delete_orders')).toBe(false); // 🔒 BUG FIX

      // Should NOT be able to delete orders
      const order = { dealer_id: 1, order_type: 'sales', status: 'pending' };
      expect(result.current.canDeleteOrder(order)).toBe(false); // 🔒 BUG FIX
    });
  });
});
