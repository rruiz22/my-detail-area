# DetailHub - Comprehensive Staging Deployment Guide

**Status:** 98% Complete - Ready for Staging
**Last Updated:** January 18, 2025
**Version:** 1.3.37
**Database:** Supabase (swfnnrpzpkdypbrzmgnr)

---

## Table of Contents

1. [Pre-Deployment Checklist](#1-pre-deployment-checklist)
2. [Database Migration Steps](#2-database-migration-steps)
3. [Seed Data Creation](#3-seed-data-creation)
4. [Frontend Deployment](#4-frontend-deployment)
5. [Post-Deployment Verification](#5-post-deployment-verification)
6. [Performance Testing](#6-performance-testing)
7. [Security Verification](#7-security-verification)
8. [Pilot Testing Plan](#8-pilot-testing-plan)
9. [Rollback Plan](#9-rollback-plan)
10. [Monitoring Setup](#10-monitoring-setup)
11. [Sign-Off Checklist](#11-sign-off-checklist)

---

## 1. Pre-Deployment Checklist

### 1.1 Code Quality Verification

**TypeScript Compilation:**
```bash
# Navigate to project directory
cd C:\Users\rudyr\apps\mydetailarea

# Run TypeScript build check
npm run build

# Expected output:
# ✓ built in XXs
# ✓ 0 TypeScript errors
```

- [ ] Build completes successfully
- [ ] Zero TypeScript errors
- [ ] No `any` types in DetailHub components
- [ ] Bundle size < 5MB (currently ~3.5MB)

**Linting:**
```bash
# Run ESLint
npm run lint

# Expected: No errors (warnings acceptable)
```

- [ ] No ESLint errors
- [ ] Critical warnings addressed
- [ ] Code follows style guide

**Translation Audit:**
```bash
# Run translation coverage audit
npm run translation:audit

# Expected: 100% coverage for DetailHub namespace
```

- [ ] All DetailHub UI text translated
- [ ] EN/ES/PT-BR coverage complete
- [ ] No hardcoded strings in components
- [ ] Translation keys follow namespace pattern

**Console Cleanup:**
```bash
# Search for console statements
npx eslint src/components/detail-hub --no-eslintrc --rule 'no-console: error'
```

- [ ] No `console.log()` in production code
- [ ] Only `console.error()` for error handling
- [ ] Debug code removed

---

### 1.2 Database Migrations Verification

**Migration Files Available:**

| Order | Migration File | Purpose | Size |
|-------|---------------|---------|------|
| 1 | `20251117000001_create_detail_hub_employees.sql` | Employees table + RLS | 7.2KB |
| 2 | `20251117000002_create_detail_hub_time_entries.sql` | Time entries + triggers | 12.7KB |
| 3 | `20251117000003_create_detail_hub_kiosks.sql` | Kiosks table + config | 8.3KB |
| 4 | `20251117000004_create_detail_hub_invoices.sql` | Invoices + line items | 13.0KB |
| 5 | `20251117000005_create_detail_hub_schedules.sql` | Schedules + shifts | 14.3KB |

**Pre-Migration Checks:**
- [ ] All 5 migration files present in `supabase/migrations/`
- [ ] No syntax errors (reviewed manually)
- [ ] Migration order verified
- [ ] Dependencies between tables understood

**Database Backup:**
```bash
# Using Supabase CLI (if available)
supabase db dump -f backup_pre_detailhub_$(date +%Y%m%d).sql

# Or manually via Supabase Dashboard:
# Database → Backups → Create Backup
```

- [ ] Database backup created
- [ ] Backup verified (non-zero file size)
- [ ] Backup location documented
- [ ] Restore procedure tested (optional but recommended)

---

### 1.3 Dependencies Verification

**NPM Audit:**
```bash
# Check for vulnerabilities
npm audit

# Expected: No high/critical vulnerabilities
# If found, review and fix:
npm audit fix
```

- [ ] No critical vulnerabilities
- [ ] No high severity issues
- [ ] PDF generation libraries verified:
  - `jspdf@3.0.3` ✓
  - `jspdf-autotable@5.0.2` ✓
  - `xlsx@0.18.5` ✓
- [ ] Face detection disabled (not in use)

**Package Integrity:**
```bash
# Verify package-lock.json is up to date
npm ci

# Expected: Clean install without warnings
```

- [ ] `package-lock.json` synchronized
- [ ] All dependencies installed
- [ ] No peer dependency warnings

---

### 1.4 Environment Variables Configuration

**Required Environment Variables for Staging:**

Create `.env.staging` file:

```bash
# ================================================
# STAGING ENVIRONMENT CONFIGURATION
# ================================================

# Supabase Configuration
VITE_SUPABASE_URL=https://swfnnrpzpkdypbrzmgnr.supabase.co
VITE_SUPABASE_ANON_KEY=[YOUR_STAGING_ANON_KEY]

# Feature Flags
VITE_FEATURE_DETAIL_HUB=true

# Environment
NODE_ENV=staging
VITE_API_BASE_URL=https://staging.mydetailarea.com

# Debug (enabled for staging)
VITE_DEBUG=true

# Port Configuration (Development only)
PORT=8080
```

**Verification:**
- [ ] `.env.staging` created
- [ ] Supabase URL correct (`swfnnrpzpkdypbrzmgnr`)
- [ ] Supabase anon key set
- [ ] No secrets committed to git
- [ ] `.gitignore` includes `.env*` files

---

### 1.5 Storage Configuration

**Supabase Storage Bucket:**

Bucket name: `time-clock-photos`

**Policies Required:**
1. `time-clock-photos-select` - Users can view photos from their dealership
2. `time-clock-photos-insert` - Users can upload photos
3. `time-clock-photos-update` - Users can update photo metadata
4. `time-clock-photos-delete` - Admins can delete photos

**Verification Checklist:**
- [ ] Bucket `time-clock-photos` exists
- [ ] Bucket is private (public access disabled)
- [ ] 4 RLS policies active
- [ ] File size limit set (10MB recommended)
- [ ] Allowed MIME types configured (`image/jpeg`, `image/png`)

**Test Upload (Pre-Deployment):**
```javascript
// Test in browser console
const { data, error } = await supabase.storage
  .from('time-clock-photos')
  .upload('test/test.jpg', file, {
    cacheControl: '3600',
    upsert: false
  });

console.log('Upload result:', data, error);
```

- [ ] Test upload succeeds
- [ ] Test download succeeds
- [ ] Test delete succeeds (admin only)

---

## 2. Database Migration Steps

### 2.1 Pre-Migration Database State

**Check Current Tables:**
```sql
-- Run in Supabase SQL Editor
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'detail_hub_%'
ORDER BY table_name;
```

**Expected Result:** Empty (no DetailHub tables yet)

- [ ] No existing `detail_hub_*` tables
- [ ] No naming conflicts
- [ ] Database accessible via Supabase MCP

---

### 2.2 Apply Migrations Using Supabase MCP

**Migration 1: Employees Table**

```bash
# Using Claude Code with Supabase MCP
# Note: Migration SQL content will be read from file
```

Read migration file:
```typescript
// Migration file: 20251117000001_create_detail_hub_employees.sql
```

Apply via MCP:
```typescript
mcp__supabase__apply_migration({
  name: "create_detail_hub_employees",
  query: [CONTENT FROM 20251117000001_create_detail_hub_employees.sql]
})
```

**Verification:**
```sql
-- Verify table created
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'detail_hub_employees'
ORDER BY ordinal_position;

-- Expected: 22 columns
```

- [ ] Table `detail_hub_employees` created
- [ ] 22 columns present
- [ ] RLS policies created (4 policies)
- [ ] Indexes created
- [ ] Constraints active

---

**Migration 2: Time Entries Table**

Read migration file:
```typescript
// Migration file: 20251117000002_create_detail_hub_time_entries.sql
```

Apply via MCP:
```typescript
mcp__supabase__apply_migration({
  name: "create_detail_hub_time_entries",
  query: [CONTENT FROM 20251117000002_create_detail_hub_time_entries.sql]
})
```

**Verification:**
```sql
-- Verify table and trigger
SELECT table_name FROM information_schema.tables
WHERE table_name = 'detail_hub_time_entries';

-- Verify trigger function exists
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'calculate_time_entry_hours';
```

- [ ] Table `detail_hub_time_entries` created
- [ ] 27 columns present
- [ ] Trigger `calculate_time_entry_hours()` created
- [ ] RLS policies created (4 policies)
- [ ] Foreign keys to `detail_hub_employees` active

**Test Auto-Calculation Trigger:**
```sql
-- Insert test time entry
INSERT INTO detail_hub_time_entries (
  employee_id, dealership_id,
  clock_in, clock_out
) VALUES (
  'test-uuid', 5,
  '2025-01-18 08:00:00+00',
  '2025-01-18 17:30:00+00'
) RETURNING total_hours, regular_hours, overtime_hours;

-- Expected:
-- total_hours: 9.5
-- regular_hours: 8.0
-- overtime_hours: 1.5

-- Cleanup
DELETE FROM detail_hub_time_entries WHERE employee_id = 'test-uuid';
```

- [ ] Trigger calculates hours correctly
- [ ] Regular hours capped at 8.0
- [ ] Overtime calculated properly

---

**Migration 3: Kiosks Table**

```typescript
mcp__supabase__apply_migration({
  name: "create_detail_hub_kiosks",
  query: [CONTENT FROM 20251117000003_create_detail_hub_kiosks.sql]
})
```

**Verification:**
```sql
SELECT * FROM information_schema.columns
WHERE table_name = 'detail_hub_kiosks'
ORDER BY ordinal_position;
```

- [ ] Table `detail_hub_kiosks` created
- [ ] JSONB `features` column present
- [ ] RLS policies created
- [ ] Unique constraint on `kiosk_code`

---

**Migration 4: Invoices Tables**

```typescript
mcp__supabase__apply_migration({
  name: "create_detail_hub_invoices",
  query: [CONTENT FROM 20251117000004_create_detail_hub_invoices.sql]
})
```

**Verification:**
```sql
-- Verify both invoice tables
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('detail_hub_invoices', 'detail_hub_invoice_line_items')
ORDER BY table_name;
```

- [ ] Table `detail_hub_invoices` created
- [ ] Table `detail_hub_invoice_line_items` created
- [ ] Foreign key relationship working
- [ ] RLS policies created

---

**Migration 5: Schedules Table**

```typescript
mcp__supabase__apply_migration({
  name: "create_detail_hub_schedules",
  query: [CONTENT FROM 20251117000005_create_detail_hub_schedules.sql]
})
```

**Verification:**
```sql
-- Verify schedule table and function
SELECT table_name FROM information_schema.tables
WHERE table_name = 'detail_hub_schedules';

-- Verify schedule validation function
SELECT routine_name FROM information_schema.routines
WHERE routine_name LIKE '%schedule%';
```

- [ ] Table `detail_hub_schedules` created
- [ ] Schedule template support active
- [ ] Validation functions created
- [ ] RLS policies created

---

### 2.3 Post-Migration Verification

**Complete Table List:**
```sql
SELECT
  t.table_name,
  (SELECT count(*) FROM information_schema.columns c
   WHERE c.table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE t.table_schema = 'public'
  AND t.table_name LIKE 'detail_hub_%'
ORDER BY t.table_name;
```

**Expected Output:**
| Table Name | Columns |
|------------|---------|
| `detail_hub_employees` | 22 |
| `detail_hub_invoice_line_items` | ~8 |
| `detail_hub_invoices` | ~15 |
| `detail_hub_kiosks` | ~19 |
| `detail_hub_schedules` | ~16 |
| `detail_hub_time_entries` | 27 |

- [ ] 6 tables created
- [ ] Total ~107 columns across all tables
- [ ] No migration errors in Supabase logs

**RLS Policies Summary:**
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename LIKE 'detail_hub_%'
ORDER BY tablename, policyname;
```

- [ ] At least 16 RLS policies active
- [ ] Policies cover SELECT, INSERT, UPDATE, DELETE
- [ ] Dealership scoping enforced

---

### 2.4 Generate TypeScript Types

**Using Supabase MCP:**
```typescript
mcp__supabase__generate_typescript_types()
```

**Manual Alternative (Supabase CLI):**
```bash
supabase gen types typescript --linked > src/types/detailhub-database.types.ts
```

**Verification:**
- [ ] TypeScript types file generated
- [ ] DetailHub table types present
- [ ] No compilation errors after import

---

## 3. Seed Data Creation

### 3.1 Test Dealership (If Not Exists)

**Check Existing Dealerships:**
```sql
SELECT id, name, address FROM dealerships
WHERE name LIKE '%Test%' OR name LIKE '%Staging%'
ORDER BY created_at DESC;
```

**Create Test Dealership (If Needed):**
```sql
INSERT INTO dealerships (
  name,
  address,
  phone,
  email,
  created_at
) VALUES (
  'Test Dealership - DetailHub Staging',
  '123 Staging Street, Test City, ST 12345',
  '555-0100',
  'staging@testdealership.com',
  NOW()
) RETURNING id, name;

-- Save the returned ID for next steps
-- Example: id = 999
```

- [ ] Test dealership created
- [ ] Dealership ID noted: `_______`
- [ ] Accessible via Supabase Dashboard

---

### 3.2 Create Test Employees (5-10 employees)

**Employee 1: Manager**
```sql
INSERT INTO detail_hub_employees (
  dealership_id,
  employee_number,
  first_name,
  last_name,
  email,
  phone,
  role,
  department,
  status,
  hourly_rate,
  pin_code,
  hire_date
) VALUES (
  999, -- Replace with your dealership ID
  'EMP001',
  'Sarah',
  'Manager',
  'sarah.manager@staging.com',
  '555-0101',
  'manager',
  'management',
  'active',
  50.00,
  '1234',
  '2025-01-01'
) RETURNING id, employee_number, first_name, last_name;
```

**Employee 2: Lead Detailer**
```sql
INSERT INTO detail_hub_employees (
  dealership_id,
  employee_number,
  first_name,
  last_name,
  email,
  phone,
  role,
  department,
  status,
  hourly_rate,
  pin_code,
  hire_date
) VALUES (
  999,
  'EMP002',
  'John',
  'Detailer',
  'john.detailer@staging.com',
  '555-0102',
  'detailer',
  'detail',
  'active',
  25.00,
  '2345',
  '2025-01-05'
) RETURNING id, employee_number, first_name, last_name;
```

**Employee 3: Car Wash Technician**
```sql
INSERT INTO detail_hub_employees (
  dealership_id, employee_number, first_name, last_name,
  email, phone, role, department, status, hourly_rate, pin_code, hire_date
) VALUES (
  999, 'EMP003', 'Maria', 'Sanchez',
  'maria.sanchez@staging.com', '555-0103',
  'car_wash', 'car_wash', 'active', 18.00, '3456', '2025-01-07'
) RETURNING id, employee_number, first_name, last_name;
```

**Employee 4: Supervisor**
```sql
INSERT INTO detail_hub_employees (
  dealership_id, employee_number, first_name, last_name,
  email, phone, role, department, status, hourly_rate, pin_code, hire_date
) VALUES (
  999, 'EMP004', 'David', 'Supervisor',
  'david.supervisor@staging.com', '555-0104',
  'supervisor', 'detail', 'active', 30.00, '4567', '2025-01-02'
) RETURNING id, employee_number, first_name, last_name;
```

**Employee 5: Service Technician**
```sql
INSERT INTO detail_hub_employees (
  dealership_id, employee_number, first_name, last_name,
  email, phone, role, department, status, hourly_rate, pin_code, hire_date
) VALUES (
  999, 'EMP005', 'Robert', 'Tech',
  'robert.tech@staging.com', '555-0105',
  'technician', 'service', 'active', 28.00, '5678', '2025-01-10'
) RETURNING id, employee_number, first_name, last_name;
```

**Additional Employees (Optional - 6-10):**
```sql
-- Employee 6-10: Copy pattern above with variations
-- Vary roles: detailer, car_wash, technician
-- Vary departments: detail, car_wash, service
-- Vary hourly rates: $15-$35
-- Vary hire dates: Past 3 months
```

**Verification:**
```sql
SELECT COUNT(*) as employee_count FROM detail_hub_employees
WHERE dealership_id = 999;

-- Expected: 5-10 employees
```

- [ ] At least 5 employees created
- [ ] Variety of roles represented
- [ ] Variety of departments represented
- [ ] All have unique employee_number
- [ ] All have PIN codes set

---

### 3.3 Create Test Kiosk

```sql
INSERT INTO detail_hub_kiosks (
  dealership_id,
  kiosk_code,
  name,
  location,
  is_active,
  features
) VALUES (
  999,
  'KIOSK-001',
  'Front Desk Kiosk - Staging',
  'Reception Area',
  true,
  '{
    "photo_fallback": true,
    "face_recognition": false,
    "pin_enabled": true,
    "auto_logout_seconds": 30
  }'::jsonb
) RETURNING id, kiosk_code, name;
```

- [ ] Kiosk `KIOSK-001` created
- [ ] Features JSON valid
- [ ] Kiosk marked as active

---

### 3.4 Create Test Schedules (Current Week)

**Get Current Week Dates:**
```sql
-- Helper query to get current week
SELECT
  DATE_TRUNC('week', CURRENT_DATE) as week_start,
  DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days' as week_end;
```

**Monday Schedule (Employee 1 - Manager):**
```sql
INSERT INTO detail_hub_schedules (
  dealership_id,
  employee_id,
  shift_date,
  start_time,
  end_time,
  kiosk_id,
  is_approved
) VALUES (
  999,
  (SELECT id FROM detail_hub_employees WHERE employee_number = 'EMP001'),
  DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '0 days', -- Monday
  '08:00:00',
  '17:00:00',
  (SELECT id FROM detail_hub_kiosks WHERE kiosk_code = 'KIOSK-001'),
  true
) RETURNING id, shift_date, start_time, end_time;
```

**Create Full Week Schedule (Mon-Fri) for Multiple Employees:**
```sql
-- Batch insert for 5 employees × 5 days = 25 schedules
INSERT INTO detail_hub_schedules (
  dealership_id, employee_id, shift_date, start_time, end_time, kiosk_id, is_approved
)
SELECT
  999,
  e.id,
  DATE_TRUNC('week', CURRENT_DATE) + (d.day_num || ' days')::INTERVAL,
  CASE
    WHEN e.role = 'manager' THEN '08:00:00'
    WHEN e.role = 'supervisor' THEN '07:00:00'
    ELSE '08:30:00'
  END,
  CASE
    WHEN e.role = 'manager' THEN '17:00:00'
    WHEN e.role = 'supervisor' THEN '16:30:00'
    ELSE '17:30:00'
  END,
  (SELECT id FROM detail_hub_kiosks WHERE kiosk_code = 'KIOSK-001'),
  true
FROM detail_hub_employees e
CROSS JOIN (
  SELECT 0 as day_num UNION ALL -- Monday
  SELECT 1 UNION ALL -- Tuesday
  SELECT 2 UNION ALL -- Wednesday
  SELECT 3 UNION ALL -- Thursday
  SELECT 4 -- Friday
) d
WHERE e.dealership_id = 999
  AND e.status = 'active'
ORDER BY e.employee_number, d.day_num;
```

**Verification:**
```sql
SELECT
  e.employee_number,
  e.first_name,
  COUNT(*) as scheduled_days
FROM detail_hub_schedules s
JOIN detail_hub_employees e ON e.id = s.employee_id
WHERE s.shift_date >= DATE_TRUNC('week', CURRENT_DATE)
  AND s.shift_date < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days'
GROUP BY e.employee_number, e.first_name
ORDER BY e.employee_number;

-- Expected: Each employee with 5 scheduled days (Mon-Fri)
```

- [ ] Schedules created for current week
- [ ] All active employees scheduled
- [ ] Mon-Fri coverage
- [ ] Shift times varied by role

---

### 3.5 Create Sample Time Entries (Historical)

**Create Time Entries for Previous Week:**
```sql
-- Sample time entries for testing analytics
INSERT INTO detail_hub_time_entries (
  employee_id,
  dealership_id,
  clock_in,
  clock_out,
  punch_in_method,
  punch_out_method,
  status,
  requires_manual_verification
)
SELECT
  e.id,
  999,
  (DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '7 days') + (d.day_num || ' days')::INTERVAL + TIME '08:00:00',
  (DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '7 days') + (d.day_num || ' days')::INTERVAL + TIME '17:00:00',
  'photo_fallback',
  'photo_fallback',
  'complete',
  false
FROM detail_hub_employees e
CROSS JOIN (
  SELECT 0 as day_num UNION ALL
  SELECT 1 UNION ALL
  SELECT 2 UNION ALL
  SELECT 3 UNION ALL
  SELECT 4
) d
WHERE e.dealership_id = 999
  AND e.status = 'active';

-- Verify hours auto-calculated
SELECT
  e.employee_number,
  COUNT(*) as entries,
  SUM(t.total_hours) as total_hours,
  SUM(t.regular_hours) as regular_hours,
  SUM(t.overtime_hours) as overtime_hours
FROM detail_hub_time_entries t
JOIN detail_hub_employees e ON e.id = t.employee_id
GROUP BY e.employee_number
ORDER BY e.employee_number;
```

- [ ] Historical time entries created
- [ ] Hours auto-calculated correctly
- [ ] Status marked as 'complete'
- [ ] No manual verification required (pre-approved)

---

### 3.6 Seed Data Summary

**Final Verification Query:**
```sql
-- Complete seed data summary
SELECT
  'Dealerships' as entity,
  COUNT(*) as count
FROM dealerships
WHERE id = 999

UNION ALL

SELECT
  'Employees',
  COUNT(*)
FROM detail_hub_employees
WHERE dealership_id = 999

UNION ALL

SELECT
  'Kiosks',
  COUNT(*)
FROM detail_hub_kiosks
WHERE dealership_id = 999

UNION ALL

SELECT
  'Schedules (This Week)',
  COUNT(*)
FROM detail_hub_schedules
WHERE dealership_id = 999
  AND shift_date >= DATE_TRUNC('week', CURRENT_DATE)

UNION ALL

SELECT
  'Time Entries (All)',
  COUNT(*)
FROM detail_hub_time_entries
WHERE dealership_id = 999;
```

**Expected Output:**
| Entity | Count |
|--------|-------|
| Dealerships | 1 |
| Employees | 5-10 |
| Kiosks | 1 |
| Schedules (This Week) | 25-50 |
| Time Entries (All) | 25-50 |

**Checklist:**
- [ ] 1 test dealership
- [ ] 5-10 test employees
- [ ] 1 test kiosk
- [ ] 25-50 current week schedules
- [ ] 25-50 historical time entries
- [ ] All data accessible via RLS

---

## 4. Frontend Deployment

### 4.1 Build Verification (Local)

**Production Build Test:**
```bash
# Clean previous builds
rm -rf dist/

# Run production build
npm run build

# Check output
ls -lh dist/

# Expected:
# - dist/index.html
# - dist/assets/*.js (chunked)
# - dist/assets/*.css
# - Total size ~3-5MB
```

**Build Checklist:**
- [ ] Build completes in < 60 seconds
- [ ] No TypeScript errors
- [ ] No build warnings (critical)
- [ ] Bundle chunks created
- [ ] CSS extracted properly

**Preview Build Locally:**
```bash
# Start preview server
npm run preview

# Navigate to: http://localhost:4173
# Test DetailHub functionality:
# - Dashboard loads
# - Employees tab works
# - Time Clock modal opens
# - Timecards tab visible
```

- [ ] Preview runs successfully
- [ ] DetailHub accessible
- [ ] No console errors
- [ ] Translations load correctly

---

### 4.2 Deployment Options

#### Option A: Railway Deployment

**Prerequisites:**
- Railway account
- Railway CLI installed
- Project linked to Railway

**Steps:**
```bash
# Install Railway CLI (if not installed)
npm install -g @railway/cli

# Login to Railway
railway login

# Link to existing project (or create new)
railway link

# Set environment variables
railway variables set VITE_SUPABASE_URL=https://swfnnrpzpkdypbrzmgnr.supabase.co
railway variables set VITE_SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
railway variables set VITE_FEATURE_DETAIL_HUB=true
railway variables set NODE_ENV=staging

# Deploy
railway up

# Monitor deployment
railway logs
```

**Post-Deployment:**
```bash
# Get deployment URL
railway status

# Example URL: https://mydetailarea-staging.up.railway.app
```

- [ ] Railway deployment successful
- [ ] Environment variables set
- [ ] Deployment URL accessible
- [ ] Logs show no errors

---

#### Option B: Vercel Deployment

**Prerequisites:**
- Vercel account
- Vercel CLI installed

**Steps:**
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to staging
vercel --env VITE_SUPABASE_URL=https://swfnnrpzpkdypbrzmgnr.supabase.co \
      --env VITE_SUPABASE_ANON_KEY=[YOUR_ANON_KEY] \
      --env VITE_FEATURE_DETAIL_HUB=true \
      --env NODE_ENV=staging

# Or use Vercel Dashboard:
# 1. Settings → Environment Variables
# 2. Add variables for staging
# 3. Redeploy
```

**Post-Deployment:**
- [ ] Vercel deployment successful
- [ ] Environment variables configured
- [ ] Deployment URL: `https://mydetailarea-staging.vercel.app`
- [ ] Build logs verified

---

#### Option C: Netlify Deployment

**Steps:**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Link site (or create new)
netlify link

# Set environment variables
netlify env:set VITE_SUPABASE_URL https://swfnnrpzpkdypbrzmgnr.supabase.co
netlify env:set VITE_SUPABASE_ANON_KEY [YOUR_ANON_KEY]
netlify env:set VITE_FEATURE_DETAIL_HUB true
netlify env:set NODE_ENV staging

# Deploy
netlify deploy --prod
```

- [ ] Netlify deployment successful
- [ ] Environment variables set
- [ ] Deployment URL accessible

---

### 4.3 DNS & SSL Configuration

**If using custom domain for staging:**

**DNS Records:**
```
Type: CNAME
Name: staging
Value: [platform-provided-domain]
TTL: 3600
```

**SSL Certificate:**
- [ ] SSL certificate auto-provisioned
- [ ] HTTPS enforced
- [ ] Certificate valid and trusted
- [ ] HTTP → HTTPS redirect active

---

## 5. Post-Deployment Verification

### 5.1 Smoke Tests (Critical - 15 minutes)

#### Test 1: Application Loads

**URL:** `https://[staging-url]/detail-hub`

**Steps:**
1. Navigate to staging URL
2. Login with test credentials
3. Navigate to Management → Detail Hub

**Expected Results:**
- [ ] Page loads in < 3 seconds
- [ ] No 404 errors
- [ ] No CORS errors in console
- [ ] Assets load correctly (images, fonts, icons)
- [ ] Translations load (check language switcher)

**Browser Console Check:**
```javascript
// Should show no errors
// Warnings acceptable
```

- [ ] Zero console errors
- [ ] No network failures
- [ ] TanStack Query Devtools accessible (if enabled)

---

#### Test 2: Database Connection

**Navigate to:** Detail Hub → Overview Tab

**Expected:**
- [ ] Dashboard loads employee data
- [ ] Stats cards show real numbers:
  - Active Employees: 5-10
  - Active Today: 0+ (depending on test data)
  - Average Hourly Rate: $20-30
- [ ] Recent Activity feed shows time entries (if any)
- [ ] System Status shows "All Systems Operational"

**SQL Verification (Backend):**
```sql
-- Check connection from frontend
SELECT COUNT(*) FROM detail_hub_employees
WHERE dealership_id = 999;

-- Should match "Active Employees" stat
```

- [ ] Database queries executing
- [ ] RLS enforcing dealership scope
- [ ] Real-time data displayed

---

#### Test 3: Create New Employee

**Navigate to:** Detail Hub → Employees Tab

**Steps:**
1. Click "Add Employee" button
2. Fill form:
   - First Name: Staging
   - Last Name: Test
   - Email: staging.test@example.com
   - Role: Detailer
   - Department: Detail
   - Hourly Rate: 22.50
   - Hire Date: Today
   - Status: Active
3. Click "Add Employee"

**Expected Results:**
- [ ] Form validates correctly
- [ ] Modal closes on submit
- [ ] Toast notification: "Employee Created"
- [ ] Employee appears in list with auto-generated employee_number (e.g., EMP006)
- [ ] Stats update: Active Employees count +1

**Database Verification:**
```sql
SELECT * FROM detail_hub_employees
WHERE email = 'staging.test@example.com';

-- Should show newly created employee
```

- [ ] Employee persisted to database
- [ ] All fields saved correctly
- [ ] Timestamps set (created_at, updated_at)

---

#### Test 4: Punch Clock Flow (Photo Capture)

**Navigate to:** Detail Hub → Header → "Time Clock" button

**Steps:**
1. Click "Time Clock" button
2. Modal opens
3. Enter Employee ID: `EMP001` (or any existing employee number)
4. Enter PIN: `1234` (matching employee's PIN)
5. Click "Clock In" button
6. Grant camera permission if prompted
7. Position yourself in camera guide box
8. Click "Capture" button
9. Wait for photo upload
10. Verify success message

**Expected Results:**
- [ ] Time Clock Modal opens
- [ ] Employee ID input autofocused
- [ ] Camera permission granted
- [ ] Camera preview shows
- [ ] Guide box overlay visible (emerald green)
- [ ] Capture button enabled
- [ ] Photo captures successfully
- [ ] Photo preview shows with timestamp watermark
- [ ] Upload progress indicator
- [ ] Success message: "✓ Photo saved! Awaiting supervisor approval."
- [ ] Modal can be closed

**Database Verification:**
```sql
SELECT
  e.employee_number,
  t.clock_in,
  t.punch_in_method,
  t.photo_in_url,
  t.requires_manual_verification,
  t.status
FROM detail_hub_time_entries t
JOIN detail_hub_employees e ON e.id = t.employee_id
WHERE e.employee_number = 'EMP001'
ORDER BY t.clock_in DESC
LIMIT 1;

-- Expected:
-- clock_in: recent timestamp
-- punch_in_method: 'photo_fallback'
-- photo_in_url: https://...supabase.co/storage/v1/object/public/time-clock-photos/...
-- requires_manual_verification: true
-- status: 'active'
```

- [ ] Time entry created in database
- [ ] Photo uploaded to Storage
- [ ] Photo URL accessible (test by opening in browser)
- [ ] Requires manual verification flag set

**Storage Verification:**
```sql
-- Verify photo exists in storage
-- Navigate to: Supabase Dashboard → Storage → time-clock-photos
-- Check for recent upload
```

- [ ] Photo file exists in bucket
- [ ] File size reasonable (50-500KB)
- [ ] File accessible via signed URL

---

#### Test 5: Photo Review & Approval

**Navigate to:** Detail Hub → Timecards Tab

**Steps:**
1. Verify "Photo Punches Pending Review" section appears (amber/yellow alert)
2. Count pending reviews (should be 1+ from Test 4)
3. View PhotoReviewCard:
   - Employee photo visible
   - Employee ID displayed (not UUID)
   - Timestamp shown on photo
   - Two buttons: Approve (green), Reject (red)
4. Click "Approve" button

**Expected Results:**
- [ ] Pending Reviews section visible
- [ ] PhotoReviewCard displays correctly:
  - Photo preview loads
  - Employee name shown (e.g., "Sarah Manager - EMP001")
  - Timestamp watermark visible on photo
  - Clock-in time displayed
- [ ] "Approve" button works
- [ ] Toast notification: "Time entry approved"
- [ ] Card disappears from pending list
- [ ] Pending count decreases

**Database Verification:**
```sql
SELECT
  e.employee_number,
  t.requires_manual_verification,
  t.verified_by,
  t.verified_at,
  t.status
FROM detail_hub_time_entries t
JOIN detail_hub_employees e ON e.id = t.employee_id
WHERE e.employee_number = 'EMP001'
ORDER BY t.clock_in DESC
LIMIT 1;

-- Expected:
-- requires_manual_verification: false
-- verified_by: [supervisor user UUID]
-- verified_at: recent timestamp
-- status: 'active'
```

- [ ] Time entry approved
- [ ] Verified by user ID set
- [ ] Verified at timestamp set
- [ ] Pending review flag cleared

---

#### Test 6: Analytics Dashboard

**Navigate to:** Detail Hub → Analytics Tab

**Steps:**
1. Wait for charts to load
2. Verify data appears
3. Test date range picker
4. Test export functionality

**Expected Results:**
- [ ] Analytics tab loads in < 2 seconds
- [ ] Charts render with real data:
  - Productivity trends (line chart)
  - Department comparison (bar chart)
  - Attendance tracking (pie chart)
- [ ] Date range picker functional
- [ ] Export buttons present (PDF, Excel)
- [ ] No "No data" messages (if seed data exists)

**Data Verification:**
```sql
-- Analytics should pull from:
SELECT
  COUNT(*) as total_entries,
  SUM(total_hours) as total_hours,
  AVG(total_hours) as avg_hours_per_entry
FROM detail_hub_time_entries
WHERE dealership_id = 999
  AND status = 'complete';
```

- [ ] Charts display seed data
- [ ] Filters work correctly
- [ ] Export to PDF generates document
- [ ] Export to Excel downloads file

---

#### Test 7: Reports Generation

**Navigate to:** Detail Hub → Reports Tab

**Steps:**
1. Select report type: "Payroll Report"
2. Select date range: Last 7 days
3. Click "Generate Report"
4. Download PDF

**Expected Results:**
- [ ] Report generation UI loads
- [ ] Date picker functional
- [ ] Report generates in < 5 seconds
- [ ] PDF downloads successfully
- [ ] PDF opens correctly in viewer
- [ ] PDF contains employee data
- [ ] PDF formatted professionally

---

#### Test 8: Invoice Management

**Navigate to:** Detail Hub → Invoices Tab

**Steps:**
1. Click "Create Invoice"
2. Fill invoice details
3. Add line items
4. Save invoice
5. Download invoice PDF

**Expected Results:**
- [ ] Invoice creation modal opens
- [ ] Form validation works
- [ ] Line items can be added/removed
- [ ] Invoice saves to database
- [ ] Invoice PDF downloads
- [ ] PDF formatted correctly with branding

---

#### Test 9: Multi-Language Support

**Test Languages:** English, Spanish, Portuguese

**Steps:**
1. Click language switcher (top navigation)
2. Select "Español"
3. Verify translations:
   - Page title
   - Tab names
   - Button labels
   - Form fields
4. Switch to "Português"
5. Verify translations again
6. Switch back to "English"

**Expected Results:**

**English:**
- [ ] Title: "Detail Hub"
- [ ] Tabs: "Overview", "Employees", "Timecards", "Analytics", "Reports", "Invoices", "Kiosks"
- [ ] Buttons: "Add Employee", "Clock In", "Clock Out"

**Spanish:**
- [ ] Title: "Centro de Detalle"
- [ ] Tabs: "Resumen", "Empleados", "Tarjetas de Tiempo", "Análisis", "Reportes", "Facturas", "Kioscos"
- [ ] Buttons: "Agregar Empleado", "Entrada", "Salida"

**Portuguese:**
- [ ] Title: "Central de Detalhamento"
- [ ] Tabs: "Visão Geral", "Funcionários", "Cartões de Ponto", "Análise", "Relatórios", "Faturas", "Quiosques"
- [ ] Buttons: "Adicionar Funcionário", "Entrada", "Saída"

**Translation Coverage:**
- [ ] No English text when Spanish selected
- [ ] No English text when Portuguese selected
- [ ] All UI elements translated
- [ ] No translation keys visible (e.g., "detail_hub.title")

---

### 5.2 Cross-Browser Testing

**Browsers to Test:**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest, if on Mac)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

**Test Checklist Per Browser:**
- [ ] Application loads
- [ ] Camera access works (Time Clock)
- [ ] Photo capture works
- [ ] PDF download works
- [ ] Charts render correctly
- [ ] Translations load
- [ ] No console errors

---

### 5.3 Mobile Responsiveness Testing

**Devices to Test:**
- [ ] iPhone (iOS Safari)
- [ ] Android Phone (Chrome)
- [ ] Tablet (iPad/Android)

**Test Scenarios:**
1. Navigate to Detail Hub on mobile
2. Test Time Clock Modal on mobile
3. Test photo capture on mobile camera
4. Test employee list scrolling
5. Test charts on small screen

**Expected Results:**
- [ ] Responsive layout adapts to screen size
- [ ] Touch targets large enough (min 44x44px)
- [ ] No horizontal scrolling
- [ ] Camera works on mobile devices
- [ ] Forms usable on mobile
- [ ] Navigation accessible

---

## 6. Performance Testing

### 6.1 Lighthouse Audit

**Run Lighthouse:**
```bash
# Install Lighthouse CLI (if not installed)
npm install -g lighthouse

# Run audit on staging URL
lighthouse https://[staging-url]/detail-hub --view --output html --output-path ./lighthouse-report.html

# Or use Chrome DevTools:
# 1. Open DevTools
# 2. Lighthouse tab
# 3. Generate report
```

**Target Scores:**
- [ ] **Performance:** > 80
- [ ] **Accessibility:** > 95
- [ ] **Best Practices:** > 90
- [ ] **SEO:** > 80

**Performance Metrics:**
- [ ] First Contentful Paint (FCP) < 1.8s
- [ ] Largest Contentful Paint (LCP) < 2.5s
- [ ] Total Blocking Time (TBT) < 200ms
- [ ] Cumulative Layout Shift (CLS) < 0.1
- [ ] Speed Index < 3.4s

**Issues to Address:**
- Review any score below target
- Fix critical performance issues
- Optimize images if needed
- Reduce bundle size if excessive

---

### 6.2 Load Testing

**Dashboard Load Time:**
```bash
# Test with browser Network throttling:
# Chrome DevTools → Network → Throttling → Fast 3G

# Navigate to Detail Hub dashboard
# Measure load time
```

**Target Load Times:**
- [ ] Dashboard loads < 3s on 3G
- [ ] Employee list loads < 2s
- [ ] Photo upload < 5s
- [ ] Analytics renders < 2s
- [ ] PDF generation < 3s

**Database Query Performance:**
```sql
-- Enable query timing
EXPLAIN ANALYZE
SELECT * FROM detail_hub_employees
WHERE dealership_id = 999;

-- Expected execution time: < 50ms
```

- [ ] Queries optimized with indexes
- [ ] No sequential scans on large tables
- [ ] RLS policies efficient

---

### 6.3 Memory Leak Testing

**Test Procedure:**
1. Open Detail Hub
2. Open browser DevTools → Performance → Memory
3. Take heap snapshot
4. Navigate between tabs 20 times
5. Take another heap snapshot
6. Compare memory usage

**Expected Results:**
- [ ] Memory usage stable (no continuous growth)
- [ ] No detached DOM nodes
- [ ] No event listener leaks
- [ ] Memory returns to baseline after idle

**Monitor for 30 Minutes:**
- [ ] No memory growth during idle
- [ ] Photo captures don't leak memory
- [ ] Modal opens/closes don't leak
- [ ] Tab switches don't accumulate memory

---

## 7. Security Verification

### 7.1 Row Level Security (RLS) Testing

**Test 1: Multi-Dealership Isolation**

**Setup:**
```sql
-- Create second test dealership
INSERT INTO dealerships (name, address, phone, email)
VALUES ('Dealership B - Staging', '456 Test Ave', '555-0200', 'dealershipb@test.com')
RETURNING id;

-- Create employee in Dealership B
INSERT INTO detail_hub_employees (
  dealership_id, employee_number, first_name, last_name,
  role, department, status, hourly_rate, hire_date
) VALUES (
  [dealership-b-id], 'EMPB001', 'Test', 'UserB',
  'detailer', 'detail', 'active', 20.00, CURRENT_DATE
);
```

**Test Procedure:**
1. Login as user from Dealership A
2. Navigate to Detail Hub → Employees
3. Verify only Dealership A employees visible
4. Try to access Dealership B employee via API (should fail)

**API Test (Browser Console):**
```javascript
// Attempt to fetch Dealership B employee
const { data, error } = await supabase
  .from('detail_hub_employees')
  .select('*')
  .eq('employee_number', 'EMPB001');

console.log('Should be empty:', data);
console.log('Should have no error (RLS filters):', error);
```

**Expected:**
- [ ] User from Dealership A sees only Dealership A data
- [ ] Cannot query Dealership B employees
- [ ] RLS silently filters results (no error, just empty array)
- [ ] No dealership_id spoofing possible

**Test 2: Verify User Cannot Bypass RLS**

```javascript
// Attempt to insert employee to different dealership
const { data, error } = await supabase
  .from('detail_hub_employees')
  .insert({
    dealership_id: 9999, // Different dealership
    employee_number: 'HACK001',
    first_name: 'Hacker',
    last_name: 'Test',
    role: 'detailer',
    department: 'detail',
    status: 'active',
    hourly_rate: 100.00,
    hire_date: '2025-01-18'
  });

console.log('Should fail:', error);
```

**Expected:**
- [ ] INSERT fails with RLS policy error
- [ ] User cannot create employees for other dealerships
- [ ] Error message indicates policy violation

---

### 7.2 Photo Storage Security

**Test 1: Photo Access Control**

**Procedure:**
1. Upload photo via Time Clock
2. Get photo URL from database
3. Try to access photo URL without authentication (incognito window)
4. Try to access photo as user from different dealership

**Expected Results:**
- [ ] Photos require authentication
- [ ] Signed URLs expire (check expiration time)
- [ ] RLS prevents cross-dealership photo access
- [ ] Direct bucket access denied (no public read)

**Test 2: Photo Upload Restrictions**

```javascript
// Attempt to upload oversized file (> 10MB)
const largeFile = new File([new ArrayBuffer(11 * 1024 * 1024)], 'large.jpg');

const { data, error } = await supabase.storage
  .from('time-clock-photos')
  .upload(`test/${Date.now()}.jpg`, largeFile);

console.log('Should fail (file too large):', error);
```

**Expected:**
- [ ] Files > 10MB rejected
- [ ] Only image MIME types accepted (image/jpeg, image/png)
- [ ] Filenames sanitized (no path traversal)

---

### 7.3 Authentication Testing

**Test 1: Unauthenticated Access**

**Procedure:**
1. Logout of application
2. Try to navigate to Detail Hub URL directly
3. Try to access API endpoints

**Expected:**
- [ ] Redirect to login page
- [ ] No data visible without authentication
- [ ] API returns 401 Unauthorized

**Test 2: Session Expiration**

**Procedure:**
1. Login to application
2. Wait for session timeout (or manually invalidate session)
3. Try to perform action (e.g., create employee)

**Expected:**
- [ ] Session expires after configured timeout
- [ ] User redirected to login
- [ ] No data loss (form data preserved if possible)

---

## 8. Pilot Testing Plan

### 8.1 Week 1: Internal Testing (3-5 Users)

**Participants:**
- 1 System Administrator
- 1 Manager
- 1 Supervisor
- 1-2 Employees

**Test Scenarios:**
1. **Admin:** Configure kiosks, manage employees, review reports
2. **Manager:** Create schedules, approve timecards, generate payroll reports
3. **Supervisor:** Approve photo punches, monitor live dashboard
4. **Employees:** Punch in/out via Time Clock modal

**Daily Check-ins:**
- [ ] Day 1: Initial training and setup
- [ ] Day 2: First real punches and approvals
- [ ] Day 3: Report generation and analytics review
- [ ] Day 4: Bug reporting and feedback collection
- [ ] Day 5: Stability assessment and issue prioritization

**Success Metrics:**
- [ ] All users complete training
- [ ] 100% of users successfully punch in/out
- [ ] 90%+ photo approval rate (< 10% rejections)
- [ ] Zero critical bugs
- [ ] Average approval time < 5 minutes

---

### 8.2 Week 2: Limited Pilot (10-15 Employees, 1 Dealership)

**Expansion:**
- Add 10-15 more employees from one dealership
- Full production usage (daily punch ins/outs)
- Supervisor approval workflow active
- Monitor analytics and reports

**Monitoring:**
- [ ] Daily photo punch rate (target: 90%+)
- [ ] Approval time average
- [ ] System uptime
- [ ] Database performance
- [ ] Storage usage

**Feedback Collection:**
- Daily Slack channel or email thread
- Weekly pilot review meeting
- Bug/feature request tracking (GitHub Issues)

**Success Criteria:**
- [ ] 80%+ daily punch compliance
- [ ] < 5% photo rejection rate
- [ ] System uptime > 99%
- [ ] No data loss incidents
- [ ] Positive user feedback

---

### 8.3 Week 3: Expanded Pilot (20-30 Employees, 2 Dealerships)

**Expansion:**
- Add second dealership
- 20-30 total employees across both dealerships
- Test multi-dealership isolation
- Increased supervisor workload

**Multi-Dealership Testing:**
- [ ] Data isolation verified (Dealership A cannot see Dealership B data)
- [ ] RLS policies enforced correctly
- [ ] Performance stable with multiple dealerships
- [ ] Reporting accurate per dealership

**Load Testing:**
- [ ] 30+ simultaneous punches (morning rush)
- [ ] Photo upload queue handling
- [ ] Supervisor approval queue under load
- [ ] Analytics performance with larger dataset

**Success Criteria:**
- [ ] Multi-tenant isolation confirmed
- [ ] Performance acceptable under load
- [ ] All critical bugs from Week 1-2 resolved
- [ ] User satisfaction > 80%

---

### 8.4 Week 4: Production Readiness Review

**Final QA:**
- [ ] All critical bugs resolved
- [ ] All high-priority bugs addressed
- [ ] Performance tuning complete
- [ ] Documentation updated
- [ ] Training materials finalized

**Sign-Off Requirements:**
- [ ] Technical Lead approval
- [ ] QA approval
- [ ] Product Owner approval
- [ ] Pilot users approval

**Production Deployment Decision:**
- Go/No-Go meeting
- Review metrics and feedback
- Set production launch date
- Plan production rollout strategy

---

## 9. Rollback Plan

### 9.1 Database Rollback Procedure

**If Critical Database Issues Found:**

**Step 1: Stop Frontend Deployment**
```bash
# Railway
railway down

# Or Vercel
vercel --prod rollback
```

**Step 2: Drop DetailHub Tables (Reverse Order)**
```sql
-- CRITICAL: Only run if rollback necessary
-- Backup data first!

-- Drop in reverse dependency order
DROP TABLE IF EXISTS detail_hub_schedules CASCADE;
DROP TABLE IF EXISTS detail_hub_invoice_line_items CASCADE;
DROP TABLE IF EXISTS detail_hub_invoices CASCADE;
DROP TABLE IF EXISTS detail_hub_kiosks CASCADE;
DROP TABLE IF EXISTS detail_hub_time_entries CASCADE;
DROP TABLE IF EXISTS detail_hub_employees CASCADE;

-- Verify cleanup
SELECT table_name FROM information_schema.tables
WHERE table_name LIKE 'detail_hub_%';

-- Expected: Empty result
```

**Step 3: Restore from Backup (If Needed)**
```bash
# Restore from pre-deployment backup
supabase db restore backup_pre_detailhub_YYYYMMDD.sql

# Or manually via Supabase Dashboard:
# Database → Backups → Restore
```

**Rollback Checklist:**
- [ ] All users notified of rollback
- [ ] Frontend deployment stopped
- [ ] DetailHub tables dropped
- [ ] Backup restored (if needed)
- [ ] Application functional without DetailHub
- [ ] Incident report created

---

### 9.2 Frontend Rollback Procedure

**If Critical Frontend Issues Found:**

**Railway:**
```bash
# View deployment history
railway deployments

# Rollback to previous deployment
railway rollback [deployment-id]

# Verify rollback
railway status
```

**Vercel:**
```bash
# List deployments
vercel ls

# Rollback to specific deployment
vercel rollback [deployment-url]

# Or via dashboard:
# Deployments → Previous deployment → Promote to Production
```

**Verification:**
- [ ] Previous version deployed
- [ ] DetailHub not accessible (feature flag off)
- [ ] No errors in logs
- [ ] Users can access rest of application

---

### 9.3 Communication Plan During Rollback

**Immediate Actions:**
1. **Post in Slack/Email:**
   ```
   🚨 ROLLBACK IN PROGRESS

   We've identified a critical issue with the Detail Hub staging deployment.
   We're rolling back to the previous stable version.

   Timeline:
   - Rollback started: [TIME]
   - Expected completion: [TIME + 15 min]

   Impact:
   - Detail Hub will be temporarily unavailable
   - All other features remain functional

   We'll provide updates every 15 minutes.
   ```

2. **Update Pilot Users:**
   - Direct message to all pilot participants
   - Explain issue briefly
   - Provide timeline for fix
   - Offer workaround if available (e.g., manual timecard tracking)

3. **Post-Rollback Communication:**
   ```
   ✅ ROLLBACK COMPLETE

   Detail Hub has been successfully rolled back.

   Root Cause: [Brief description]
   Next Steps:
   - Issue analysis: [DATE]
   - Fix development: [DATE]
   - Re-deployment: [DATE]

   We appreciate your patience.
   ```

---

## 10. Monitoring Setup

### 10.1 Error Tracking

**Sentry Integration (Recommended):**

**Setup:**
```javascript
// src/lib/sentry.ts
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.NODE_ENV,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay()
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

export default Sentry;
```

**Wrap DetailHub:**
```typescript
// src/components/detail-hub/DetailHubDashboard.tsx
import Sentry from '@/lib/sentry';

const DetailHubDashboard = () => {
  return (
    <Sentry.ErrorBoundary
      fallback={<ErrorFallback />}
      showDialog
    >
      {/* DetailHub content */}
    </Sentry.ErrorBoundary>
  );
};
```

**Monitor:**
- [ ] Console errors logged to Sentry
- [ ] React errors captured
- [ ] Network failures tracked
- [ ] User sessions replayed (on error)

---

### 10.2 Usage Analytics

**Key Events to Track:**

1. **Employee Management:**
   - Employee created
   - Employee updated
   - Employee deleted
   - Employee search performed

2. **Time Tracking:**
   - Punch in initiated
   - Punch in successful
   - Punch in failed (with reason)
   - Punch out initiated
   - Punch out successful

3. **Photo Management:**
   - Photo captured
   - Photo uploaded
   - Photo approved
   - Photo rejected
   - Photo upload failed

4. **Reports:**
   - Report generated (by type)
   - Report exported (PDF/Excel)
   - Analytics dashboard viewed

**Analytics Implementation:**
```typescript
// src/utils/analytics.ts
export const trackEvent = (event: string, properties?: Record<string, any>) => {
  // Google Analytics 4
  gtag('event', event, properties);

  // Or custom analytics
  console.log(`[Analytics] ${event}:`, properties);
};

// Usage:
trackEvent('detail_hub_employee_created', {
  employee_role: 'detailer',
  department: 'detail'
});
```

**Metrics Dashboard:**
- [ ] Daily active users (DAU)
- [ ] Daily punch count
- [ ] Photo upload success rate
- [ ] Photo approval/rejection rate
- [ ] Average approval time
- [ ] Report generation count

---

### 10.3 Performance Monitoring

**Database Query Performance:**

```sql
-- Enable pg_stat_statements extension (if not enabled)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Monitor slow queries
SELECT
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%detail_hub%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Monitor:**
- [ ] Query execution times
- [ ] Most frequent queries
- [ ] Slow queries (> 100ms)
- [ ] Index usage

**Frontend Performance:**

```typescript
// Performance observer
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.entryType === 'navigation') {
      console.log('Page load time:', entry.duration);
    }
  }
});

observer.observe({ entryTypes: ['navigation', 'resource'] });
```

**Track:**
- [ ] Dashboard load time
- [ ] Photo upload duration
- [ ] Analytics render time
- [ ] PDF generation time

---

### 10.4 Uptime Monitoring

**Service Options:**
- **UptimeRobot** (Free tier)
- **Pingdom**
- **StatusCake**

**Monitor URLs:**
- `https://[staging-url]/detail-hub` - HTTP 200 expected
- `https://[staging-url]/api/health` - Health check endpoint

**Alert Configuration:**
- [ ] Check interval: Every 5 minutes
- [ ] Alert on: 2 consecutive failures
- [ ] Notification: Email + Slack
- [ ] Recovery notification: Yes

**Health Check Endpoint (Optional):**
```typescript
// src/api/health.ts
export async function GET() {
  try {
    // Test database connection
    const { data, error } = await supabase
      .from('detail_hub_employees')
      .select('id')
      .limit(1);

    if (error) throw error;

    return new Response(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'up',
        storage: 'up'
      }
    }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({
      status: 'unhealthy',
      error: error.message
    }), { status: 503 });
  }
}
```

---

## 11. Sign-Off Checklist

### 11.1 Technical Lead Sign-Off

**Code Review:**
- [ ] All DetailHub components reviewed
- [ ] TypeScript types properly defined
- [ ] No `any` types used
- [ ] Error handling comprehensive
- [ ] Console logs removed
- [ ] Code follows project standards

**Security Review:**
- [ ] RLS policies tested and verified
- [ ] No SQL injection vulnerabilities
- [ ] Photo storage secured
- [ ] Authentication enforced
- [ ] No secrets in code

**Performance Review:**
- [ ] Build size acceptable (< 5MB)
- [ ] Lighthouse scores meet targets
- [ ] Database queries optimized
- [ ] No memory leaks detected
- [ ] Load times acceptable

**Documentation:**
- [ ] Code documented (JSDoc comments)
- [ ] README updated
- [ ] Migration guide complete
- [ ] Deployment guide complete (this document)

**Technical Lead Signature:**

Name: ________________________
Date: ________________________
Approved: ☐ Yes ☐ No (with conditions)

Conditions (if any):
________________________________________________
________________________________________________

---

### 11.2 QA Lead Sign-Off

**Testing Coverage:**
- [ ] All smoke tests passed
- [ ] Cross-browser testing complete
- [ ] Mobile responsiveness verified
- [ ] Multi-language testing passed
- [ ] E2E tests written and passing
- [ ] Security testing complete

**Bug Review:**
- [ ] No critical bugs open
- [ ] All high-priority bugs resolved
- [ ] Medium/low bugs documented for future
- [ ] Regression testing passed

**Accessibility:**
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] WCAG 2.1 AA compliant
- [ ] Color contrast meets standards

**QA Lead Signature:**

Name: ________________________
Date: ________________________
Approved: ☐ Yes ☐ No (with conditions)

Conditions (if any):
________________________________________________
________________________________________________

---

### 11.3 Product Owner Sign-Off

**Feature Completeness:**
- [ ] All MVP features implemented
- [ ] User workflows validated
- [ ] Business logic correct
- [ ] Reporting meets requirements
- [ ] Analytics dashboard functional

**User Acceptance:**
- [ ] Pilot users satisfied (> 80%)
- [ ] User feedback addressed
- [ ] Training materials prepared
- [ ] Support documentation ready

**Business Readiness:**
- [ ] ROI potential validated
- [ ] Cost estimates accurate
- [ ] Operational plan defined
- [ ] Support plan in place

**Product Owner Signature:**

Name: ________________________
Date: ________________________
Approved: ☐ Yes ☐ No (with conditions)

Conditions (if any):
________________________________________________
________________________________________________

---

### 11.4 Deployment Sign-Off

**Pre-Deployment:**
- [ ] All migrations applied successfully
- [ ] Seed data created
- [ ] Environment variables configured
- [ ] SSL certificates valid
- [ ] DNS configured (if applicable)

**Post-Deployment:**
- [ ] All smoke tests passed
- [ ] No console errors
- [ ] Performance targets met
- [ ] Security verified
- [ ] Monitoring active

**Rollback Plan:**
- [ ] Rollback procedure documented
- [ ] Backup verified
- [ ] Rollback tested (dry run)
- [ ] Communication plan ready

**Deployment Lead Signature:**

Name: ________________________
Date: ________________________
Approved: ☐ Yes ☐ No (with conditions)

Conditions (if any):
________________________________________________
________________________________________________

---

## 12. Post-Deployment Actions

### 12.1 Immediate (Day 1)

**Hour 1:**
- [ ] Monitor error logs (Sentry/console)
- [ ] Check uptime monitor (should be green)
- [ ] Verify first user logins
- [ ] Monitor database performance

**Hour 2-4:**
- [ ] Pilot users begin testing
- [ ] Support channel active (Slack/email)
- [ ] Document any issues
- [ ] Quick fixes for minor issues

**End of Day 1:**
- [ ] Day 1 retrospective
- [ ] Issue triage and prioritization
- [ ] Update documentation (if needed)
- [ ] Plan Day 2 focus areas

---

### 12.2 Week 1 Actions

**Daily:**
- [ ] Morning standup with pilot users
- [ ] Monitor analytics dashboard
- [ ] Review error logs
- [ ] Address user feedback

**End of Week 1:**
- [ ] Week 1 summary report
- [ ] Bug resolution status
- [ ] User satisfaction survey
- [ ] Decision: Proceed to Week 2 pilot?

---

### 12.3 Ongoing Monitoring (Weeks 2-4)

**Weekly:**
- [ ] Review analytics trends
- [ ] Database performance analysis
- [ ] User feedback compilation
- [ ] Feature enhancement backlog

**Monthly:**
- [ ] Comprehensive performance review
- [ ] Cost analysis (storage, compute)
- [ ] Security audit
- [ ] Roadmap review

---

## 13. Appendix

### 13.1 Key URLs and Credentials

**Staging Environment:**
- URL: `https://[staging-url]/detail-hub`
- Supabase Project: `swfnnrpzpkdypbrzmgnr`
- Test Dealership ID: `999` (or as created)

**Admin Login:**
- Email: `[REDACTED]`
- Password: `[REDACTED]`

**Test Employee Credentials:**
- Employee ID: `EMP001`
- PIN: `1234`

---

### 13.2 Support Contacts

**Technical Issues:**
- Technical Lead: [Name] - [Email/Slack]
- Backend Support: [Name] - [Email/Slack]
- Frontend Support: [Name] - [Email/Slack]

**Product/Business:**
- Product Owner: [Name] - [Email/Slack]
- Project Manager: [Name] - [Email/Slack]

**Pilot Support:**
- Slack Channel: `#detailhub-pilot`
- Email: `detailhub-support@mydetailarea.com`
- Response Time: < 2 hours during business hours

---

### 13.3 Reference Documentation

**Internal Docs:**
- [Detail Hub Complete Implementation](./DETAIL_HUB_COMPLETE.md)
- [Database Schema Guide](./database-schema.md)
- [Translation Guidelines](./translation-guidelines.md)
- [Permission Architecture](./PERMISSIONS_ARCHITECTURE.md)

**External Resources:**
- [Supabase Documentation](https://supabase.com/docs)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [React i18next](https://react.i18next.com/)
- [shadcn/ui Components](https://ui.shadcn.com/)

---

## 14. Final Checklist Summary

**Before clicking "Deploy":**

- [ ] All 5 migrations applied successfully
- [ ] Seed data created (5-10 employees, 1 kiosk, schedules)
- [ ] Build passes with zero errors
- [ ] All smoke tests passed
- [ ] Performance targets met (Lighthouse > 80)
- [ ] Security verified (RLS tested)
- [ ] Multi-language working (EN/ES/PT-BR)
- [ ] Technical Lead approved
- [ ] QA Lead approved
- [ ] Product Owner approved
- [ ] Rollback plan ready
- [ ] Monitoring active
- [ ] Support team briefed
- [ ] Pilot users notified

**Post-Deployment (Day 1):**

- [ ] First users successfully logged in
- [ ] No critical errors in logs
- [ ] Uptime monitor green
- [ ] All smoke tests still passing
- [ ] Support team responsive
- [ ] Issues documented and triaged

---

## Success!

If all checklists above are complete, **DetailHub is successfully deployed to staging** and ready for pilot testing.

Next milestone: **Week 4 Production Readiness Review**

---

**Document Version:** 1.0
**Last Updated:** January 18, 2025
**Status:** Ready for Use
**Prepared by:** Claude Code AI (Deployment Engineer)
