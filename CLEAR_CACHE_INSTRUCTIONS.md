# Clear Browser Cache - Fix Module Export Error

## The Problem
The error "does not provide an export named 'ReportFilters'" is typically caused by cached modules in the browser or Vite dev server.

## Quick Fixes (Try in this order)

### 1. Hard Refresh Browser
**Windows/Linux:**
- Press `Ctrl + Shift + R`
- Or `Ctrl + F5`

**Mac:**
- Press `Cmd + Shift + R`
- Or `Cmd + Option + R`

### 2. Clear Vite Cache
Stop the dev server (Ctrl+C) and run:
```bash
# Delete Vite cache
rm -rf node_modules/.vite

# Or on Windows PowerShell
Remove-Item -Recurse -Force node_modules\.vite

# Restart dev server
npm run dev
```

### 3. Clear Browser Data
1. Open DevTools (F12)
2. Right-click on the Refresh button
3. Select "Empty Cache and Hard Reload"

### 4. Full Clean
If the above doesn't work:
```bash
# Stop dev server
# Delete all cache and node_modules
rm -rf node_modules/.vite
rm -rf node_modules

# Reinstall
npm install

# Restart
npm run dev
```

### 5. Check Browser Console
After refresh:
1. Open DevTools (F12)
2. Go to Console tab
3. Clear console
4. Refresh page
5. Check for new errors

## The Fix Applied
Added both named and default exports to `ReportFilters.tsx`:
```typescript
export const ReportFilters = () => { ... };  // Named export
export default ReportFilters;                 // Default export
```

## Expected Result
After cache clear, you should see:
- ✅ No import errors
- ✅ Service filter dropdown visible in Reports
- ✅ All filters working correctly

