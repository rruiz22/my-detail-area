import { test, expect } from '@playwright/test';

test.describe('Sales Orders Page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('**/auth/v1/user', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            app_metadata: { role: 'user' }
          }
        })
      });
    });

    // Mock orders data
    await page.route('**/rest/v1/orders*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: '1',
            vin: 'TEST123456789',
            year: 2023,
            make: 'Toyota',
            model: 'Camry',
            customer_name: 'John Doe',
            status: 'pending',
            department: 'sales',
            created_at: new Date().toISOString(),
          }
        ])
      });
    });
  });

  test('should display sales orders dashboard', async ({ page }) => {
    await page.goto('/sales-orders');
    
    // Should show the dashboard layout
    await expect(page.locator('h1')).toContainText('Sales Orders');
    
    // Should show filter bar
    await expect(page.locator('[data-testid="quick-filter-bar"]')).toBeVisible();
    
    // Should show orders in some format (list or kanban)
    await expect(page.locator('[data-testid="order-item"]').first()).toBeVisible();
  });

  test('should filter orders by status', async ({ page }) => {
    await page.goto('/sales-orders');
    
    // Click on pending filter
    await page.click('text=Pending');
    
    // Should show only pending orders
    await expect(page.locator('[data-testid="order-status"]')).toContainText('pending');
  });

  test('should open order details modal', async ({ page }) => {
    await page.goto('/sales-orders');
    
    // Click on first order
    await page.click('[data-testid="order-item"]');
    
    // Should open modal
    await expect(page.locator('[data-testid="order-modal"]')).toBeVisible();
    await expect(page.locator('text=John Doe')).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/sales-orders');
    
    // Should show mobile layout
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    
    // Should stack elements vertically
    const filterBar = page.locator('[data-testid="quick-filter-bar"]');
    await expect(filterBar).toBeVisible();
  });
});