/**
 * ✅ PHASE 5.1: E2E Performance Test for Loading Optimizations
 *
 * Tests that validate the performance improvements from Phases 1-4:
 * - No "Access Denied" flash visible
 * - Splash screen displays correctly
 * - Total load time under acceptable threshold
 * - Cache functionality works correctly
 *
 * Run with: npx playwright test tests/e2e/loading-performance.spec.ts
 */

import { test, expect } from '@playwright/test';

test.describe('App Loading Performance', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage to test cold load
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should load without "Access Denied" flash', async ({ page }) => {
    // Track if "Access Denied" ever appears
    let accessDeniedVisible = false;

    // Listen for "Access Denied" text
    page.on('console', (msg) => {
      if (msg.text().includes('Access Denied')) {
        accessDeniedVisible = true;
      }
    });

    // Navigate to app
    await page.goto('http://localhost:8080');

    // Wait for either splash screen OR dashboard
    await Promise.race([
      page.waitForSelector('[data-testid="splash-screen"]', { timeout: 2000 }).catch(() => null),
      page.waitForSelector('[data-testid="dashboard"]', { timeout: 2000 }).catch(() => null)
    ]);

    // Verify "Access Denied" text is never visible in DOM
    const accessDeniedElement = page.locator('text=Access Denied');
    const isVisible = await accessDeniedElement.isVisible().catch(() => false);

    expect(isVisible).toBe(false);
    expect(accessDeniedVisible).toBe(false);
  });

  test('should display splash screen during initialization', async ({ page }) => {
    const startTime = Date.now();

    // Navigate to app
    await page.goto('http://localhost:8080');

    // Check if splash screen appears (it may be very brief if cache hits)
    const splashScreen = page.locator('.min-h-screen:has-text("Loading")');

    // Give it a brief moment to appear (splash might be quick due to caching)
    await page.waitForTimeout(100);

    // If splash appeared, verify it has proper structure
    const hasSplash = await splashScreen.isVisible().catch(() => false);

    if (hasSplash) {
      // Verify splash screen has loading indicator
      const loader = page.locator('[role="status"]');
      await expect(loader).toBeVisible();

      // Verify splash has progress indication or message
      const loadingText = page.locator('text=/Loading|Authenticating|permissions/i');
      await expect(loadingText).toBeVisible();
    }

    // Wait for app to be ready (either immediately or after splash)
    await page.waitForLoadState('networkidle', { timeout: 5000 });

    const loadTime = Date.now() - startTime;

    // Total load should be under 1 second for good UX
    expect(loadTime).toBeLessThan(1000);
  });

  test('should load faster on second visit (cache hit)', async ({ page, context }) => {
    // First load (cold)
    const coldStartTime = Date.now();
    await page.goto('http://localhost:8080');
    await page.waitForLoadState('networkidle');
    const coldLoadTime = Date.now() - coldStartTime;

    // Navigate away
    await page.goto('about:blank');

    // Second load (warm - should use cache)
    const warmStartTime = Date.now();
    await page.goto('http://localhost:8080');
    await page.waitForLoadState('networkidle');
    const warmLoadTime = Date.now() - warmStartTime;

    // Warm load should be significantly faster (at least 30% improvement)
    expect(warmLoadTime).toBeLessThan(coldLoadTime * 0.7);

    console.log(`Cold load: ${coldLoadTime}ms, Warm load: ${warmLoadTime}ms`);
    console.log(`Improvement: ${Math.round((1 - warmLoadTime / coldLoadTime) * 100)}%`);
  });

  test('should have translations ready before content renders', async ({ page }) => {
    await page.goto('http://localhost:8080');

    // Wait for page to be interactive
    await page.waitForLoadState('domcontentloaded');

    // Check for translation keys (should NOT appear if translations loaded correctly)
    const translationKeys = page.locator('text=/^[a-z]+\\.[a-z_]+$/');
    const keyCount = await translationKeys.count();

    // There should be NO visible translation keys (like "common.loading")
    expect(keyCount).toBe(0);

    // Verify actual translated text is present
    const hasEnglishText = await page.locator('text=/Dashboard|Orders|Contacts/i').count();
    expect(hasEnglishText).toBeGreaterThan(0);
  });

  test('should cache permissions in localStorage after login', async ({ page }) => {
    // This test assumes you have a test login
    await page.goto('http://localhost:8080');

    // If already logged in, check for permission cache
    await page.waitForLoadState('networkidle');

    // Check localStorage for permission cache
    const permissionCache = await page.evaluate(() => {
      return localStorage.getItem('permissions_cache_v1');
    });

    // If user is logged in, permission cache should exist
    if (permissionCache) {
      const parsed = JSON.parse(permissionCache);

      // Verify cache structure
      expect(parsed).toHaveProperty('id');
      expect(parsed).toHaveProperty('system_permissions');
      expect(parsed).toHaveProperty('module_permissions');
      expect(parsed).toHaveProperty('cached_at');
      expect(parsed).toHaveProperty('version');

      // Verify cache is recent (within last 5 minutes)
      const cacheAge = Date.now() - parsed.cached_at;
      expect(cacheAge).toBeLessThan(5 * 60 * 1000);
    }
  });

  test('should respect WCAG accessibility during loading', async ({ page }) => {
    await page.goto('http://localhost:8080');

    // Check for ARIA attributes on loading elements
    const loadingElement = page.locator('[role="status"], [aria-live="polite"]');

    // Give brief time for splash to appear
    await page.waitForTimeout(100);

    const hasAriaElement = await loadingElement.count();

    if (hasAriaElement > 0) {
      // Verify proper ARIA attributes
      const ariaLabel = await loadingElement.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    }

    // Verify no accessibility violations (basic check)
    await page.waitForLoadState('networkidle');

    // Check for proper heading hierarchy
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThan(0);
  });
});

test.describe('Performance Metrics', () => {
  test('should meet Core Web Vitals thresholds', async ({ page }) => {
    await page.goto('http://localhost:8080');

    // Wait for load
    await page.waitForLoadState('networkidle');

    // Measure performance metrics
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        // First Contentful Paint (should be < 1.8s)
        fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
        // DOM Content Loaded
        dcl: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        // Total load time
        loadTime: navigation.loadEventEnd - navigation.fetchStart
      };
    });

    console.log('Performance metrics:', metrics);

    // FCP should be under 1.8 seconds (good threshold)
    expect(metrics.fcp).toBeLessThan(1800);

    // DCL should be under 1 second
    expect(metrics.dcl).toBeLessThan(1000);
  });
});
