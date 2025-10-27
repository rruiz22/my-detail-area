#!/usr/bin/env node

/**
 * Clear All Cache Script
 * Cleans localStorage, sessionStorage, indexedDB, and browser cache
 * Run with: node scripts/clear-all-cache.js
 */

const { chromium } = require('playwright');

async function clearAllCache() {
  console.log('🧹 Starting complete cache cleanup...');
  console.log('');

  let browser;
  try {
    // Launch browser
    console.log('🌐 Launching browser...');
    browser = await chromium.launch({
      headless: false // Show browser so you can see the cleanup
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    // Navigate to the app
    console.log('📍 Navigating to http://localhost:8080...');
    await page.goto('http://localhost:8080', { waitUntil: 'domcontentloaded' });

    // Clear localStorage
    console.log('🗑️  Clearing localStorage...');
    const localStorageItems = await page.evaluate(() => {
      const items = Object.keys(localStorage);
      localStorage.clear();
      return items;
    });
    console.log(`   ✅ Cleared ${localStorageItems.length} localStorage items:`);
    localStorageItems.forEach(item => console.log(`      - ${item}`));

    // Clear sessionStorage
    console.log('🗑️  Clearing sessionStorage...');
    const sessionStorageItems = await page.evaluate(() => {
      const items = Object.keys(sessionStorage);
      sessionStorage.clear();
      return items;
    });
    console.log(`   ✅ Cleared ${sessionStorageItems.length} sessionStorage items:`);
    sessionStorageItems.forEach(item => console.log(`      - ${item}`));

    // Clear indexedDB
    console.log('🗑️  Clearing indexedDB...');
    const indexedDBNames = await page.evaluate(async () => {
      const dbs = await window.indexedDB.databases();
      const names = dbs.map(db => db.name);
      for (const db of dbs) {
        if (db.name) {
          window.indexedDB.deleteDatabase(db.name);
        }
      }
      return names;
    });
    console.log(`   ✅ Cleared ${indexedDBNames.length} indexedDB databases:`);
    indexedDBNames.forEach(name => console.log(`      - ${name}`));

    // Clear cookies
    console.log('🗑️  Clearing cookies...');
    const cookies = await context.cookies();
    await context.clearCookies();
    console.log(`   ✅ Cleared ${cookies.length} cookies`);

    // Clear service workers
    console.log('🗑️  Clearing service workers...');
    const serviceWorkers = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
        return registrations.length;
      }
      return 0;
    });
    console.log(`   ✅ Cleared ${serviceWorkers} service worker(s)`);

    // Clear cache storage
    console.log('🗑️  Clearing cache storage...');
    const cacheNames = await page.evaluate(async () => {
      if ('caches' in window) {
        const names = await caches.keys();
        for (const name of names) {
          await caches.delete(name);
        }
        return names;
      }
      return [];
    });
    console.log(`   ✅ Cleared ${cacheNames.length} cache storage(s):`);
    cacheNames.forEach(name => console.log(`      - ${name}`));

    console.log('');
    console.log('✨ Cache cleanup completed successfully!');
    console.log('');
    console.log('📋 Summary:');
    console.log(`   - localStorage: ${localStorageItems.length} items cleared`);
    console.log(`   - sessionStorage: ${sessionStorageItems.length} items cleared`);
    console.log(`   - indexedDB: ${indexedDBNames.length} databases cleared`);
    console.log(`   - Cookies: ${cookies.length} cleared`);
    console.log(`   - Service Workers: ${serviceWorkers} unregistered`);
    console.log(`   - Cache Storage: ${cacheNames.length} caches cleared`);
    console.log('');
    console.log('🔄 The page will now reload...');

    // Reload the page
    await page.reload({ waitUntil: 'domcontentloaded' });

    // Wait a moment to see the reload
    await page.waitForTimeout(2000);

    console.log('✅ Page reloaded successfully!');
    console.log('');
    console.log('🎯 Next steps:');
    console.log('   1. Login with your custom role user');
    console.log('   2. Check the console for errors');
    console.log('   3. Verify sidebar shows modules');
    console.log('   4. Check PermissionsDebugger shows green status');
    console.log('');
    console.log('Press Ctrl+C to close the browser when done.');

    // Keep browser open for manual testing
    await page.waitForTimeout(60000); // Wait 1 minute before closing

  } catch (error) {
    console.error('❌ Error during cache cleanup:', error.message);
    console.error('');
    console.error('💡 Manual cleanup instructions:');
    console.error('   1. Open DevTools (F12)');
    console.error('   2. Go to Application tab');
    console.error('   3. Clear storage → Clear site data');
    console.error('   4. Hard reload: Ctrl + Shift + R');
  } finally {
    if (browser) {
      console.log('🔒 Closing browser...');
      await browser.close();
    }
  }
}

// Run the cleanup
clearAllCache().catch(console.error);
