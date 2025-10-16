# Reports & Invoices Module - Implementation Guide

## Overview
Complete billing and financial reporting system for Sales, Service, Recon, and Car Wash orders.

## ✅ Completed

### 1. Database Structure
- **Location**: `supabase/migrations/20241016_create_invoices_system.sql`
- **Tables Created**:
  - `invoices` - Main invoice records with order references
  - `invoice_items` - Line items (snapshot from order services)
  - `payments` - Payment tracking with methods and status
  - `scheduled_reports` - Automated report scheduling
  - `report_send_history` - Email sending history

- **Key Features**:
  - All customer/vehicle data comes from `orders` table (no duplication)
  - Auto-generated invoice numbers: `INV-YYYY-####`
  - Auto-generated payment numbers: `PAY-YYYY-####`
  - Automatic total calculations via triggers
  - RLS policies for multi-tenant security

### 2. Analytics Functions
- **Location**: `supabase/migrations/20241016_create_reports_functions.sql`
- **Functions**:
  - `get_orders_analytics()` - Real-time order statistics
  - `get_revenue_analytics()` - Revenue breakdown by period
  - `get_performance_trends()` - Department performance metrics
  - `get_invoice_analytics()` - Invoice and payment statistics

### 3. TypeScript Types
- **Location**: `src/types/invoices.ts`
- Complete type definitions for:
  - Invoice, InvoiceItem, Payment
  - Form data types
  - Filter types
  - Supabase row types

### 4. React Hooks
- **Location**: `src/hooks/useInvoices.ts`
- Hooks implemented:
  - `useInvoices(filters)` - Get filtered invoices
  - `useInvoice(id)` - Get single invoice with details
  - `useInvoiceSummary(filters)` - Get summary statistics
  - `useCreateInvoice()` - Create new invoice
  - `useRecordPayment()` - Record payment
  - `useSendInvoiceEmail()` - Send invoice via email

### 5. UI Components
- **Main Report**: `src/components/reports/sections/InvoicesReport.tsx`
  - Notion-style minimalist design
  - Summary cards (Billed, Collected, Outstanding, Overdue)
  - Filterable invoice table
  - Quick actions (Pay, Email, Download)

- **Dialogs** (placeholders): `src/components/reports/invoices/`
  - `CreateInvoiceDialog.tsx`
  - `InvoiceDetailsDialog.tsx`
  - `RecordPaymentDialog.tsx`

### 6. Integration
- Added Invoices tab to `src/pages/Reports.tsx`
- 4-tab layout: Operational | Financial | Invoices | Export

## 🚧 Pending Implementation

### 1. Complete Dialog Components
Need to fully implement:
- Create Invoice form (select order, set dates, tax rate, terms)
- Invoice Details view (PDF-style preview)
- Record Payment form (amount, method, reference)

### 2. PDF Generation
- Invoice PDF template
- Download functionality
- Email attachment

### 3. Excel Export
- Install `exceljs` package
- Implement multi-sheet workbooks
- Format currency and dates

### 4. Email System
- Create Supabase Edge Function for sending emails
- Email templates for invoices
- Scheduled report emails

### 5. Period Filters Enhancement
- Quick filters: Today, This Week, This Month, Last Month
- Date range comparison
- Custom date ranges

### 6. Translations
- Complete English translations
- Complete Spanish translations
- All invoice-related keys

## 📋 Migration Instructions

### To Apply the Database Changes:

1. **Run the migrations in Supabase Dashboard** (SQL Editor):
   ```sql
   -- First, run the invoices system:
   -- Copy contents from: supabase/migrations/20241016_create_invoices_system.sql

   -- Then, run the analytics functions:
   -- Copy contents from: supabase/migrations/20241016_create_reports_functions.sql
   ```

2. **Verify the tables were created**:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN ('invoices', 'invoice_items', 'payments', 'scheduled_reports');
   ```

3. **Test the functions**:
   ```sql
   -- Test with your dealer ID
   SELECT * FROM get_orders_analytics(
     1, -- dealer_id
     NOW() - INTERVAL '30 days',
     NOW(),
     'all',
     'all'
   );
   ```

## 🎨 Design Philosophy

### Notion-Style Minimalism
- Clean borders with subtle shadows
- No gradients, flat colors
- Clear typography hierarchy
- Ample whitespace
- Hover states for interactivity
- Status badges with pastel backgrounds

### Color Palette
- Blue: Primary actions, pending items
- Green: Success, paid status
- Orange: Warning, outstanding
- Red: Error, overdue
- Gray: Neutral, cancelled

## 🔐 Security

- RLS policies ensure users only see their dealership's data
- Invoice creation requires authenticated user
- Payment recording tracks who recorded it
- Email sending is logged with timestamps

## 📊 Features

### Invoice Management
- Create invoices from completed orders
- Automatic line item generation from order services
- Tax calculation
- Discount support
- Multiple payment methods
- Payment history tracking

### Payment Status
- Draft: Not finalized
- Pending: Sent, awaiting payment
- Partially Paid: Partial payment received
- Paid: Fully paid
- Overdue: Past due date
- Cancelled: Voided

### Reports
- Real-time financial metrics
- Order analytics by type
- Revenue trends
- Performance by department
- SLA compliance tracking

## 🚀 Next Steps

1. Complete invoice dialog forms
2. Implement PDF generation
3. Set up email system
4. Add Excel export
5. Complete translations
6. Test with real data
7. User acceptance testing

## Notes

- All invoice data is derived from orders table
- Invoice is a snapshot at time of creation
- Payments update invoice status automatically
- Scheduled reports can be configured per dealer
- Email sending history is tracked for audit

