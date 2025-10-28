/**
 * ✅ PHASE 5.2: Unit Tests for Permission Serialization
 *
 * Tests that validate the Map/Set serialization logic works correctly
 * and handles edge cases gracefully.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  serializePermissions,
  deserializePermissions,
  cachePermissions,
  getCachedPermissions,
  clearPermissionsCache,
  getPermissionCacheStats
} from '../permissionSerialization';
import type { EnhancedUserGranular } from '@/types/permissions';

describe('Permission Serialization', () => {
  // Mock user data
  const mockUser: EnhancedUserGranular = {
    id: 'test-user-123',
    email: 'test@example.com',
    dealership_id: 1,
    is_system_admin: false,
    is_manager: true,
    system_permissions: new Set(['view_system_settings', 'manage_users']),
    module_permissions: new Map([
      ['dashboard', new Set(['view', 'edit'])],
      ['sales_orders', new Set(['view', 'create', 'edit', 'delete'])],
      ['contacts', new Set(['view', 'create'])]
    ]),
    custom_roles: [
      { role_id: 1, role_name: 'Manager', dealership_id: 1 }
    ]
  };

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    // Clean up after each test
    localStorage.clear();
  });

  describe('serializePermissions', () => {
    it('should convert Set to Array for system_permissions', () => {
      const serialized = serializePermissions(mockUser);

      expect(Array.isArray(serialized.system_permissions)).toBe(true);
      expect(serialized.system_permissions).toContain('view_system_settings');
      expect(serialized.system_permissions).toContain('manage_users');
    });

    it('should convert Map<string, Set> to Array for module_permissions', () => {
      const serialized = serializePermissions(mockUser);

      expect(Array.isArray(serialized.module_permissions)).toBe(true);
      expect(serialized.module_permissions.length).toBe(3);

      // Check structure: [[module, [permissions]]]
      const dashboardEntry = serialized.module_permissions.find(([m]) => m === 'dashboard');
      expect(dashboardEntry).toBeDefined();
      expect(Array.isArray(dashboardEntry![1])).toBe(true);
      expect(dashboardEntry![1]).toContain('view');
      expect(dashboardEntry![1]).toContain('edit');
    });

    it('should include metadata (cached_at, version)', () => {
      const serialized = serializePermissions(mockUser);

      expect(serialized).toHaveProperty('cached_at');
      expect(typeof serialized.cached_at).toBe('number');
      expect(serialized).toHaveProperty('version');
      expect(serialized.version).toBe(1);
    });

    it('should preserve user data intact', () => {
      const serialized = serializePermissions(mockUser);

      expect(serialized.id).toBe(mockUser.id);
      expect(serialized.email).toBe(mockUser.email);
      expect(serialized.dealership_id).toBe(mockUser.dealership_id);
      expect(serialized.is_system_admin).toBe(mockUser.is_system_admin);
      expect(serialized.is_manager).toBe(mockUser.is_manager);
      expect(serialized.custom_roles).toEqual(mockUser.custom_roles);
    });
  });

  describe('deserializePermissions', () => {
    it('should convert Array back to Set for system_permissions', () => {
      const serialized = serializePermissions(mockUser);
      const deserialized = deserializePermissions(serialized);

      expect(deserialized).not.toBeNull();
      expect(deserialized!.system_permissions instanceof Set).toBe(true);
      expect(deserialized!.system_permissions.has('view_system_settings')).toBe(true);
      expect(deserialized!.system_permissions.has('manage_users')).toBe(true);
    });

    it('should convert Array back to Map<string, Set> for module_permissions', () => {
      const serialized = serializePermissions(mockUser);
      const deserialized = deserializePermissions(serialized);

      expect(deserialized).not.toBeNull();
      expect(deserialized!.module_permissions instanceof Map).toBe(true);

      const dashboardPerms = deserialized!.module_permissions.get('dashboard');
      expect(dashboardPerms instanceof Set).toBe(true);
      expect(dashboardPerms!.has('view')).toBe(true);
      expect(dashboardPerms!.has('edit')).toBe(true);
    });

    it('should return null for expired cache (TTL exceeded)', () => {
      const serialized = serializePermissions(mockUser);

      // Set cached_at to 10 minutes ago (exceeds 5-minute TTL)
      serialized.cached_at = Date.now() - (10 * 60 * 1000);

      const deserialized = deserializePermissions(serialized);
      expect(deserialized).toBeNull();
    });

    it('should return null for version mismatch', () => {
      const serialized = serializePermissions(mockUser);

      // Change version
      serialized.version = 999;

      const deserialized = deserializePermissions(serialized);
      expect(deserialized).toBeNull();
    });

    it('should handle deserialization errors gracefully', () => {
      const invalidData: any = {
        id: 'test',
        version: 1,
        cached_at: Date.now(),
        system_permissions: 'invalid', // Should be array
        module_permissions: 'invalid' // Should be array
      };

      const deserialized = deserializePermissions(invalidData);
      expect(deserialized).toBeNull();
    });
  });

  describe('cachePermissions', () => {
    it('should save permissions to localStorage', () => {
      cachePermissions(mockUser);

      const cached = localStorage.getItem('permissions_cache_v1');
      expect(cached).not.toBeNull();

      const parsed = JSON.parse(cached!);
      expect(parsed.id).toBe(mockUser.id);
      expect(parsed.email).toBe(mockUser.email);
    });

    it('should handle localStorage quota errors gracefully', () => {
      // Mock localStorage.setItem to throw quota error
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error('QuotaExceededError');
      });

      // Should not throw
      expect(() => cachePermissions(mockUser)).not.toThrow();

      // Restore original
      Storage.prototype.setItem = originalSetItem;
    });
  });

  describe('getCachedPermissions', () => {
    it('should retrieve cached permissions from localStorage', () => {
      cachePermissions(mockUser);

      const retrieved = getCachedPermissions(mockUser.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(mockUser.id);
      expect(retrieved!.system_permissions instanceof Set).toBe(true);
      expect(retrieved!.module_permissions instanceof Map).toBe(true);
    });

    it('should return null if no cache exists', () => {
      const retrieved = getCachedPermissions('non-existent-user');
      expect(retrieved).toBeNull();
    });

    it('should return null if user ID mismatch', () => {
      cachePermissions(mockUser);

      const retrieved = getCachedPermissions('different-user-id');
      expect(retrieved).toBeNull();
    });

    it('should clear cache if user ID mismatch detected', () => {
      cachePermissions(mockUser);

      // Try to get with wrong user ID
      getCachedPermissions('wrong-user');

      // Cache should be cleared
      const cached = localStorage.getItem('permissions_cache_v1');
      expect(cached).toBeNull();
    });

    it('should handle corrupted cache gracefully', () => {
      // Set corrupted JSON
      localStorage.setItem('permissions_cache_v1', 'invalid json{');

      const retrieved = getCachedPermissions(mockUser.id);
      expect(retrieved).toBeNull();

      // Cache should be cleared
      const cached = localStorage.getItem('permissions_cache_v1');
      expect(cached).toBeNull();
    });
  });

  describe('clearPermissionsCache', () => {
    it('should remove cache from localStorage', () => {
      cachePermissions(mockUser);

      // Verify cache exists
      expect(localStorage.getItem('permissions_cache_v1')).not.toBeNull();

      clearPermissionsCache();

      // Verify cache is cleared
      expect(localStorage.getItem('permissions_cache_v1')).toBeNull();
    });

    it('should handle missing cache gracefully', () => {
      // Should not throw even if cache doesn't exist
      expect(() => clearPermissionsCache()).not.toThrow();
    });
  });

  describe('getPermissionCacheStats', () => {
    it('should return stats for existing cache', () => {
      cachePermissions(mockUser);

      const stats = getPermissionCacheStats(mockUser.id);

      expect(stats.exists).toBe(true);
      expect(stats.valid).toBe(true);
      expect(stats.age).toBeLessThan(1000); // Should be very recent
      expect(stats.version).toBe(1);
      expect(stats.userId).toBe(mockUser.id);
    });

    it('should indicate invalid cache for wrong user', () => {
      cachePermissions(mockUser);

      const stats = getPermissionCacheStats('different-user');

      expect(stats.exists).toBe(true);
      expect(stats.valid).toBe(false);
      expect(stats.reason).toContain('User ID mismatch');
    });

    it('should indicate no cache exists', () => {
      const stats = getPermissionCacheStats('non-existent');

      expect(stats.exists).toBe(false);
      expect(stats.valid).toBe(false);
      expect(stats.reason).toBe('No cache found');
    });

    it('should indicate expired cache', () => {
      const serialized = serializePermissions(mockUser);
      serialized.cached_at = Date.now() - (10 * 60 * 1000); // 10 minutes old
      localStorage.setItem('permissions_cache_v1', JSON.stringify(serialized));

      const stats = getPermissionCacheStats(mockUser.id);

      expect(stats.exists).toBe(true);
      expect(stats.valid).toBe(false);
      expect(stats.reason).toBe('Expired');
    });
  });

  describe('Round-trip serialization', () => {
    it('should preserve data through serialize → deserialize cycle', () => {
      const serialized = serializePermissions(mockUser);
      const deserialized = deserializePermissions(serialized);

      expect(deserialized).not.toBeNull();
      expect(deserialized!.id).toBe(mockUser.id);
      expect(deserialized!.email).toBe(mockUser.email);

      // Check system permissions
      expect(deserialized!.system_permissions.size).toBe(mockUser.system_permissions.size);
      mockUser.system_permissions.forEach(perm => {
        expect(deserialized!.system_permissions.has(perm)).toBe(true);
      });

      // Check module permissions
      expect(deserialized!.module_permissions.size).toBe(mockUser.module_permissions.size);
      mockUser.module_permissions.forEach((perms, module) => {
        const deserializedPerms = deserialized!.module_permissions.get(module);
        expect(deserializedPerms).toBeDefined();
        expect(deserializedPerms!.size).toBe(perms.size);
        perms.forEach(perm => {
          expect(deserializedPerms!.has(perm)).toBe(true);
        });
      });
    });
  });
});
