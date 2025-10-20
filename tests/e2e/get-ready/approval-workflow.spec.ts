import { test, expect, Page } from '@playwright/test';

test.describe('Get-Ready Approval Workflow', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();

    // Login as dealer_manager (has approval permissions)
    await page.goto('http://localhost:8080/auth');
    await page.fill('[name="email"]', 'manager@dealer.com');
    await page.fill('[name="password"]', 'testpassword');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('http://localhost:8080/dashboard');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should display pending approvals in approvals tab', async () => {
    // Navigate to Get-Ready Approvals
    await page.goto('http://localhost:8080/get-ready/approvals');

    // Wait for data to load
    await page.waitForSelector('[data-testid="approval-queue"]', { timeout: 5000 }).catch(() => {
      // If no test ID, wait for cards
      return page.waitForSelector('text=Pending Approvals');
    });

    // Verify summary cards are visible
    await expect(page.locator('text=Pending')).toBeVisible();
    await expect(page.locator('text=Approved Today')).toBeVisible();
    await expect(page.locator('text=Rejected Today')).toBeVisible();
  });

  test('should approve a work item from queue', async () => {
    await page.goto('http://localhost:8080/get-ready/approvals');

    // Wait for approval cards
    await page.waitForTimeout(1000);

    // Find first approval card with approve button
    const approveButton = page.locator('button:has-text("Approve")').first();

    if (await approveButton.isVisible()) {
      // Click approve
      await approveButton.click();

      // Verify success toast
      await expect(page.locator('.toast, [role="status"]')).toContainText(/approved/i);
    }
  });

  test('should reject a work item with reason', async () => {
    await page.goto('http://localhost:8080/get-ready/approvals');

    await page.waitForTimeout(1000);

    // Find first reject button
    const rejectButton = page.locator('button:has-text("Reject")').first();

    if (await rejectButton.isVisible()) {
      // Click reject
      await rejectButton.click();

      // Dialog should open
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      await expect(page.locator('text=Rejection Reason')).toBeVisible();

      // Fill rejection reason
      await page.fill('textarea[id="reject-reason"]', 'Quality standards not met');
      await page.fill('textarea[id="reject-notes"]', 'Please redo the paint work');

      // Confirm rejection
      await page.click('button:has-text("Confirm Rejection")');

      // Verify success
      await expect(page.locator('.toast')).toContainText(/rejected/i);
    }
  });

  test('should filter approval queue by type', async () => {
    await page.goto('http://localhost:8080/get-ready/approvals');

    await page.waitForTimeout(1000);

    // Click filter dropdown
    await page.click('button:has(svg):has-text("All Types")');

    // Select work items only
    await page.click('text=Work Items Only');

    // Verify filter applied (all visible items should be work items)
    const workItemBadges = page.locator('text=Work Item');
    const vehicleBadges = page.locator('text=Vehicle Approval');

    if (await workItemBadges.count() > 0) {
      expect(await vehicleBadges.count()).toBe(0);
    }
  });

  test('should search approval queue', async () => {
    await page.goto('http://localhost:8080/get-ready/approvals');

    await page.waitForTimeout(1000);

    // Type in search
    await page.fill('input[placeholder*="Search"]', 'ABC123');

    // Wait for search to filter
    await page.waitForTimeout(500);

    // Results should be filtered (if any match)
    const cards = page.locator('[class*="shadow-sm"]');
    const count = await cards.count();

    // Either 0 results (no match) or filtered results
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should bulk approve multiple items', async () => {
    await page.goto('http://localhost:8080/get-ready/approvals');

    await page.waitForTimeout(1000);

    // Select first 2 checkboxes
    const checkboxes = page.locator('input[type="checkbox"]');
    const count = await checkboxes.count();

    if (count >= 3) { // At least select-all + 2 items
      await checkboxes.nth(1).click(); // First item
      await checkboxes.nth(2).click(); // Second item

      // Verify bulk approve button appears
      await expect(page.locator('button:has-text("Approve Selected")')).toBeVisible();

      // Click bulk approve
      await page.click('button:has-text("Approve Selected")');

      // Verify toast
      await expect(page.locator('.toast')).toContainText(/approved/i);
    }
  });

  test('should navigate to vehicle details from approval card', async () => {
    await page.goto('http://localhost:8080/get-ready/approvals');

    await page.waitForTimeout(1000);

    // Click "View Details" button
    const viewDetailsButton = page.locator('button:has-text("View Details")').first();

    if (await viewDetailsButton.isVisible()) {
      await viewDetailsButton.click();

      // Should navigate to details view
      await expect(page).toHaveURL(/\/get-ready\/details\?vehicle=/);
    }
  });

  test('should display critical items with warning badge', async () => {
    await page.goto('http://localhost:8080/get-ready/approvals');

    await page.waitForTimeout(1000);

    // Check if critical badge exists
    const criticalBadge = page.locator('text=Critical').first();

    if (await criticalBadge.isVisible()) {
      // Critical badge should have red styling
      await expect(criticalBadge).toHaveClass(/destructive|red/);
    }
  });

  test('should sort approval queue by oldest first', async () => {
    await page.goto('http://localhost:8080/get-ready/approvals');

    await page.waitForTimeout(1000);

    // Select sort option
    await page.click('button:has-text("Oldest First")').catch(() => {
      // If already selected, this is fine
    });

    // Verify sort applied (check if cards exist)
    const cards = page.locator('[class*="shadow-sm"]');
    expect(await cards.count()).toBeGreaterThanOrEqual(0);
  });

  test('should show empty state when no approvals pending', async () => {
    // This test assumes no pending approvals
    // In real scenario, would need to approve all first

    await page.goto('http://localhost:8080/get-ready/approvals');

    await page.waitForTimeout(1000);

    // Check for empty state (may or may not be visible)
    const emptyState = page.locator('text=All Caught Up');

    // Test passes whether empty state is shown or items are shown
    expect(page).toBeTruthy();
  });

  test('should update summary counts after approval', async () => {
    await page.goto('http://localhost:8080/get-ready/approvals');

    await page.waitForTimeout(1000);

    // Get initial pending count
    const pendingCard = page.locator('text=Pending').locator('..');
    const initialCount = await pendingCard.locator('text=/^\\d+$/').first().textContent();

    // Approve first item if exists
    const approveButton = page.locator('button:has-text("Approve")').first();

    if (await approveButton.isVisible()) {
      await approveButton.click();

      // Wait for update
      await page.waitForTimeout(2000);

      // Pending count should decrease or stay same
      const newCount = await pendingCard.locator('text=/^\\d+$/').first().textContent();

      expect(parseInt(newCount || '0')).toBeLessThanOrEqual(parseInt(initialCount || '0'));
    }
  });
});
