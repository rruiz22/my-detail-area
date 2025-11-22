# Kiosk Configuration Bug Fix - Verification Guide

**Issue**: Configured PCs showing "This device is not configured as a kiosk" error

**Root Cause**: Conflict between `useKioskConfig` fallback ('default-kiosk') and `PunchClockKioskModal` UUID validation

---

## Changes Applied

### 1. `src/hooks/useKioskConfig.tsx`

**Line 77** - Removed 'default-kiosk' fallback:
```typescript
// BEFORE:
kioskId: kioskId || DEFAULT_KIOSK_ID,

// AFTER:
kioskId: kioskId || null,  // ✅ Returns null instead of invalid fallback
```

**Lines 101-134** - Added cleanup function:
```typescript
export function clearInvalidKioskConfig(): void {
  const kioskId = localStorage.getItem(KIOSK_ID_KEY);
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // Clear if:
  // 1. kioskId is 'default-kiosk' (old fallback)
  // 2. kioskId is not a valid UUID
  // 3. kioskId exists but fingerprint is missing
  if (
    kioskId === DEFAULT_KIOSK_ID ||
    (kioskId && !uuidRegex.test(kioskId)) ||
    (kioskId && !localStorage.getItem(KIOSK_FINGERPRINT_KEY))
  ) {
    // Remove all kiosk config
    localStorage.removeItem(KIOSK_ID_KEY);
    localStorage.removeItem(KIOSK_FINGERPRINT_KEY);
    localStorage.removeItem(KIOSK_CONFIGURED_AT_KEY);
    localStorage.removeItem(KIOSK_USERNAME_KEY);
  }
}
```

### 2. `src/components/detail-hub/PunchClockKioskModal.tsx`

**Lines 287-328** - Improved validation with specific error messages:
```typescript
useEffect(() => {
  if (open) {
    // Case 1: kioskId is null (never configured)
    if (KIOSK_ID === null) {
      toast({
        title: t('detail_hub.punch_clock.error'),
        description: 'This device is not configured as a kiosk. Please configure it in the Kiosk Manager.',
        variant: "destructive",
        duration: 5000
      });
      setTimeout(() => onClose(), 100);
      return;
    }

    // Case 2: kioskId is invalid UUID (corrupted)
    if (!isValidUUID(KIOSK_ID)) {
      toast({
        title: t('detail_hub.punch_clock.error'),
        description: 'Corrupted kiosk configuration detected. Please reconfigure this device.',
        variant: "destructive",
        duration: 5000
      });
      setTimeout(() => onClose(), 100);
      return;
    }

    // Valid UUID - proceed normally
    console.log('[Kiosk] ✅ Valid kiosk ID:', KIOSK_ID);
  }
}, [open, KIOSK_ID, toast, t, onClose]);
```

### 3. `src/components/detail-hub/DetailHubDashboard.tsx`

**Lines 24-25** - Added import:
```typescript
import { clearInvalidKioskConfig } from "@/hooks/useKioskConfig";
```

**Lines 42-49** - Auto-cleanup on mount:
```typescript
useEffect(() => {
  // ✅ FIX: Auto-clean invalid kiosk configs on mount
  clearInvalidKioskConfig();

  const configuredId = getConfiguredKioskId();
  setKioskId(configuredId);
  console.log('[DetailHub] 🧹 Cleanup complete. Kiosk configured:', configuredId ? 'YES' : 'NO', configuredId);
}, []);
```

---

## Testing Scenarios

### ✅ Scenario 1: Valid UUID Configuration
**Setup**: PC configured with valid UUID (e.g., `123e4567-e89b-12d3-a456-426614174000`)

**Expected Behavior**:
1. ✅ Time Clock button visible in topbar
2. ✅ Clicking button opens Time Clock modal
3. ✅ Console shows: `[Kiosk] ✅ Valid kiosk ID: 123e4567...`
4. ✅ Heartbeat starts successfully
5. ✅ Kiosk status updates to "online"

**Test**: Open Time Clock and verify no error messages

---

### ✅ Scenario 2: 'default-kiosk' in localStorage (OLD BUG)
**Setup**:
```javascript
localStorage.setItem('kiosk_id', 'default-kiosk');
```

**Expected Behavior**:
1. ✅ On page load: `clearInvalidKioskConfig()` removes 'default-kiosk'
2. ✅ Console shows: `[KioskConfig] 🧹 Clearing invalid configuration: default-kiosk fallback`
3. ✅ Time Clock button visible but shows error on click
4. ✅ Error message: "This device is not configured as a kiosk. Please configure it in the Kiosk Manager."

**Test**:
```javascript
// 1. Set invalid config in console
localStorage.setItem('kiosk_id', 'default-kiosk');

// 2. Refresh page
location.reload();

// 3. Check if cleaned
console.log(localStorage.getItem('kiosk_id')); // Should be null
```

---

### ✅ Scenario 3: Null/Missing Configuration
**Setup**: PC never configured (clean localStorage)

**Expected Behavior**:
1. ✅ Time Clock button visible
2. ✅ Clicking button shows error: "This device is not configured as a kiosk. Please configure it in the Kiosk Manager."
3. ✅ Modal closes immediately
4. ✅ Console shows: `[Kiosk] ❌ No kiosk configured on this device`

**Test**: Clear localStorage and try to open Time Clock

---

### ✅ Scenario 4: Corrupted UUID
**Setup**:
```javascript
localStorage.setItem('kiosk_id', 'invalid-uuid-123');
localStorage.setItem('kiosk_device_fingerprint', 'abc123');
```

**Expected Behavior**:
1. ✅ On page load: `clearInvalidKioskConfig()` removes corrupted config
2. ✅ Console shows: `[KioskConfig] 🧹 Clearing invalid configuration: invalid UUID`
3. ✅ Clicking Time Clock shows: "This device is not configured as a kiosk."

**Test**:
```javascript
// 1. Set corrupted config
localStorage.setItem('kiosk_id', 'corrupted-id');
localStorage.setItem('kiosk_device_fingerprint', 'test123');

// 2. Refresh page
location.reload();

// 3. Verify cleanup
console.log(localStorage.getItem('kiosk_id')); // Should be null
```

---

### ✅ Scenario 5: Missing Fingerprint (Incomplete Config)
**Setup**:
```javascript
localStorage.setItem('kiosk_id', '123e4567-e89b-12d3-a456-426614174000'); // Valid UUID
// Missing kiosk_device_fingerprint
```

**Expected Behavior**:
1. ✅ On page load: `clearInvalidKioskConfig()` removes incomplete config
2. ✅ Console shows: `[KioskConfig] 🧹 Clearing invalid configuration: missing fingerprint`
3. ✅ PC treated as unconfigured

**Test**:
```javascript
// 1. Set incomplete config
localStorage.setItem('kiosk_id', '123e4567-e89b-12d3-a456-426614174000');
localStorage.removeItem('kiosk_device_fingerprint');

// 2. Refresh page
location.reload();

// 3. Verify cleanup
console.log(localStorage.getItem('kiosk_id')); // Should be null
```

---

## Console Log Reference

### ✅ Success Logs (Valid Configuration)
```
[DetailHub] 🧹 Cleanup complete. Kiosk configured: YES 123e4567-e89b-12d3-a456-426614174000
[Kiosk] ✅ Valid kiosk ID: 123e4567-e89b-12d3-a456-426614174000
[Kiosk] 💓 Starting heartbeat system for kiosk: KIOSK-001
[Kiosk] 🌐 IP detected: 192.168.1.100
[Kiosk] ✅ Heartbeat sent successfully (IP: 192.168.1.100)
```

### ⚠️ Cleanup Logs (Invalid Configuration)
```
[KioskConfig] 🧹 Clearing invalid configuration: { kioskId: 'default-kiosk', reason: 'default-kiosk fallback' }
[DetailHub] 🧹 Cleanup complete. Kiosk configured: NO null
```

### ❌ Error Logs (Unconfigured)
```
[Kiosk] ❌ No kiosk configured on this device
```

### ❌ Error Logs (Corrupted)
```
[Kiosk] ❌ Invalid kiosk ID format: invalid-uuid-123
```

---

## User-Facing Error Messages

### Before Fix
- **Generic error**: "This device is not configured as a kiosk. Please contact your administrator."
- **User confused**: "But I configured it yesterday!"

### After Fix
- **Unconfigured**: "This device is not configured as a kiosk. Please configure it in the Kiosk Manager."
- **Corrupted**: "Corrupted kiosk configuration detected. Please reconfigure this device."
- **Clear action**: Users know exactly what to do

---

## Reconfiguration Process

If a PC shows configuration errors:

1. **Go to Detail Hub → Kiosk Manager tab**
2. **Find the kiosk in the list**
3. **Click "Configure This PC" button**
4. **Wizard will:**
   - Detect device fingerprint
   - Show system username
   - Save valid UUID to localStorage
   - Save fingerprint for verification
5. **Done!** Time Clock will work immediately

---

## Database Impact

**No database changes required** - This is purely a frontend localStorage fix.

The database `detail_hub_kiosks` table remains unchanged. The fix only affects:
- How kiosk IDs are stored in browser localStorage
- How validation is performed before querying the database
- Auto-cleanup of invalid localStorage entries

---

## Rollback Plan (If Needed)

If this fix causes issues, revert these 3 files:

```bash
git checkout HEAD~1 src/hooks/useKioskConfig.tsx
git checkout HEAD~1 src/components/detail-hub/PunchClockKioskModal.tsx
git checkout HEAD~1 src/components/detail-hub/DetailHubDashboard.tsx
```

---

## Success Criteria

✅ **Fix is successful if:**
1. PCs with valid UUID configurations continue to work normally
2. PCs with 'default-kiosk' in localStorage get auto-cleaned on page load
3. Corrupted configurations are detected and removed automatically
4. Error messages clearly indicate the problem and solution
5. No database queries fail due to invalid UUIDs
6. Reconfiguration process works smoothly

---

**Status**: ✅ Implementation complete - Ready for testing
**Next Step**: Test on the 2 PCs that lost their configuration
