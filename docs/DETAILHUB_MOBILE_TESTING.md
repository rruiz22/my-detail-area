# DetailHub Mobile & Responsive Testing Guide

## Overview

DetailHub is designed as a **tablet-first kiosk system** for employee punch clock and management. This guide provides comprehensive testing procedures for mobile and tablet devices, with special emphasis on kiosk deployment scenarios.

## Device Support Matrix

### Primary Kiosk Devices (Tablets)

| Device | Screen Size | Resolution | OS | Priority |
|--------|-------------|------------|-----|----------|
| **iPad Pro 12.9"** | 12.9" | 2732x2048 | iOS 17+ | Critical |
| **iPad Air** | 10.9" | 2360x1640 | iOS 17+ | Critical |
| **iPad (10th gen)** | 10.9" | 2360x1640 | iOS 16+ | High |
| **Samsung Galaxy Tab S8** | 11" | 2560x1600 | Android 13+ | High |
| **Samsung Galaxy Tab A** | 10.4" | 2000x1200 | Android 12+ | Medium |
| **Surface Pro 9** | 13" | 2880x1920 | Windows 11 | Medium |
| **Amazon Fire HD 10** | 10.1" | 1920x1200 | Fire OS 8+ | Low |

### Supervisor Mobile Devices (Phones)

| Device | Screen Size | Resolution | OS | Priority |
|--------|-------------|------------|-----|----------|
| **iPhone 14 Pro** | 6.1" | 2556x1179 | iOS 17+ | High |
| **iPhone 13** | 6.1" | 2532x1170 | iOS 16+ | High |
| **iPhone SE (3rd gen)** | 4.7" | 1334x750 | iOS 16+ | High |
| **Samsung Galaxy S23** | 6.1" | 2340x1080 | Android 13+ | High |
| **Google Pixel 7** | 6.3" | 2400x1080 | Android 13+ | Medium |
| **Samsung Galaxy A54** | 6.4" | 2340x1080 | Android 13+ | Medium |

### Viewport Sizes (Browser Testing)

| Viewport | Width | Device Type | Use Case | Priority |
|----------|-------|-------------|----------|----------|
| **iPhone SE** | 320px | Phone Portrait | Minimum support | Medium |
| **iPhone 14** | 390px | Phone Portrait | Common mobile | High |
| **iPad Mini** | 768px | Tablet Portrait | Kiosk primary | Critical |
| **iPad Pro** | 1024px | Tablet Landscape | Kiosk secondary | Critical |
| **Desktop** | 1280px+ | Desktop | Admin access | High |

## Critical Mobile Features Testing

### 1. Photo Capture on Tablets (CRITICAL)

**Priority**: CRITICAL - Core kiosk functionality

#### iPad (iOS) Testing Procedure

```
Setup:
1. iPad Pro 12.9" running iOS 17
2. Safari browser
3. Navigate to PunchClockKiosk
4. Ensure good lighting for camera

Test Flow:
1. Click "Clock In" button
   □ Button tap responsive (no delay)
   □ Photo capture modal opens full-screen

2. Camera Permission Request
   □ iOS system permission modal appears
   □ Text explains camera usage
   □ "Allow" and "Don't Allow" options clear

3. Grant Camera Access
   □ Permission saves for future sessions
   □ Video preview starts automatically
   □ Preview fills guide box (no black bars)
   □ Preview shows live camera feed (not frozen)

4. Camera Selection (if device has multiple cameras)
   □ Default: Front-facing camera
   □ Toggle button switches to rear camera
   □ Preview updates without refresh

5. Photo Capture
   □ Tap capture button (large, easy to press)
   □ Shutter animation plays
   □ Preview freezes on captured frame
   □ Photo quality sharp (not blurry/pixelated)

6. Photo Review
   □ "Retake" button visible and large
   □ "Confirm" button visible and large
   □ Photo displays at full resolution
   □ Face clearly visible in photo

7. Retake Flow
   □ Tap "Retake"
   □ Returns to live camera view
   □ Can capture new photo
   □ Previous photo discarded

8. Confirm & Upload
   □ Tap "Confirm"
   □ Upload progress indicator shows
   □ Upload completes in < 5s on WiFi
   □ Success message appears
   □ Modal closes automatically
   □ Dashboard updates with new punch
```

#### Android Tablet Testing Procedure

```
Setup:
1. Samsung Galaxy Tab S8 running Android 13
2. Chrome browser
3. Navigate to PunchClockKiosk

Test Flow (Same as iOS):
1. Click "Clock In"
   □ Modal opens full-screen

2. Camera Permission (Android-specific)
   □ Chrome permission request appears
   □ "Allow" / "Block" options
   □ Option to "Remember this decision"

3. Camera Access Granted
   □ Video preview starts
   □ Preview orientation correct (not rotated)
   □ Preview fills guide box

4. Photo Capture
   □ Capture button responsive
   □ Photo captured immediately
   □ No shutter lag

5. Photo Quality Check
   □ Resolution matches camera capability
   □ No compression artifacts
   □ Colors accurate (not washed out)

6. Upload
   □ Upload speed acceptable on 4G/5G
   □ Retry on network failure
   □ Error message if upload fails
```

#### Common Issues & Fixes

**Issue**: Black screen instead of camera preview
```
Causes:
- Permission denied
- Camera in use by another app
- Browser doesn't support getUserMedia()

Debug:
1. Check browser console for errors
2. Verify camera works in native camera app
3. Close other apps using camera
4. Try different browser

Fix:
- Clear browser cache/permissions
- Restart browser
- Grant camera permission in iOS Settings
```

**Issue**: Photo appears rotated/sideways
```
Causes:
- Device orientation not detected
- EXIF data missing/ignored

Fix:
- Implemented in code: Read EXIF orientation
- Rotate canvas before upload
- Test in portrait and landscape modes
```

**Issue**: Upload fails or times out
```
Causes:
- Slow network connection
- File size too large (> 5MB)
- Server timeout

Fix:
- Compress image before upload (max 1MB)
- Show progress indicator
- Implement retry logic (3 attempts)
- Error message with retry button
```

### 2. Touch Interactions

**Priority**: CRITICAL - Kiosk is touch-only

#### Touch Target Size Validation

**WCAG AA Standard**: 44x44px minimum

```
Test Procedure:
1. Use browser DevTools to inspect elements
2. Verify all interactive elements meet minimum:

Primary Buttons (Clock In/Out):
□ Width: ≥ 100px
□ Height: ≥ 60px
□ Padding: ≥ 16px
□ Spacing between: ≥ 8px

Secondary Buttons (Break, Cancel):
□ Width: ≥ 80px
□ Height: ≥ 44px
□ Padding: ≥ 12px

Tab Buttons:
□ Width: ≥ 120px
□ Height: ≥ 48px
□ Active indicator visible

Form Inputs:
□ Height: ≥ 44px
□ Font size: ≥ 16px (prevents iOS zoom)
□ Padding: ≥ 12px

Icon Buttons:
□ Clickable area: ≥ 44x44px
□ Icon size: ≥ 24x24px
□ Visual feedback on tap
```

#### Touch Event Testing

```
Tap Responsiveness:
1. Tap each button on screen
   □ Visual feedback immediate (< 100ms)
   □ Active state visible (color change)
   □ Ripple effect plays (Material Design)
   □ No double-tap required

2. Rapid Tapping
   □ Debouncing prevents double-submit
   □ Button disables during processing
   □ No race conditions

Long Press:
□ Context menus work (if implemented)
□ Touch-hold duration: 500ms
□ Visual indicator shows (progress ring)

Swipe Gestures:
□ Horizontal swipe for carousel (if used)
□ Pull-to-refresh disabled (prevents accidents)
□ Swipe direction correct (LTR/RTL)

Pinch Zoom:
□ Disabled on kiosk pages (viewport fixed)
□ Enabled on photo review (zoom to verify)
```

#### Accidental Touch Prevention

```
Kiosk Mode Best Practices:
□ No external links (prevent navigation away)
□ Confirmation for destructive actions
□ Large touch targets reduce mis-taps
□ Spacing prevents adjacent button taps
□ Disable text selection (user-select: none)
□ Disable context menu (preventDefault)
```

### 3. Landscape/Portrait Orientation

**Priority**: HIGH - Tablets used in both modes

#### Orientation Change Testing

```
Test Procedure:
1. Load PunchClockKiosk in portrait mode (768x1024)
2. Verify layout:
   □ Photo capture guide box: 400x500px
   □ Buttons: Full width, stacked vertically
   □ Dashboard stats: 1 column
   □ Recent activity: Full width list

3. Rotate device to landscape (1024x768)
4. Verify layout adapts:
   □ Photo capture guide box: 500x400px (wider)
   □ Buttons: Horizontal row
   □ Dashboard stats: 2-3 columns
   □ Recent activity: Grid layout

5. Rapid Rotation Test
   □ Rotate 10 times quickly
   □ Layout adapts smoothly
   □ No flickering or jumps
   □ Content doesn't disappear
   □ Scroll position preserved

6. Orientation Lock (iOS)
   □ If lock enabled, respect user preference
   □ Layout still works if locked to portrait
```

#### CSS Media Query Verification

```css
/* Verify these work on actual devices */

/* Portrait Tablet (iPad default) */
@media (min-width: 768px) and (orientation: portrait) {
  .kiosk-container {
    max-width: 768px; /* ✓ Centered layout */
  }
  .photo-guide-box {
    width: 400px;
    height: 500px; /* ✓ Portrait aspect */
  }
}

/* Landscape Tablet */
@media (min-width: 1024px) and (orientation: landscape) {
  .kiosk-container {
    max-width: 1024px;
  }
  .photo-guide-box {
    width: 500px;
    height: 400px; /* ✓ Landscape aspect */
  }
  .stats-grid {
    grid-template-columns: repeat(3, 1fr); /* ✓ 3 columns */
  }
}
```

#### Orientation Best Practices

```
Design Principles:
□ Default: Portrait mode (natural tablet holding)
□ Support: Both orientations gracefully
□ Avoid: Layout breaking in either mode
□ Test: Actual rotation on real device (not just resize)
```

### 4. Kiosk Mode Considerations

**Priority**: HIGH - Production deployment

#### Full-Screen Kiosk Setup

**iOS (Guided Access)**
```
Setup Instructions:
1. Settings → Accessibility → Guided Access
2. Enable Guided Access
3. Set passcode (prevent exit)
4. Open Safari to DetailHub
5. Triple-click home button
6. Enable Guided Access mode

Verify:
□ Home button disabled
□ Gesture navigation disabled
□ App switching disabled
□ Sleep/wake still works
□ Volume buttons work
□ URL bar hidden
□ Browser chrome hidden
```

**Android (Kiosk Mode App)**
```
Recommended Apps:
- Kiosk Browser Lockdown
- Fully Kiosk Browser
- Samsung Knox (enterprise)

Configuration:
□ Lock to single app (DetailHub)
□ Disable notifications
□ Hide navigation bar
□ Prevent task switching
□ Allow only whitelisted URLs
□ Auto-restart on crash
```

**Web App Manifest (PWA)**
```json
{
  "name": "DetailHub Kiosk",
  "short_name": "DetailHub",
  "display": "fullscreen",
  "orientation": "portrait-primary",
  "start_url": "/detail-hub",
  "theme_color": "#1a1a1a",
  "background_color": "#ffffff"
}
```

#### Kiosk Security Features

```
Prevent Accidental Exits:
□ No external links (all relative)
□ Intercept window.open() calls
□ Disable right-click context menu
□ Prevent Ctrl+W / Cmd+W (close tab)
□ Confirm before navigation away

Session Management:
□ Auto-logout after inactivity (30 min)
□ Clear session data on logout
□ No persistent login (security)
□ PIN required for each punch

Error Recovery:
□ Network offline mode (cache data)
□ Auto-reconnect when online
□ Retry failed uploads (3 attempts)
□ Clear error state visible
□ Manual refresh button available
```

#### Kiosk Performance Optimization

```
Battery Life:
□ Reduce screen brightness in settings
□ Disable unnecessary background tasks
□ Use WiFi (not cellular data)
□ Screen timeout: Never (while plugged in)

Power Management:
□ Keep tablet plugged in 24/7
□ Use quality charger (OEM)
□ Monitor battery health monthly
□ Replace battery if degraded (< 80%)

Network Reliability:
□ Strong WiFi signal at kiosk location
□ 5GHz preferred (less congestion)
□ Fallback to cellular if WiFi drops
□ Test upload speed: ≥ 5 Mbps
```

## Mobile-Specific Testing (Phones)

### 1. Dashboard on Small Screens

**Priority**: HIGH - Supervisor access

#### Viewport: 320px (iPhone SE Portrait)

```
Test Procedure:
1. Resize browser to 320px width
2. Navigate to DetailHub Dashboard

Layout Checks:
□ Navigation menu: Hamburger icon visible
□ Stats cards: Stack vertically (1 column)
□ Card width: 100% (no horizontal scroll)
□ Card padding: 16px (touch-friendly)
□ Font size: ≥ 14px (readable)

Tables:
□ Horizontal scroll enabled
□ Sticky header visible
□ Row height: ≥ 44px (touch targets)
□ Actions menu: Icon buttons (not text)

Charts:
□ Recharts responsive container works
□ Chart maintains aspect ratio
□ Touch interactions work (zoom, pan)
□ Tooltips visible on tap
□ Legend below chart (not side)

Tabs:
□ Tabs scroll horizontally
□ Active tab indicator visible
□ Swipe gesture to change tabs
□ Tab content full width
```

#### Viewport: 390px (iPhone 14 Portrait)

```
Layout Improvements:
□ Stats cards: Still 1 column (up to 640px)
□ More padding: 20px (more breathing room)
□ Font size: 16px (optimal readability)
□ Buttons: Wider (easier to tap)

Tables:
□ More columns visible (less scrolling)
□ Cell padding increased
```

### 2. Forms & Inputs

**Priority**: HIGH - Employee creation

#### Mobile Form Best Practices

```
Input Fields:
□ Height: ≥ 44px
□ Font size: ≥ 16px (CRITICAL - prevents iOS auto-zoom)
□ Padding: 12px vertical, 16px horizontal
□ Border: 2px (easy to see focus)
□ Spacing: ≥ 16px between fields

Input Types:
□ type="email" → Email keyboard (iOS)
□ type="tel" → Numeric keyboard
□ type="date" → Date picker
□ type="time" → Time picker
□ inputmode="numeric" → Number pad (Android)

Labels:
□ Position: Above input (not placeholder)
□ Font size: ≥ 14px
□ Color: High contrast (gray-700)
□ Required indicator: * (red)

Buttons:
□ Submit button: Full width on mobile
□ Height: ≥ 52px (larger than inputs)
□ Font size: 18px (prominent)
□ Margin top: 24px (clear separation)
```

#### Virtual Keyboard Handling

```
iOS Keyboard Issues:
1. Input field hidden by keyboard
   Fix: Scroll input into view on focus

2. Fixed footer hidden by keyboard
   Fix: Adjust padding when keyboard opens

3. Keyboard dismissal
   Fix: Tap outside input or "Done" button

Test Procedure:
1. Focus on input field
   □ Keyboard appears
   □ Input scrolls into view (above keyboard)
   □ Submit button visible

2. Fill out form
   □ Tab key moves to next field (iOS)
   □ Return key submits (if last field)

3. Dismiss keyboard
   □ Tap outside form
   □ Tap "Done" on keyboard
   □ Layout returns to normal
```

#### Auto-Complete & Auto-Fill

```
Browser Auto-Fill:
□ autocomplete="name" → Name suggestions
□ autocomplete="email" → Email suggestions
□ autocomplete="tel" → Phone suggestions
□ autocomplete="off" → Disable (if needed)

Test:
1. Start typing "John"
   □ Browser suggests "John Doe" (if saved)
2. Tap suggestion
   □ Form populates correctly
3. Submit form
   □ Browser asks to save
   □ Decline or accept
```

### 3. Performance on Mobile Networks

**Priority**: HIGH - Real-world usage

#### Network Throttling Tests

```
Chrome DevTools Network Throttling:
1. F12 → Network tab
2. Throttle: "Slow 3G" (400ms RTT, 400kbps down)
3. Reload page

Metrics to Measure:
□ Initial page load: < 5s
□ Dashboard data load: < 3s
□ Photo upload: < 10s on 3G
□ Interactive (TTI): < 6s

Fast 3G (100ms RTT, 1.6Mbps):
□ Page load: < 3s
□ Photo upload: < 5s
□ Smooth interactions

4G (50ms RTT, 4Mbps):
□ Page load: < 2s
□ Photo upload: < 3s
□ Near-instant interactions
```

#### Offline Mode Testing

```
Test Procedure:
1. Load DetailHub
2. Enable airplane mode
3. Attempt to use app

Expected Behavior:
□ Cached data still visible
□ "Offline" indicator shows
□ Actions queued for later
□ Retry button appears
□ Clear error message

4. Re-enable network
□ Auto-reconnect
□ Queued actions execute
□ UI updates with fresh data
□ "Online" indicator shows
```

#### Progressive Web App (PWA)

```
Installation:
1. Safari (iOS): Share → Add to Home Screen
2. Chrome (Android): Install banner or menu → Install

Verify:
□ App icon on home screen
□ Splash screen on launch
□ Runs in standalone mode (no browser chrome)
□ Fast load from cache
□ Works offline (basic functionality)

Manifest Check:
□ Name: "DetailHub"
□ Icon: 192x192, 512x512 PNG
□ Start URL: /detail-hub
□ Display: standalone
□ Theme color: #1a1a1a
```

## Responsive Component Testing

### Component Breakpoint Matrix

| Component | 320px | 640px | 768px | 1024px | 1280px |
|-----------|-------|-------|-------|--------|--------|
| **PunchClockKiosk** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **DetailHubDashboard** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **EmployeePortal** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **ScheduleCalendar** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **PhotoReviewCard** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **TimecardSystem** | ⚠️ | ✅ | ✅ | ✅ | ✅ |

**Legend**: ✅ Fully supported | ⚠️ Limited functionality | ❌ Not supported (tablet-only)

### Per-Component Checklists

#### PunchClockKiosk (Tablet-Only)

```
Tablet Portrait (768px):
□ Photo guide box: 400x500px, centered
□ Clock In/Out buttons: Full width, 60px height
□ Break buttons: Side by side, 44px height
□ Status indicator: Top center, prominent
□ Recent activity: List view, 3 items visible

Tablet Landscape (1024px):
□ Photo guide box: 500x400px, centered
□ Buttons: Horizontal row
□ Status indicator: Top right
□ Recent activity: Grid view, 2 columns
```

#### DetailHubDashboard (All Viewports)

```
Mobile (320px):
□ Stats cards: 1 column, full width
□ Chart: Full width, 200px height
□ Tables: Horizontal scroll
□ Tabs: Horizontal scroll

Tablet (768px):
□ Stats cards: 2 columns
□ Chart: Full width, 300px height
□ Tables: All columns visible
□ Tabs: All visible

Desktop (1280px):
□ Stats cards: 4 columns
□ Chart: 2/3 width, 400px height
□ Tables: Expanded columns
□ Sidebar: Fixed left navigation
```

#### EmployeePortal (All Viewports)

```
Mobile (320px):
□ Employee cards: 1 column
□ Avatar: 60x60px
□ Actions: Icon-only buttons
□ Search: Full width, sticky top

Tablet (768px):
□ Employee cards: 2 columns
□ Avatar: 80x80px
□ Actions: Icon + text buttons
□ Search: + Filter buttons

Desktop (1024px):
□ Employee table: Replaces cards
□ Columns: Avatar, Name, Role, Status, Actions
□ Sortable headers
□ Bulk actions toolbar
```

#### ScheduleCalendar (All Viewports)

```
Mobile (320px):
□ Week view: Horizontal scroll
□ Day column: 100px width
□ Events: Truncated text, tap to expand
□ Navigation: Date picker dropdown

Tablet (768px):
□ Week view: All 7 days visible
□ Day column: 140px width
□ Events: Full text visible
□ Navigation: Prev/Next week arrows

Desktop (1024px):
□ Week view: Expanded layout
□ Day column: 180px width
□ Events: Color-coded, hover details
□ Navigation: Month selector
```

## Testing Methodology

### Manual Testing on Real Devices

**Required Devices** (Minimum):
```
1. iPad (any model, iOS latest)
2. iPhone (any model, iOS latest)
3. Android tablet (Samsung preferred)
4. Android phone (Samsung or Google)
```

**Testing Session** (30 minutes per device):
```
1. Setup (5 min)
   - Connect to test WiFi
   - Navigate to staging URL
   - Login with test account

2. Core Flows (15 min)
   - Punch clock workflow (2x)
   - Photo capture (3x - test quality)
   - Break management
   - Dashboard navigation

3. Edge Cases (10 min)
   - Rotate device during photo capture
   - Network loss during upload
   - Rapid button tapping
   - Background/foreground app
```

### Automated Mobile Testing

**Chrome DevTools Device Emulation**
```bash
# Run in responsive mode
npm run dev
# F12 → Toggle device toolbar (Ctrl+Shift+M)
# Test each preset: iPhone SE, iPhone 14, iPad, iPad Pro
```

**Playwright Mobile Tests**
```typescript
// tests/mobile.spec.ts
import { test, devices } from '@playwright/test';

test.use(devices['iPad Pro']);

test('punch clock on iPad', async ({ page }) => {
  await page.goto('http://localhost:8080/detail-hub');
  await page.click('[data-testid="clock-in-button"]');
  // ... rest of test
});
```

**BrowserStack Real Device Cloud**
```
Devices to Test:
- iPad Pro 12.9" (iOS 17) - Safari
- iPad Air (iOS 16) - Safari
- iPhone 14 Pro (iOS 17) - Safari
- Samsung Galaxy Tab S8 (Android 13) - Chrome
- Samsung Galaxy S23 (Android 13) - Chrome
```

### Network Simulation

**Test on Various Connections**:
```
WiFi (Fast):
- Speed: 50+ Mbps
- Latency: < 20ms
- Expected: Instant loads, smooth experience

4G (Good):
- Speed: 5-12 Mbps
- Latency: 50-100ms
- Expected: 2-3s loads, slight delays

3G (Slow):
- Speed: 1-3 Mbps
- Latency: 200-500ms
- Expected: 5-10s loads, noticeable lag

Offline:
- No connection
- Expected: Cached data, queue actions
```

## Accessibility on Mobile

### Touch Accessibility

**WCAG 2.1 AA Compliance**:
```
Touch Target Size:
□ Minimum: 44x44px (WCAG 2.1)
□ Recommended: 48x48px (Material Design)
□ Spacing: ≥ 8px between targets

Text Readability:
□ Minimum font size: 16px (body text)
□ Line height: 1.5 (optimal)
□ Paragraph width: ≤ 70 characters
□ Contrast ratio: ≥ 4.5:1 (WCAG AA)

Zoom:
□ Support 200% zoom (WCAG 2.1)
□ Text reflows at 200% (no horizontal scroll)
□ Images scale appropriately
```

### Mobile Screen Reader Testing

**iOS VoiceOver**:
```
Enable: Settings → Accessibility → VoiceOver

Test Procedure:
1. Swipe right to navigate elements
   □ Buttons announced with role
   □ Labels descriptive (not "button1")
   □ State changes announced

2. Double-tap to activate
   □ Buttons activate correctly
   □ Confirmation announced

3. Rotate device
   □ VoiceOver adapts to new layout
   □ Focus doesn't get lost
```

**Android TalkBack**:
```
Enable: Settings → Accessibility → TalkBack

Test Procedure:
1. Swipe right to navigate
   □ Elements announced clearly
   □ Headings hierarchy correct (h1, h2, h3)

2. Explore by touch
   □ Elements announced on touch
   □ Activation requires lift + double-tap

3. Test gestures
   □ Two-finger swipe scrolls
   □ Back gesture works
```

## Performance Benchmarks

### Mobile Performance Targets

**Lighthouse Mobile Audit** (Target Scores):
```
Performance: ≥ 90
- First Contentful Paint: < 1.8s
- Largest Contentful Paint: < 2.5s
- Time to Interactive: < 3.8s
- Speed Index: < 3.4s
- Total Blocking Time: < 200ms
- Cumulative Layout Shift: < 0.1

Accessibility: ≥ 95
Best Practices: ≥ 95
SEO: ≥ 90
```

### Battery Life Testing

**Kiosk Tablet** (24-hour test):
```
Setup:
- Fully charged iPad
- WiFi connected
- DetailHub open in kiosk mode
- Screen brightness: 50%

Monitor:
□ Battery drain: < 50% in 8 hours
□ No excessive heat
□ No memory leaks (RAM stable)
□ App doesn't crash overnight

Expected:
- 16+ hours on full charge
- Consistent performance throughout
```

### Memory Usage

**Mobile Device Limits**:
```
iOS:
- Available RAM: 2-6GB (varies by device)
- App limit: ~1.4GB before termination

Android:
- Available RAM: 2-12GB (varies by device)
- App limit: Varies by manufacturer

DetailHub Target:
- Initial load: < 50MB
- After 1 hour use: < 100MB
- No memory leaks (stable over time)
```

## Troubleshooting Common Issues

### Photo Capture Fails

**Symptom**: Camera doesn't start or shows black screen

**Debug Steps**:
```
1. Check browser console
   □ NotAllowedError → Permission denied
   □ NotFoundError → No camera available
   □ NotReadableError → Camera in use

2. Verify device
   □ Camera works in native app?
   □ Multiple cameras available?
   □ iOS/Android version supported?

3. Check permissions
   □ iOS: Settings → Safari → Camera → Allow
   □ Android: Settings → Apps → Chrome → Permissions → Camera

4. Test different browser
   □ iOS: Only Safari supports getUserMedia fully
   □ Android: Try Chrome, Firefox, Samsung Internet
```

### Upload Slow or Fails

**Symptom**: Photos take > 10s to upload or timeout

**Debug Steps**:
```
1. Check network speed
   □ Run speed test: fast.com
   □ Required: ≥ 5 Mbps upload

2. Check photo file size
   □ Inspect network tab in DevTools
   □ Target: ≤ 1MB after compression
   □ If > 2MB: Compression not working

3. Check server response
   □ 500 error → Server issue
   □ Timeout → Network issue
   □ 413 error → File too large

4. Retry logic
   □ Should retry 3 times
   □ Exponential backoff (1s, 2s, 4s)
   □ Error message after 3 failures
```

### Layout Breaks on Rotation

**Symptom**: UI elements overlap or disappear when rotating device

**Debug Steps**:
```
1. Inspect CSS media queries
   □ Check breakpoints in DevTools
   □ Verify orientation queries work

2. Test viewport meta tag
   <meta name="viewport" content="width=device-width, initial-scale=1.0">

3. Check fixed positioning
   □ Fixed elements may break on iOS
   □ Use sticky positioning instead

4. Verify flexbox/grid
   □ Inspect with DevTools layout panel
   □ Check for hardcoded widths
```

## Conclusion

Mobile and tablet testing is critical for DetailHub's kiosk deployment. This guide should be referenced before every release, with particular emphasis on:

1. **Real device testing** (at least iPad + iPhone)
2. **Photo capture verification** (core functionality)
3. **Touch interaction validation** (usability)
4. **Performance on mobile networks** (real-world conditions)

**Minimum Testing**: Quick test (5 min) on iPad + iPhone
**Recommended Testing**: Full device matrix + performance audit
**Comprehensive Testing**: BrowserStack + accessibility + 24-hour battery test

For questions or issues, contact the development team or refer to the Browser Testing Guide for cross-browser specifics.
