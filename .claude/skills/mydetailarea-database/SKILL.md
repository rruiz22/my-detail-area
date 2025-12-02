---
name: mydetailarea-database
description: Database optimization, security audit, and performance analysis for MyDetailArea Supabase/PostgreSQL. Provides safe query optimization, RLS policy review, index recommendations, and migration strategies with extreme caution and rollback plans. Use when optimizing database performance, auditing security, or creating safe migrations. CRITICAL - All recommendations require validation and testing before production.
license: MIT
---

# MyDetailArea Database Optimization & Security

⚠️ **CRITICAL SAFETY NOTICE** ⚠️

This skill provides database optimization and security recommendations with **EXTREME CAUTION**.

**NEVER apply changes without:**
1. ✅ Thorough testing in development environment
2. ✅ Rollback plan documented and tested
3. ✅ Database backup created
4. ✅ Team review and approval
5. ✅ Staged rollout (dev → staging → production)

---

## Purpose

Provide **safe, validated** database optimization and security recommendations specifically for the MyDetailArea Supabase/PostgreSQL database. All suggestions prioritize **security over performance** and include comprehensive testing and rollback strategies.

## When to Use

Use this skill when:
- Analyzing slow queries and performance bottlenecks
- Auditing Row Level Security (RLS) policies
- Creating safe database migrations
- Reviewing index strategies
- Detecting security vulnerabilities
- Optimizing JOIN-heavy queries
- Planning schema changes
- Setting up monitoring and alerts

**DO NOT use for:**
- ❌ Direct production database changes
- ❌ Untested performance "quick fixes"
- ❌ Security changes without peer review
- ❌ Migrations without rollback plans

---

## Database Architecture

### Technology Stack
- **Database:** Supabase (PostgreSQL 15+)
- **Auth:** Supabase Auth with JWT tokens
- **Real-time:** PostgreSQL logical replication
- **Security:** Row Level Security (RLS)
- **Migrations:** SQL files in `supabase/migrations/`

### Project Paths

All paths are absolute:
- **Migrations:** `C:\Users\rudyr\apps\mydetailarea\supabase\migrations\`
- **Schema:** Access via Supabase Dashboard or `supabase db dump`
- **Hooks:** `C:\Users\rudyr\apps\mydetailarea\src\hooks\`
- **Edge Functions:** `C:\Users\rudyr\apps\mydetailarea\supabase\functions\`

---

## 🔒 SECURITY PRINCIPLES (MANDATORY)

### Priority Order (Never Compromise)

1. **SECURITY** - Data protection and access control
2. **DATA INTEGRITY** - Prevent data loss or corruption
3. **AVAILABILITY** - System uptime and reliability
4. **PERFORMANCE** - Speed and efficiency

Performance optimization **MUST NEVER** compromise security or data integrity.

### Security Audit Checklist

Before ANY optimization:

```sql
-- ✅ VERIFY: All tables have RLS enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = false;
-- ⚠️ If any results: RLS NOT enabled - CRITICAL SECURITY ISSUE

-- ✅ VERIFY: All RLS policies are comprehensive
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';
-- ⚠️ Review each policy for gaps

-- ✅ VERIFY: No public write access
SELECT tablename
FROM information_schema.table_privileges
WHERE grantee = 'anon'
AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE');
-- ⚠️ If any results: SECURITY BREACH RISK
```

---

## Query Optimization (Safe Patterns)

### ⚠️ CRITICAL RULES

1. **ALWAYS test in development first**
2. **ALWAYS measure before and after**
3. **ALWAYS have a rollback plan**
4. **NEVER optimize without understanding the query**
5. **NEVER add indexes without analyzing impact**

### Analysis Workflow

#### Step 1: Identify Slow Queries

```sql
-- Enable query statistics (development only)
-- ⚠️ DO NOT run in production without understanding impact
ALTER DATABASE postgres SET log_min_duration_statement = 1000; -- Log queries >1s

-- View slow queries (Supabase Dashboard → Logs)
-- Look for patterns: missing indexes, full table scans, excessive JOINs
```

#### Step 2: Analyze Query Plan

```sql
-- Use EXPLAIN ANALYZE to understand query execution
-- ⚠️ ANALYZE actually executes the query - be careful with mutations
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT i.*, o.customer_name
FROM invoices i
JOIN orders o ON o.id = i.order_id
WHERE i.dealer_id = 1
AND i.status = 'pending';

-- Look for:
-- - Seq Scan (full table scan) = needs index
-- - High cost numbers = inefficient operation
-- - Nested Loop with high rows = JOIN optimization needed
```

#### Step 3: Propose Index (WITH CAUTION)

```sql
-- ⚠️ CRITICAL: Always analyze index impact
-- Indexes speed up SELECT but slow down INSERT/UPDATE

-- Example: Index for common query pattern
CREATE INDEX CONCURRENTLY idx_invoices_dealer_status
ON invoices(dealer_id, status)
WHERE status IN ('pending', 'overdue');
-- ✅ CONCURRENTLY = no table lock
-- ✅ Partial index = smaller, faster
-- ✅ Multi-column = query-specific optimization

-- ⚠️ ROLLBACK plan:
DROP INDEX CONCURRENTLY idx_invoices_dealer_status;
```

#### Step 4: Test Impact

```bash
# Development environment testing protocol:

# 1. Backup first
supabase db dump -f backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Apply index in development
supabase migration new add_performance_indexes

# 3. Run performance tests
# - Measure query time before/after
# - Check disk usage increase
# - Monitor write performance impact

# 4. Document results
# - Query time improvement (%)
# - Index size (MB)
# - Write operation impact

# 5. Only if improvement > 30% and write impact < 5%:
#    Consider production deployment
```

---

## Index Strategy (Evidence-Based)

### ⚠️ Index Guidelines

**When to Add Index:**
- ✅ Query runs >1s consistently
- ✅ WHERE clause on same column(s) repeatedly
- ✅ JOIN on foreign keys (usually auto-indexed)
- ✅ ORDER BY / GROUP BY on high-cardinality columns
- ✅ Proven >30% performance improvement in testing

**When NOT to Add Index:**
- ❌ Table has <1000 rows (minimal benefit)
- ❌ Column has low cardinality (e.g., boolean, status with 3 values)
- ❌ High write frequency table (indexes slow writes)
- ❌ "Just in case" mentality without evidence

### Existing Indexes (mydetailarea)

```sql
-- VERIFIED: invoices table already has good indexes
-- From migration 20241016_create_invoices_system.sql:

CREATE INDEX idx_invoices_dealer_id ON invoices(dealer_id);
CREATE INDEX idx_invoices_order_id ON invoices(order_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_created_by ON invoices(created_by);

-- ✅ Well-designed: Covers foreign keys and common filters
-- ⚠️ Potential optimization: Composite indexes for common query patterns
```

### Safe Index Recommendations

```sql
-- Pattern 1: Dealer + Date Range Queries
-- Common query: List invoices for dealer in date range
CREATE INDEX CONCURRENTLY idx_invoices_dealer_date
ON invoices(dealer_id, issue_date DESC);
-- Benefits: Faster dealer-specific reports
-- Rollback: DROP INDEX CONCURRENTLY idx_invoices_dealer_date;

-- Pattern 2: Status + Due Date (Overdue Invoices)
-- Common query: Find overdue invoices
CREATE INDEX CONCURRENTLY idx_invoices_overdue
ON invoices(due_date)
WHERE status IN ('pending', 'partially_paid');
-- Benefits: Fast overdue invoice detection
-- Rollback: DROP INDEX CONCURRENTLY idx_invoices_overdue;

-- Pattern 3: Payment Lookups
-- ⚠️ ONLY if payments table queries are slow
CREATE INDEX CONCURRENTLY idx_payments_invoice_date
ON payments(invoice_id, payment_date DESC);
-- Benefits: Fast payment history
-- Rollback: DROP INDEX CONCURRENTLY idx_payments_invoice_date;
```

---

## Row Level Security (RLS) Audit

### ⚠️ CRITICAL SECURITY CHECKS

#### Audit 1: RLS Enabled on All Tables

```sql
-- ⚠️ CRITICAL: Run this audit regularly
SELECT
  schemaname,
  tablename,
  CASE
    WHEN rowsecurity = true THEN '✅ ENABLED'
    ELSE '🔴 DISABLED - CRITICAL SECURITY ISSUE'
  END AS rls_status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ⚠️ If ANY table shows DISABLED:
-- Immediately enable RLS:
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
-- Then create appropriate policies
```

#### Audit 2: Policy Coverage

```sql
-- Review all policies for completeness
SELECT
  tablename,
  policyname,
  cmd AS operation, -- SELECT, INSERT, UPDATE, DELETE
  qual AS using_clause,
  with_check AS with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- ⚠️ Check for gaps:
-- - Does each table have policies for SELECT, INSERT, UPDATE, DELETE?
-- - Are policies correctly scoped to dealership?
-- - Do policies prevent privilege escalation?
```

#### Audit 3: Policy Performance

```sql
-- ⚠️ RLS policies run on EVERY query - must be efficient

-- Bad Policy (slow subquery on every row):
CREATE POLICY "bad_example" ON orders FOR SELECT
USING (
  dealer_id IN (
    SELECT dealer_id FROM user_dealerships WHERE user_id = auth.uid()
  )
);
-- ❌ Subquery runs for each row = N+1 query problem

-- Good Policy (with proper index):
CREATE POLICY "good_example" ON orders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_dealerships
    WHERE user_id = auth.uid()
    AND dealer_id = orders.dealer_id
  )
);
-- ✅ EXISTS is more efficient than IN
-- ✅ Requires index on user_dealerships(user_id, dealer_id)

-- Create supporting index:
CREATE INDEX CONCURRENTLY idx_user_dealerships_lookup
ON user_dealerships(user_id, dealer_id);
```

---

## Query Optimization Patterns

### Pattern 1: Avoiding N+1 Queries

**❌ BAD: N+1 Query Problem**

```typescript
// Component makes 1 query + N queries (N = number of invoices)
const { data: invoices } = useQuery(['invoices'], async () => {
  const { data } = await supabase.from('invoices').select('*');
  return data;
});

// Then for each invoice:
invoices.map(async (invoice) => {
  const { data: items } = await supabase
    .from('invoice_items')
    .eq('invoice_id', invoice.id)
    .select('*');
  // ❌ N separate queries!
});
```

**✅ GOOD: Single Query with JOIN**

```typescript
// Single query fetches everything
const { data: invoices } = useQuery(['invoices'], async () => {
  const { data } = await supabase
    .from('invoices')
    .select(`
      *,
      items:invoice_items(*),
      order:orders(customer_name, customer_email),
      dealer:dealerships(name)
    `);
  return data;
});
// ✅ 1 query instead of N+1
// ✅ Use select() sparingly - only needed fields
```

### Pattern 2: Pagination (Mandatory for Large Datasets)

**❌ BAD: Loading All Data**

```typescript
// Loads thousands of records = slow, memory intensive
const { data } = await supabase
  .from('orders')
  .select('*')
  .eq('dealer_id', dealerId);
// ❌ No limit, no pagination
```

**✅ GOOD: Paginated Query**

```typescript
const PAGE_SIZE = 50;

const { data, count } = await supabase
  .from('orders')
  .select('id, order_number, customer_name, total_amount, status', { count: 'exact' })
  .eq('dealer_id', dealerId)
  .order('created_at', { ascending: false })
  .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
// ✅ Only 50 records per page
// ✅ Total count for pagination UI
// ✅ Only essential fields selected
```

### Pattern 3: Selective Field Loading

**❌ BAD: SELECT ***

```typescript
// Loads ALL columns including large JSONB, TEXT fields
const { data } = await supabase
  .from('orders')
  .select('*');
// ❌ Unnecessary data transfer
// ❌ Slower query execution
```

**✅ GOOD: Select Only Needed Fields**

```typescript
// Only fields used in UI
const { data } = await supabase
  .from('orders')
  .select('id, order_number, customer_name, status, total_amount');
// ✅ Faster query
// ✅ Less memory
// ✅ Reduced network transfer
```

---

## Migration Safety Protocol

### ⚠️ CRITICAL: Migration Checklist

Every migration MUST include:

1. **Migration file** with UP changes
2. **Rollback script** with DOWN changes
3. **Testing evidence** from development
4. **Data backup verification**
5. **Team review approval**
6. **Staged deployment plan**

### Migration Template (Safe)

```sql
-- =====================================================
-- Migration: [Brief Description]
-- Created: [YYYY-MM-DD]
-- Author: [Name]
-- Review: [Reviewer Name]
-- Testing: [Evidence/Results]
--
-- ⚠️ ROLLBACK PLAN:
-- [Exact rollback steps documented below]
-- =====================================================

-- =====================================================
-- SAFETY CHECKS
-- =====================================================

-- Verify affected table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'target_table') THEN
    RAISE EXCEPTION 'Table target_table does not exist - migration aborted';
  END IF;
END $$;

-- Verify no data loss will occur
DO $$
DECLARE
  row_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO row_count FROM target_table;
  RAISE NOTICE 'Affected rows: %', row_count;
  -- Add logic to prevent destructive changes
END $$;

-- =====================================================
-- MIGRATION (UP)
-- =====================================================

BEGIN;

-- Example: Add column with default value (safe)
ALTER TABLE target_table
ADD COLUMN IF NOT EXISTS new_column TEXT DEFAULT 'default_value';

-- Create index concurrently (safe, no lock)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_target_new_column
ON target_table(new_column);

COMMIT;

-- =====================================================
-- ROLLBACK PLAN (Tested in development)
-- =====================================================

/*
-- To rollback this migration:

BEGIN;

-- Drop index
DROP INDEX CONCURRENTLY IF EXISTS idx_target_new_column;

-- Remove column (⚠️ data loss)
ALTER TABLE target_table DROP COLUMN IF EXISTS new_column;

COMMIT;

-- Verification:
SELECT column_name FROM information_schema.columns
WHERE table_name = 'target_table' AND column_name = 'new_column';
-- Should return 0 rows

*/
```

### ⚠️ DANGEROUS OPERATIONS (Extreme Caution)

```sql
-- ❌ NEVER without backup and rollback plan:

-- 1. DROP TABLE
DROP TABLE table_name;
-- ⚠️ Permanent data loss - requires full backup

-- 2. ALTER COLUMN TYPE
ALTER TABLE table_name ALTER COLUMN column_name TYPE new_type;
-- ⚠️ Can cause data truncation/loss

-- 3. DROP COLUMN
ALTER TABLE table_name DROP COLUMN column_name;
-- ⚠️ Permanent data loss

-- 4. DELETE without WHERE
DELETE FROM table_name;
-- ⚠️ Deletes all data

-- 5. UPDATE without WHERE
UPDATE table_name SET column = value;
-- ⚠️ Updates all rows

-- ✅ Safe alternatives:
-- - Soft delete: Add "deleted_at" column instead of DROP
-- - Add new column instead of ALTER TYPE, migrate data, then swap
-- - Add WHERE clause and verify with SELECT first
```

---

## Monitoring & Alerting

### Performance Metrics (Supabase Dashboard)

```sql
-- Key metrics to monitor:

-- 1. Query performance (slow queries)
SELECT
  query,
  calls,
  total_time,
  mean_time,
  min_time,
  max_time
FROM pg_stat_statements
WHERE mean_time > 1000 -- Queries averaging >1s
ORDER BY mean_time DESC
LIMIT 20;

-- 2. Table sizes (disk usage)
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 3. Index usage (unused indexes)
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
-- ⚠️ If idx_scan = 0: Index never used, consider dropping

-- 4. Connection pool usage
SELECT count(*) FROM pg_stat_activity;
-- ⚠️ If near max_connections: Connection leak or need scaling
```

### Alert Thresholds

```yaml
# Recommended monitoring alerts:

- name: slow_queries
  threshold: mean_time > 2000ms
  action: Investigate and optimize

- name: table_bloat
  threshold: size > 1GB
  action: Review data retention policy

- name: unused_indexes
  threshold: idx_scan = 0 for 7 days
  action: Consider dropping index

- name: connection_pool
  threshold: connections > 80% of max
  action: Check for connection leaks

- name: rls_disabled
  threshold: ANY table without RLS
  action: CRITICAL - Enable RLS immediately
```

---

## Reference Files

- **[RLS Policy Patterns](./references/rls-patterns.md)** - Secure RLS policy templates
- **[Index Strategy Guide](./references/index-strategy.md)** - Evidence-based indexing
- **[Migration Templates](./references/migration-templates.md)** - Safe migration patterns
- **[Security Audit Checklist](./references/security-audit.md)** - Comprehensive security review

## Examples

- **[examples/query-optimization.sql](./examples/query-optimization.sql)** - Before/after optimizations
- **[examples/rls-audit.sql](./examples/rls-audit.sql)** - Security audit scripts
- **[examples/safe-migration.sql](./examples/safe-migration.sql)** - Production-ready migrations

---

## Best Practices (Non-Negotiable)

1. **SECURITY FIRST** - Never compromise security for performance
2. **MEASURE EVERYTHING** - No optimization without data
3. **TEST THOROUGHLY** - Development → Staging → Production
4. **ROLLBACK READY** - Every change has documented rollback
5. **BACKUP ALWAYS** - Database backup before any DDL
6. **REVIEW REQUIRED** - Peer review for all database changes
7. **MONITOR CONTINUOUSLY** - Track performance metrics
8. **DOCUMENT DECISIONS** - Why this optimization? What's the evidence?
9. **CAUTIOUS INDEXING** - Evidence-based index creation only
10. **RLS MANDATORY** - All tables must have RLS enabled

---

## ⚠️ FINAL WARNING

**Database changes are irreversible without backups.**

Before ANY optimization:
1. ✅ Create full database backup
2. ✅ Test in development environment
3. ✅ Document rollback procedure
4. ✅ Get team approval
5. ✅ Deploy during low-traffic window
6. ✅ Monitor closely post-deployment

**When in doubt, DO NOT proceed. Consult with team first.**

---

## Common Anti-Patterns to Avoid

❌ **"I'll just add an index to make it faster"**
✅ Measure query performance, analyze execution plan, test index impact

❌ **"This worked on my local database"**
✅ Test with production-like data volume and load

❌ **"RLS is slowing things down, let's disable it"**
✅ NEVER. Optimize RLS policies instead

❌ **"We can rollback if something breaks"**
✅ Have tested rollback procedure BEFORE deploying

❌ **"SELECT * is fine, it's simpler"**
✅ Select only needed fields, always

❌ **"We'll add monitoring later"**
✅ Monitoring FIRST, then optimize based on data

---

This skill prioritizes **security, safety, and evidence-based optimization**. Every recommendation includes rollback plans and requires thorough testing before production deployment.
