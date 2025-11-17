# Apply Trigger Fixes - Manual Instructions

## ❌ Issues Being Fixed

The Get Ready module had errors when trying to:
1. **Start a work item**: `record "old" has no field "vendor_id"`
   ✅ **Fixed**: Changed to `assigned_vendor_id`

2. **Start a work item**: `record "old" has no field "due_date"`
   ✅ **Fixed**: Changed to `scheduled_end`

3. **Complete a work item**: `record "new" has no field "completed_at"`
   ✅ **Fixed**: Changed to `actual_end`

## 🎯 Option 1: Automatic Application (Preferred)

If you have the Supabase service role key:

```powershell
# Set your service role key (get it from Supabase Dashboard > Settings > API)
$env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"

# Run the migration script
npm run migration:fix-triggers
```

## 📝 Option 2: Manual Application via Supabase Dashboard

### Step 1: Access SQL Editor
1. Go to [Supabase SQL Editor](https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/sql/new)
2. Make sure you're logged in

### Step 2: Apply Migration 1 - Fix vendor_id
1. Open file: `supabase/migrations/20251105000000_fix_vendor_id_column_name.sql`
2. Copy the entire SQL content
3. Paste into the SQL Editor
4. Click **RUN** button
5. Wait for success message ✅

### Step 3: Apply Migration 2 - Fix due_date and cost_estimate
1. Open file: `supabase/migrations/20251105000001_fix_work_item_field_triggers.sql`
2. Copy the entire SQL content
3. Paste into the SQL Editor (new query)
4. Click **RUN** button
5. Wait for success message ✅

### Step 4: Apply Migration 3 - Fix completed_at
1. Open file: `supabase/migrations/20251105000002_fix_completed_at_field_name.sql`
2. Copy the entire SQL content
3. Paste into the SQL Editor (new query)
4. Click **RUN** button
5. Wait for success message ✅

## ✅ Verification

After applying all migrations:

1. Refresh your application (F5)
2. Go to **Get Ready** module
3. Select a vehicle with work items
4. Try to:
   - **Start a work item** ✅ Should work without errors
   - **Complete a work item** ✅ Should work without errors
   - **Assign/remove vendor** ✅ Should work without errors

## 🐛 Troubleshooting

### "Already exists" errors
If you see errors like "function already exists" or "trigger already exists", this is **NORMAL**. The migrations use `DROP ... IF EXISTS` to ensure idempotency.

### Still seeing errors?
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh (Ctrl+F5)
3. Check browser console for any remaining errors
4. If errors persist, check that all 3 migrations were applied successfully

## 📚 What Changed?

### Database Trigger Fixes

**Before** (❌ Incorrect column names):
- `OLD.vendor_id` → **ERROR**: Column doesn't exist
- `OLD.due_date` → **ERROR**: Column doesn't exist
- `NEW.completed_at` → **ERROR**: Column doesn't exist

**After** (✅ Correct column names):
- `OLD.assigned_vendor_id` → Works correctly
- `OLD.scheduled_end` → Works correctly
- `NEW.actual_end` → Works correctly

### Functions Updated
- `log_vendor_removal()` - Fixed vendor field references
- `log_work_item_field_updates()` - Fixed date and cost field references
- `log_work_item_activities()` - Fixed completion tracking

## 🎉 Success!

Once all migrations are applied, the Get Ready module will work without errors:
- ✅ Start work items
- ✅ Complete work items
- ✅ Track vendor assignments
- ✅ Activity log captures all changes correctly

---

**Need help?** Check the console logs in your browser's Developer Tools (F12) for any remaining errors.
