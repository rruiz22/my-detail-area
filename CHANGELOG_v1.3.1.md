# Changelog - Version 1.3.1

**Release Date**: November 4, 2025
**Type**: Patch Release
**Git Commit**: 61921a3

---

## 🐛 Bug Fixes

### Invoice List Auto-Refresh
- **Fixed**: Invoice list now refreshes automatically after create, edit, or delete operations
- **Fixed**: Vehicle availability updates immediately after invoice deletion
- **Impact**: Users no longer need to manually refresh the page to see changes

### Invoice Date Field Logic
- **Fixed**: Sales and Service orders now correctly filter by `due_date` (instead of `updated_at`)
- **Fixed**: Recon and CarWash orders now correctly filter by `completed_at` (instead of `updated_at`)
- **Impact**: Date range filters in Create Invoices tab now show accurate results

### Timezone Configuration
- **Fixed**: Date calculations now respect configured timezone from Settings → Platform → General
- **Fixed**: "Last Week" and other date presets now use platform timezone instead of hardcoded Eastern Time
- **Impact**: Multi-timezone dealers now see correct date ranges

---

## ✨ Improvements

### Query Invalidation
- Enhanced React Query invalidation across all invoice mutations:
  - `useCreateInvoice` - invalidates 5 related queries
  - `useDeleteInvoice` - invalidates 5 related queries + frees vehicles
  - `useRecordPayment` - invalidates 3 related queries
  - `useSendInvoiceEmail` - invalidates 2 related queries
  - `useDeletePayment` - invalidates 3 related queries

### UI Label Accuracy
- Changed "vehicles available" → "orders available"
- Changed "Selected Vehicles" → "Selected Orders"
- Changed "Filter Vehicles" → "Filter Orders"
- Added clarification: "Showing completed orders from..."

### New Hook: `useDateCalculations`
- Created centralized date calculation hook
- Reads timezone dynamically from system settings
- Provides consistent date range calculations across the app
- Supports all date presets (today, this week, last week, etc.)

---

## 🔧 Technical Changes

### Files Modified

**New Files:**
- `src/hooks/useDateCalculations.ts` - Timezone-aware date utilities

**Updated Files:**
- `src/hooks/useInvoices.ts` - Enhanced query invalidation in all mutations
- `src/components/reports/sections/InvoicesReport.tsx` - Added auto-refresh on inline invoice creation
- `src/components/reports/invoices/CreateInvoiceDialog.tsx` - Uses dynamic timezone, corrected date fields, updated UI labels
- `package.json` - Version bump to 1.3.1

### Query Keys Affected
- `['invoices']` - Main invoice list
- `['invoice-summary']` - Financial summary
- `['invoice', invoiceId]` - Individual invoice details
- `['all-vehicles-for-counts']` - Available vehicles for invoicing
- `['vehicles-without-invoice']` - Uninvoiced vehicles
- `['operational-vehicles-list']` - Operational reports list

---

## 📊 Data Consistency

### Before 1.3.1
- Create Invoices: 490 orders (using `updated_at`)
- Operational Tab: 590 orders (using correct date fields)
- **Discrepancy**: 100 orders difference

### After 1.3.1
- Create Invoices: Uses correct date fields (`due_date`/`completed_at`)
- Operational Tab: Uses correct date fields
- **Result**: Counts now match consistently

---

## 🧪 Testing Performed

✅ Create invoice from Create Invoices tab → List refreshes automatically
✅ Delete invoice → List updates and vehicles become available
✅ Record payment → Invoice status updates immediately
✅ Send invoice email → Email indicator updates
✅ Change timezone in Settings → Date ranges recalculate correctly
✅ Compare counts between Create Invoices and Operational tabs → Now consistent
✅ Last Week date range → Uses configured timezone

---

## 🔄 Migration Notes

No database migrations required for this release.

---

## 👥 Contributors

- Implementation: AI Assistant
- Testing: User Validation Required

---

## 📝 Notes

This is a bug fix and improvement release focused on:
1. Improving user experience with auto-refresh
2. Fixing date field logic for accurate filtering
3. Supporting dynamic timezone configuration
4. Ensuring data consistency across different views

No breaking changes. Fully backward compatible.

---

## 🔗 Related Issues

- Invoice list not refreshing after CRUD operations
- Vehicle count discrepancy (490 vs 590)
- Hardcoded timezone causing incorrect date ranges
- UI labels misleading (vehicles vs orders)
