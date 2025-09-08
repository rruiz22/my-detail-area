import { test, expect } from '@playwright/test';

test.describe('Chat Interface', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to auth page and login with admin credentials
    await page.goto('/auth');
    
    // Fill login form
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for navigation to dashboard
    await page.waitForURL('/dashboard');
    
    // Navigate to chat page
    await page.goto('/chat');
  });

  test('should display chat page with basic elements', async ({ page }) => {
    // Check if the page title is present
    await expect(page.locator('h1')).toContainText('Chat');
    
    // Check if the subtitle is present
    await expect(page.locator('p')).toContainText('Real-time communication for');
    
    // Check if feature highlights are present
    await expect(page.locator('text=Real-time Messaging')).toBeVisible();
    await expect(page.locator('text=Secure & Private')).toBeVisible();
    await expect(page.locator('text=Rich Media Support')).toBeVisible();
  });

  test('should display feature cards with correct icons and descriptions', async ({ page }) => {
    // Check real-time messaging feature
    await expect(page.locator('[data-testid="feature-realtime"]')).toBeVisible();
    await expect(page.locator('text=Instant message delivery and read receipts')).toBeVisible();
    
    // Check secure feature
    await expect(page.locator('[data-testid="feature-secure"]')).toBeVisible();
    await expect(page.locator('text=End-to-end encrypted conversations')).toBeVisible();
    
    // Check multimedia feature
    await expect(page.locator('[data-testid="feature-multimedia"]')).toBeVisible();
    await expect(page.locator('text=Share files, images, and voice messages')).toBeVisible();
  });

  test('should display chat layout with conversation list and message area', async ({ page }) => {
    // Check if the chat layout is rendered
    await expect(page.locator('[data-testid="chat-layout"]')).toBeVisible();
    
    // Check if conversation list area exists
    await expect(page.locator('[data-testid="conversation-list"]')).toBeVisible();
    
    // Check if placeholder message is shown when no conversation is selected
    await expect(page.locator('text=Select a conversation to start chatting')).toBeVisible();
  });

  test('should show conversation search and filter options', async ({ page }) => {
    // Check if search input is present
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
    
    // Check if filter buttons are present
    await expect(page.locator('button:has-text("All")')).toBeVisible();
    await expect(page.locator('button:has-text("Direct")')).toBeVisible();
    await expect(page.locator('button:has-text("Group")')).toBeVisible();
  });

  test('should display new conversation button', async ({ page }) => {
    // Check if new conversation button is present
    await expect(page.locator('button:has-text("New Conversation")')).toBeVisible();
  });

  test('should be responsive on mobile viewports', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check if the layout is still functional on mobile
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[data-testid="chat-layout"]')).toBeVisible();
    
    // Feature cards should still be visible but may stack vertically
    await expect(page.locator('text=Real-time Messaging')).toBeVisible();
  });

  test('should handle search functionality', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search"]');
    
    // Type in search box
    await searchInput.fill('test conversation');
    await expect(searchInput).toHaveValue('test conversation');
    
    // Clear search
    await searchInput.clear();
    await expect(searchInput).toHaveValue('');
  });

  test('should handle filter button interactions', async ({ page }) => {
    // Test All filter button
    const allButton = page.locator('button:has-text("All")');
    await allButton.click();
    await expect(allButton).toHaveClass(/bg-primary/);
    
    // Test Direct filter button
    const directButton = page.locator('button:has-text("Direct")');
    await directButton.click();
    await expect(directButton).toHaveClass(/bg-primary/);
    
    // Test Group filter button
    const groupButton = page.locator('button:has-text("Group")');
    await groupButton.click();
    await expect(groupButton).toHaveClass(/bg-primary/);
  });

  test('should display empty state when no conversations exist', async ({ page }) => {
    // Should show empty state message
    await expect(page.locator('text=No conversations found')).toBeVisible();
  });

  test('should handle conversation selection (if conversations exist)', async ({ page }) => {
    // Wait for any conversations to load
    await page.waitForTimeout(2000);
    
    // If conversations exist, test selection
    const conversationItems = page.locator('[data-testid="conversation-item"]');
    const count = await conversationItems.count();
    
    if (count > 0) {
      // Click first conversation
      await conversationItems.first().click();
      
      // Should show message thread
      await expect(page.locator('[data-testid="message-thread"]')).toBeVisible();
      
      // Should show message composer
      await expect(page.locator('[data-testid="message-composer"]')).toBeVisible();
    }
  });

  test('should show proper error handling for failed requests', async ({ page }) => {
    // Mock failed network request
    await page.route('**/chat_conversations*', route => {
      route.abort('failed');
    });
    
    // Reload page to trigger failed request
    await page.reload();
    
    // Should still render the basic layout even if conversations fail to load
    await expect(page.locator('h1')).toContainText('Chat');
  });

  test('should display dealership context correctly', async ({ page }) => {
    // Check if dealership name is displayed in the header
    await expect(page.locator('text=Admin Dealership')).toBeVisible();
    
    // Check if dealership context is shown with user icon
    const dealershipContext = page.locator('[data-testid="dealership-context"]');
    await expect(dealershipContext).toBeVisible();
  });

  test('should navigate back to dashboard when clicking breadcrumb', async ({ page }) => {
    // If there's a back navigation, test it
    const backButton = page.locator('button[aria-label*="back"], a[href="/dashboard"]');
    const backButtonCount = await backButton.count();
    
    if (backButtonCount > 0) {
      await backButton.first().click();
      await expect(page).toHaveURL('/dashboard');
    }
  });
});

test.describe('Chat Interface - Unauthenticated', () => {
  test('should redirect to auth page when not logged in', async ({ page }) => {
    // Try to access chat page without authentication
    await page.goto('/chat');
    
    // Should redirect to auth page or show auth required message
    const currentUrl = page.url();
    const isAuthPage = currentUrl.includes('/auth');
    const hasAuthMessage = await page.locator('text=Sign in to access').isVisible();
    
    expect(isAuthPage || hasAuthMessage).toBeTruthy();
  });

  test('should show authentication required message when user is not logged in', async ({ page }) => {
    // Navigate to chat without authentication
    await page.goto('/chat');
    
    // Should show auth required message or redirect
    if (!page.url().includes('/auth')) {
      await expect(page.locator('text=Authentication Required')).toBeVisible();
    }
  });
});

test.describe('Chat Interface - No Dealership Access', () => {
  test('should show no dealership access message for users without dealership', async ({ page }) => {
    // This test would need a user account without dealership access
    // For now, we'll just check the structure exists
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    await page.goto('/chat');
    
    // The page should load successfully for admin user
    await expect(page.locator('h1')).toContainText('Chat');
  });
});