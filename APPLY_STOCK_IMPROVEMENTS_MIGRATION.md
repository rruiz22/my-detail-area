# Stock Module Improvements - Migration Instructions

## Overview
This migration adds the `dealer_dms_config` table for DMS integration configuration and connects both `StockSyncHistory` and `StockDMSConfig` components to real data.

## Prerequisites
- Database access to your Supabase project
- Admin permissions to create tables and policies

## Migration Steps

### Step 1: Apply Database Migration

Execute the SQL script to create the `dealer_dms_config` table:

```bash
# Using Supabase CLI
supabase db execute --file CREATE_DEALER_DMS_CONFIG_TABLE.sql

# Or manually in Supabase Dashboard
# Go to SQL Editor and paste the contents of CREATE_DEALER_DMS_CONFIG_TABLE.sql
```

### Step 2: Verify Table Creation

Run this query to verify the table was created successfully:

```sql
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'dealer_dms_config'
ORDER BY ordinal_position;
```

Expected columns:
- `id` (uuid)
- `dealer_id` (bigint)
- `dms_provider` (text)
- `auto_sync_enabled` (boolean)
- `sync_frequency` (text)
- `last_sync_at` (timestamptz)
- `sync_settings` (jsonb)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### Step 3: Verify RLS Policies

Check that RLS policies were created:

```sql
SELECT
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE tablename = 'dealer_dms_config';
```

Expected policies:
- `Users can view DMS config for their dealerships` (SELECT)
- `Admins can update DMS config` (UPDATE)
- `Admins can insert DMS config` (INSERT)
- `Admins can delete DMS config` (DELETE)

### Step 4: (Optional) Regenerate TypeScript Types

If you're using Supabase CLI, regenerate TypeScript types:

```bash
supabase gen types typescript --local > src/integrations/supabase/types.ts
# or
supabase gen types typescript --project-id <your-project-id> > src/integrations/supabase/types.ts
```

## Changes Summary

### 1. StockSyncHistory Component
**File**: `src/components/stock/StockSyncHistory.tsx`

**Changes**:
- ✅ Connected to `dealer_inventory_sync_log` table
- ✅ Loads real sync history data
- ✅ Supports filtering by status and type
- ✅ Displays actual sync results from CSV uploads
- ✅ Limits display to 50 most recent sync logs

**Benefits**:
- Users can see actual sync history
- Troubleshoot failed syncs
- Track processing metrics

### 2. StockDMSConfig Component
**File**: `src/components/stock/StockDMSConfig.tsx`

**Changes**:
- ✅ Connected to new `dealer_dms_config` table
- ✅ Loads existing configuration or shows defaults
- ✅ Saves configuration to database (upsert logic)
- ✅ Enforces admin permissions
- ✅ Shows loading states

**Benefits**:
- Persist DMS settings per dealer
- Configure auto-sync preferences
- Store API credentials securely (JSONB field)

### 3. Database Schema
**New Table**: `dealer_dms_config`

**Features**:
- Stores DMS provider settings
- Auto-sync configuration
- Flexible JSONB field for provider-specific settings
- RLS policies for security
- Automatic `updated_at` trigger
- One config per dealer (unique constraint)

## Testing Checklist

After applying the migration:

- [ ] Navigate to Stock > Sync History tab
- [ ] Verify sync history loads (or shows "No history" if none exists)
- [ ] Upload a CSV file and verify it appears in sync history
- [ ] Navigate to Stock > DMS Configuration tab
- [ ] Verify default configuration loads
- [ ] Change some settings and click "Save Configuration"
- [ ] Refresh page and verify settings persist
- [ ] Test with user without admin permissions (should see "No permission" alert)

## Rollback Instructions

If you need to rollback:

```sql
-- Drop the table and all related objects
DROP TABLE IF EXISTS public.dealer_dms_config CASCADE;

-- Drop the trigger function
DROP FUNCTION IF EXISTS public.update_dealer_dms_config_updated_at() CASCADE;
```

## Next Steps

After this migration is applied:

1. **Server-side Pagination**: Implement pagination in `StockInventoryTable` (next TODO)
2. **Refactor Upload**: Break down `uploadCSV` function into smaller units
3. **DMS Integration**: Implement actual DMS API connections (future feature)
4. **Auto-sync Jobs**: Create background jobs for auto-sync when enabled

## Notes

- The `sync_settings` JSONB field is flexible and can store provider-specific configuration
- API keys should be encrypted before storing (implement encryption in future update)
- Consider implementing rate limiting for test connection endpoint
- The table uses RLS policies - ensure users have proper module permissions

## Support

If you encounter issues:

1. Check Supabase logs for error messages
2. Verify RLS policies are enabled: `ALTER TABLE dealer_dms_config ENABLE ROW LEVEL SECURITY;`
3. Ensure user has module permission: `SELECT * FROM user_has_module_permission(auth.uid(), 'stock', 'admin');`
4. Check foreign key constraints are satisfied
