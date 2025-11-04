# Timezone Fix - Current Status

## Problem
Reports module showing $0 for Sales, Service, Recon departments with "Last Week" filter (Oct 27 - Nov 02, 2025) and "Completed" status filter active.

## Changes Made

### 1. src/pages/Reports.tsx
- ✅ Added `getSystemTimezone` import
- ✅ Updated `getWeekDates` to normalize dates to system timezone
- ✅ Updated `loadFiltersFromStorage` to parse dates in system timezone

### 2. src/components/reports/ReportFilters.tsx
- ✅ Added `getSystemTimezone` import
- ✅ Updated `getWeekDates` to normalize dates to system timezone
- ✅ Updated `handleQuickDateRange` to create dates in system timezone

### 3. src/hooks/useReportsData.tsx
- ❌ Reverted timezone normalization when sending to Supabase
- ✅ Kept using `.toISOString()` directly

## Current Issue

With active filters:
- Date: Oct 27 - Nov 02, 2025 (Last Week)
- Status: Completed
- Services: 18 services selected

Results:
- Sales: $0 (0 orders)
- Service: $0 (0 orders)
- Recon: $0 (0 orders)
- Carwash: $3,528 (441 orders) ✅

## Possible Causes

1. **Service filter** - 18 services are selected, may be excluding orders
2. **Status filter** - Only showing "Completed" orders
3. **Date normalization** - Changes to getWeekDates may have shifted the date range
4. **Combination** - Multiple filters creating zero results

## Next Steps to Debug

1. Click "Clear All" to remove all filters except date range
2. Change Status from "Completed" to "All Statuses"
3. Check if data appears for other departments
4. Compare with Operational tab using same date range

## Technical Notes

The approach of normalizing dates when creating them (in Reports.tsx and ReportFilters.tsx) should work because:
- It ensures buttons like "Last Week" create the correct Monday-Sunday range in user's timezone
- PostgreSQL stores dates in UTC and handles timezone conversions automatically
- The `.toISOString()` conversion is correct for sending to Supabase

The issue is likely NOT the timezone fix itself, but rather the combination of filters active.
