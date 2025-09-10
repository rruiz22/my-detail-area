import { test, expect } from '@playwright/test';

test.describe('Order Detail Modal Layout', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to sales orders page
    await page.goto('http://localhost:8080/sales');
    await page.waitForLoadState('networkidle');
  });

  test('modal opens at top without auto-scroll to communication hub', async ({ page }) => {
    // Click first order in table to open modal
    await page.click('tbody tr:first-child', { clickCount: 2 });
    
    // Wait for modal to open
    await page.waitForSelector('[data-testid="order-detail-modal"]', { timeout: 3000 });
    
    // Verify modal opens at top (Vehicle Info should be visible)
    const vehicleBlock = page.locator('text=Vehicle Information');
    await expect(vehicleBlock).toBeInViewport();
    
    // Verify Communication Hub is NOT in viewport initially
    const commBlock = page.locator('text=Team Communication');
    const isCommVisible = await commBlock.isInViewport().catch(() => false);
    expect(isCommVisible).toBeFalsy();
    
    // Verify header contains order information
    const orderHeader = page.locator('h1').first();
    await expect(orderHeader).toBeVisible();
  });

  test('status badges display professional indicators', async ({ page }) => {
    await page.click('tbody tr:first-child', { clickCount: 2 });
    await page.waitForSelector('[data-testid="order-detail-modal"]');
    
    // Look for status badges (On Time, Delayed, etc.)
    const statusBadges = page.locator('.bg-emerald-100, .bg-yellow-100, .bg-orange-100, .bg-red-100');
    const badgeCount = await statusBadges.count();
    expect(badgeCount).toBeGreaterThanOrEqual(1);
    
    // Verify badge text content
    const badgeText = await statusBadges.first().textContent();
    expect(badgeText).toMatch(/ON TIME|DUE TODAY|DELAYED|OVERDUE|NEW|PRIORITY/);
  });

  test('QR code block displays with mda.to integration', async ({ page }) => {
    await page.click('tbody tr:first-child', { clickCount: 2 });
    await page.waitForSelector('[data-testid="order-detail-modal"]');
    
    // Verify QR code section exists
    const qrTitle = page.locator('text=QR Code');
    await expect(qrTitle).toBeVisible();
    
    // Verify short link display
    const shortLink = page.locator('text=/mda\\.to/');
    if (await shortLink.count() > 0) {
      await expect(shortLink).toBeVisible();
    }
  });

  test('two-block communication system works', async ({ page }) => {
    await page.click('tbody tr:first-child', { clickCount: 2 });
    await page.waitForSelector('[data-testid="order-detail-modal"]');
    
    // Verify Public Comments block exists
    const publicComments = page.locator('text=Team Communication');
    await expect(publicComments).toBeVisible();
    
    // Verify Internal Notes block exists  
    const internalNotes = page.locator('text=Internal Notes');
    await expect(internalNotes).toBeVisible();
    
    // Verify they are separate blocks (not combined)
    const commentCard = publicComments.locator('..').locator('..');
    const notesCard = internalNotes.locator('..').locator('..');
    
    expect(await commentCard.getAttribute('class')).toContain('bg-');
    expect(await notesCard.getAttribute('class')).toContain('bg-');
  });

  test('followers block displays team members', async ({ page }) => {
    await page.click('tbody tr:first-child', { clickCount: 2 });
    await page.waitForSelector('[data-testid="order-detail-modal"]');
    
    const followersTitle = page.locator('text=Followers');
    await expect(followersTitle).toBeVisible();
    
    // Verify follower count badge
    const followerBadge = followersTitle.locator('..').locator('.badge');
    if (await followerBadge.count() > 0) {
      await expect(followerBadge).toBeVisible();
    }
  });

  test('recent activity timeline displays correctly', async ({ page }) => {
    await page.click('tbody tr:first-child', { clickCount: 2 });
    await page.waitForSelector('[data-testid="order-detail-modal"]');
    
    const activityTitle = page.locator('text=Recent Activity');
    await expect(activityTitle).toBeVisible();
    
    // Verify activity items exist or placeholder is shown
    const activityItems = page.locator('.border-l-2, text=No recent activity');
    expect(await activityItems.count()).toBeGreaterThanOrEqual(1);
  });

  test('VIN copying works on click', async ({ page }) => {
    await page.click('tbody tr:first-child', { clickCount: 2 });
    await page.waitForSelector('[data-testid="order-detail-modal"]');
    
    // Find and click VIN element
    const vinElement = page.locator('.font-mono').first();
    if (await vinElement.count() > 0) {
      await vinElement.click();
      
      // Verify toast notification appears
      const toast = page.locator('text=VIN copied to clipboard');
      await expect(toast).toBeVisible({ timeout: 2000 });
    }
  });

  test('mobile responsive layout works', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.click('tbody tr:first-child', { clickCount: 2 });
    await page.waitForSelector('[data-testid="order-detail-modal"]');
    
    // Verify modal adapts to mobile
    const modal = page.locator('[data-testid="order-detail-modal"]');
    await expect(modal).toBeVisible();
    
    // Verify responsive grid layout
    const vehicleBlock = page.locator('text=Vehicle Information');
    await expect(vehicleBlock).toBeVisible();
  });
});

test.describe('Table Layout Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8080/sales');
    await page.waitForLoadState('networkidle');
  });

  test('6-column table layout displays correctly', async ({ page }) => {
    // Switch to table view if not already
    const tableButton = page.locator('text=Table');
    if (await tableButton.isVisible()) {
      await tableButton.click();
    }
    
    // Verify all 6 column headers are present
    const headers = ['Order ID', 'Stock', 'Vehicle', 'Due', 'Status', 'Actions'];
    
    for (const header of headers) {
      await expect(page.locator(`th:has-text("${header}")`)).toBeVisible();
    }
  });

  test('mobile card layout displays correctly', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    
    // Mobile should show card layout instead of table
    const mobileCards = page.locator('.lg\\:hidden .space-y-4');
    await expect(mobileCards).toBeVisible();
    
    // Table should be hidden on mobile
    const desktopTable = page.locator('.hidden.lg\\:block');
    await expect(desktopTable).toBeHidden();
  });

  test('status changes update table immediately', async ({ page }) => {
    // Click status badge in first row
    const statusBadge = page.locator('tbody tr:first-child .cursor-pointer').first();
    await statusBadge.click();
    
    // Select new status from dropdown
    await page.click('text=completed');
    
    // Verify table updates without refresh
    await expect(page.locator('text=Status updated')).toBeVisible({ timeout: 3000 });
  });
});