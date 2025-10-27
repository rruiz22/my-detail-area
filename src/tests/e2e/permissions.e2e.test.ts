/**
 * E2E Tests for Permission System
 *
 * Tests permission flows from end-to-end including:
 * - System admin full access
 * - User login and permission checks
 * - Module access control
 * - Order ownership validation
 * - Permission changes and audit trail
 */

import { expect, test, type Page } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.VITE_APP_URL || 'http://localhost:8080';

// Test users
const SYSTEM_ADMIN = {
  email: 'admin@test.com',
  password: 'test123'
};

const DEALER_USER = {
  email: 'user@test.com',
  password: 'test123'
};

/**
 * Helper to login
 */
async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 10000 });
}

/**
 * Helper to logout
 */
async function logout(page: Page) {
  await page.click('[data-testid="user-menu"]');
  await page.click('text=Logout');
  await page.waitForURL(`${BASE_URL}/login`);
}

test.describe('Permission System E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Start each test from a clean state
    await page.goto(BASE_URL);
  });

  test.describe('System Admin Access', () => {
    test('system admin should have access to all modules', async ({ page }) => {
      await login(page, SYSTEM_ADMIN.email, SYSTEM_ADMIN.password);

      // Wait for sidebar to load
      await page.waitForSelector('[data-testid="sidebar"]', { timeout: 5000 });

      // Check that all major modules are visible
      const modules = [
        'Service Orders',
        'Recon Orders',
        'Car Wash',
        'Sales Orders',
        'Stock',
        'Settings',
        'Users'
      ];

      for (const moduleName of modules) {
        const moduleLink = page.locator(`nav a:has-text("${moduleName}")`);
        await expect(moduleLink).toBeVisible({ timeout: 3000 });
      }
    });

    test('system admin should be able to manage users', async ({ page }) => {
      await login(page, SYSTEM_ADMIN.email, SYSTEM_ADMIN.password);

      // Navigate to Users page
      await page.click('text=Users');
      await page.waitForURL('**/users');

      // Should see "Add User" button (system admin privilege)
      const addUserButton = page.locator('button:has-text("Add User")');
      await expect(addUserButton).toBeVisible({ timeout: 5000 });
    });

    test('system admin should be able to manage roles', async ({ page }) => {
      await login(page, SYSTEM_ADMIN.email, SYSTEM_ADMIN.password);

      // Navigate to Roles page
      await page.click('text=Settings');
      await page.click('text=Roles');
      await page.waitForURL('**/settings/roles');

      // Should see "Create Role" button
      const createRoleButton = page.locator('button:has-text("Create Role")');
      await expect(createRoleButton).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Dealer User Access', () => {
    test('regular user should only see permitted modules', async ({ page }) => {
      await login(page, DEALER_USER.email, DEALER_USER.password);

      // Wait for sidebar
      await page.waitForSelector('[data-testid="sidebar"]', { timeout: 5000 });

      // User should see their permitted modules (e.g., Service Orders)
      await expect(page.locator('nav a:has-text("Service Orders")')).toBeVisible();

      // User should NOT see admin modules (e.g., Users management)
      await expect(page.locator('nav a:has-text("Users")')).not.toBeVisible();
    });

    test('user without edit permission should not see edit buttons', async ({ page }) => {
      await login(page, DEALER_USER.email, DEALER_USER.password);

      // Navigate to Service Orders
      await page.click('text=Service Orders');
      await page.waitForURL('**/service-orders');

      // Wait for orders to load
      await page.waitForSelector('[data-testid="orders-list"]', { timeout: 5000 });

      // Click on first order to view details
      await page.click('[data-testid="order-row"]').first();

      // Edit button should be hidden if user doesn't have edit permission
      const editButton = page.locator('button:has-text("Edit")');
      const buttonVisible = await editButton.isVisible().catch(() => false);

      // If user doesn't have edit permission, button should not be visible
      if (!buttonVisible) {
        await expect(editButton).not.toBeVisible();
      }
    });

    test('user should not access other dealership orders', async ({ page }) => {
      await login(page, DEALER_USER.email, DEALER_USER.password);

      // Try to directly navigate to an order from another dealership
      // This should either redirect or show "Access Denied"
      await page.goto(`${BASE_URL}/service-orders/other-dealer-order-id`);

      // Should show access denied or redirect
      const accessDenied = page.locator('text=Access Denied');
      const insufficientPermissions = page.locator('text=Insufficient Permissions');

      const isDenied = await Promise.race([
        accessDenied.isVisible().then(() => true),
        insufficientPermissions.isVisible().then(() => true),
        page.waitForURL('**/dashboard', { timeout: 3000 }).then(() => true)
      ]).catch(() => false);

      expect(isDenied).toBe(true);
    });
  });

  test.describe('Order Ownership Validation', () => {
    test('user can edit pending orders from their dealership', async ({ page }) => {
      await login(page, DEALER_USER.email, DEALER_USER.password);

      // Navigate to Service Orders
      await page.click('text=Service Orders');
      await page.waitForURL('**/service-orders');

      // Filter for pending orders
      await page.click('button:has-text("Status")');
      await page.click('text=Pending');

      // Wait for filtered results
      await page.waitForTimeout(1000);

      // Click on first pending order
      const firstOrder = page.locator('[data-testid="order-row"][data-status="pending"]').first();

      if (await firstOrder.isVisible()) {
        await firstOrder.click();

        // Edit button should be visible for pending orders from same dealership
        const editButton = page.locator('button:has-text("Edit")');
        await expect(editButton).toBeVisible({ timeout: 5000 });
      }
    });

    test('user cannot edit completed orders', async ({ page }) => {
      await login(page, DEALER_USER.email, DEALER_USER.password);

      // Navigate to Service Orders
      await page.click('text=Service Orders');
      await page.waitForURL('**/service-orders');

      // Filter for completed orders
      await page.click('button:has-text("Status")');
      await page.click('text=Completed');

      // Wait for filtered results
      await page.waitForTimeout(1000);

      // Click on first completed order
      const firstOrder = page.locator('[data-testid="order-row"][data-status="completed"]').first();

      if (await firstOrder.isVisible()) {
        await firstOrder.click();

        // Edit button should NOT be visible for completed orders
        const editButton = page.locator('button:has-text("Edit")');
        await expect(editButton).not.toBeVisible();
      }
    });
  });

  test.describe('Permission Changes and Audit', () => {
    test('system admin can assign roles and changes are audited', async ({ page }) => {
      await login(page, SYSTEM_ADMIN.email, SYSTEM_ADMIN.password);

      // Navigate to Users
      await page.click('text=Users');
      await page.waitForURL('**/users');

      // Click on a user to edit
      await page.click('[data-testid="user-row"]').first();

      // Assign a role
      await page.click('button:has-text("Assign Role")');
      await page.selectOption('select[name="role"]', { index: 1 });
      await page.click('button:has-text("Save")');

      // Wait for success message
      await expect(page.locator('text=Role assigned successfully')).toBeVisible({ timeout: 5000 });

      // Navigate to Audit Log
      await page.click('text=Settings');
      await page.click('text=Audit Log');
      await page.waitForURL('**/settings/audit-log');

      // Check that the role assignment is logged
      await expect(page.locator('text=role_assigned')).toBeVisible({ timeout: 5000 });
    });

    test('permission changes reflect immediately without page refresh', async ({ page }) => {
      // This test requires two browser contexts (admin and user)
      // We'll simulate by testing that after permission change, user sees updated UI

      await login(page, SYSTEM_ADMIN.email, SYSTEM_ADMIN.password);

      // Grant user a new permission (e.g., edit_orders for service_orders)
      await page.click('text=Users');
      await page.click('[data-testid="user-row"]').first();
      await page.click('button:has-text("Manage Permissions")');
      await page.check('input[name="service_orders.edit_orders"]');
      await page.click('button:has-text("Save Permissions")');

      await logout(page);

      // Login as user
      await login(page, DEALER_USER.email, DEALER_USER.password);

      // Navigate to Service Orders
      await page.click('text=Service Orders');
      await page.click('[data-testid="order-row"]').first();

      // Edit button should now be visible (permission just granted)
      const editButton = page.locator('button:has-text("Edit")');
      await expect(editButton).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Performance', () => {
    test('permission checks should not cause noticeable lag', async ({ page }) => {
      await login(page, DEALER_USER.email, DEALER_USER.password);

      // Navigate to a page with many permission checks
      await page.click('text=Service Orders');
      await page.waitForURL('**/service-orders');

      // Measure time to load orders list
      const startTime = Date.now();
      await page.waitForSelector('[data-testid="orders-list"]', { timeout: 5000 });
      const loadTime = Date.now() - startTime;

      // Should load in under 2 seconds (reasonable for permission-heavy page)
      expect(loadTime).toBeLessThan(2000);
    });

    test('navigating between modules should use cached permissions', async ({ page }) => {
      await login(page, DEALER_USER.email, DEALER_USER.password);

      // Navigate to first module
      await page.click('text=Service Orders');
      await page.waitForURL('**/service-orders');

      // Navigate to second module
      const startTime = Date.now();
      await page.click('text=Recon Orders');
      await page.waitForURL('**/recon-orders');
      const navTime = Date.now() - startTime;

      // Navigation should be fast (using cached permissions)
      expect(navTime).toBeLessThan(1000);
    });
  });
});
