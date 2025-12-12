# 🔧 Kiosk localStorage Fix Guide

## Problem
The kiosk "BMW of Sudbury" has corrupted localStorage with `kiosk_id = "KIOSK-001"` (string) instead of the proper UUID. This causes:
- Counter increment to be skipped
- `punches_today` shows 0 even after 6+ punches
- Database fetch fails due to UUID validation

## Solution: Fix localStorage on Physical Kiosk Device

---

## ⚠️ IMPORTANT: This Must Be Done On-Site
You must physically access the PC/tablet that runs the kiosk.

---

## Option A: DevTools Quick Fix (2 minutes) ⚡

### Steps:
1. On the kiosk device, open the MyDetailArea app
2. Press **F12** to open Developer Tools
3. Click the **Console** tab
4. Copy and paste this code:

```javascript
// Clear corrupted data
localStorage.removeItem('kiosk_id');
localStorage.removeItem('kiosk_code');
localStorage.removeItem('kiosk_configured_at');
localStorage.removeItem('kiosk_username');

// Set correct UUID for BMW of Sudbury kiosk
localStorage.setItem('kiosk_id', '519835af-86e4-4c22-955b-010bc9a6af21');

// Reload page
location.reload();
```

5. Press **Enter**
6. Page will reload automatically
7. Test by making a punch → verify counter increments

---

## Option B: Wizard Reconfiguration (5 minutes) ✅ RECOMMENDED

### Steps:
1. On the kiosk device, open the MyDetailArea app
2. Press **F12** to open Developer Tools
3. Click the **Console** tab
4. Copy and paste this code:

```javascript
// Clear ALL localStorage
localStorage.clear();

// Reload page
location.reload();
```

5. Press **Enter**
6. The **Kiosk Setup Wizard** will appear automatically
7. Select **"BMW of Sudbury"** from the dropdown
8. Click **"Configure Kiosk"**
9. Wait for success message
10. Test by making a punch → verify counter increments

### Why Option B is Better:
- ✅ Regenerates ALL localStorage keys cleanly
- ✅ Creates new device binding in database
- ✅ Generates new registration code for recovery
- ✅ More thorough fix
- ✅ No manual UUID entry

---

## Verification Steps

After applying either fix:

1. **Check localStorage**:
   ```javascript
   console.log('kiosk_id:', localStorage.getItem('kiosk_id'));
   // Should show: 519835af-86e4-4c22-955b-010bc9a6af21
   ```

2. **Make a test punch**:
   - Search for any employee
   - Enter PIN
   - Clock in
   - Capture photo
   - Submit

3. **Check Kiosk Manager**:
   - Open Detail Hub → Kiosk Manager
   - Find "BMW of Sudbury" kiosk
   - **Today's Punches** should show correct count (not 0)

4. **Verify counter increments**:
   - Make another test punch
   - Refresh Kiosk Manager
   - Counter should increase by 1

---

## Troubleshooting

### Issue: Wizard doesn't appear after `localStorage.clear()`
**Solution**: Hard refresh with Ctrl+Shift+R

### Issue: UUID validation still fails
**Solution**:
1. Check if UUID is correct:
   ```javascript
   localStorage.getItem('kiosk_id') === '519835af-86e4-4c22-955b-010bc9a6af21'
   ```
2. If wrong, delete and re-apply Option B

### Issue: Counter still shows 0 after fix
**Solution**:
1. Verify migration `20251211000000_fix_kiosk_id_inconsistency.sql` ran successfully
2. Check database manually:
   ```sql
   SELECT punches_today, total_punches, last_punch_at
   FROM detail_hub_kiosks
   WHERE kiosk_code = 'KIOSK-001';
   ```

---

## Related Files

- **Migration**: `supabase/migrations/20251211000000_fix_kiosk_id_inconsistency.sql`
- **Code Fix**: `src/components/detail-hub/PunchClockKioskModal.tsx` (lines 876, 892, 907, 922)
- **Hook**: `src/hooks/useKioskConfig.tsx` (UUID validation logic)

---

## Contact

If you encounter issues, contact the development team with:
- Kiosk name: "BMW of Sudbury"
- localStorage values (screenshot of Console)
- Database kiosk_id value
- Error messages (if any)
