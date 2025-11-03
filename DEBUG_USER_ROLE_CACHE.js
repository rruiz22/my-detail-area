// ============================================================================
// DEBUG USER ROLE CACHE IN TOPBAR
// ============================================================================
// Ejecuta este script en la consola del navegador para verificar por qué
// el topbar muestra un role diferente al del modal de crear orden.
//
// CÓMO USAR:
// 1. Abre DevTools (F12) en la pestaña del USUARIO AFECTADO (rudyruizlima@gmail.com)
// 2. Copia y pega TODO este código en la consola
// 3. El script se ejecuta automáticamente y te muestra todo el estado
// ============================================================================

console.log('🔍 ========================================');
console.log('🔍 DEBUGGING ROLE DISPLAY IN TOPBAR');
console.log('🔍 ========================================\n');

// Step 1: Check localStorage caches
console.log('📦 STEP 1: Checking localStorage caches...\n');

const permissionCache = localStorage.getItem('permissions_cache_v1');
const profileCache = localStorage.getItem('user_profile_cache');

if (permissionCache) {
  console.log('✅ Found permissions_cache_v1:');
  try {
    const parsed = JSON.parse(permissionCache);
    console.log('   User ID:', parsed.userId);
    console.log('   Timestamp:', new Date(parsed.timestamp).toLocaleString());
    console.log('   Age:', Math.floor((Date.now() - parsed.timestamp) / 1000), 'seconds');
    console.log('   Data:', parsed.data);
  } catch (e) {
    console.error('   ❌ Error parsing:', e);
  }
} else {
  console.log('❌ No permissions_cache_v1 found');
}

console.log('');

if (profileCache) {
  console.log('✅ Found user_profile_cache:');
  try {
    const parsed = JSON.parse(profileCache);
    console.log('   User ID:', parsed.userId);
    console.log('   Email:', parsed.email);
    console.log('   Role:', parsed.role);
    console.log('   Cached at:', new Date(parsed.cached_at).toLocaleString());
    console.log('   Age:', Math.floor((Date.now() - new Date(parsed.cached_at).getTime()) / 1000), 'seconds');
    console.log('   Version:', parsed.version);
  } catch (e) {
    console.error('   ❌ Error parsing:', e);
  }
} else {
  console.log('❌ No user_profile_cache found');
}

// Step 2: Check React Query cache (if DevTools available)
console.log('\n📊 STEP 2: Checking React Query cache...\n');

try {
  // Try to access queryClient from window (exposed by React Query DevTools)
  const queryClient = window.__REACT_QUERY_DEVTOOLS_CLIENT__;

  if (queryClient) {
    const queryCache = queryClient.getQueryCache();
    const allQueries = queryCache.getAll();

    // Find permission-related queries
    const permissionQueries = allQueries.filter(q =>
      q.queryKey.includes('user-permissions') ||
      q.queryKey.includes('user_profile_permissions')
    );

    if (permissionQueries.length > 0) {
      console.log(`✅ Found ${permissionQueries.length} permission-related queries:\n`);

      permissionQueries.forEach(q => {
        console.log(`   Query: ${JSON.stringify(q.queryKey)}`);
        console.log(`   Status: ${q.state.status}`);
        console.log(`   Data updated: ${q.state.dataUpdatedAt ? new Date(q.state.dataUpdatedAt).toLocaleString() : 'never'}`);
        console.log(`   Age: ${q.state.dataUpdatedAt ? Math.floor((Date.now() - q.state.dataUpdatedAt) / 1000) : 'N/A'}s`);

        if (q.state.data) {
          console.log(`   Data preview:`, q.state.data);
        }
        console.log('');
      });
    } else {
      console.log('❌ No permission-related queries found');
    }
  } else {
    console.log('ℹ️  React Query DevTools not available');
    console.log('   Install React Query DevTools extension to see query cache');
  }
} catch (error) {
  console.log('ℹ️  Could not access React Query cache:', error.message);
}

// Step 3: Check current DOM state
console.log('\n🎨 STEP 3: Checking topbar DOM elements...\n');

try {
  // Find all badges in the user dropdown
  const badges = document.querySelectorAll('[role="menu"] .badge, [role="menu"] .text-xs.px-2');

  if (badges.length > 0) {
    console.log(`✅ Found ${badges.length} role badge(s) in topbar:\n`);
    badges.forEach((badge, index) => {
      console.log(`   Badge ${index + 1}: "${badge.textContent.trim()}"`);
    });
  } else {
    console.log('ℹ️  No role badges found (dropdown might be closed)');
    console.log('   Open the user dropdown to see the current role display');
  }
} catch (error) {
  console.log('⚠️  Could not check DOM:', error.message);
}

// Step 4: Provide solution
console.log('\n💡 SOLUTION:\n');
console.log('─────────────────────────────────────────');
console.log('If you see OLD role data above, run this to fix:');
console.log('');
console.log('   // Clear all caches');
console.log('   localStorage.removeItem("permissions_cache_v1");');
console.log('   localStorage.removeItem("user_profile_cache");');
console.log('   sessionStorage.clear();');
console.log('   location.reload(true);');
console.log('');
console.log('OR simply execute:');
console.log('   clearAllCaches();');
console.log('─────────────────────────────────────────\n');

// Helper function
window.clearAllCaches = function() {
  console.log('🧹 Clearing all caches...');
  localStorage.removeItem('permissions_cache_v1');
  localStorage.removeItem('permissions_cache_v2');
  localStorage.removeItem('permissions_cache_v3');
  localStorage.removeItem('user_profile_cache');
  localStorage.removeItem('dealership_cache');
  localStorage.removeItem('accessible_dealerships_cache');
  sessionStorage.clear();
  console.log('✅ All caches cleared!');
  console.log('🔄 Reloading page...');
  location.reload(true);
};

console.log('✅ Debug script loaded!');
console.log('📌 Available commands:');
console.log('   - clearAllCaches() - Clear all caches and reload');
console.log('');
