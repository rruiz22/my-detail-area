# Changelog v1.3.2

**Release Date:** 2025-11-04

## 🐛 Bug Fixes

### Invoice Reports (PDF, Excel, Print)

- **Fixed Service Names Display**: Service names now display correctly instead of UUIDs in all invoice exports (PDF, Excel, and Print view). Implemented robust service name extraction logic that handles multiple data structures (strings, objects with `name`, `type`, `id`, or `service_name` fields).

- **Fixed Missing Toast Notification**: Corrected missing `useToast` hook initialization in `InvoiceDetailsDialog.tsx` that was causing errors when downloading PDFs.

- **Fixed PDF Column Width Warning**: Adjusted PDF table column widths to fit within page boundaries (reduced from 174mm to 168mm) to eliminate jsPDF warnings.

## ✨ New Features

### Date Separators in Reports

- **Visual Date Grouping**: Added visual separators between different dates in all invoice exports to improve readability and organization:
  - **PDF**: Separator rows with 6px height, centered date, light gray background (#E5E7EB)
  - **Excel**: Separator rows with 8px height, merged cells, centered date
  - **Print View**: Separator rows with colspan, gray background, centered date
  - **Dialog View**: Visual separator rows between date groups

- **Ascending Date Sort**: All invoice items are now sorted by date in ascending order (oldest first) across all views and exports.

### Enhanced PDF Export

- **Department Information**: Department information is now always visible in PDF header. Shows selected department(s) or "All Departments" as fallback.

- **No-Wrap Columns**: Implemented no-wrap for:
  - All table headers (no line breaks)
  - Order number column (keeps order numbers like "CW-1469" on single line)

- **Improved Footer**: Enhanced PDF footer with complete metadata on every page:
  - Left: Generated date/time, Invoice number, Department(s)
  - Center: Pagination (always visible, bold)
  - Right: Dealer name, Service period, Total vehicles count

### Enhanced Print View

- **Responsive Footer**: Completely redesigned footer with fixed positioning that appears on all printed pages:
  - Three-column layout (left, center, right)
  - Flexbox-based responsive design
  - Proper print margins and background

- **Improved Header Layout**:
  - Removed unnecessary divider lines above Department and Total Amount
  - Added single divider line below header section to separate from data table

- **Pagination**: Added page numbering in footer center ("Page 1 of 1")

- **Better Spacing**: Optimized spacing and removed redundant borders for cleaner appearance

## 🚀 Improvements

### Service Name Handling

Enhanced service name extraction across multiple files:
- `InvoicesReport.tsx`: Robust logic to handle all service data structures when creating invoices
- `CreateInvoiceDialog.tsx`: Consistent service name extraction
- `generateInvoicePDF.ts`: Fallback logic for missing service names
- `generateInvoiceExcel.ts`: Fallback logic for missing service names

Priority order for service name resolution:
1. Direct `name` field (carwash new format)
2. Lookup by `type` field (carwash with ID)
3. Lookup by `id` field (Sales/Service/Recon)
4. `service_name` field
5. String ID as fallback

### PDF Styling

- Reduced header font sizes for better fit (8pt headers, 7pt for PO/RO/Tag)
- Optimized column widths for better space utilization
- Services column increased from 32mm to 34mm for better readability
- Consistent overflow handling across all columns

### Print View Enhancements

- Fixed footer positioning with `position: fixed`
- Added `padding-bottom: 60px` to body for footer space
- Proper `@page` margins (0.5in sides, 0.75in bottom)
- Three-column footer layout for better organization
- Consistent styling across all pages

## 📝 Technical Details

### Files Modified

1. **src/utils/generateInvoicePDF.ts**
   - Added date sorting and grouping
   - Implemented date separators
   - Enhanced footer with complete metadata
   - Improved column widths and overflow handling
   - Always show department information

2. **src/utils/generateInvoiceExcel.ts**
   - Added date sorting and grouping
   - Implemented date separators with merged cells
   - Enhanced service name fallback logic

3. **src/components/reports/invoices/InvoiceDetailsDialog.tsx**
   - Fixed missing `useToast` hook
   - Redesigned print view footer
   - Removed unnecessary divider lines
   - Added header divider
   - Implemented date separators in print view
   - Added date separators in dialog table view

4. **src/components/reports/sections/InvoicesReport.tsx**
   - Enhanced service name extraction logic
   - Improved handling of multiple service data structures

5. **src/components/reports/invoices/CreateInvoiceDialog.tsx**
   - Enhanced service name extraction logic
   - Consistent with InvoicesReport implementation

### Date Separator Format

```
┌───────────────────────────────────────────┐
│                  10/28                    │  ← Separator (double height)
├───────────────────────────────────────────┤
│ Order data for 10/28...                  │
│ Order data for 10/28...                  │
└───────────────────────────────────────────┘
```

## 🎯 User Experience

- Invoices are now easier to read with clear date grouping
- Service names are human-readable instead of technical UUIDs
- Print view is professional and consistent across all pages
- Footer information is complete and properly positioned
- No more console errors when generating PDFs
- Better space utilization in PDF tables

## 🔧 Testing Checklist

- ✅ PDF exports with correct column widths
- ✅ Excel exports with date separators
- ✅ Print view with responsive footer on all pages
- ✅ Service names display correctly (not UUIDs)
- ✅ Date separators appear between different dates
- ✅ Orders sorted by date (ascending)
- ✅ Department information visible in all exports
- ✅ Pagination displays correctly
- ✅ No console errors or warnings
- ✅ Footer appears on all printed pages
