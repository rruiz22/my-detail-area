# Reports Multi-Service Filter - Deployment Instructions

## Migration File
`supabase/migrations/20251103000006_update_reports_multi_service_filter.sql`

## Changes Summary
This migration updates the Reports module to:
1. **Support multiple service selection** (changed from single `p_service_id` to array `p_service_ids`)
2. **Show ALL dealer services** when "All Departments" is selected
3. **Show department-specific services** when a specific department is selected
4. **Display selected services as badges** in the Active Filters section

## Key Improvements

### 1. Multi-Select Service Filter
- Users can now select **multiple services** at once
- Shows "X services selected" when services are selected
- Each selected service appears as a badge in Active Filters
- "Clear All" button to deselect all services quickly

### 2. Comprehensive Service List
- **"All Departments"**: Shows ALL active services from the dealer
- **Specific Department**: Shows only services for that department (Sales, Service, Recon, CarWash)
- Services are ordered alphabetically

### 3. Better UX
- Checkbox interface for service selection
- Scrollable list for many services
- Visual feedback (hover, selected state)
- Loading state while fetching services

## Deployment Steps

### Option 1: Supabase Dashboard (Recommended)

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the ENTIRE contents of:
   ```
   supabase/migrations/20251103000006_update_reports_multi_service_filter.sql
   ```
5. Paste into the SQL Editor
6. Click **Run** (or press Ctrl+Enter / Cmd+Enter)

### Option 2: Supabase CLI

```bash
npx supabase login
npx supabase db push
```

## Verification

After applying the migration:

1. **Navigate to Reports module**
2. **Click on the Service Filter** (should say "All Services")
3. **Verify**:
   - ✅ You see all dealer services (not just one department)
   - ✅ You can select multiple services with checkboxes
   - ✅ Selected count shows in the button ("2 services selected")
   - ✅ Selected services appear as badges below filters
   - ✅ "Clear All" button works to deselect all

4. **Change Department Filter** to "Service"
   - ✅ Service filter updates to show only Service Dept services

5. **Select "All Departments"**
   - ✅ Service filter shows ALL services again

6. **Select multiple services and verify filtering works**
   - ✅ Only orders containing selected services are shown
   - ✅ Total Volume and Total Orders update correctly

## SQL Function Changes

### Before (Single Service)
```sql
p_service_id TEXT DEFAULT NULL
...
WHERE service->>'id' = p_service_id
```

### After (Multiple Services)
```sql
p_service_ids TEXT[] DEFAULT NULL
...
WHERE (service->>'id')::TEXT = ANY(p_service_ids)
   OR (service->>'type')::TEXT = ANY(p_service_ids)
```

## Frontend Changes

### ReportsFilters Interface
```typescript
// Before
serviceId?: string;

// After
serviceIds?: string[];  // Array of service IDs
```

### UI Component
- Changed from `<Select>` to `<Popover>` with checkboxes
- Multi-select with visual feedback
- Shows selected count
- Displays each selected service as a badge

## Troubleshooting

### Issue: Services not showing
**Fix**: Check browser console for errors. Verify dealer has active services in `dealer_services` table.

### Issue: Filter not working
**Fix**:
1. Hard refresh browser (Ctrl+Shift+R)
2. Check that migration was applied successfully
3. Verify service IDs are being passed correctly in Network tab

### Issue: "All Departments" shows no services
**Fix**: Check that services have `is_active = true` in the database.

## Rollback (if needed)

If you need to rollback, re-apply the previous migration:
```sql
-- Re-apply previous version with single service ID
-- Copy from: 20251103000005_fix_reports_by_order_type.sql
```

## Support

The multi-service filter now allows users to:
- Filter by specific services like "New Pics", "Mini Detail", etc.
- Combine multiple services to see orders containing ANY of the selected services
- Quickly clear selections
- See exactly which services are being filtered

This is especially useful for analyzing specific service performance and revenue.






