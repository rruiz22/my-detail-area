# Kiosk 400 Error - Root Cause Analysis

## 🎯 Executive Summary

The 400 Bad Request error when creating kiosks is caused by **missing database schema** - the `detail_hub_kiosks` table migration was never applied to production.

## 📋 Diagnostic Results

### Test 1: INSERT with full payload (as app does)
```
❌ Error Code: PGRST204
❌ Message: Could not find the 'camera_status' column of 'detail_hub_kiosks' in the schema cache
```

### Test 2: INSERT with minimal payload
```
❌ Error Code: 42501
❌ Message: new row violates row-level security policy for table "detail_hub_kiosks"
```

### Test 3: SELECT existing kiosks
```
✅ Query succeeds (table exists)
⚠️  Result: 0 rows (table is empty)
⚠️  Cannot determine columns without data
```

## 🔍 Root Causes

### Primary Issue: Missing Columns
The table exists but is missing critical columns defined in migration `20251117000003_create_detail_hub_kiosks.sql`:

**Missing columns:**
- `camera_status` (ENUM: detail_hub_camera_status)
- Possibly `status` (ENUM: detail_hub_kiosk_status)
- Possibly other columns defined in the migration

**Evidence:**
- PGRST204 error specifically mentions `camera_status` column not found in schema cache
- Application code in `KioskManager.tsx:131-132` attempts to insert these values:
  ```typescript
  status: 'offline',
  camera_status: 'inactive'
  ```

### Secondary Issue: RLS Policies Not Configured
Even with minimal payload (dealership_id, kiosk_code, name), INSERT fails with:
- **Error Code**: 42501 (insufficient_privilege)
- **Message**: "new row violates row-level security policy"

**Evidence:**
- RLS is enabled on the table
- No valid INSERT policy exists OR
- Current user session is not authenticated OR
- User role doesn't match policy requirements

## 📁 Files Analysis

### Migration File
**Location:** `supabase/migrations/20251117000003_create_detail_hub_kiosks.sql`

**Defines:**
```sql
CREATE TYPE detail_hub_kiosk_status AS ENUM ('online', 'offline', 'warning', 'maintenance');
CREATE TYPE detail_hub_camera_status AS ENUM ('active', 'inactive', 'error');

CREATE TABLE detail_hub_kiosks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealership_id INTEGER NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  kiosk_code TEXT NOT NULL,
  name TEXT NOT NULL,
  status detail_hub_kiosk_status NOT NULL DEFAULT 'offline',
  camera_status detail_hub_camera_status NOT NULL DEFAULT 'inactive',
  -- ... 20+ more columns
);

-- RLS Policies:
-- - "Users can view kiosks from their dealerships"
-- - "Managers can insert kiosks" (requires dealer_admin, dealer_manager, or system_admin role)
-- - "Managers can update kiosks"
-- - "Admins can delete kiosks"
```

### Application Code
**Location:** `src/hooks/useDetailHubKiosks.tsx:117-151`

**Attempts to insert:**
```typescript
export function useCreateKiosk() {
  return useMutation({
    mutationFn: async (kioskData: Partial<DetailHubKiosk>) => {
      const { data, error } = await supabase
        .from('detail_hub_kiosks')
        .insert({
          ...kioskData,
          dealership_id: kioskData.dealership_id || selectedDealerId,
        })
        .select()
        .single();
      // ...
    }
  });
}
```

**Called from:** `src/components/detail-hub/KioskManager.tsx:108-139`

## ✅ Solution

### Option 1: Apply Missing Migration (RECOMMENDED)

Apply the complete migration that creates the table with all required columns and RLS policies:

```bash
# Apply via Supabase Dashboard > SQL Editor
supabase/migrations/20251117000003_create_detail_hub_kiosks.sql
```

**Why this is recommended:**
- Creates ALL required columns (30+ columns)
- Creates ENUM types (detail_hub_kiosk_status, detail_hub_camera_status)
- Sets up proper RLS policies
- Creates indexes for performance
- Adds helper functions (update_kiosk_heartbeat, increment_kiosk_punch_counter)
- Maintains schema consistency with application code

### Option 2: Partial Schema Fix (NOT RECOMMENDED)

Manually add missing columns via ALTER TABLE:

```sql
-- Add missing ENUM types
CREATE TYPE detail_hub_kiosk_status AS ENUM ('online', 'offline', 'warning', 'maintenance');
CREATE TYPE detail_hub_camera_status AS ENUM ('active', 'inactive', 'error');

-- Add missing columns
ALTER TABLE detail_hub_kiosks
ADD COLUMN IF NOT EXISTS status detail_hub_kiosk_status NOT NULL DEFAULT 'offline',
ADD COLUMN IF NOT EXISTS camera_status detail_hub_camera_status NOT NULL DEFAULT 'inactive';
-- ... add all other missing columns
```

**Why NOT recommended:**
- Error-prone (easy to miss columns)
- Doesn't create indexes, triggers, or helper functions
- Doesn't set up RLS policies correctly
- High risk of schema drift

### Option 3: Check if Table Needs Recreation

It's possible the table exists from an earlier incomplete migration. Check:

```sql
-- Check if table exists and what columns it has
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'detail_hub_kiosks'
ORDER BY ordinal_position;

-- If table exists but is incomplete, DROP and recreate:
DROP TABLE IF EXISTS detail_hub_kiosks CASCADE;
-- Then apply full migration
```

## 📊 Verification Steps

After applying migration, verify:

### 1. Check ENUM types exist
```sql
SELECT typname, enumlabel
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE typname IN ('detail_hub_kiosk_status', 'detail_hub_camera_status')
ORDER BY typname, enumsortorder;
```

### 2. Check table schema
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'detail_hub_kiosks'
ORDER BY ordinal_position;
```

### 3. Check RLS policies
```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'detail_hub_kiosks'
ORDER BY cmd, policyname;
```

### 4. Test INSERT (as authenticated user with dealer_admin role)
```typescript
// From application (after signing in as rruiz@lima.llc)
const { data, error } = await supabase
  .from('detail_hub_kiosks')
  .insert({
    dealership_id: 1,
    kiosk_code: 'KIOSK-001',
    name: 'Main Entrance',
    status: 'offline',
    camera_status: 'inactive'
  })
  .select()
  .single();

console.log('Success:', data);
console.log('Error:', error);
```

## 🔧 Implementation Steps

### Immediate Fix (5 minutes)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr
   - Navigate to: SQL Editor

2. **Copy migration content**
   - File: `supabase/migrations/20251117000003_create_detail_hub_kiosks.sql`
   - Copy entire content (243 lines)

3. **Execute migration**
   - Paste into SQL Editor
   - Click "Run"
   - Verify success message

4. **Test from application**
   - Sign in as rruiz@lima.llc
   - Navigate to DetailHub → Kiosk Manager
   - Click "Add Kiosk"
   - Fill form and submit
   - Should succeed without 400 error

### Alternative: Apply via Supabase CLI (if installed)

```bash
# From project root
supabase db push

# Or apply specific migration
supabase migration up --db-url "postgresql://postgres:YOUR_PASSWORD@db.swfnnrpzpkdypbrzmgnr.supabase.co:5432/postgres"
```

## 📝 Prevention

To prevent this issue in future:

1. **Migration tracking**: Maintain a migration log in Notion/MCP
2. **Schema validation**: Add pre-deployment schema checks
3. **CI/CD integration**: Auto-apply migrations on deploy
4. **Schema tests**: Add tests that verify table schemas match TypeScript types

## 🚨 Related Issues

This same pattern (migrations not applied) may affect other DetailHub tables:
- `detail_hub_employees` (migration: 20251117000001)
- `detail_hub_schedules` (migration: 20251117000005)
- `detail_hub_time_punches` (migration: 20251117000002)
- `detail_hub_punch_photos` (migration: 20251117000004)

**Recommendation:** Audit all DetailHub migrations to ensure they're applied to production.

---

**Status:** ✅ Root cause identified
**Severity:** 🔴 Critical (blocks kiosk creation)
**Priority:** P0 (immediate fix required)
**Time to fix:** 5-10 minutes (apply migration)
