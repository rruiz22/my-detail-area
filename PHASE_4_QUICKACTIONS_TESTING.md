# Phase 4: QuickActions & Keyboard Shortcuts - Testing Guide

**Testing Date**: 2025-10-21
**Features**: Keyboard Shortcuts (Ctrl+S) + Contextual Quick Actions
**Server**: http://localhost:8080
**Status**: ✅ Server running on port 8080

---

## 🎹 Keyboard Shortcuts Testing

### Global Search Shortcuts

#### Ctrl+S / Cmd+S (Open Search)
- [ ] **Windows**: Press `Ctrl + S` → Search input should focus
- [ ] **Mac**: Press `Cmd + S` → Search input should focus
- [ ] **From any page**: Shortcut works from Dashboard, Sales Orders, Contacts, etc.
- [ ] **Input focus**: Cursor appears in search box ready to type
- [ ] **Dropdown opens**: Popover opens automatically when focused

#### ESC (Close Search)
- [ ] **ESC key**: Press `ESC` → Search dropdown closes
- [ ] **Input blur**: Input loses focus
- [ ] **Query cleared**: Search text is cleared from input
- [ ] **Results cleared**: Search results are removed

#### Search Flow Test
1. [ ] Press `Ctrl+S` → Input focused
2. [ ] Type "test" → Search executes after 300ms
3. [ ] See results → Results display in dropdown
4. [ ] Press `ESC` → Dropdown closes, input cleared
5. [ ] Repeat cycle → Works consistently

---

## ⚡ QuickActions Component Testing

### Desktop Layout (≥768px)

#### QuickActions Display
- [ ] **Visible on desktop**: QuickActions appear in header (md:flex)
- [ ] **Position**: Located before separator and DealershipFilter
- [ ] **Vertical separator**: Gray line (h-6 w-px bg-border) separates QuickActions from other tools

#### Primary Actions (First 1-2 actions)
- [ ] **Button display**: First 2 actions shown as buttons
- [ ] **Icons visible**: lucide-react icons display correctly
- [ ] **Text visible on XL**: Button text shows on xl:inline breakpoint
- [ ] **Icon-only on LG**: Only icons visible between lg and xl breakpoints

#### Overflow Dropdown (More than 2 actions)
- [ ] **Zap icon button**: Appears when more than 2 actions available
- [ ] **Ghost variant**: Button uses ghost style
- [ ] **Dropdown opens**: Click opens menu aligned to end
- [ ] **Additional actions**: Overflow actions (3+) appear in dropdown
- [ ] **Icons in dropdown**: Each item shows correct icon + text

### Mobile Layout (<768px)

#### QuickActions Mobile Menu
- [ ] **Hidden primary buttons**: Individual action buttons hidden (lg:hidden)
- [ ] **Mobile dropdown visible**: Shows as outline button with Zap icon
- [ ] **Button text responsive**: Shows "Quick Actions" on sm:inline
- [ ] **Icon-only on smallest**: Only Zap icon visible on very small screens

#### Mobile Dropdown Content
- [ ] **All actions visible**: Mobile dropdown shows ALL actions (not just overflow)
- [ ] **Vertical stack**: Actions arranged vertically
- [ ] **Icons + text**: Each action shows icon + translated label
- [ ] **Clickable**: Each action triggers correct behavior

---

## 🎯 Contextual Actions by Route

Test QuickActions display for each route and verify correct actions appear:

### Dashboard (`/dashboard`)
**Expected Actions**:
- [ ] ✅ "New Sales Order" (if has permission + dealer selected)
- [ ] ✅ "New Service Order" (if has permission + dealer selected)
- [ ] ✅ "View Reports" (if has permission)

**Test**:
1. [ ] Navigate to `/dashboard`
2. [ ] Verify 3 actions appear (if all permissions granted)
3. [ ] Click "New Sales Order" → Opens sales order modal OR navigates to `/sales-orders`
4. [ ] Click "New Service Order" → Opens service order modal OR navigates to `/service-orders`
5. [ ] Click "View Reports" → Navigates to `/reports`

### Sales Orders (`/sales-orders`)
**Expected Actions**:
- [ ] ✅ "New Sales Order" (if has permission + dealer selected)
- [ ] ✅ "Export Sales" (if has permission)

**Test**:
1. [ ] Navigate to `/sales-orders`
2. [ ] Verify 2 actions appear
3. [ ] Click "New Sales Order" → Dispatches CustomEvent `open-new-order-modal` with `{ type: 'sales' }`
4. [ ] Click "Export Sales" → Dispatches CustomEvent `export-orders` with `{ type: 'sales' }`

### Service Orders (`/service-orders`)
**Expected Actions**:
- [ ] ✅ "New Service Order" (if has permission + dealer selected)

**Test**:
1. [ ] Navigate to `/service-orders`
2. [ ] Verify 1 action appears
3. [ ] Click "New Service Order" → Dispatches CustomEvent `open-new-order-modal` with `{ type: 'service' }`

### Recon Orders (`/recon-orders`)
**Expected Actions**:
- [ ] ✅ "New Recon Order" (if has permission + dealer selected)

**Test**:
1. [ ] Navigate to `/recon-orders`
2. [ ] Verify 1 action appears
3. [ ] Click "New Recon Order" → Dispatches CustomEvent `open-new-order-modal` with `{ type: 'recon' }`

### Car Wash (`/car-wash`)
**Expected Actions**:
- [ ] ✅ "New Car Wash" (if has permission + dealer selected)

**Test**:
1. [ ] Navigate to `/car-wash`
2. [ ] Verify 1 action appears
3. [ ] Click "New Car Wash" → Dispatches CustomEvent `open-new-order-modal` with `{ type: 'car_wash' }`

### Contacts (`/contacts`)
**Expected Actions**:
- [ ] ✅ "New Contact" (if has permission)

**Test**:
1. [ ] Navigate to `/contacts`
2. [ ] Verify 1 action appears
3. [ ] Click "New Contact" → Dispatches CustomEvent `open-new-contact-modal`
4. [ ] **Note**: Contact creation doesn't require dealer selection

### Users (`/users`)
**Expected Actions**:
- [ ] ✅ "Invite User" (if has permission)

**Test**:
1. [ ] Navigate to `/users`
2. [ ] Verify 1 action appears
3. [ ] Click "Invite User" → Dispatches CustomEvent `open-invite-user-modal`

### Dealerships (`/dealers`)
**Expected Actions**:
- [ ] ✅ "New Dealership" (if has permission)

**Test**:
1. [ ] Navigate to `/dealers`
2. [ ] Verify 1 action appears
3. [ ] Click "New Dealership" → Dispatches CustomEvent `open-new-dealership-modal`

---

## 🔐 Permission-Based Testing

### User with Limited Permissions
**Test Scenario**: User with only `read` permissions

1. [ ] Login as limited user
2. [ ] Navigate to Dashboard
3. [ ] **Expected**: No QuickActions appear (requiresWrite)
4. [ ] Navigate to Sales Orders
5. [ ] **Expected**: No "New Sales Order" button (requires `write`)

### User with Write Permissions
**Test Scenario**: User with `write` permissions for orders

1. [ ] Login as user with write permissions
2. [ ] Navigate to Dashboard
3. [ ] **Expected**: "New Sales Order", "New Service Order" appear
4. [ ] Navigate to Sales Orders
5. [ ] **Expected**: "New Sales Order" button appears

### System Admin
**Test Scenario**: User with `system_admin` role (rruiz@lima.llc)

1. [ ] Login as system admin
2. [ ] Navigate to each route
3. [ ] **Expected**: All contextual actions appear
4. [ ] Verify "New Dealership" appears on `/dealers` route

---

## 🏢 Dealer Filter Integration

### "All Dealerships" Selected
**Test Scenario**: Global filter set to "All"

1. [ ] Set dealer filter to "All Dealerships"
2. [ ] Navigate to Dashboard
3. [ ] **Expected**: Actions with `requiresDealer: true` are HIDDEN
4. [ ] Verify "View Reports" still appears (no dealer requirement)

### Individual Dealer Selected
**Test Scenario**: Specific dealer selected

1. [ ] Select individual dealership from filter
2. [ ] Navigate to Dashboard
3. [ ] **Expected**: All actions appear (including dealer-required ones)
4. [ ] Navigate to Sales Orders
5. [ ] **Expected**: "New Sales Order" appears

---

## 🌐 Translation Testing

### English (EN)
- [ ] Switch language to English
- [ ] Dashboard → "New Sales Order", "New Service Order", "View Reports"
- [ ] Sales Orders → "New Sales Order", "Export Sales"
- [ ] Mobile dropdown → "Quick Actions" title
- [ ] Overflow dropdown → "More Actions" label

### Spanish (ES)
- [ ] Switch language to Spanish
- [ ] Dashboard → "Nueva Orden de Venta", "Nueva Orden de Servicio", "Ver Reportes"
- [ ] Sales Orders → "Nueva Orden de Venta", "Exportar Ventas"
- [ ] Mobile dropdown → "Acciones Rápidas" title
- [ ] Overflow dropdown → "Más Acciones" label

### Portuguese (PT-BR)
- [ ] Switch language to Portuguese
- [ ] Dashboard → "Novo Pedido de Venda", "Novo Pedido de Serviço", "Ver Relatórios"
- [ ] Sales Orders → "Novo Pedido de Venda", "Exportar Vendas"
- [ ] Mobile dropdown → "Ações Rápidas" title
- [ ] Overflow dropdown → "Mais Ações" label

---

## 🎨 Design System Compliance

### Visual Style (Notion Design)
- [ ] **No gradients**: All buttons use solid colors
- [ ] **Muted palette**: Uses gray variants (text-muted-foreground)
- [ ] **Icon consistency**: lucide-react icons only (h-4 w-4)
- [ ] **Button variants**:
  - [ ] `default` for primary action (solid background)
  - [ ] `outline` for secondary actions
  - [ ] `ghost` for overflow dropdown trigger
- [ ] **Separator color**: Border color matches design system (bg-border)

### Spacing & Layout
- [ ] **Gap spacing**: `gap-2` between QuickActions and separator
- [ ] **Icon size**: Icons are h-4 w-4 consistently
- [ ] **Button size**: Buttons use `size="sm"` (compact)
- [ ] **Dropdown width**: Menu is w-56 (224px)

---

## 📱 Responsive Breakpoint Testing

### Large Desktop (≥1280px - XL)
- [ ] **Button text visible**: Primary actions show icon + text
- [ ] **No overflow on 2 actions**: If ≤2 actions, no overflow dropdown
- [ ] **Overflow on 3+ actions**: Zap icon button appears for 3+ actions

### Desktop (1024px - 1279px - LG)
- [ ] **Icon-only buttons**: Primary actions show only icons (xl:inline hides text)
- [ ] **Badge visible**: Dealer badge shows on DealershipFilter
- [ ] **QuickActions visible**: Actions display in header

### Tablet (768px - 1023px - MD)
- [ ] **Desktop layout**: Still shows desktop header
- [ ] **QuickActions visible**: Actions appear before separator
- [ ] **Mobile menu hidden**: Sheet hamburger NOT visible

### Mobile (640px - 767px - SM)
- [ ] **Mobile layout**: Shows mobile header
- [ ] **QuickActions in dropdown**: Actions moved to mobile dropdown menu
- [ ] **Search visible**: GlobalSearch still visible (sm:block)

### Small Mobile (<640px)
- [ ] **Icon-only dropdown**: QuickActions button shows only Zap icon
- [ ] **Search hidden**: GlobalSearch hidden (sm:block)
- [ ] **Compact layout**: All elements fit without overflow

---

## 🐛 Edge Cases & Error Handling

### No Permissions
- [ ] **User with no permissions**: QuickActions component returns `null` (not rendered)
- [ ] **No visual error**: No broken UI or console errors

### No Dealer Selected
- [ ] **"All" selected**: Dealer-required actions filtered out
- [ ] **Actions without dealer requirement**: Still appear (New Contact, Invite User, etc.)

### CustomEvent Dispatching
- [ ] **Console log verification**:
  ```javascript
  window.addEventListener('open-new-order-modal', (e) => console.log(e.detail));
  ```
- [ ] **Event payload**: `{ type: 'sales' | 'service' | 'recon' | 'car_wash' }`
- [ ] **Event fires**: Click triggers CustomEvent correctly

### Browser Console
- [ ] **No TypeScript errors**
- [ ] **No React warnings** (keys, props, etc.)
- [ ] **No accessibility warnings**
- [ ] **useContextualActions logs**: Verify hook is recalculating on route change

---

## ♿ Accessibility Testing

### Keyboard Navigation
- [ ] **Tab order**: QuickActions buttons in logical tab sequence
- [ ] **Dropdown opens**: Enter/Space opens dropdown menu
- [ ] **Arrow keys**: Navigate dropdown items with Up/Down arrows
- [ ] **Escape closes**: ESC closes dropdown
- [ ] **Focus visible**: Focus indicators clear on all interactive elements

### Screen Reader Testing
- [ ] **aria-label**: Mobile dropdown has "Quick Actions" label
- [ ] **DropdownMenuLabel**: "Quick Actions" / "More Actions" announced
- [ ] **Button text**: Screen reader announces button purpose
- [ ] **Icon alternative**: Icons have text alternatives

---

## 📊 Performance Testing

### Render Performance
- [ ] **Initial render**: QuickActions renders in < 50ms
- [ ] **Route change**: Actions update immediately on navigation
- [ ] **No unnecessary re-renders**: useContextualActions memoizes correctly

### Hook Optimization
- [ ] **Dependency array**: useContextualActions only recalculates when route/permissions/dealer changes
- [ ] **Event listeners**: CustomEvents don't cause memory leaks
- [ ] **Cleanup**: No console warnings about unmounted components

---

## ✅ Testing Summary

### Pass Criteria
- [ ] All checkboxes above marked as completed
- [ ] Ctrl+S keyboard shortcut works globally
- [ ] ESC closes search and clears results
- [ ] QuickActions appear contextually on all routes
- [ ] Permissions filter actions correctly
- [ ] Dealer filter affects dealer-required actions
- [ ] All 3 languages display correct translations
- [ ] Responsive layouts work on all breakpoints
- [ ] Design system compliance verified (Notion style)
- [ ] No console errors or warnings
- [ ] Accessibility standards met

### Notes / Issues Found
_Document any issues, bugs, or improvements needed:_

---

### Testing Completed By
**Name**: _____________
**Date**: _____________
**Status**: ☐ Passed  ☐ Failed (see notes)

---

## 🚀 Implementation Summary

### ✅ Completed Features

#### Keyboard Shortcuts
- **Ctrl+S / Cmd+S**: Opens global search with input focus
- **ESC**: Closes search, clears query, blurs input
- **Event cleanup**: Proper useEffect cleanup prevents memory leaks

#### QuickActions Component
- **Contextual actions**: Dynamic actions based on route + permissions + dealer
- **Responsive design**:
  - Desktop: First 2 actions as buttons, rest in overflow dropdown
  - Mobile: All actions in dropdown menu
- **Permission-based**: Uses `hasPermission()` to filter actions
- **Dealer-aware**: Filters dealer-required actions when "All" selected

#### useContextualActions Hook
- **Route detection**: Maps routes to relevant actions
- **Permission checking**: Integrates with `usePermissions` hook
- **Dealer integration**: Uses `useDealerFilter` context
- **CustomEvent dispatch**: Emits events for other components to handle
- **Memoization**: Efficient recalculation only when dependencies change

#### Translations
- **EN**: All keys added (quick_actions.*)
- **ES**: Spanish translations complete
- **PT-BR**: Portuguese (Brazil) translations complete
- **New keys**:
  - `quick_actions.new_dealership`
  - `quick_actions.view_reports`
  - `quick_actions.export_sales`
  - `quick_actions.more`
  - `quick_actions.more_actions`

#### Integration
- **ProtectedLayout**: QuickActions integrated before separator
- **Visual separator**: Gray vertical line (h-6 w-px bg-border)
- **Mobile Sheet**: Actions accessible in mobile menu

### 📁 Files Created/Modified

**Created**:
- `src/hooks/useContextualActions.ts` (204 lines)
- `src/components/actions/QuickActions.tsx` (133 lines)
- `PHASE_4_QUICKACTIONS_TESTING.md` (this file)

**Modified**:
- `src/components/search/GlobalSearch.tsx` (+20 lines - keyboard shortcuts)
- `src/components/ProtectedLayout.tsx` (+3 lines - QuickActions integration)
- `public/translations/en.json` (+5 keys)
- `public/translations/es.json` (+5 keys)
- `public/translations/pt-BR.json` (+5 keys)

---

**End of Testing Guide**
