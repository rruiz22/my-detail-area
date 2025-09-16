import { test, expect } from '@playwright/test';

test.describe('Translation Coverage Testing', () => {
  // Helper function to login
  async function login(page: any) {
    await page.goto('/auth');

    // Wait for auth page to load
    await page.waitForSelector('input[type="email"]');

    // Use test credentials (adjust these for your actual test account)
    await page.fill('input[type="email"]', 'rruiz@lima.llc');
    await page.fill('input[type="password"]', 'testpassword123');

    // Submit login
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 });
  }

  // Helper function to switch language
  async function switchLanguage(page: any, language: 'en' | 'es' | 'pt-BR') {
    try {
      // Look for language switcher
      await page.click('[data-testid="language-switcher"]', { timeout: 5000 });

      // Select language
      const langMap = {
        'en': 'English',
        'es': 'Español',
        'pt-BR': 'Português'
      };

      await page.click(`text=${langMap[language]}`);
      await page.waitForTimeout(1000); // Wait for language change
    } catch (error) {
      console.log(`Language switcher not found or language ${language} not available`);
    }
  }

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Settings module - Critical translation coverage', async ({ page }) => {
    console.log('🔍 Testing Settings module translation coverage...');

    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Capture in English
    await switchLanguage(page, 'en');
    await page.screenshot({
      path: 'translation-screenshots/settings-en.png',
      fullPage: true
    });

    // Capture in Spanish
    await switchLanguage(page, 'es');
    await page.screenshot({
      path: 'translation-screenshots/settings-es.png',
      fullPage: true
    });

    // Capture in Portuguese
    await switchLanguage(page, 'pt-BR');
    await page.screenshot({
      path: 'translation-screenshots/settings-pt.png',
      fullPage: true
    });

    // Check for hardcoded strings (from audit report)
    await page.goto('/settings');
    const hardcodedStrings = [
      'General Settings',
      'Dealership Name',
      'Location',
      'Address',
      'Notification Settings',
      'Email Notifications',
      'SMS Notifications'
    ];

    for (const str of hardcodedStrings) {
      const element = page.locator(`text=${str}`);
      if (await element.isVisible()) {
        console.log(`⚠️ Found hardcoded string: "${str}"`);
      }
    }
  });

  test('User Management - Analytics and Audit', async ({ page }) => {
    console.log('🔍 Testing User Management translation coverage...');

    await page.goto('/users');
    await page.waitForLoadState('networkidle');

    // Capture screenshots in all languages
    const languages = ['en', 'es', 'pt-BR'] as const;

    for (const lang of languages) {
      await switchLanguage(page, lang);
      await page.screenshot({
        path: `translation-screenshots/users-${lang}.png`,
        fullPage: true
      });
    }

    // Check for known hardcoded strings
    const hardcodedStrings = [
      'User Analytics',
      'Audit Log',
      'Advanced Filters',
      'Bulk Operations'
    ];

    for (const str of hardcodedStrings) {
      const element = page.locator(`text=${str}`);
      if (await element.isVisible()) {
        console.log(`⚠️ Found hardcoded string in Users: "${str}"`);
      }
    }
  });

  test('Navigation and Core Modules', async ({ page }) => {
    console.log('🔍 Testing core module navigation and translations...');

    const coreModules = [
      { path: '/dashboard', name: 'dashboard' },
      { path: '/sales', name: 'sales' },
      { path: '/service', name: 'service' },
      { path: '/recon', name: 'recon' },
      { path: '/carwash', name: 'carwash' },
      { path: '/stock', name: 'stock' },
      { path: '/chat', name: 'chat' },
      { path: '/contacts', name: 'contacts' },
      { path: '/reports', name: 'reports' }
    ];

    for (const module of coreModules) {
      console.log(`📍 Testing module: ${module.name}`);

      try {
        await page.goto(module.path);
        await page.waitForLoadState('networkidle');

        // Screenshot in Spanish (most likely to show missing translations)
        await switchLanguage(page, 'es');
        await page.screenshot({
          path: `translation-screenshots/${module.name}-es-overview.png`,
          fullPage: true
        });

        // Quick check for English text in Spanish mode (indicates missing translations)
        const englishPatterns = [
          'Dashboard', 'Settings', 'Management', 'Orders', 'Create', 'Edit', 'Delete',
          'Submit', 'Cancel', 'Save', 'Export', 'Import', 'Search', 'Filter'
        ];

        for (const pattern of englishPatterns) {
          const element = page.locator(`text=${pattern}`);
          if (await element.isVisible()) {
            console.log(`⚠️ Possible missing translation in ${module.name}: "${pattern}"`);
          }
        }

      } catch (error) {
        console.log(`❌ Error testing module ${module.name}: ${error}`);
      }
    }
  });

  test('Modal and Form Translations', async ({ page }) => {
    console.log('🔍 Testing modal and form translations...');

    // Test order creation modals (high priority)
    const modalTests = [
      {
        module: '/sales',
        trigger: 'text=Add New Order',
        name: 'sales-order-modal'
      },
      {
        module: '/service',
        trigger: 'text=New Service Order',
        name: 'service-order-modal'
      },
      {
        module: '/contacts',
        trigger: 'text=Add Contact',
        name: 'contact-modal'
      }
    ];

    for (const modalTest of modalTests) {
      try {
        await page.goto(modalTest.module);
        await page.waitForLoadState('networkidle');

        // Open modal
        await page.click(modalTest.trigger);
        await page.waitForSelector('[role="dialog"]');

        // Screenshot modal in Spanish
        await switchLanguage(page, 'es');
        await page.screenshot({
          path: `translation-screenshots/${modalTest.name}-es.png`
        });

        // Close modal
        await page.press('body', 'Escape');

      } catch (error) {
        console.log(`❌ Error testing modal ${modalTest.name}: ${error}`);
      }
    }
  });
});