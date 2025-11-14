#!/usr/bin/env node

/**
 * Clear i18next translation cache
 *
 * This script clears all cached translations from sessionStorage and memory cache
 * to force a fresh reload of translation files.
 */

console.log('🧹 Clearing i18next translation cache...');

// Clear localStorage language preference
try {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('language');
    console.log('✅ Cleared language preference from localStorage');
  }
} catch (e) {
  console.log('⚠️  Could not access localStorage (private mode?)');
}

// Clear sessionStorage translation cache
try {
  if (typeof sessionStorage !== 'undefined') {
    // Clear all i18n cache keys
    const keysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.includes('i18n_translations_cache')) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => {
      sessionStorage.removeItem(key);
      console.log(`✅ Removed cache key: ${key}`);
    });

    if (keysToRemove.length === 0) {
      console.log('ℹ️  No translation cache found in sessionStorage');
    }
  }
} catch (e) {
  console.log('⚠️  Could not access sessionStorage (private mode?)');
}

console.log('✨ Translation cache clearing complete!');
console.log('🔄 Please refresh your browser to reload translations');
