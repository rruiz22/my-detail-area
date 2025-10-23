# 🔄 Migration Guide: Enhanced Work Items Status System

## 📋 Overview

This guide walks you through the safe migration of work items from the old 4-status system to the new enhanced 9-status system.

### Status Mapping

| Old Status | New Status | Condition |
|------------|------------|-----------|
| `pending` | `awaiting_approval` | When `approval_required = true` |
| `pending` | `ready` | When `approval_required = false` OR `approval_status = 'approved'` |
| `declined` | `rejected` | Always |
| `in_progress` | `in_progress` | No change |
| `completed` | `completed` | No change |

### New Statuses Available

- ✅ `awaiting_approval` - Waiting for approval
- ✅ `rejected` - Rejected by approver
- ✅ `ready` - Approved or no approval needed, ready to start
- ✅ `scheduled` - Scheduled for future date
- ✅ `in_progress` - Active work in progress
- ✅ `on_hold` - Temporarily paused
- ✅ `blocked` - Blocked by dependencies
- ✅ `completed` - Successfully completed
- ✅ `cancelled` - Permanently cancelled

---

## 🚀 Pre-Migration Checklist

- [ ] **Backup database** - Create a full database backup
- [ ] **Notify team** - Inform users about the upcoming changes
- [ ] **Test in staging** - Run migration in staging environment first
- [ ] **Review migration scripts** - Part 1 and Part 2 (see below)
  - `supabase/migrations/20250123000001_enhance_work_items_status_PART1_add_enums.sql`
  - `supabase/migrations/20250123000002_enhance_work_items_status_PART2_migrate_data.sql`
- [ ] **Schedule maintenance window** - Plan for minimal downtime
- [ ] **Document current state** - Take screenshots of current work items

---

## 📝 Migration Steps

### Step 1: Backup Current Database

```bash
# Using Supabase CLI
supabase db dump -f backup_pre_work_items_migration_$(date +%Y%m%d).sql

# Or using pg_dump directly
pg_dump -h your-db-host -U postgres -d your-db-name -F c -b -v -f backup_pre_migration.dump
```

### Step 2: Review Current Work Items

```sql
-- Check current status distribution
SELECT
    status,
    approval_required,
    COUNT(*) as count
FROM get_ready_work_items
GROUP BY status, approval_required
ORDER BY status, approval_required;

-- Expected output example:
-- status       | approval_required | count
-- ------------+-------------------+-------
-- pending     | false             | 15
-- pending     | true              | 8
-- in_progress | false             | 12
-- completed   | false             | 45
-- declined    | true              | 3
```

### Step 3: Run Migration - TWO PARTS (CRITICAL!)

**⚠️ IMPORTANT: This migration is split into 2 parts due to PostgreSQL ENUM transaction boundaries.**

PostgreSQL requires ENUM values to be committed before they can be used. Therefore, we run Part 1, let it commit, then run Part 2.

#### Part 1: Add ENUM values and columns

```bash
# Navigate to project directory
cd c:/Users/rudyr/apps/mydetailarea

# Apply Part 1 ONLY
supabase db push

# This will run: 20250123000001_enhance_work_items_status_PART1_add_enums.sql
# Wait for the migration to complete and commit
```

**What Part 1 does:**
- ✅ Adds 5 new columns (blocked_reason, on_hold_reason, etc.)
- ✅ Creates backup table
- ✅ Adds 7 new ENUM values (awaiting_approval, rejected, ready, scheduled, on_hold, blocked, cancelled)
- ✅ Creates performance indexes

**⏳ Wait for Part 1 to complete before proceeding!**

#### Part 2: Migrate existing data

```bash
# After Part 1 completes successfully, run Part 2
supabase db push

# This will run: 20250123000002_enhance_work_items_status_PART2_migrate_data.sql
```

**What Part 2 does:**
- ✅ Migrates `pending` + approval_required=true → `awaiting_approval`
- ✅ Migrates `pending` + approval_required=false → `ready`
- ✅ Migrates `declined` → `rejected`
- ✅ Preserves `in_progress` and `completed` (no change)
- ✅ Verifies migration integrity

### Step 4: Run Migration (Manual - If not using Supabase CLI)

```bash
# Connect to your Supabase database
psql -h db.your-project.supabase.co -U postgres -d postgres

# Run Part 1 first
\i supabase/migrations/20250123000001_enhance_work_items_status_PART1_add_enums.sql

# Wait for transaction to commit (automatic)

# Then run Part 2
\i supabase/migrations/20250123000002_enhance_work_items_status_PART2_migrate_data.sql
```

### Step 5: Verify Migration Success

```sql
-- Check new status distribution
SELECT
    status,
    COUNT(*) as count
FROM get_ready_work_items
GROUP BY status
ORDER BY
    CASE status
        WHEN 'awaiting_approval' THEN 1
        WHEN 'rejected' THEN 2
        WHEN 'ready' THEN 3
        WHEN 'scheduled' THEN 4
        WHEN 'in_progress' THEN 5
        WHEN 'on_hold' THEN 6
        WHEN 'blocked' THEN 7
        WHEN 'completed' THEN 8
        WHEN 'cancelled' THEN 9
    END;

-- Verify no orphaned statuses
SELECT COUNT(*)
FROM get_ready_work_items
WHERE status NOT IN (
    'awaiting_approval',
    'rejected',
    'ready',
    'scheduled',
    'in_progress',
    'on_hold',
    'blocked',
    'completed',
    'cancelled'
);
-- Should return: 0

-- Check backup table exists
SELECT COUNT(*) FROM get_ready_work_items_backup_pre_status_migration;
```

### Step 6: Test Application

- [ ] Login to the application
- [ ] Navigate to Get Ready module
- [ ] View Work Items tab
- [ ] Verify all status badges display correctly
- [ ] Test creating a new work item (should use new statuses)
- [ ] Test status transitions:
  - [ ] Approve → should move to `ready`
  - [ ] Reject → should move to `rejected`
  - [ ] Start → should move to `in_progress`
  - [ ] Pause → should move to `on_hold`
  - [ ] Resume → should return to `in_progress`
  - [ ] Block → should move to `blocked`
  - [ ] Unblock → should return to `in_progress`
  - [ ] Complete → should move to `completed`
  - [ ] Cancel → should move to `cancelled`

---

## 🔍 Monitoring Post-Migration

### Day 1: Initial Monitoring

```sql
-- Monitor status distribution hourly
SELECT
    status,
    COUNT(*) as count,
    MAX(updated_at) as last_updated
FROM get_ready_work_items
GROUP BY status;

-- Check for any errors in status transitions
SELECT
    id,
    title,
    status,
    approval_status,
    updated_at
FROM get_ready_work_items
WHERE
    (status = 'awaiting_approval' AND approval_status = 'approved')
    OR (status = 'ready' AND approval_status IS NULL AND approval_required = true);
```

### Week 1: Detailed Analysis

```sql
-- Analyze new status usage
SELECT
    status,
    COUNT(*) as total,
    COUNT(CASE WHEN DATE(updated_at) >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as last_7_days
FROM get_ready_work_items
GROUP BY status
ORDER BY total DESC;

-- Check reason fields utilization
SELECT
    'blocked' as reason_type,
    COUNT(CASE WHEN blocked_reason IS NOT NULL THEN 1 END) as with_reason,
    COUNT(CASE WHEN blocked_reason IS NULL THEN 1 END) as without_reason
FROM get_ready_work_items
WHERE status = 'blocked'

UNION ALL

SELECT
    'on_hold',
    COUNT(CASE WHEN on_hold_reason IS NOT NULL THEN 1 END),
    COUNT(CASE WHEN on_hold_reason IS NULL THEN 1 END)
FROM get_ready_work_items
WHERE status = 'on_hold'

UNION ALL

SELECT
    'cancelled',
    COUNT(CASE WHEN cancelled_reason IS NOT NULL THEN 1 END),
    COUNT(CASE WHEN cancelled_reason IS NULL THEN 1 END)
FROM get_ready_work_items
WHERE status = 'cancelled';
```

---

## ⚠️ Rollback Procedure (Emergency Only)

**⚠️ WARNING: Only use if critical issues are discovered**

### Quick Rollback

```sql
-- Step 1: Restore status values from backup
UPDATE get_ready_work_items wi
SET
    status = backup.status,
    updated_at = NOW()
FROM get_ready_work_items_backup_pre_status_migration backup
WHERE wi.id = backup.id;

-- Step 2: Remove new columns
ALTER TABLE get_ready_work_items DROP COLUMN IF EXISTS blocked_reason;
ALTER TABLE get_ready_work_items DROP COLUMN IF EXISTS on_hold_reason;
ALTER TABLE get_ready_work_items DROP COLUMN IF EXISTS cancelled_reason;
ALTER TABLE get_ready_work_items DROP COLUMN IF EXISTS cancelled_by;
ALTER TABLE get_ready_work_items DROP COLUMN IF EXISTS cancelled_at;

-- Step 3: Restore old CHECK constraint
ALTER TABLE get_ready_work_items DROP CONSTRAINT IF EXISTS get_ready_work_items_status_check;
ALTER TABLE get_ready_work_items
ADD CONSTRAINT get_ready_work_items_status_check
CHECK (status IN ('pending', 'in_progress', 'completed', 'declined'));

-- Step 4: Drop indexes
DROP INDEX IF EXISTS idx_get_ready_work_items_status;
DROP INDEX IF EXISTS idx_get_ready_work_items_cancelled;
DROP INDEX IF EXISTS idx_get_ready_work_items_blocked;

-- Step 5: Verify rollback
SELECT status, COUNT(*) FROM get_ready_work_items GROUP BY status;
```

### After Rollback

1. Investigate the issue that caused rollback
2. Fix the problem in code
3. Test thoroughly in staging
4. Schedule new migration attempt

---

## 🧹 Cleanup (After 30 Days of Successful Operation)

```sql
-- Remove backup table (only after confirming everything works)
DROP TABLE IF EXISTS get_ready_work_items_backup_pre_status_migration;

-- Vacuum to reclaim space
VACUUM ANALYZE get_ready_work_items;
```

---

## 📊 Success Metrics

### Migration is Successful When:

- [ ] All work items have valid status values (9 allowed statuses)
- [ ] No errors reported by users
- [ ] Status transitions work correctly in UI
- [ ] Translations display properly in all 3 languages (EN/ES/PT-BR)
- [ ] Performance is acceptable (queries under 100ms)
- [ ] No data loss (total count matches pre-migration)

### Performance Benchmarks

```sql
-- Query performance test (should be under 100ms)
EXPLAIN ANALYZE
SELECT *
FROM get_ready_work_items
WHERE vehicle_id = 'test-vehicle-id'
ORDER BY created_at DESC;

-- Index usage verification
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename = 'get_ready_work_items';
```

---

## 🆘 Support & Troubleshooting

### Common Issues

#### Issue 1: Some work items still showing "pending"

**Cause**: Migration didn't complete
**Solution**:
```sql
-- Check for remaining 'pending' statuses
SELECT COUNT(*) FROM get_ready_work_items WHERE status = 'pending';

-- Manually migrate remaining if needed
UPDATE get_ready_work_items
SET status = CASE
    WHEN approval_required = true THEN 'awaiting_approval'
    ELSE 'ready'
END
WHERE status = 'pending';
```

#### Issue 2: UI not showing new statuses

**Cause**: Frontend cache not cleared
**Solution**:
1. Hard refresh browser (Ctrl+Shift+R)
2. Clear localStorage
3. Restart dev server: `npm run dev`

#### Issue 3: Status transitions not working

**Cause**: Hooks not properly updated
**Solution**:
1. Check browser console for errors
2. Verify hooks are imported correctly in VehicleWorkItemsTab
3. Check network tab for API errors

---

## 📞 Contact

If you encounter issues during migration:

1. **Check logs**: Review Supabase logs for SQL errors
2. **Backup first**: Always have a recent backup before attempting fixes
3. **Test in staging**: Never run untested fixes in production
4. **Document issues**: Take screenshots and save error messages

---

## ✅ Post-Migration Checklist

- [ ] Migration completed without errors
- [ ] All work items have valid statuses
- [ ] UI displays new statuses correctly
- [ ] Status transitions work in all 3 languages
- [ ] Performance is acceptable
- [ ] Team has been trained on new statuses
- [ ] Documentation updated
- [ ] Backup table exists for rollback
- [ ] Monitoring in place for 30 days
- [ ] Schedule cleanup after 30 days

---

**Migration Date**: _______________
**Executed By**: _______________
**Rollback Required**: ☐ Yes ☐ No
**Issues Encountered**: _______________
**Notes**: _______________
