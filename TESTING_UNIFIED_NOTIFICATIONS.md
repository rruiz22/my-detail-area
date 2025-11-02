# Testing Guide: Unified Notifications System

## Quick Verification Steps

### 1. Visual Test - Bell Icon Count

**Expected Behavior**: Bell icon should show combined count from both tables

```bash
# Start dev server
npm run dev
```

**Test Steps**:
1. Open http://localhost:8080
2. Login to system
3. Check bell icon in topbar
4. Should show notification count from BOTH tables combined

**Verification**:
- If `notification_log` has 0 notifications and `get_ready_notifications` has 5 → Bell shows **5**
- If `notification_log` has 3 notifications and `get_ready_notifications` has 5 → Bell shows **8**

### 2. Console Verification

Open browser console and check for these logs:

```
✅ Good Signs:
[useSmartNotifications] Setting up dual real-time subscriptions
🔗 [useAccessibleDealerships] Hook called, proxying to context

❌ Bad Signs:
Error fetching notifications
Error marking notification as read
```

### 3. Database Verification

**Query to check Get Ready notifications**:

```sql
-- Via Supabase Dashboard → SQL Editor
SELECT COUNT(*) as get_ready_count
FROM get_ready_notifications
WHERE dismissed_at IS NULL;
```

**Expected**: Should return count > 0 (since Get Ready has data)

### 4. Mark as Read Test

**Test Steps**:
1. Click bell icon
2. Click a notification
3. Click "Mark as Read" from menu

**Expected Behavior**:
- Notification should be marked as read
- Unread count should decrease by 1
- Should work for BOTH notification sources

**Verification**:
```typescript
// In browser console after marking as read:
// Check if query was invalidated
Performance.getEntriesByType('resource')
  .filter(r => r.name.includes('get_ready_notifications'))
  .length > 0; // Should be true if Get Ready notification
```

### 5. Real-time Subscription Test

**Create Test Notification**:

Via Supabase Dashboard → SQL Editor:

```sql
-- Insert a test notification into get_ready_notifications
INSERT INTO get_ready_notifications (
  dealer_id,
  user_id,
  notification_type,
  priority,
  title,
  message
) VALUES (
  1, -- Your dealer_id
  auth.uid(), -- Your user_id
  'system_alert',
  'high',
  'Test Notification',
  'This is a test notification to verify real-time updates'
);
```

**Expected Behavior**:
- Notification should appear in bell icon immediately
- Sound should play (if enabled)
- Toast notification should appear (for high priority)
- Unread count should increment by 1

### 6. Source Detection Test

**Browser Console Test**:

```javascript
// Get hook instance (for testing only)
const notifications = /* bell icon notifications state */;

// Check source field exists
console.log('Sources:', notifications.map(n => ({
  id: n.id,
  source: n.source,
  module: n.module
})));

// Expected output:
// [
//   { id: '123', source: 'get_ready_notifications', module: 'get_ready' },
//   { id: '456', source: 'notification_log', module: 'system' }
// ]
```

## Automated Tests (Future)

### Unit Tests (Vitest)

```typescript
// tests/hooks/useSmartNotifications.test.tsx
describe('useSmartNotifications', () => {
  it('should combine notifications from both tables', () => {
    // Mock both queries
    // Verify combined array
    // Check sorting by created_at
  });

  it('should auto-detect source when marking as read', () => {
    // Mock notification with source
    // Call markAsRead without source param
    // Verify correct table was updated
  });

  it('should transform Get Ready notifications correctly', () => {
    // Test priority mapping (medium → normal)
    // Test source assignment
    // Test module assignment
  });
});
```

### Integration Tests (Playwright)

```typescript
// tests/integration/notifications.spec.ts
test('bell icon shows combined count', async ({ page }) => {
  await page.goto('http://localhost:8080');
  await page.waitForSelector('[data-testid="notification-bell"]');

  const badge = await page.locator('[data-testid="notification-badge"]');
  const count = await badge.textContent();

  // Verify count is > 0 (from Get Ready notifications)
  expect(parseInt(count)).toBeGreaterThan(0);
});

test('mark as read works for both sources', async ({ page }) => {
  // Click bell icon
  // Open notification panel
  // Mark notification as read
  // Verify count decreases
});
```

## Performance Verification

### 1. Network Tab Verification

**Check Dual Queries**:
1. Open DevTools → Network tab
2. Filter: `get_ready_notifications`
3. Refresh page

**Expected**:
- Should see TWO separate queries (one for each table)
- Both should complete within 500ms
- Should NOT see duplicate queries

### 2. React DevTools Profiler

**Check Re-renders**:
1. Install React DevTools
2. Open Profiler tab
3. Click bell icon

**Expected**:
- NotificationBell should render once
- SmartNotificationCenter should render once
- No unnecessary re-renders

### 3. Query Cache Verification

**Browser Console**:

```javascript
// Check TanStack Query cache
window.__REACT_QUERY_DEVTOOLS__;

// Look for these keys:
// - ['smartNotifications', dealerId, userId]
// - ['getReadyNotifications', dealerId, userId]
```

## Common Issues & Solutions

### Issue 1: Bell shows 0 even though Get Ready has notifications

**Possible Causes**:
- `validatedDealerId` is null
- User not authenticated
- Query is disabled

**Debug**:
```javascript
// Browser console
console.log('Dealer ID:', localStorage.getItem('selectedDealerFilter'));
console.log('User ID:', /* check auth state */);
```

**Solution**:
- Ensure dealer is selected
- Ensure user is logged in
- Check browser console for errors

### Issue 2: Mark as read doesn't work

**Possible Causes**:
- Source auto-detection failing
- RPC function not found
- Permission error

**Debug**:
```javascript
// Check notification structure
console.log('Notification:', notification);
console.log('Has source?', 'source' in notification);
```

**Solution**:
- Verify notification has `source` field
- Check Supabase function `mark_notification_read` exists
- Verify RLS policies allow updates

### Issue 3: Real-time updates not working

**Possible Causes**:
- Subscription not established
- Wrong dealer_id filter
- User_id mismatch

**Debug**:
```javascript
// Check active subscriptions
supabase.getChannels();
// Should see channels for both tables
```

**Solution**:
- Check console for subscription logs
- Verify dealer_id matches current context
- Ensure user_id is correct

## Success Criteria

✅ **Implementation is successful if**:

1. Bell icon shows combined count from both tables
2. Clicking notification marks correct table
3. Real-time updates work for both sources
4. No console errors
5. Performance is acceptable (<500ms query time)
6. Existing components work without changes

## Next Steps After Testing

1. **Monitor production** - Check error logs for any issues
2. **User feedback** - Gather feedback on notification behavior
3. **Performance metrics** - Monitor query times and cache hit rates
4. **Plan FASE 3** - Migration to unified notification_log system

---

**Test Completion Checklist**:

- [ ] Visual verification (bell icon count)
- [ ] Console verification (no errors)
- [ ] Database verification (Get Ready count)
- [ ] Mark as read test (both sources)
- [ ] Real-time subscription test
- [ ] Source detection verification
- [ ] Performance verification
- [ ] Common issues checked

**Status**: Ready for testing
