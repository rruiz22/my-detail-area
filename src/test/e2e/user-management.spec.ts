import { test, expect } from '@playwright/test';

test.describe('User Management System', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page and authenticate
    await page.goto('/auth');
    
    // Fill login form with test credentials
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForURL('/dashboard');
    
    // Navigate to users page
    await page.goto('/users');
    await page.waitForLoadState('networkidle');
  });

  test('should display user dashboard with all tabs', async ({ page }) => {
    // Check main dashboard elements
    await expect(page.locator('h1')).toContainText('User Management');
    
    // Check all tabs are present
    await expect(page.locator('[role="tablist"]')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Users' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Invitations' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Permissions' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Activity' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Analytics' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Audit Log' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Notifications' })).toBeVisible();
  });

  test('should display user statistics cards', async ({ page }) => {
    // Wait for stats to load
    await page.waitForSelector('[data-testid="user-stats-cards"]', { timeout: 10000 });
    
    // Check for key metrics
    await expect(page.locator('text=Total Users')).toBeVisible();
    await expect(page.locator('text=Active Users')).toBeVisible();
    await expect(page.locator('text=Pending Invitations')).toBeVisible();
    await expect(page.locator('text=Recently Joined')).toBeVisible();
  });

  test('should navigate between tabs correctly', async ({ page }) => {
    // Click on Users tab
    await page.click('[role="tab"]:has-text("Users")');
    await expect(page.locator('[data-testid="unified-user-management"]')).toBeVisible();
    
    // Click on Analytics tab
    await page.click('[role="tab"]:has-text("Analytics")');
    await expect(page.locator('text=User Analytics')).toBeVisible();
    await expect(page.locator('text=Comprehensive user insights and metrics')).toBeVisible();
    
    // Click on Audit Log tab
    await page.click('[role="tab"]:has-text("Audit Log")');
    await expect(page.locator('text=User Activity Audit Log')).toBeVisible();
  });

  test('should handle refresh functionality', async ({ page }) => {
    // Click refresh button
    const refreshButton = page.getByRole('button', { name: 'Refresh' });
    await expect(refreshButton).toBeVisible();
    await refreshButton.click();
    
    // Should show loading state briefly
    await page.waitForTimeout(500);
    
    // Should return to normal state
    await expect(page.locator('h1')).toContainText('User Management');
  });

  test('should display export functionality for admins', async ({ page }) => {
    // Look for export button (should be visible for admin users)
    const exportButton = page.getByRole('button', { name: 'Export Report' });
    await expect(exportButton).toBeVisible();
  });

  test('should show role distribution in overview', async ({ page }) => {
    // Ensure we're on overview tab
    await page.click('[role="tab"]:has-text("Overview")');
    
    // Check for role distribution section
    await expect(page.locator('text=Role Distribution')).toBeVisible();
    await expect(page.locator('text=Dealership Distribution')).toBeVisible();
  });

  test('should display user analytics charts', async ({ page }) => {
    // Navigate to analytics tab
    await page.click('[role="tab"]:has-text("Analytics")');
    
    // Wait for charts to load
    await page.waitForSelector('[data-testid="responsive-container"]', { timeout: 10000 });
    
    // Check for chart tabs
    await expect(page.getByRole('tab', { name: 'User Growth' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Role Distribution' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Departments' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Comparison' })).toBeVisible();
    
    // Test tab switching
    await page.click('[role="tab"]:has-text("Role Distribution")');
    await expect(page.locator('text=Role Statistics')).toBeVisible();
  });

  test('should show audit log with filters', async ({ page }) => {
    // Navigate to audit log tab
    await page.click('[role="tab"]:has-text("Audit Log")');
    
    // Check for filter options
    await expect(page.locator('text=Filters')).toBeVisible();
    await expect(page.locator('input[placeholder="Search..."]')).toBeVisible();
    
    // Check for event type filter
    const eventTypeSelect = page.locator('[role="combobox"]').first();
    await expect(eventTypeSelect).toBeVisible();
    
    // Test export functionality
    const exportLogButton = page.getByRole('button', { name: 'Export Log' });
    await expect(exportLogButton).toBeVisible();
  });

  test('should handle invitation management', async ({ page }) => {
    // Navigate to invitations tab
    await page.click('[role="tab"]:has-text("Invitations")');
    
    // Check for invitation management component
    await expect(page.locator('[data-testid="invitation-management"]')).toBeVisible();
  });

  test('should handle permission management', async ({ page }) => {
    // Navigate to permissions tab
    await page.click('[role="tab"]:has-text("Permissions")');
    
    // Check for permission manager component
    await expect(page.locator('[data-testid="permission-manager"]')).toBeVisible();
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check that dashboard is still accessible
    await expect(page.locator('h1')).toContainText('User Management');
    
    // Check that tabs are accessible (might be in a different layout)
    await expect(page.locator('[role="tablist"]')).toBeVisible();
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Simulate network error by intercepting API calls
    await page.route('**/api/**', route => {
      route.abort('failed');
    });
    
    // Refresh page to trigger error
    await page.reload();
    
    // Should still show main structure
    await expect(page.locator('h1')).toContainText('User Management');
  });

  test('should show activity feed', async ({ page }) => {
    // Navigate to activity tab
    await page.click('[role="tab"]:has-text("Activity")');
    
    // Check for activity feed component
    await expect(page.locator('[data-testid="user-activity-feed"]')).toBeVisible();
  });

  test('should handle notifications tab', async ({ page }) => {
    // Navigate to notifications tab
    await page.click('[role="tab"]:has-text("Notifications")');
    
    // Check for notifications content
    await expect(page.locator('text=Notification Center')).toBeVisible();
    await expect(page.locator('text=Smart notification management coming soon')).toBeVisible();
  });
});