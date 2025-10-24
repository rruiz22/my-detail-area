# Vehicle Details Page - Testing Guide

## Quick Start Testing

### 1. Navigate to Vehicle Details

**From Stock Inventory:**
1. Go to `/stock`
2. Click on any vehicle row in the inventory table
3. Should navigate to `/stock/vehicles/:id`

**Direct URL:**
- Navigate directly to `/stock/vehicles/{vehicle-id}`
- Replace `{vehicle-id}` with an actual vehicle UUID from your database

**From Global Search:**
- Search for a vehicle in the global search bar
- Click the vehicle from search results
- Should navigate to vehicle details page

---

### 2. Test Each Tab

#### Tab 1: Information ✅
**What to check:**
- Vehicle Overview card (year, make, model, trim, VIN, stock#)
- Vehicle Details card (mileage, color, drivetrain, certified)
- Location & Status card (lot location, DMS status, objective, age, risk light)
- Additional Information card (if data exists)

**Expected:**
- All data displays correctly
- "N/A" shown for missing data
- Cards are responsive on mobile

#### Tab 2: Pricing ✅
**What to check:**
- Current Pricing (price, MSRP)
- Valuation & Costs (if data exists)
- Proof Points (if data exists)

**Expected:**
- Prices formatted as currency
- Profit shown in green/red based on value
- "No additional pricing data available" if no valuation data

#### Tab 3: Market ✅
**What to check:**
- Market Performance (rankings, percent to market)
- Market Supply & Demand (MDS metrics)
- Lead Performance (7-day leads, total, daily avg)
- CarGurus Metrics (if data exists)

**Expected:**
- Rankings displayed as "#X of Y"
- Percentages shown correctly
- "No market data available" if no data

#### Tab 4: Photos ✅
**What to check:**
- Photo gallery (if photos exist)
- Upload button (if user has `stock.edit` permission)
- Empty state (if no photos)

**Expected:**
- Key photo displays in header AND gallery
- Key photo has "Key Photo" badge
- Upload button visible only with edit permission
- Hover overlay on photos (Set Key Photo, Delete)

#### Tab 5: History ✅
**What to check:**
- Current price card
- Last reprice card (if exists)
- "Coming soon" notice

**Expected:**
- Current price displays with "Active" badge
- Last reprice shows date and leads since reprice
- Timeline format is clear

#### Tab 6: Activity ✅
**What to check:**
- Activity timeline
- "Created" activity (minimum)
- "Coming soon" notice

**Expected:**
- Activity cards show type, user, timestamp
- Timeline sorted newest first
- Color-coded activity types

---

### 3. Test Quick Actions

#### Create Order Dropdown ✅

**If user has `sales_orders.create`:**
- "Create Sales Order" option appears
- Clicking navigates to `/sales_orders` with prefilled data

**If user has `service_orders.create`:**
- "Create Service Order" option appears
- Clicking navigates to `/service_orders` with prefilled data

**If user has `recon_orders.create`:**
- "Create Recon Order" option appears
- Clicking navigates to `/recon_orders` with prefilled data

**If user has NONE:**
- Entire dropdown doesn't show

**What to verify:**
- Prefilled data includes: VIN, year, make, model, stock number
- User can complete order creation with prefilled data

#### Link to Get Ready ✅

**If vehicle already linked:**
- Button shows "View in Get Ready"
- Clicking navigates to `/get-ready` with item highlighted

**If vehicle NOT linked:**
- Button shows "Link to Get Ready"
- Clicking navigates to `/get-ready` with prefilled data

**If user doesn't have `get_ready.view`:**
- Button doesn't show

#### Edit Vehicle ✅

**If user has `stock.edit`:**
- "Edit Vehicle" button shows
- *Note: Dialog not yet implemented, button is placeholder*

**If user doesn't have `stock.edit`:**
- Button doesn't show

#### Change Price ✅

**If user has `stock.edit`:**
- "Change Price" button shows
- *Note: Dialog not yet implemented, button is placeholder*

**If user doesn't have `stock.edit`:**
- Button doesn't show

---

### 4. Test Permissions

#### No View Permission
**Setup:** User WITHOUT `stock.view` permission

**Expected:**
- Entire page shows "No Permission" message
- Back button to return to previous page

#### View Only (No Edit)
**Setup:** User WITH `stock.view` but WITHOUT `stock.edit`

**Expected:**
- All tabs visible and functional
- NO upload button in Photos tab
- NO edit vehicle button
- NO change price button

#### View + Edit (No Delete)
**Setup:** User WITH `stock.view` and `stock.edit` but WITHOUT `stock.delete`

**Expected:**
- All tabs visible and functional
- Upload button shows in Photos tab
- Edit vehicle button shows
- Change price button shows
- NO delete button on photos

#### Full Access
**Setup:** User WITH `stock.view`, `stock.edit`, and `stock.delete`

**Expected:**
- All tabs visible and functional
- Upload button shows
- Edit vehicle button shows
- Change price button shows
- Delete button shows on photos (in hover overlay)

---

### 5. Test Navigation

#### Back Button
**Test:**
1. Navigate from `/stock` to vehicle details
2. Click back button

**Expected:**
- Returns to `/stock` with same filters/pagination

#### Direct Link
**Test:**
1. Copy vehicle details URL
2. Paste in new tab

**Expected:**
- Page loads correctly
- All data fetches and displays

#### Browser Back/Forward
**Test:**
1. Navigate to vehicle details
2. Click browser back button
3. Click browser forward button

**Expected:**
- Navigation works correctly
- Page state preserved

---

### 6. Test Loading States

#### Normal Load
**What to check:**
- Loading spinner shows while fetching data
- Spinner disappears when data loaded

#### Error State
**Test:** Navigate to `/stock/vehicles/invalid-id`

**Expected:**
- Error message shows "Vehicle not found"
- Back button available

#### Network Error
**Test:** Disconnect network, then navigate to vehicle details

**Expected:**
- Error message shows
- Back button available

---

### 7. Test Responsive Design

#### Desktop (1920x1080)
**What to check:**
- All tabs fit in one row
- 3-column grid in Info tab
- Photo gallery shows 4 columns

#### Tablet (768x1024)
**What to check:**
- Tabs might wrap or scroll horizontally
- 2-column grid in Info tab
- Photo gallery shows 3 columns

#### Mobile (375x667)
**What to check:**
- Tabs scroll horizontally
- 1-column grid in Info tab
- Photo gallery shows 2 columns
- Quick actions stack vertically

---

### 8. Test Translations

#### English
**Test:** Set language to English

**Expected:**
- All labels in English
- Tab names in English
- Button labels in English

#### Spanish
**Test:** Set language to Spanish

**Expected:**
- All labels in Spanish
- Tab names: Información, Precios, Mercado, Fotos, Historial, Actividad
- Button labels in Spanish

#### Portuguese (Brazil)
**Test:** Set language to Portuguese

**Expected:**
- All labels in Portuguese
- Tab names: Informação, Preços, Mercado, Fotos, Histórico, Atividade
- Button labels in Portuguese

---

## Common Issues & Solutions

### Issue: Page shows "Vehicle not found"
**Solution:**
- Verify vehicle ID exists in `dealer_vehicle_inventory`
- Verify vehicle has `is_active = true`
- Check user has access to vehicle's dealer

### Issue: Create order button doesn't show
**Solution:**
- Verify user has `create` permission for order type
- Verify order module is active for dealer

### Issue: Get Ready button doesn't show
**Solution:**
- Verify user has `get_ready.view` permission
- Verify Get Ready module is active for dealer

### Issue: Photos don't load
**Solution:**
- Check `key_photo_url` in vehicle record
- Verify image URL is accessible
- Check browser console for CORS errors

### Issue: Translation keys showing instead of text
**Solution:**
- Verify translation keys exist in all 3 language files
- Check for typos in translation keys
- Clear browser cache

---

## Performance Benchmarks

### Target Load Times
- Initial page load: < 1 second
- Tab switch: < 100ms
- Navigation: < 500ms

### Database Queries
- Single query for vehicle data
- Separate query for Get Ready check
- Total: 2 queries maximum

---

## Accessibility Testing

### Keyboard Navigation
- ✅ Tab through all interactive elements
- ✅ Enter to activate buttons
- ✅ Arrow keys to switch tabs

### Screen Reader
- ✅ All images have alt text
- ✅ All buttons have labels
- ✅ Tab order is logical

---

## Browser Compatibility

Tested and working on:
- ✅ Chrome 120+
- ✅ Firefox 120+
- ✅ Safari 17+
- ✅ Edge 120+

---

## Next Steps After Testing

1. Test with real production data
2. Gather user feedback on layout and features
3. Implement Phase 2 enhancements:
   - Photo upload modal
   - Edit vehicle dialog
   - Change price dialog
   - Activity logging
4. Monitor performance metrics
5. Iterate based on usage patterns

---

**Testing completed successfully? ✅**

Proceed to production deployment when ready!
