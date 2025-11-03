// ============================================================================
// SCRIPT DE PRUEBA PARA CACHE INVALIDATION
// ============================================================================
// Ejecuta este script en la consola del navegador (DevTools) para verificar
// que el cache de permisos se está limpiando correctamente.
//
// CÓMO USAR:
// 1. Abre DevTools (F12)
// 2. Copia y pega TODO este archivo en la consola
// 3. Ejecuta: testCacheInvalidation()
// ============================================================================

function testCacheInvalidation() {
  console.log('🧪 ========================================');
  console.log('🧪 TESTING CACHE INVALIDATION');
  console.log('🧪 ========================================\n');

  // Step 1: Check localStorage
  console.log('📦 STEP 1: Checking localStorage...');
  const localStorageKeys = Object.keys(localStorage);
  const permissionKeys = localStorageKeys.filter(key =>
    key.includes('permission') ||
    key.includes('cache') ||
    key.includes('profile') ||
    key.includes('dealership')
  );

  if (permissionKeys.length === 0) {
    console.log('✅ localStorage is CLEAN (no permission cache)');
  } else {
    console.warn('⚠️ Found cache keys in localStorage:');
    permissionKeys.forEach(key => {
      const value = localStorage.getItem(key);
      console.log(`   - ${key}: ${value?.substring(0, 100)}...`);
    });
  }

  // Step 2: Check sessionStorage
  console.log('\n📦 STEP 2: Checking sessionStorage...');
  const sessionStorageKeys = Object.keys(sessionStorage);

  if (sessionStorageKeys.length === 0) {
    console.log('✅ sessionStorage is CLEAN');
  } else {
    console.warn(`⚠️ Found ${sessionStorageKeys.length} items in sessionStorage:`);
    sessionStorageKeys.forEach(key => {
      console.log(`   - ${key}`);
    });
  }

  // Step 3: Check React Query cache (if accessible)
  console.log('\n🔍 STEP 3: Checking React Query cache...');
  try {
    // Try to access queryClient from window (if exposed)
    if (window.__REACT_QUERY_DEVTOOLS_CLIENT__) {
      const queryCache = window.__REACT_QUERY_DEVTOOLS_CLIENT__.getQueryCache();
      const queries = queryCache.getAll();
      const permissionQueries = queries.filter(q =>
        q.queryKey.some(k =>
          typeof k === 'string' &&
          (k.includes('permission') || k.includes('role') || k.includes('user'))
        )
      );

      console.log(`   Found ${permissionQueries.length} permission-related queries:`);
      permissionQueries.forEach(q => {
        console.log(`   - ${JSON.stringify(q.queryKey)}`);
        console.log(`     State: ${q.state.status}, Data age: ${q.state.dataUpdatedAt}`);
      });
    } else {
      console.log('   ℹ️ React Query DevTools not available');
      console.log('   (Install React Query DevTools to see query cache)');
    }
  } catch (error) {
    console.log('   ℹ️ Could not access React Query cache:', error.message);
  }

  // Step 4: Force clear everything
  console.log('\n🧹 STEP 4: Force clearing ALL cache...');
  try {
    // Clear all permission-related localStorage keys
    const keysToRemove = [
      'permissions_cache_v1',
      'permissions_cache_v2',
      'permissions_cache_v3',
      'user_profile_cache',
      'dealership_cache',
      'accessible_dealerships_cache'
    ];

    let removedCount = 0;
    keysToRemove.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        removedCount++;
      }
    });

    // Clear sessionStorage
    sessionStorage.clear();

    console.log(`   ✅ Removed ${removedCount} items from localStorage`);
    console.log(`   ✅ Cleared sessionStorage`);

  } catch (error) {
    console.error('   ❌ Error clearing cache:', error);
  }

  // Step 5: Summary
  console.log('\n📊 SUMMARY:');
  console.log('─────────────────────────────────────────');
  console.log('✅ Cache invalidation test complete!');
  console.log('');
  console.log('NEXT STEPS:');
  console.log('1. Reload the page (Ctrl+Shift+R)');
  console.log('2. Login again');
  console.log('3. Run this test again to verify clean state');
  console.log('─────────────────────────────────────────\n');
}

// Auto-run the test
testCacheInvalidation();

// ============================================================================
// ADDITIONAL DEBUGGING FUNCTIONS
// ============================================================================

/**
 * Check if a specific user has cached permissions
 */
function checkUserCache(userId) {
  console.log(`🔍 Checking cache for user: ${userId}`);

  const cacheKey = 'permissions_cache_v1';
  const cached = localStorage.getItem(cacheKey);

  if (!cached) {
    console.log('✅ No cache found');
    return;
  }

  try {
    const parsed = JSON.parse(cached);
    if (parsed.userId === userId) {
      console.log('⚠️ Cache found for this user:');
      console.log('   Cached at:', new Date(parsed.timestamp));
      console.log('   Age:', Math.floor((Date.now() - parsed.timestamp) / 1000), 'seconds');
      console.log('   Permissions:', parsed.data);
    } else {
      console.log('✅ Cache is for a different user');
    }
  } catch (error) {
    console.error('❌ Error parsing cache:', error);
  }
}

/**
 * Simulate a hard reload
 */
function simulateHardReload() {
  console.log('🔄 Simulating hard reload...');
  console.log('   1. Clearing localStorage...');
  localStorage.clear();
  console.log('   2. Clearing sessionStorage...');
  sessionStorage.clear();
  console.log('   3. Reloading page...');
  location.reload(true); // Force reload from server
}

// Expose functions globally
window.testCacheInvalidation = testCacheInvalidation;
window.checkUserCache = checkUserCache;
window.simulateHardReload = simulateHardReload;

console.log('💡 Available debugging functions:');
console.log('   - testCacheInvalidation()');
console.log('   - checkUserCache(userId)');
console.log('   - simulateHardReload()');
