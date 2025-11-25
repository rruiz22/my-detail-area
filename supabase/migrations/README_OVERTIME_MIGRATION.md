# Overtime Calculation Migration - 8h Daily → 40h Weekly

## 📋 Overview

This migration changes the Detail Hub Timecards overtime calculation from:
- **OLD**: Overtime after 8 hours per DAY
- **NEW**: Overtime after 40 hours per WEEK (Monday-Sunday)

**Migration File**: `20251125145626_overtime_weekly_calculation.sql`

---

## 🎯 Business Rules

### Week Definition
- **Start**: Monday 00:00:00
- **End**: Sunday 23:59:59
- **Timezone**: Uses `clock_in` timestamptz field

### Overtime Calculation
- First **40 hours per week** = `regular_hours`
- Hours **beyond 40** = `overtime_hours`
- Hours distributed **chronologically** (earlier clock-ins get regular hours first)

### Special Cases
- **Partial weeks** (new hires): Get full 40h allowance
- **Disputed entries**: Excluded from overtime calculations
- **Retroactive edits**: Editing any day recalculates entire week automatically

---

## 📦 What This Migration Does

### 1. Creates New Function: `calculate_weekly_overtime()`
```sql
calculate_weekly_overtime(employee_id, week_start_date, dealership_id)
```
- Queries all time entries for an employee in a given week
- Calculates total weekly hours
- Distributes first 40h as regular, rest as overtime
- Updates ALL entries in that week

### 2. Modifies Existing Trigger: `calculate_time_entry_hours()`
- **OLD**: Calculated OT after 8h daily
- **NEW**: Calls `calculate_weekly_overtime()` after each clock-out
- Automatically recalculates entire week when ANY day is edited

### 3. Adds Performance Index
```sql
idx_time_entries_employee_week (employee_id, clock_in, dealership_id)
```
- Optimizes weekly queries
- Critical for performance since every clock-out queries all entries for that week

### 4. Backfills Historical Data
- Recalculates `regular_hours` and `overtime_hours` for all existing records
- Processes all employee-week combinations
- Logs progress every 100 weeks

### 5. Creates Helper View: `detail_hub_weekly_hours`
- Shows weekly totals per employee
- Useful for payroll reports and analytics
- Auto-updates when underlying data changes

---

## 🚀 How to Apply This Migration

### Option A: Using Supabase CLI (Recommended)

```bash
# 1. Link to your project (if not already linked)
supabase link --project-ref swfnnrpzpkdypbrzmgnr

# 2. Apply migration to remote database
supabase db push

# 3. Verify migration was applied
supabase migration list --linked
```

### Option B: Using Supabase Dashboard

1. Go to https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr
2. Navigate to: **SQL Editor**
3. Click: **+ New query**
4. Copy-paste the contents of `20251125145626_overtime_weekly_calculation.sql`
5. Click: **Run** (Ctrl+Enter)
6. Verify success messages in output

### Option C: Using MCP Tool (From Claude Code)

```typescript
// Using Supabase MCP server
mcp__supabase__apply_migration({
  name: "overtime_weekly_calculation",
  query: "-- contents of 20251125145626_overtime_weekly_calculation.sql"
})
```

---

## 🧪 Testing Checklist

### Pre-Migration
- [ ] Backup database: `supabase db dump -f backup_before_overtime_migration.sql`
- [ ] Document current total overtime hours (for validation)
```sql
SELECT SUM(overtime_hours) FROM detail_hub_time_entries;
-- Result: ______ hours
```

### During Migration
- [ ] Watch for errors in migration output
- [ ] Verify backfill completed successfully
- [ ] Check that all employee-weeks were processed

### Post-Migration
- [ ] Verify migration applied:
```sql
-- Should show the new migration
SELECT * FROM supabase_migrations.schema_migrations
WHERE version = '20251125145626';
```

- [ ] Test new function exists:
```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'calculate_weekly_overtime';
-- Should return 1 row
```

- [ ] Test view exists:
```sql
SELECT * FROM detail_hub_weekly_hours LIMIT 5;
-- Should return weekly summaries
```

- [ ] Validate overtime calculations:
```sql
-- Get a week where total > 40h
SELECT * FROM detail_hub_weekly_hours
WHERE total_hours > 40
LIMIT 1;

-- Verify: total_regular_hours should be 40, total_overtime_hours = total - 40
```

---

## 🔍 Test Scenarios

### Test 1: Exactly 40 Hours
**Setup**: Employee works exactly 40h in a week
**Expected**:
- `total_hours` = 40.00
- `regular_hours` = 40.00 (sum of all entries)
- `overtime_hours` = 0.00

```sql
-- Create test data
INSERT INTO detail_hub_time_entries (...)
VALUES
  (Monday 8h),
  (Tuesday 8h),
  (Wednesday 8h),
  (Thursday 8h),
  (Friday 8h);

-- Verify
SELECT SUM(regular_hours), SUM(overtime_hours)
FROM detail_hub_time_entries
WHERE employee_id = <test_employee>;
-- Expected: 40.00 regular, 0.00 OT
```

### Test 2: Over 40 Hours
**Setup**: Employee works 45h in a week
**Expected**:
- `total_hours` = 45.00
- `regular_hours` = 40.00
- `overtime_hours` = 5.00

```sql
-- Example distribution (chronological):
Monday:    10h → 10h regular + 0h OT
Tuesday:   10h → 10h regular + 0h OT
Wednesday: 10h → 10h regular + 0h OT
Thursday:  10h → 10h regular + 0h OT
Friday:     5h → 0h regular + 5h OT
```

### Test 3: Retroactive Edit
**Setup**: Employee has 40h for the week, then Monday is edited from 8h to 10h
**Expected**:
- Entire week recalculates automatically
- New total: 42h (40h regular + 2h OT)
- The 2h OT should appear on the LAST entry chronologically (Friday)

```sql
-- Before edit
SELECT * FROM detail_hub_time_entries WHERE employee_id = <test>;
-- Mon 8h, Tue 8h, Wed 8h, Thu 8h, Fri 8h = 40h total, 0 OT

-- Edit Monday to 10h
UPDATE detail_hub_time_entries
SET clock_out = clock_in + INTERVAL '10 hours'
WHERE ... Monday entry;

-- After edit (trigger recalculates)
SELECT * FROM detail_hub_time_entries WHERE employee_id = <test>;
-- Mon 10h (10 reg + 0 OT)
-- Tue 8h (8 reg + 0 OT)
-- Wed 8h (8 reg + 0 OT)
-- Thu 8h (8 reg + 0 OT)
-- Fri 8h (6 reg + 2 OT) ← Changed!
```

### Test 4: Partial Week (New Hire)
**Setup**: Employee starts Wednesday, works 45h (Wed-Sun)
**Expected**:
- Still gets full 40h regular allowance
- `regular_hours` = 40.00
- `overtime_hours` = 5.00

---

## 📊 Monitoring Queries

### Weekly Overtime Summary
```sql
SELECT
  week_start::date as week,
  COUNT(DISTINCT employee_id) as employees,
  SUM(total_hours) as total_hours,
  SUM(total_regular_hours) as regular_hours,
  SUM(total_overtime_hours) as overtime_hours,
  ROUND(SUM(total_overtime_hours) / SUM(total_hours) * 100, 1) as ot_percentage
FROM detail_hub_weekly_hours
WHERE week_start >= NOW() - INTERVAL '4 weeks'
GROUP BY week_start
ORDER BY week_start DESC;
```

### Employees with Most Overtime
```sql
SELECT
  p.full_name,
  w.week_start::date,
  w.total_hours,
  w.total_overtime_hours,
  ROUND(w.total_overtime_hours / w.total_hours * 100, 1) as ot_pct
FROM detail_hub_weekly_hours w
JOIN profiles p ON p.id = w.employee_id
WHERE w.week_start >= NOW() - INTERVAL '4 weeks'
  AND w.total_overtime_hours > 0
ORDER BY w.total_overtime_hours DESC
LIMIT 20;
```

### Verify No Daily OT (Should Return 0 Rows)
```sql
-- This query checks if any single entry has OT but daily total < 8h
-- Should return ZERO rows after migration
SELECT
  id,
  employee_id,
  clock_in::date as day,
  total_hours,
  regular_hours,
  overtime_hours
FROM detail_hub_time_entries
WHERE overtime_hours > 0
  AND total_hours <= 8
  AND clock_out IS NOT NULL;
-- Expected: 0 rows (no OT on days under 8h)
```

---

## 🔄 Rollback Plan

If you need to rollback this migration:

```sql
-- WARNING: This will revert to 8h daily overtime calculation

-- 1. Drop new function
DROP FUNCTION IF EXISTS calculate_weekly_overtime(UUID, TIMESTAMPTZ, UUID);

-- 2. Restore old trigger function
CREATE OR REPLACE FUNCTION calculate_time_entry_hours()
RETURNS TRIGGER AS $$
DECLARE
  v_work_hours NUMERIC;
BEGIN
  -- Calculate work hours
  v_work_hours := (EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) - COALESCE(NEW.break_duration_minutes, 0) * 60) / 3600.0;

  -- OLD LOGIC: 8h daily threshold
  IF v_work_hours <= 8 THEN
    NEW.regular_hours := ROUND(v_work_hours, 2);
    NEW.overtime_hours := 0;
  ELSE
    NEW.regular_hours := 8;
    NEW.overtime_hours := ROUND(v_work_hours - 8, 2);
  END IF;

  NEW.total_hours := ROUND(v_work_hours, 2);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Drop index (optional)
DROP INDEX IF EXISTS idx_time_entries_employee_week;

-- 4. Drop view
DROP VIEW IF EXISTS detail_hub_weekly_hours;

-- 5. Recalculate all records with old logic
UPDATE detail_hub_time_entries
SET
  regular_hours = CASE
    WHEN total_hours <= 8 THEN total_hours
    ELSE 8
  END,
  overtime_hours = CASE
    WHEN total_hours <= 8 THEN 0
    ELSE total_hours - 8
  END
WHERE clock_out IS NOT NULL;
```

---

## 📞 Support

If you encounter issues:

1. **Check migration logs**:
```bash
supabase functions logs --tail
```

2. **Verify trigger is working**:
```sql
-- Create a test entry and verify it calculates correctly
```

3. **Contact**: Detail Hub development team

---

## ✅ Migration Checklist

- [ ] Read this entire README
- [ ] Backup database
- [ ] Apply migration
- [ ] Run all test scenarios
- [ ] Verify overtime calculations are correct
- [ ] Monitor for 48 hours
- [ ] Update team on new overtime rules

**Date Applied**: __________________
**Applied By**: __________________
**Verified By**: __________________
