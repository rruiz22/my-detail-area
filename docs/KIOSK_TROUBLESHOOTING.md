# Kiosk Configuration Troubleshooting Guide

## Overview

El sistema de kiosk ahora incluye **recuperación automática** y **logging exhaustivo** para diagnosticar y prevenir pérdida de configuración.

## Architecture Changes (Nov 2024)

### Before (v1.0 - Vulnerable)
```
Configuration Storage: localStorage ONLY
Recovery: None
Cleanup: Aggressive (deletes incomplete configs)
```

### After (v2.0 - Resilient) ✅
```
Primary Storage: localStorage (fast access)
Backup Storage: detail_hub_kiosk_devices table (recovery)
Auto-Recovery: Enabled via device fingerprint
Cleanup: Reduced aggressiveness (only corrupted data)
Logging: Comprehensive diagnostics
```

## How Auto-Recovery Works

### Scenario: localStorage is Cleared

**Step 1**: User opens app → `useKioskConfig` hook initializes

**Step 2**: Detects empty localStorage:
```typescript
// No kiosk_id found in localStorage
localStorage.getItem('kiosk_id') === null
```

**Step 3**: Queries database using device fingerprint:
```sql
SELECT kiosk_id, configured_at, last_seen_username
FROM detail_hub_kiosk_devices
WHERE device_fingerprint = '<BROWSER_FINGERPRINT>'
AND is_active = true
```

**Step 4**: If found → Automatically restores configuration:
```typescript
localStorage.setItem('kiosk_id', data.kiosk_id);
localStorage.setItem('kiosk_device_fingerprint', fingerprint);
// ... etc
```

**Step 5**: Shows success notification:
```
✅ Kiosk Configuration Restored
Your kiosk configuration was automatically recovered from the database.
```

**User Impact**: **ZERO** - completely transparent recovery!

---

## Diagnostic Tools

### Browser Console Commands

Open browser DevTools (F12) and run these commands in the Console tab:

#### 1. Full Diagnostic Check
```javascript
await window.kioskDiagnostics.diagnose()
```

**Output Example**:
```
🔍 Starting Kiosk Configuration Diagnostic...
📦 Checking localStorage...
🗄️ Checking database...

📊 Diagnostic Report:
  localStorage:
    ✅ kioskId: 'abc123...'
    ✅ fingerprint: 'XYZ789...'
    ✅ configuredAt: '2024-11-20T...'

  database:
    ✅ Kiosk exists
    ✅ Device binding exists

  severity: 'ok'
  recommendations: ['✅ Everything looks good!']
```

#### 2. Show Current Configuration
```javascript
window.kioskDiagnostics.show()
```

**Output Example**:
```
📦 Current Kiosk Configuration:
┌─────────────────────┬───────────────────┐
│ Kiosk ID            │ abc123...         │
│ Device Fingerprint  │ XYZ789...         │
│ Configured At       │ 2024-11-20T10:30  │
│ Username            │ DETAILAREA-PC     │
│ Age (days)          │ 5                 │
└─────────────────────┴───────────────────┘
```

#### 3. Test Recovery System
```javascript
await window.kioskDiagnostics.testRecovery()
```

**Output if recovery would work**:
```
🧪 Testing automatic recovery...
✅ Device binding found - recovery would SUCCEED
📋 Recovery would restore:
  kioskId: 'abc123...'
  configuredAt: '2024-11-20T...'
  username: 'DETAILAREA-PC'
```

**Output if recovery would fail**:
```
❌ No device binding found - recovery would FAIL
💡 You need to reconfigure this kiosk to create a device binding
```

#### 4. Force Reset (Nuclear Option)
```javascript
window.kioskDiagnostics.reset()
```

**Use this when**: Configuration is corrupted and auto-recovery doesn't work.

**Effect**: Deletes all kiosk config from localStorage. Reload page to reconfigure.

---

## Enhanced Logging System

### Where Logs Appear

All kiosk-related logs are prefixed with `[KioskConfig]`, `[KioskSetup]`, or `[Kiosk]`.

**Example Log Output**:
```
[KioskConfig] ✅ Valid configuration found: { kioskId: 'abc123...', ageInDays: 5 }
[Kiosk] ✅ Valid UUID format detected: abc123-def456-...
[Kiosk] ✅ Kiosk validated against database: { name: 'Front Desk Kiosk', code: 'FD001' }
```

### Critical Error Logs

#### Configuration Loss Detection
```
[KioskConfig] 🚨 EXTERNAL DELETION DETECTED!
{
  detectionMethod: 'localStorage.clear()',
  possibleCauses: [
    '1. User cleared browser cache/storage (Ctrl+Shift+Del)',
    '2. Privacy extension (CCleaner, Avast, etc.)',
    '3. Browser automatic cleanup',
    '4. Manual deletion via DevTools → Application → Storage'
  ]
}
```

#### Kiosk Not Found in Database
```
[Kiosk] 🚨 CRITICAL: Valid UUID but kiosk NOT FOUND in database!
{
  kioskId: 'abc123...',
  possibleCauses: [
    '1. Kiosk was deleted by admin',
    '2. Dealership was deleted (CASCADE)',
    '3. Database migration reset'
  ]
}
```

#### Auto-Recovery Success
```
[KioskConfig] 🎉 RECOVERY SUCCESSFUL - Found device binding in database
[KioskConfig] ✅ Configuration restored to localStorage successfully
```

---

## Common Issues & Solutions

### Issue 1: "This device is not configured as a kiosk"

**Symptoms**: Red toast error when clicking Time Clock button

**Diagnostic Steps**:
1. Open DevTools Console (F12)
2. Run: `await window.kioskDiagnostics.diagnose()`
3. Look for localStorage issues

**Solutions**:

**Scenario A: No localStorage config found**
```
localStorage: { kioskId: null, fingerprint: null }
database: { deviceBindingExists: true }
```
→ **Solution**: Reload page - auto-recovery will restore config

**Scenario B: No database binding found**
```
localStorage: { kioskId: null }
database: { deviceBindingExists: false }
```
→ **Solution**: Click "Setup Kiosk" button to reconfigure

**Scenario C: Kiosk deleted from database**
```
localStorage: { kioskId: 'abc123...' }
database: { kioskExists: false }
```
→ **Solution**: Kiosk was deleted by admin - reconfigure or contact support

### Issue 2: Configuration keeps disappearing

**Root Cause**: Browser cache being cleared (manually or automatically)

**Diagnostic Steps**:
1. Look for this log entry:
   ```
   [KioskConfig] 🚨 EXTERNAL DELETION DETECTED!
   ```

2. Check `possibleCauses` in the log

**Solutions**:

**Browser Settings**:
- Disable automatic cache clearing
- Whitelist MyDetailArea in privacy extensions (CCleaner, Avast, etc.)
- Check browser settings: Settings → Privacy → Clear browsing data → Ensure "Cookies and site data" is NOT checked for automatic clearing

**Windows Power Settings** (Kiosks):
- Disable browser auto-restart on Windows updates
- Use dedicated kiosk browser profile (not shared with personal browsing)

**Now with v2.0**: Even if cache is cleared, **auto-recovery will restore config automatically** on next page load!

### Issue 3: "Corrupted kiosk configuration detected"

**Symptoms**: Red toast with "Corrupted kiosk configuration" message

**Root Cause**: localStorage has invalid UUID (malformed string)

**Diagnostic Steps**:
1. Run: `window.kioskDiagnostics.show()`
2. Look for `Kiosk ID` value

**Solutions**:

**If UUID is 'default-kiosk'**:
```javascript
// This is a legacy bug - should auto-fix on reload
location.reload();
```

**If UUID is corrupted** (e.g., "abc123" instead of valid UUID):
```javascript
// Force reset and reconfigure
window.kioskDiagnostics.reset();
location.reload();
```

### Issue 4: Fingerprint Mismatch Warning

**Symptoms**: Console warning about fingerprint mismatch

**Log Example**:
```
[KioskConfig] ⚠️ Fingerprint mismatch - device may have changed
```

**Causes**:
- Browser update (changes user agent)
- Screen resolution change (monitor plugged/unplugged)
- GPU driver update
- Different browser used on same PC

**Solution**:
- **Currently**: Warning only, no action taken
- **Recommendation**: Reconfigure kiosk if hardware changed significantly

---

## Testing Scenarios

### Test 1: Simulate localStorage Clear

```javascript
// 1. Show current config
window.kioskDiagnostics.show()

// 2. Force clear localStorage
window.kioskDiagnostics.reset()

// 3. Reload page
location.reload()

// EXPECTED: Auto-recovery should restore config + show green toast
```

### Test 2: Verify Database Backup

```javascript
// 1. Run diagnostic
await window.kioskDiagnostics.diagnose()

// 2. Check deviceBindingExists
// EXPECTED: true (if configured recently)
```

### Test 3: Test Recovery System

```javascript
// Check if recovery would work WITHOUT clearing localStorage
await window.kioskDiagnostics.testRecovery()

// EXPECTED:
// ✅ Device binding found - recovery would SUCCEED
```

---

## Database Schema

### Table: `detail_hub_kiosk_devices`

**Purpose**: Backup storage for device bindings (enables auto-recovery)

**Columns**:
```sql
id                  UUID PRIMARY KEY
kiosk_id            UUID REFERENCES detail_hub_kiosks(id) ON DELETE CASCADE
device_fingerprint  TEXT NOT NULL UNIQUE
is_active           BOOLEAN DEFAULT true
configured_at       TIMESTAMP
last_seen_at        TIMESTAMP
last_seen_username  TEXT
```

**Key Behavior**:
- `device_fingerprint` is UNIQUE - one device = one kiosk
- `ON DELETE CASCADE` - if kiosk deleted, device binding is also deleted
- `is_active` - allows deactivation without deletion

### Automatic Updates

**When KioskSetupWizard runs**:
```sql
INSERT INTO detail_hub_kiosk_devices (
  kiosk_id,
  device_fingerprint,
  configured_at,
  last_seen_username,
  is_active
) VALUES (...)
ON CONFLICT (device_fingerprint)
DO UPDATE SET
  kiosk_id = EXCLUDED.kiosk_id,
  last_seen_at = EXCLUDED.last_seen_at
```

**When PunchClockKioskModal opens**:
- Validates kiosk UUID exists in `detail_hub_kiosks`
- Logs validation result for diagnostics

**When auto-recovery runs**:
```sql
UPDATE detail_hub_kiosk_devices
SET last_seen_at = NOW()
WHERE device_fingerprint = '<FINGERPRINT>'
```

---

## Monitoring Dashboard (Future Enhancement)

### Recommended Queries for Admin Panel

**Show all configured devices**:
```sql
SELECT
  k.name AS kiosk_name,
  k.kiosk_code,
  d.device_fingerprint,
  d.configured_at,
  d.last_seen_at,
  d.is_active,
  EXTRACT(EPOCH FROM (NOW() - d.last_seen_at)) / 60 AS minutes_since_last_seen
FROM detail_hub_kiosk_devices d
JOIN detail_hub_kiosks k ON k.id = d.kiosk_id
ORDER BY d.last_seen_at DESC
```

**Find stale devices (not seen in 7 days)**:
```sql
SELECT * FROM detail_hub_kiosk_devices
WHERE last_seen_at < NOW() - INTERVAL '7 days'
AND is_active = true
```

**Find orphaned device bindings (kiosk deleted)**:
```sql
SELECT * FROM detail_hub_kiosk_devices d
WHERE NOT EXISTS (
  SELECT 1 FROM detail_hub_kiosks k
  WHERE k.id = d.kiosk_id
)
```

---

## Migration Notes

### Existing Kiosks (Configured Before Nov 2024)

**Status**: ⚠️ No device binding in database

**What happens**:
- Kiosk continues working normally (localStorage still has config)
- If localStorage is cleared → **NO auto-recovery** (binding doesn't exist)

**How to fix**:
1. Go to DetailHub → Click "Kiosk Settings" button
2. Wizard will open (even if configured)
3. Select same kiosk → Click "Configure"
4. Device binding will be created in database
5. Future localStorage clears will auto-recover ✅

### New Kiosks (Configured After Nov 2024)

**Status**: ✅ Full protection enabled

**Features**:
- localStorage + database backup created automatically
- Auto-recovery enabled from day 1
- Enhanced logging for all operations

---

## Developer Notes

### Files Modified

| File | Changes | Purpose |
|------|---------|---------|
| `src/hooks/useKioskConfig.tsx` | +50 lines | Auto-recovery + storage monitoring + reduced cleanup aggressiveness |
| `src/components/detail-hub/KioskSetupWizard.tsx` | +20 lines | Database backup on configuration |
| `src/components/detail-hub/PunchClockKioskModal.tsx` | +30 lines | Enhanced validation logging |
| `src/utils/kioskDiagnostics.ts` | NEW FILE | Diagnostic utilities for browser console |
| `src/components/detail-hub/DetailHubDashboard.tsx` | +1 line | Import diagnostics |

### Key Functions

#### `clearInvalidKioskConfig()` - Less Aggressive Now
```typescript
// OLD: Deleted configs missing fingerprint
if (kioskId && !fingerprint) {
  localStorage.clear(); // ❌ TOO AGGRESSIVE
}

// NEW: Lets auto-recovery handle it
if (kioskId && !fingerprint) {
  console.warn('Incomplete config - auto-recovery will handle');
  // ✅ DOESN'T DELETE
}
```

#### Auto-Recovery Hook
```typescript
useEffect(() => {
  if (!localStorage.getItem('kiosk_id') && fingerprint) {
    // Try to recover from database
    const binding = await fetchDeviceBinding(fingerprint);
    if (binding) {
      restoreConfiguration(binding);
      showSuccessToast();
    }
  }
}, [fingerprint]);
```

### Testing Checklist

Before deploying to production:

- [ ] Test auto-recovery: Clear localStorage → Reload → Verify restoration
- [ ] Test diagnostic tools: Run all 4 commands in console
- [ ] Test new kiosk setup: Configure fresh kiosk → Verify DB entry created
- [ ] Test reconfiguration: Existing kiosk → Reconfigure → Verify DB updated
- [ ] Monitor logs: Check for enhanced log output during normal operations

---

## FAQ

### Q: Will this slow down the app?

**A**: No. Auto-recovery only runs once on page load, and only if localStorage is empty. Typical scenario has zero performance impact.

### Q: What if both localStorage AND database are empty?

**A**: Normal behavior - device is not configured. User sees "Setup Kiosk" button.

### Q: What if fingerprint changes (browser update)?

**A**: Currently logs warning but doesn't break. Future enhancement could auto-update fingerprint.

### Q: Can recovery fail?

**A**: Yes, if:
1. Device binding doesn't exist in database (kiosk configured before Nov 2024)
2. Kiosk was deleted from database (CASCADE)
3. Device was deactivated (is_active = false)

In these cases, user must manually reconfigure kiosk.

### Q: How do I migrate existing kiosks?

**A**: Just reconfigure them once (even if already working). This creates the device binding for future recovery.

---

## Emergency Procedures

### Complete System Reset

If a kiosk is completely broken and won't recover:

**Step 1: Browser Console**
```javascript
window.kioskDiagnostics.reset()
```

**Step 2: Clear Browser Cache**
- Chrome: Ctrl+Shift+Del → "Cookies and site data" → Clear
- Edge: Similar process

**Step 3: Reload Page**
```javascript
location.reload()
```

**Step 4: Reconfigure**
- Click "Setup Kiosk" button
- Select kiosk from dropdown
- Confirm configuration

**Step 5: Verify**
```javascript
await window.kioskDiagnostics.diagnose()
// Should show: severity: 'ok'
```

---

## Monitoring Best Practices

### For System Administrators

**Weekly Check**:
```sql
-- Find devices not seen in 7+ days
SELECT
  k.name,
  d.last_seen_at,
  EXTRACT(DAY FROM NOW() - d.last_seen_at) as days_offline
FROM detail_hub_kiosk_devices d
JOIN detail_hub_kiosks k ON k.id = d.kiosk_id
WHERE d.last_seen_at < NOW() - INTERVAL '7 days'
ORDER BY d.last_seen_at ASC
```

**Monthly Cleanup**:
```sql
-- Deactivate devices not seen in 30+ days
UPDATE detail_hub_kiosk_devices
SET is_active = false
WHERE last_seen_at < NOW() - INTERVAL '30 days'
AND is_active = true
RETURNING *;
```

### For Developers

**Enable verbose logging** (add to localStorage):
```javascript
localStorage.setItem('DEBUG_KIOSK', 'true')
```

**Monitor specific events**:
1. Configuration deletions → Look for 🚨 emoji in logs
2. Auto-recoveries → Look for 🎉 emoji in logs
3. Database validation failures → Look for ❌ emoji in logs

---

## Change Log

### v2.0 (Nov 2024)
- ✅ Added automatic recovery via database backup
- ✅ Added comprehensive logging system
- ✅ Added diagnostic utilities (window.kioskDiagnostics)
- ✅ Added storage event monitoring
- ✅ Reduced cleanup aggressiveness
- ✅ Added device binding persistence

### v1.0 (Pre-Nov 2024)
- Basic localStorage-only configuration
- Aggressive cleanup on every mount
- No recovery mechanism
- Minimal logging

---

**Last Updated**: November 25, 2024
**Status**: Production Ready ✅
