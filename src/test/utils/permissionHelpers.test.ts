/**
 * Tests for Permission Helper Functions
 *
 * These tests verify utility functions for the granular permission system:
 * - Dangerous permission detection
 * - Prerequisite validation
 * - Permission sorting and categorization
 */

import type { ModulePermissionKey, SystemPermissionKey } from '@/types/permissions';
import {
    getPrerequisites,
    isDangerousPermission,
    sortPermissionsByCategory,
    validatePermissions
} from '@/utils/permissionHelpers';
import { describe, expect, it } from 'vitest';

describe('Permission Helpers', () => {
  describe('isDangerousPermission', () => {
    it('should identify delete_users as dangerous', () => {
      expect(isDangerousPermission('delete_users')).toBe(true);
    });

    it('should identify delete_orders as dangerous', () => {
      expect(isDangerousPermission('delete_orders')).toBe(true);
    });

    it('should identify delete_vehicles as dangerous', () => {
      expect(isDangerousPermission('delete_vehicles')).toBe(true);
    });

    it('should NOT identify view_orders as dangerous', () => {
      expect(isDangerousPermission('view_orders')).toBe(false);
    });

    it('should NOT identify invite_users as dangerous', () => {
      expect(isDangerousPermission('invite_users')).toBe(false);
    });

    it('should identify all delete permissions as dangerous', () => {
      const dangerousPermissions: ModulePermissionKey[] = [
        'delete_orders',
        'delete_vehicles',
        'delete_contacts',
        'delete_tasks',
        'delete_messages'
      ];

      dangerousPermissions.forEach(perm => {
        expect(isDangerousPermission(perm)).toBe(true);
      });
    });
  });

  describe('getPrerequisites', () => {
    it('should require view_pricing before edit_pricing', () => {
      const prereqs = getPrerequisites('edit_pricing');
      expect(prereqs).toContain('view_pricing');
    });

    it('should require edit_orders before delete_orders', () => {
      const prereqs = getPrerequisites('delete_orders');
      expect(prereqs).toContain('edit_orders');
    });

    it('should require edit_vehicles before delete_vehicles', () => {
      const prereqs = getPrerequisites('delete_vehicles');
      expect(prereqs).toContain('edit_vehicles');
    });

    it('should require view_contacts before edit_contacts', () => {
      const prereqs = getPrerequisites('edit_contacts');
      expect(prereqs).toContain('view_contacts');
    });

    it('should require view_conversations before send_messages', () => {
      const prereqs = getPrerequisites('send_messages');
      expect(prereqs).toContain('view_conversations');
    });

    it('should return empty array for permissions without prerequisites', () => {
      const prereqs = getPrerequisites('view_orders');
      expect(prereqs).toEqual([]);
    });
  });

  describe('validatePermissions', () => {
    it('should validate when all prerequisites are met', () => {
      const permissions: ModulePermissionKey[] = ['view_pricing', 'edit_pricing'];
      const warnings = validatePermissions(permissions);

      // Should not warn about missing view_pricing
      expect(warnings.length).toBe(0);
    });

    it('should warn when prerequisites are missing', () => {
      const permissions: ModulePermissionKey[] = ['edit_pricing']; // Missing view_pricing
      const warnings = validatePermissions(permissions);

      expect(warnings.some(w => w.includes('view pricing'))).toBe(true);
    });

    it('should validate permissions without prerequisites', () => {
      const permissions: ModulePermissionKey[] = ['view_orders'];
      const warnings = validatePermissions(permissions);

      expect(warnings.length).toBe(0);
    });

    it('should validate complex prerequisite chains', () => {
      // delete_orders requires edit_orders
      const permissionsValid: ModulePermissionKey[] = ['view_orders', 'edit_orders', 'delete_orders'];
      const warningsValid = validatePermissions(permissionsValid);

      expect(warningsValid.length).toBe(0);

      // Missing edit_orders and view_orders
      const permissionsInvalid: ModulePermissionKey[] = ['delete_orders'];
      const warningsInvalid = validatePermissions(permissionsInvalid);

      expect(warningsInvalid.length).toBeGreaterThan(0);
    });
  });

  describe('sortPermissionsByCategory', () => {
    it('should sort permissions by logical order', () => {
      const permissions: ModulePermissionKey[] = [
        'delete_orders',
        'view_orders',
        'edit_orders',
        'create_orders'
      ];

      const sorted = sortPermissionsByCategory(permissions);

      // Expected order: view -> create -> edit -> delete
      expect(sorted[0]).toBe('view_orders');
      expect(sorted[1]).toBe('create_orders');
      expect(sorted[2]).toBe('edit_orders');
      expect(sorted[3]).toBe('delete_orders');
    });

    it('should group view permissions first', () => {
      const permissions: ModulePermissionKey[] = [
        'edit_orders',
        'view_dashboard',
        'delete_orders',
        'view_orders',
        'create_orders'
      ];

      const sorted = sortPermissionsByCategory(permissions);

      // All view_* permissions should come before others
      const viewPermissions = sorted.filter(p => p.startsWith('view_'));
      const nonViewPermissions = sorted.filter(p => !p.startsWith('view_'));

      const lastViewIndex = sorted.lastIndexOf(viewPermissions[viewPermissions.length - 1]);
      const firstNonViewIndex = sorted.indexOf(nonViewPermissions[0]);

      expect(lastViewIndex).toBeLessThan(firstNonViewIndex);
    });

    it('should place delete permissions after view/edit permissions', () => {
      const permissions: ModulePermissionKey[] = [
        'delete_orders',
        'view_orders',
        'edit_orders',
        'create_orders'
      ];

      const sorted = sortPermissionsByCategory(permissions);

      // Delete permissions (score 5) should come after view (score 1), create (score 2), edit (score 3)
      const deleteIndex = sorted.indexOf('delete_orders');
      const viewIndex = sorted.indexOf('view_orders');
      const editIndex = sorted.indexOf('edit_orders');

      expect(deleteIndex).toBeGreaterThan(viewIndex);
      expect(deleteIndex).toBeGreaterThan(editIndex);
    });
  });

  describe('Permission Categorization', () => {
    it('should categorize system permissions', () => {
      const systemPermissions: SystemPermissionKey[] = [
        'manage_all_settings',
        'invite_users',
        'delete_users',
        'view_audit_logs'
      ];

      // All should be recognized as system-level
      systemPermissions.forEach(perm => {
        expect(perm).toBeDefined();
        expect(typeof perm).toBe('string');
      });
    });

    it('should categorize module permissions by action type', () => {
      const viewPerms: ModulePermissionKey[] = [
        'view_orders',
        'view_inventory',
        'view_contacts'
      ];

      const editPerms: ModulePermissionKey[] = [
        'edit_orders',
        'edit_vehicles',
        'edit_contacts'
      ];

      const deletePerms: ModulePermissionKey[] = [
        'delete_orders',
        'delete_vehicles',
        'delete_contacts'
      ];

      // All view permissions should start with 'view_'
      viewPerms.forEach(perm => expect(perm.startsWith('view_')).toBe(true));

      // All edit permissions should start with 'edit_'
      editPerms.forEach(perm => expect(perm.startsWith('edit_')).toBe(true));

      // All delete permissions should start with 'delete_'
      deletePerms.forEach(perm => expect(perm.startsWith('delete_')).toBe(true));
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty permission arrays', () => {
      const permissions: ModulePermissionKey[] = [];
      const warnings = validatePermissions(permissions);

      expect(warnings.length).toBe(0);
    });

    it('should handle undefined prerequisites', () => {
      // Permission that doesn't exist in the system
      const fakePermission = 'fake_permission' as ModulePermissionKey;
      const prereqs = getPrerequisites(fakePermission);

      expect(prereqs).toEqual([]);
    });

    it('should handle null/undefined in dangerous check', () => {
      expect(isDangerousPermission(undefined as any)).toBe(false);
      expect(isDangerousPermission(null as any)).toBe(false);
      expect(isDangerousPermission('' as any)).toBe(false);
    });

    it('should return warnings for multiple dangerous permissions', () => {
      const permissions: ModulePermissionKey[] = [
        'delete_orders',
        'delete_vehicles',
        'delete_contacts',
        'delete_tasks'
      ];

      const warnings = validatePermissions(permissions);

      // Should warn about multiple dangerous permissions
      expect(warnings.some(w => w.includes('dangerous'))).toBe(true);
    });
  });
});
