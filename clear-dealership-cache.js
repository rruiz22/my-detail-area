/**
 * Clear Dealership Cache - Emergency Script
 *
 * Run this in the browser console to force a complete cache refresh
 * of the dealership dropdown.
 *
 * Usage:
 * 1. Open browser console (F12)
 * 2. Copy and paste this entire script
 * 3. Press Enter
 * 4. Refresh the page
 */

console.log('🧹 Clearing dealership cache...');

// Step 1: Clear localStorage dealership cache
const keysToRemove = [
  'dealerships-cache',
  'selectedDealerFilter',
  'dealerFilter'
];

keysToRemove.forEach(key => {
  if (localStorage.getItem(key)) {
    localStorage.removeItem(key);
    console.log(`✅ Removed: ${key}`);
  }
});

// Step 2: Clear all React Query cache keys related to dealerships
if (window.queryClient) {
  console.log('🔄 Invalidating React Query cache...');

  // Remove all dealership queries
  window.queryClient.removeQueries({ queryKey: ['accessible_dealerships'] });
  window.queryClient.removeQueries({ queryKey: ['dealerships'] });
  window.queryClient.removeQueries({ queryKey: ['dealer-memberships'] });

  console.log('✅ React Query cache cleared');
} else {
  console.warn('⚠️ QueryClient not found in window. Refresh the page to clear React Query cache.');
}

// Step 3: Trigger a hard reload
console.log('🔄 Reloading page...');
setTimeout(() => {
  window.location.reload(true);
}, 500);
