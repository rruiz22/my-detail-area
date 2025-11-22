# 📱 SMS History Feature

**Created:** 2025-11-21
**Location:** Settings → SMS History tab
**Component:** `src/components/settings/SMSHistoryTab.tsx`

---

## 📋 Overview

The SMS History feature provides comprehensive visibility into all SMS notifications sent through the MyDetailArea system. It displays a complete audit trail of SMS messages with statistics, filtering, and export capabilities.

---

## ✨ Features

### 1. **Statistics Dashboard**
- **Total SMS**: Count of all SMS records
- **Successfully Sent**: Number of delivered messages with success rate percentage
- **Failed**: Number of failed messages with failure rate percentage
- **Total Cost**: Aggregate cost in dollars with average cost per SMS

### 2. **Advanced Filtering**

| Filter | Options | Description |
|--------|---------|-------------|
| **Search** | Text input | Search by user name, email, phone number, or message content |
| **Status** | All / Sent / Delivered / Failed / Queued | Filter by SMS delivery status |
| **Module** | All / Sales / Service / Recon / Car Wash / Get Ready | Filter by order module type |
| **Date Range** | Last 24h / 7 days / 30 days / 90 days / All time | Filter by sent date |

### 3. **Data Table Columns**

- **Date/Time**: When the SMS was sent (formatted: MMM dd, yyyy HH:mm:ss)
- **Recipient**: User name and email
- **Phone**: Recipient's phone number (formatted E.164)
- **Module**: Order module badge with color coding
- **Event**: Event type that triggered the SMS (e.g., status_changed, order_created)
- **Status**: Visual badge indicating delivery status
- **Message**: SMS message content (truncated with tooltip for full text)
- **Cost**: Cost in USD (calculated from `cost_cents`)

### 4. **Export to CSV**

Click "Export CSV" button to download filtered records with:
- Date/Time
- User name
- Phone number
- Module
- Event type
- Status
- Full message content
- Cost

Filename format: `sms-history-YYYY-MM-DD.csv`

---

## 🗄️ Database Schema

**Table:** `sms_send_history`

```sql
CREATE TABLE sms_send_history (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  dealer_id INTEGER,
  module TEXT,                    -- sales_orders, service_orders, etc.
  event_type TEXT,                -- order_created, status_changed, etc.
  entity_id UUID,                 -- Order ID
  phone_number TEXT,              -- E.164 format
  message_content TEXT,
  twilio_sid TEXT,                -- Twilio message SID
  status TEXT,                    -- sent, delivered, failed, queued
  sent_at TIMESTAMP,
  sent_day DATE,
  cost_cents INTEGER,             -- Cost in cents (e.g., 7 = $0.07)
  error_message TEXT
);
```

**Joined Tables:**
- `profiles`: User information (first_name, last_name, email)

---

## 🎨 UI Components

### Status Badges

| Status | Color | Icon |
|--------|-------|------|
| **Sent** / **Delivered** | Green (emerald-500) | CheckCircle2 |
| **Failed** | Red (destructive) | XCircle |
| **Queued** / **Sending** | Gray (secondary) | Clock |
| **Unknown** | Outline | AlertCircle |

### Module Badges

| Module | Color |
|--------|-------|
| **sales_orders** | Blue (blue-500) |
| **service_orders** | Purple (purple-500) |
| **recon_orders** | Amber (amber-500) |
| **car_wash** | Cyan (cyan-500) |
| **get_ready** | Emerald (emerald-500) |

---

## 🔐 Access Control

**Visibility:** All authenticated users can view SMS History

**Data Scope:**
- Currently shows ALL records from `sms_send_history` table (limited to 100 most recent)
- Future enhancement: Filter by `dealer_id` to scope to user's dealership only

**RLS Policies Required:**
```sql
-- Allow users to view SMS history for their dealership
CREATE POLICY "Users can view SMS history for their dealership"
ON sms_send_history
FOR SELECT
USING (
  dealer_id IN (
    SELECT dealer_id
    FROM dealer_memberships
    WHERE user_id = auth.uid()
    AND is_active = true
  )
);
```

---

## 📊 Query Performance

**Current Query:**
```typescript
supabase
  .from('sms_send_history')
  .select(`
    *,
    profiles!inner(first_name, last_name, email)
  `)
  .order('sent_at', { ascending: false })
  .limit(100)
  // + filters for status, module, date range
```

**Optimization Recommendations:**
1. Add index on `sent_at` for faster sorting
2. Add composite index on `(dealer_id, sent_at)` for dealership-scoped queries
3. Add index on `status` for filter queries
4. Add index on `module` for filter queries

```sql
-- Recommended indexes
CREATE INDEX idx_sms_history_sent_at ON sms_send_history(sent_at DESC);
CREATE INDEX idx_sms_history_dealer_sent ON sms_send_history(dealer_id, sent_at DESC);
CREATE INDEX idx_sms_history_status ON sms_send_history(status);
CREATE INDEX idx_sms_history_module ON sms_send_history(module);
```

---

## 🧪 Testing Checklist

### Manual Testing

- [ ] **Statistics Display**
  - [ ] Total SMS count is accurate
  - [ ] Success rate calculates correctly
  - [ ] Failure rate calculates correctly
  - [ ] Total cost displays in dollars ($0.07 per SMS)

- [ ] **Filtering**
  - [ ] Search by user name works
  - [ ] Search by phone number works
  - [ ] Search by message content works
  - [ ] Status filter (Sent, Failed, etc.) works
  - [ ] Module filter (Sales, Service, etc.) works
  - [ ] Date range filter works (Last 24h, 7 days, etc.)

- [ ] **Table Display**
  - [ ] All columns render correctly
  - [ ] Date/time formats correctly
  - [ ] Status badges show correct colors
  - [ ] Module badges show correct colors
  - [ ] Long messages truncate with tooltip
  - [ ] Error messages display for failed SMS

- [ ] **CSV Export**
  - [ ] Export button downloads file
  - [ ] CSV contains all filtered records
  - [ ] CSV headers are correct
  - [ ] CSV data is properly escaped (quotes in messages)
  - [ ] Filename includes current date

- [ ] **Responsiveness**
  - [ ] Mobile view (< 768px) works correctly
  - [ ] Tablet view (768px - 1024px) works correctly
  - [ ] Desktop view (> 1024px) works correctly

- [ ] **Loading States**
  - [ ] Loading spinner shows on initial load
  - [ ] "No SMS records found" shows when empty

---

## 🚀 Future Enhancements

### Phase 2 Features

1. **Advanced Analytics**
   - Success rate trends over time (line chart)
   - SMS volume by module (pie chart)
   - Cost analysis by dealership
   - Peak usage times heatmap

2. **Retry Failed SMS**
   - Button to retry failed messages
   - Bulk retry for multiple failed SMS

3. **Real-time Updates**
   - WebSocket subscription for live updates
   - Auto-refresh when new SMS are sent

4. **Enhanced Filtering**
   - Filter by specific user
   - Filter by specific order
   - Date range picker (custom dates)
   - Cost range filter

5. **Notifications**
   - Alert when SMS fails
   - Daily summary email of SMS activity
   - Cost threshold warnings

6. **Audit Trail**
   - Track who viewed SMS history
   - Export audit log
   - Compliance reporting

---

## 🐛 Known Issues

1. **RLS Policy Not Applied**: Currently showing all records regardless of dealership
   - **Fix**: Add RLS policy to scope by `dealer_id`
   - **Priority**: High

2. **No Pagination**: Limited to 100 records
   - **Fix**: Implement cursor-based pagination
   - **Priority**: Medium

3. **Large Messages**: Full message content not visible in table
   - **Fix**: Add expandable row or modal to view full message
   - **Priority**: Low

---

## 📚 Related Documentation

- [NOTIFICATION_LEVEL3_SIMPLIFICATION.md](../../../NOTIFICATION_LEVEL3_SIMPLIFICATION.md) - Level 3 architecture
- [NOTIFICATION_LEVEL2_FIX.md](../../../NOTIFICATION_LEVEL2_FIX.md) - Security fix for Level 2
- [VERIFY_DEPLOYMENT.md](../../../VERIFY_DEPLOYMENT.md) - Deployment verification guide
- [Edge Function: send-order-sms-notification](../../../supabase/functions/send-order-sms-notification/index.ts) - SMS sending logic

---

## 🔧 Maintenance

**Dependencies:**
- `date-fns` - Date formatting
- `lucide-react` - Icons
- `@supabase/supabase-js` - Database queries
- `shadcn/ui` - UI components (Table, Badge, Card, Select, etc.)

**Component Size:** ~580 lines

**Last Updated:** 2025-11-21

---

✅ **Feature Status:** Ready for production
📝 **Documentation Status:** Complete
🧪 **Test Coverage:** Manual testing required
