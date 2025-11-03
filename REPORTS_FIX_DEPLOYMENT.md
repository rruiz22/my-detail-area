# Reports Fix - Manual Deployment Instructions

## Migration File
`supabase/migrations/20251103000005_fix_reports_by_order_type.sql`

## Changes Summary
This migration fixes the Reports module to:
1. Use correct date field per order type:
   - **Sales & Service**: `due_date` (expected delivery date)
   - **Recon & CarWash**: `completed_at` (actual completion date)
2. Add service filter capability (include/exclude specific services like "New Pics")
3. Add `total_volume` metric (count of services, not orders)

## Deployment Options

### Option 1: Supabase Dashboard (Recommended)

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy the ENTIRE contents of the migration file:
   - File: `supabase/migrations/20251103000005_fix_reports_by_order_type.sql`
5. Paste into the SQL Editor
6. Click **Run** (or press Ctrl+Enter / Cmd+Enter)
7. Verify you see "Success. No rows returned" or similar success message

### Option 2: Supabase CLI

If you have Supabase CLI installed and authenticated:

```bash
# Login first (if not already logged in)
npx supabase login

# Apply all pending migrations
npx supabase db push
```

### Option 3: Direct psql Connection

If you have PostgreSQL client installed:

```bash
# Get your connection string from Supabase Dashboard > Project Settings > Database
psql "YOUR_CONNECTION_STRING_HERE" -f supabase/migrations/20251103000005_fix_reports_by_order_type.sql
```

## Verification Steps

After applying the migration, verify it worked:

1. Go to **SQL Editor** in Supabase Dashboard
2. Run this query to check the functions exist:

```sql
SELECT
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('get_orders_analytics', 'get_revenue_analytics', 'get_performance_trends')
ORDER BY p.proname;
```

You should see:
- `get_orders_analytics` with 6 parameters (including `p_service_id`)
- `get_revenue_analytics` with 5 parameters (including `p_service_id`)
- `get_performance_trends` with 4 parameters (including `p_service_id`)

## Expected Results

After successful deployment:

1. ✅ **Total Volume** will show the count of services (order with 2 services = 2 volume)
2. ✅ **Total Orders** will show 16 (correct count of orders)
3. ✅ **Date filtering** will use:
   - `due_date` for Sales and Service orders
   - `completed_at` for Recon and CarWash orders
4. ✅ **Service filter** dropdown will appear in Reports filters
5. ✅ Orders appear based on correct date field per order type
6. ✅ "New Pics" service can be included/excluded via the service filter

## Rollback (if needed)

If you need to rollback to the previous version:

```sql
-- This will restore the previous functions from migration 20251103000004
-- (Copy the CREATE FUNCTION statements from that file)
```

## Troubleshooting

### Error: "function name not unique"
- The migration already includes DROP FUNCTION statements
- If you still see this error, manually run:
```sql
DROP FUNCTION IF EXISTS get_orders_analytics(INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_revenue_analytics(INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, TEXT);
DROP FUNCTION IF EXISTS get_performance_trends(INTEGER, TIMESTAMPTZ, TIMESTAMPTZ);
```

### Error: "permission denied"
- Make sure you're connected as the database owner or postgres role
- In Supabase Dashboard, you should have full permissions

## Support
If you encounter any issues, check:
1. Supabase Dashboard > Database > Logs
2. Browser console for any frontend errors
3. Verify the migration file is complete and not corrupted
