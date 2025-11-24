# Changelog - Version 1.3.44

**Release Date:** November 24, 2025

## 🐛 Bug Fixes

### Sales Orders Modal - Loading State Fix

**Issue:** The "Create Order" button in Sales Orders modal did not show loading visual feedback correctly when creating orders. The button would return to normal state before the operation completed, causing confusion for users.

**Root Cause:**
- The `onSave()` function was called without `await`, causing the `finally` block to execute immediately
- `setSubmitting(false)` was triggered before the async operation completed
- No proper error handling with try/catch around `onSave()`
- Modal closed automatically even when operation failed

**Changes Made:**

1. **Added `await` to `onSave()` calls** (Lines 1018, 1039)
   - Multiple orders path: `await onSave(ordersData as unknown as OrderData);`
   - Single order path: `await onSave(dbData);`

2. **Wrapped `onSave()` in try/catch blocks**
   - Added error handling for both multiple and single order paths
   - Modal now stays open if operation fails
   - Only closes modal on successful save with `onClose()`

3. **Added `submitError` state and visual Alert**
   - New state: `const [submitError, setSubmitError] = useState<string | null>(null);`
   - Red Alert banner displays error message when save fails
   - Consistent error handling with Service Orders modal

**Files Modified:**
- `src/components/orders/OrderModal.tsx`

**Result:**
- ✅ Button now shows spinner and "Creating..." text during entire operation
- ✅ Modal remains open if error occurs
- ✅ User sees clear error message with red Alert banner
- ✅ Consistent behavior with Service Orders modal

## 📦 Version Updates

- **package.json:** v1.3.43 → v1.3.44
- **src/version.json:** v1.3.42 → v1.3.44

---

**Previous Version:** v1.3.43
**Current Version:** v1.3.44
**Build Date:** 2025-11-24T22:00:00.000Z
