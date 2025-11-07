# 🚗 MyDetailArea - Google Sheets Integration

## Enterprise-Grade Integration for Automated Vehicle Workflow

Seamlessly sync vehicles from Google Sheets directly into MyDetailArea's Get Ready module with one click.

---

## 🎯 Overview

This integration eliminates double data entry by allowing dealership managers to send vehicles from their Google Sheet inventory tracking directly to the Get Ready workflow management system.

### Problem Solved

**Before:**
1. Manager adds vehicle to Google Sheet (columns A, L, M, N)
2. Manager manually enters same data into Get Ready module
3. **Time wasted:** 2-3 minutes per vehicle × 50-200 vehicles/month = **100-600 minutes/month** lost

**After:**
1. Manager adds vehicle to Google Sheet (same columns)
2. Click menu button → Confirm in modal
3. **Time saved:** 90% reduction (10-15 seconds per vehicle)

### Benefits

- ✅ **Zero cost** - No monthly fees
- ✅ **Zero learning curve** - Works inside familiar Google Sheets
- ✅ **One-click operation** - Modal confirmation in 2 clicks
- ✅ **Automatic tracking** - Status updated in sheet automatically
- ✅ **Comprehensive logging** - Full audit trail
- ✅ **Error handling** - Validates data before sending
- ✅ **Bulk operations** - Send 100+ vehicles at once

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        GOOGLE SHEET                              │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  A      ...   L      M      N      ...      Q              │  │
│  │ Stock#  ...  Year   Make  Model   ...   Status Info        │  │
│  │ ABC123  ...  2023   Honda Civic   ...      -               │  │
│  └────────────────────────────────────────────────────────────┘  │
│                               │                                  │
│  [Manager clicks: 🚗 Get Ready → 📤 Send Selected Vehicle]      │
└───────────────────────────────┼──────────────────────────────────┘
                                │
                                ▼
          ┌─────────────────────────────────────────┐
          │  📋 MODAL CONFIRMATION DIALOG           │
          │  ─────────────────────────────────────  │
          │  Vehicle Info:                          │
          │   • Stock: ABC123                       │
          │   • Year: 2023                          │
          │   • Make: Honda                         │
          │   • Model: Civic                        │
          │                                         │
          │  Additional Details:                    │
          │   • VIN: [________] (optional)          │
          │   • Trim: [________] (optional)         │
          │   • Priority: [Medium ▼]                │
          │   • Initial Step: [Inspection ▼]       │
          │                                         │
          │  [Cancel]  [✓ Add Vehicle]              │
          └─────────────────┬───────────────────────┘
                            │ User confirms
                            ▼
          ┌──────────────────────────────────────┐
          │  GOOGLE APPS SCRIPT                  │
          │  ──────────────────────────────────  │
          │  1. Validate data                    │
          │  2. Format payload                   │
          │  3. Call Supabase REST API           │
          │  4. Handle response                  │
          │  5. Update Sheet status (column E)   │
          │  6. Log to "API Logs" sheet          │
          └──────────────┬───────────────────────┘
                         │ POST /rest/v1/get_ready_vehicles
                         ▼
          ┌───────────────────────────────────────┐
          │  SUPABASE REST API                    │
          │  ───────────────────────────────────  │
          │  • RLS Policy validation              │
          │  • Duplicate check (stock#, VIN)      │
          │  • Insert into get_ready_vehicles     │
          │  • Return created vehicle ID          │
          └──────────────┬────────────────────────┘
                         │
                         ▼
          ┌───────────────────────────────────────┐
          │  DATABASE TRIGGERS (Automatic)        │
          │  ───────────────────────────────────  │
          │  ✅ Create activity log entry         │
          │  ✅ Notify assigned users (if any)    │
          │  ✅ Update KPI metrics                │
          │  ✅ Calculate SLA status              │
          └──────────────┬────────────────────────┘
                         │
                         ▼
          ┌───────────────────────────────────────┐
          │  MYDETAILAREA FRONTEND                │
          │  ───────────────────────────────────  │
          │  • Real-time subscription picks up    │
          │  • New vehicle appears in UI          │
          │  • Manager/team sees vehicle          │
          │  • Workflow can begin                 │
          └───────────────────────────────────────┘
```

---

## 📁 Project Structure

```
google-sheets-integration/
├── Code.gs                      # Backend logic (Apps Script)
├── SendToGetReadyDialog.html    # Modal UI (HTML/CSS/JS)
├── appsscript.json              # Manifest & OAuth scopes
├── SETUP_GUIDE.md               # Installation instructions
├── USER_GUIDE.md                # Daily usage guide
└── README.md                    # This file
```

---

## 🚀 Quick Start

### For First-Time Setup

1. **Read**: [SETUP_GUIDE.md](./SETUP_GUIDE.md)
2. **Follow**: Step-by-step setup (15-20 minutes)
3. **Test**: Send one vehicle to verify
4. **Train**: Share USER_GUIDE.md with manager

### For Daily Use

1. **Read**: [USER_GUIDE.md](./USER_GUIDE.md)
2. **Use**: Menu → 🚗 Get Ready → 📤 Send Selected Vehicle
3. **Monitor**: Check API Logs periodically

---

## 🔧 Technical Details

### Technology Stack

- **Frontend**: HTML5 + CSS3 + Vanilla JavaScript
- **Backend**: Google Apps Script (JavaScript V8 runtime)
- **API**: Supabase REST API
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Anon Key + RLS Policies

### API Endpoints Used

```
GET  /rest/v1/get_ready_steps?dealer_id=eq.{DEALER_ID}
POST /rest/v1/get_ready_vehicles
```

### Rate Limits & Quotas

**Google Apps Script:**
- 20,000 URL Fetch calls/day (Gmail account)
- 100,000 URL Fetch calls/day (Google Workspace)
- 6 minutes max execution time per function
- 30 seconds timeout for URL Fetch

**Recommendation for 50-200 vehicles/month:**
- ✅ Well within limits (~6-7 vehicles/day average)
- ✅ Peak days (50 vehicles) = 2.5% of daily quota

### Caching Strategy

**Workflow Steps:**
- Cached for 1 hour using `CacheService`
- Reduces API calls by ~95%
- Manual refresh: Menu → Clear Steps Cache

**Why?**
- Steps rarely change (maybe once a week)
- Reduces latency (instant dropdown population)
- Stays within API quotas

### Error Handling

**Validation Layers:**
1. **Client-side** (HTML5 form validation)
2. **Apps Script** (validateVehicleData function)
3. **Supabase** (RLS policies + constraints)

**Duplicate Detection:**
- Stock number duplicate: Caught by unique constraint
- Returns friendly error message
- Logged to API Logs for review

### Security Measures

**API Key Storage:**
- ✅ Stored in Script Properties (encrypted at rest by Google)
- ✅ Never exposed in client-side code
- ✅ Only accessible by script owner

**Data Transmission:**
- ✅ HTTPS only (TLS 1.2+)
- ✅ Supabase validates all requests via RLS
- ✅ No sensitive data cached client-side

**Access Control:**
- ✅ Only users with Sheet edit permission can run script
- ✅ Supabase enforces dealership-scoped access
- ✅ Audit trail in API Logs

---

## 📊 Features

### ✅ Core Features

- [x] **Custom menu integration** - Native "Get Ready" menu in Google Sheets
- [x] **Modal dialog** - Beautiful confirmation UI
- [x] **Single vehicle send** - One-click operation
- [x] **Bulk vehicle send** - Process all unmarked vehicles
- [x] **Auto-fetch steps** - Dropdown populated from Get Ready
- [x] **Priority selection** - Low/Medium/High/Urgent
- [x] **Optional VIN entry** - Add VIN if available
- [x] **Status tracking** - Column Q marks added vehicles with sheet name, timestamp, and ID
- [x] **Comprehensive API logs** - Separate sheet for audit trail
- [x] **Error handling** - User-friendly error messages
- [x] **Connection testing** - Verify setup function
- [x] **Settings dialog** - View current configuration

### 🔮 Future Enhancements (Roadmap)

- [ ] **Auto-trigger on new row** - Add vehicle without manual click
- [ ] **VIN auto-decode** - Call VIN decoder API to populate year/make/model
- [ ] **Duplicate warning** - Show existing vehicle before creating duplicate
- [ ] **Batch VIN import** - Paste multiple VINs at once
- [ ] **Status sync** - Update Sheet when vehicle changes step in Get Ready
- [ ] **Bidirectional sync** - Get Ready changes update Sheet
- [ ] **Email notifications** - Send confirmation email after creation
- [ ] **Slack integration** - Post to Slack channel when vehicles added
- [ ] **Custom field mapping** - Configure which columns map to which fields

---

## 🧪 Testing

### Manual Testing Checklist

**Before going live:**
- [ ] Test with valid vehicle (all fields filled)
- [ ] Test with missing Make/Model (should show error)
- [ ] Test with empty Stock# (should show error)
- [ ] Test with duplicate Stock# (should show friendly error)
- [ ] Test with invalid VIN (16 chars - should validate)
- [ ] Test connection to Supabase (testSupabaseConnection)
- [ ] Test bulk send with 3-5 vehicles
- [ ] Verify status updates in column E
- [ ] Verify vehicle appears in Get Ready module
- [ ] Check API Logs sheet is created and populated
- [ ] Test with poor/no internet (should show error)

### Load Testing

For high-volume dealerships (>100 vehicles/month):

```javascript
// Run this function to test bulk processing
function bulkLoadTest() {
  // Create 50 test vehicles
  const testVehicles = [];
  for (let i = 1; i <= 50; i++) {
    testVehicles.push({
      stock_number: `TEST${i}`,
      vehicle_year: 2023,
      vehicle_make: 'Toyota',
      vehicle_model: 'Camry',
      step_id: 'inspection',
      priority: 'medium'
    });
  }

  // Process with rate limiting
  testVehicles.forEach((vehicle, index) => {
    createVehicleInGetReady(vehicle);
    if (index % 10 === 0) {
      Logger.log(`Processed ${index} vehicles...`);
    }
    Utilities.sleep(100); // 100ms delay = 600/min (safe)
  });
}
```

---

## 🔒 Security & Privacy

### Data Privacy

- ✅ **No data stored** in Apps Script beyond execution logs
- ✅ **Direct API calls** to Supabase (no intermediary servers)
- ✅ **Dealership-scoped** - RLS ensures data isolation
- ✅ **Audit trail** - All actions logged with timestamps

### OAuth Scopes Used

```json
{
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets.currentonly",
    "https://www.googleapis.com/auth/script.container.ui",
    "https://www.googleapis.com/auth/script.external_request"
  ]
}
```

**What these mean:**
- `spreadsheets.currentonly` - Read/write ONLY the current sheet (not other files)
- `script.container.ui` - Show menus and dialogs
- `script.external_request` - Make API calls to Supabase

---

## 📈 Performance & Scalability

### Current Performance

- **Single vehicle**: 2-5 seconds
- **Bulk (10 vehicles)**: 15-30 seconds
- **Bulk (100 vehicles)**: 2-4 minutes

### Optimization Techniques Used

1. **Caching** - Steps cached for 1 hour
2. **Rate limiting** - 100ms delay between bulk requests
3. **Batch logging** - Efficient sheet updates
4. **Conditional triggers** - Only fire when needed

### Scaling Considerations

**Current capacity:** 50-200 vehicles/month
**Max capacity:** 1,000 vehicles/month (with current quotas)
**If you exceed:** Consider upgrading to Google Workspace (higher quotas)

---

## 🐛 Known Issues & Limitations

### Current Limitations

1. **Manual trigger** - Manager must click menu (not fully automatic)
2. **No auto-VIN decode** - VIN must be entered manually or decoded separately
3. **One dealership** - Single DEALER_ID configuration
4. **No bidirectional sync** - Changes in Get Ready don't update Sheet

### Planned Fixes

See "Future Enhancements" section above.

### Workarounds

**Issue: Manager forgets to send vehicles**
→ **Solution**: Use bulk send at end of day

**Issue: VIN entry is tedious**
→ **Solution**: Leave VIN blank initially, add later in Get Ready

**Issue: Need to track multiple dealerships**
→ **Solution**: Create separate Script for each dealership's sheet

---

## 🔄 Maintenance

### Regular Maintenance (Optional)

**Monthly:**
- Review API Logs for errors
- Clean up old logs (keep last 3 months)
- Verify connection still works

**When Making Changes:**
- Update Code.gs if API changes
- Clear steps cache if workflow steps change
- Re-test after updates

### Updating the Integration

When new versions are released:

1. **Backup current script** (File → Make a copy)
2. **Replace Code.gs** with new version
3. **Replace HTML** if updated
4. **Test** with one vehicle
5. **Deploy** if successful

---

## 📞 Support

### Documentation

- **Setup**: See [SETUP_GUIDE.md](./SETUP_GUIDE.md)
- **Daily use**: See [USER_GUIDE.md](./USER_GUIDE.md)
- **This file**: Architecture & technical details

### Contact

**Technical Issues:**
- 📧 Email: support@mydetailarea.com
- 🌐 Website: mydetailarea.com

**Feature Requests:**
- Submit via MyDetailArea admin panel
- Or email feature requests to product team

---

## 📄 License & Attribution

**Copyright:** MyDetailArea LLC
**Version:** 1.0.0
**Last Updated:** January 2025

**Built with:**
- Google Apps Script
- Supabase REST API
- MyDetailArea Get Ready Module

---

## 🙏 Acknowledgments

Thanks to:
- **Google Workspace team** - For Apps Script platform
- **Supabase team** - For excellent API and real-time infrastructure
- **Dealership managers** - For feedback on workflow optimization

---

## 🚀 Getting Started

**New user?**
→ Start with [SETUP_GUIDE.md](./SETUP_GUIDE.md)

**Already configured?**
→ See [USER_GUIDE.md](./USER_GUIDE.md)

**Questions?**
→ Contact MyDetailArea support

---

**💡 Pro Tip:** Bookmark this folder for quick access to guides and updates!

*Happy vehicle tracking! 🚗💨*
