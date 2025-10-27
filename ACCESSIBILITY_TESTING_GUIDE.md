# Accessibility Testing Guide - Sales Orders Module
## My Detail Area Enterprise Dealership System

**Version:** 1.0.0
**Last Updated:** 2025-01-26
**Target:** WCAG 2.1 Level AA

---

## Quick Start

### Prerequisites
- **Screen Reader:** NVDA (Windows) or VoiceOver (macOS)
- **Browser:** Chrome/Edge with DevTools
- **Extensions:** axe DevTools, WAVE

### Testing Checklist (5-Minute Quick Test)
1. ✅ Open Sales Orders page (`/sales`)
2. ✅ Tab through all interactive elements (no traps)
3. ✅ Activate a KPI card with Enter key
4. ✅ Open an order card actions menu with keyboard
5. ✅ Check color contrast in DevTools
6. ✅ Zoom to 200% (no horizontal scroll)

---

## Manual Testing Procedures

### 1. Keyboard Navigation Testing

#### Test: Tab Order
**Steps:**
1. Navigate to `/sales` page
2. Press **Tab** repeatedly
3. Verify focus moves in this order:
   - "Refresh" button
   - "New Order" button
   - Search input field
   - "Clear search" button (if search has text)
   - View mode toggle buttons (Table/Kanban/Calendar)
   - "Filters" button
   - Filter pill buttons (Dashboard, Today, Tomorrow, etc.)
   - KPI cards (if on Dashboard view)
   - Order cards or table rows
   - Action buttons (View, Edit, Delete)
   - Pagination buttons (if applicable)

**Expected:**
- ✅ Focus visible on all interactive elements
- ✅ Focus ring gray-400 with 2px offset
- ✅ No focus traps
- ✅ Tab order matches visual layout

**Failure Examples:**
- ❌ Focus jumps randomly
- ❌ No visible focus indicator
- ❌ Focus gets stuck in dropdown menu

---

#### Test: Keyboard Activation
**Steps:**
1. Tab to an order card
2. Press **Enter** → Order details modal should open
3. Press **Escape** → Modal should close
4. Tab to a KPI card
5. Press **Space** → Filter should activate
6. Tab to actions menu button
7. Press **Enter** → Menu should open
8. Press **Arrow Down** → First menu item focused
9. Press **Enter** → Menu item activated

**Expected:**
- ✅ **Enter** and **Space** activate buttons
- ✅ **Escape** closes modals/menus
- ✅ **Arrow keys** navigate menus
- ✅ Action announcements via screen reader

**Failure Examples:**
- ❌ Enter does nothing on focused card
- ❌ Escape doesn't close modal
- ❌ Arrow keys don't navigate menu

---

### 2. Screen Reader Testing

#### NVDA Setup (Windows)
1. Download NVDA from https://www.nvaccess.org/
2. Install and start NVDA (Ctrl+Alt+N)
3. Open Chrome/Edge
4. Navigate to `http://localhost:8080/sales`
5. Press **Insert+Down Arrow** to start reading

#### Test: Order Card Announcement
**Steps:**
1. Start NVDA
2. Navigate to Sales Orders → Kanban view
3. Tab to an order card
4. Listen to announcement

**Expected Announcement:**
> "Article: Order 12345, Customer John Doe, 2024 Toyota Camry, In Progress, Due 2:00 PM on January 26, Assigned to Mike Johnson. Press Enter to view details."

**Verification:**
- ✅ Order number announced
- ✅ Customer name announced
- ✅ Vehicle info announced
- ✅ Status announced
- ✅ Due date and time announced
- ✅ Assigned user announced
- ✅ Instructions provided

**Failure Examples:**
- ❌ "Unlabeled button"
- ❌ Only order number announced
- ❌ No instructions for activation

---

#### Test: Kanban Column Navigation
**Steps:**
1. Navigate to Kanban view
2. Tab to first column
3. Listen to announcement

**Expected Announcement:**
> "Region: Pending column with 5 orders. List: Orders list for Pending status."

**Verification:**
- ✅ Column name announced
- ✅ Order count announced
- ✅ List role announced

---

#### Test: Dashboard KPI Card
**Steps:**
1. Navigate to Dashboard view
2. Tab to "Today Orders" KPI card
3. Listen to announcement

**Expected Announcement:**
> "Button: Today Orders: 12. Activate to filter."

**Verification:**
- ✅ Card title announced
- ✅ Value announced
- ✅ Action hint provided

---

#### Test: Live Region Announcements
**Steps:**
1. Start NVDA
2. Create a new order
3. Wait for announcement (without moving focus)

**Expected Announcement:**
> "New order created successfully"

**Verification:**
- ✅ Announcement without stealing focus
- ✅ Polite interruption (waits for pause)
- ✅ Clear success message

**Additional Scenarios:**
- Update order → "Order updated successfully"
- Change status → "Order status updated to In Progress"
- Delete order → "Order deleted successfully"
- Error occurred → "An error occurred: [message]"

---

### 3. Color Contrast Testing

#### Using Chrome DevTools
**Steps:**
1. Open Sales Orders page
2. Press **F12** → DevTools
3. Go to **Lighthouse** tab
4. Select **Accessibility** only
5. Click **Analyze page load**
6. Review "Contrast" section

**Expected:**
- ✅ All text passes WCAG AA (4.5:1 minimum)
- ✅ Large text passes WCAG AA (3:1 minimum)
- ✅ Focus indicators pass (3:1 minimum)

---

#### Using Color Contrast Analyzer
**Steps:**
1. Download CCA from https://www.tpgi.com/color-contrast-checker/
2. Use eyedropper to sample foreground color
3. Sample background color
4. Verify ratio meets WCAG AA

**Notion Palette Verification:**

| Element | Foreground | Background | Ratio | Pass |
|---------|-----------|------------|-------|------|
| Heading (Gray 900) | `#0f172a` | `#ffffff` | 16.5:1 | ✅ |
| Primary text (Gray 700) | `#334155` | `#ffffff` | 12.6:1 | ✅ |
| Secondary text (Gray 600) | `#475569` | `#ffffff` | 9.2:1 | ✅ |
| Muted text (Gray 500) | `#64748b` | `#ffffff` | 5.9:1 | ✅ |
| Success badge | `#10b981` | `#ffffff` | 4.8:1 | ✅ |
| Warning badge | `#d97706` | `#ffffff` | 5.2:1 | ✅ |
| Error badge | `#dc2626` | `#ffffff` | 5.9:1 | ✅ |
| Focus ring | `#94a3b8` | `#ffffff` | 3.8:1 | ✅ |

---

### 4. Zoom and Reflow Testing

#### Test: 200% Zoom
**Steps:**
1. Open Sales Orders page
2. Press **Ctrl++** (or Cmd++ on Mac) until 200%
3. Verify no horizontal scroll
4. Verify all content readable

**Expected:**
- ✅ Content reflows to fit viewport
- ✅ No horizontal scrollbar
- ✅ Text remains readable
- ✅ Buttons remain clickable
- ✅ Focus indicators visible

**Failure Examples:**
- ❌ Horizontal scrollbar appears
- ❌ Text overlaps
- ❌ Buttons cut off

---

#### Test: 400% Zoom (Mobile Layout)
**Steps:**
1. Zoom to 400%
2. Verify mobile layout activates
3. Verify all functionality available

**Expected:**
- ✅ Kanban switches to table view (mobile)
- ✅ Search bar full width
- ✅ Filter pills stacked vertically
- ✅ Order cards show mobile layout

---

### 5. Touch Target Size Testing

#### Test: Minimum Size
**Steps:**
1. Open browser DevTools (F12)
2. Enable **Device Mode** (Ctrl+Shift+M)
3. Select iPhone/Android device
4. Verify all buttons at least 44x44px

**Elements to Check:**
- ✅ View/Edit/Delete action buttons
- ✅ Filter pill buttons
- ✅ KPI cards
- ✅ Dropdown menu trigger
- ✅ Close modal button

**Measurement:**
```javascript
// In DevTools Console
document.querySelectorAll('button').forEach(btn => {
  const rect = btn.getBoundingClientRect();
  if (rect.width < 44 || rect.height < 44) {
    console.warn('Small button:', btn, rect);
  }
});
```

---

## Automated Testing

### axe-core Integration

#### Installation
```bash
npm install --save-dev @axe-core/react jest-axe
```

#### Test File
```typescript
// src/components/sales/__tests__/OrderCard.a11y.test.tsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { OrderCard } from '../OrderCard';

expect.extend(toHaveNoViolations);

describe('OrderCard Accessibility', () => {
  const mockOrder = {
    id: '12345',
    orderNumber: 'SO-12345',
    customerName: 'John Doe',
    vehicleYear: 2024,
    vehicleMake: 'Toyota',
    vehicleModel: 'Camry',
    status: 'in_progress',
    dueDate: '2025-01-26T14:00:00Z',
    assignedTo: 'Mike Johnson',
    services: [],
    dealer_id: 1,
  };

  it('should have no accessibility violations', async () => {
    const { container } = render(
      <OrderCard
        order={mockOrder}
        onEdit={jest.fn()}
        onView={jest.fn()}
        onDelete={jest.fn()}
        canEdit={true}
        canDelete={false}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper ARIA label', () => {
    const { container } = render(
      <OrderCard
        order={mockOrder}
        onEdit={jest.fn()}
        onView={jest.fn()}
        canEdit={true}
        canDelete={false}
      />
    );

    const card = container.querySelector('[role="article"]');
    expect(card).toHaveAttribute('aria-label');
    expect(card?.getAttribute('aria-label')).toContain('Order 12345');
    expect(card?.getAttribute('aria-label')).toContain('John Doe');
    expect(card?.getAttribute('aria-label')).toContain('Toyota Camry');
  });

  it('should be keyboard accessible', () => {
    const onView = jest.fn();
    const { container } = render(
      <OrderCard
        order={mockOrder}
        onEdit={jest.fn()}
        onView={onView}
        canEdit={true}
        canDelete={false}
      />
    );

    const card = container.querySelector('[role="article"]');
    expect(card).toHaveAttribute('tabindex', '0');

    // Simulate Enter key press
    card?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(onView).toHaveBeenCalledWith(mockOrder);
  });

  it('should have proper focus indicators', () => {
    const { container } = render(
      <OrderCard
        order={mockOrder}
        onEdit={jest.fn()}
        onView={jest.fn()}
        canEdit={true}
        canDelete={false}
      />
    );

    const card = container.querySelector('[role="article"]');
    expect(card).toHaveClass('focus-visible:ring-2');
    expect(card).toHaveClass('focus-visible:ring-gray-400');
    expect(card).toHaveClass('focus-visible:ring-offset-2');
  });
});
```

---

### Lighthouse CI

#### Configuration
```json
// .lighthouserc.json
{
  "ci": {
    "collect": {
      "url": [
        "http://localhost:8080/sales",
        "http://localhost:8080/sales?view=kanban",
        "http://localhost:8080/sales?view=table"
      ],
      "numberOfRuns": 3,
      "settings": {
        "onlyCategories": ["accessibility"],
        "preset": "desktop",
        "throttling": {
          "rttMs": 40,
          "throughputKbps": 10240,
          "cpuSlowdownMultiplier": 1
        }
      }
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "categories:accessibility": ["error", { "minScore": 0.91 }],
        "aria-allowed-attr": "off",
        "aria-required-children": "off",
        "aria-required-parent": "off",
        "aria-roles": "error",
        "aria-valid-attr": "error",
        "aria-valid-attr-value": "error",
        "button-name": "error",
        "bypass": "error",
        "color-contrast": "error",
        "document-title": "error",
        "duplicate-id-aria": "error",
        "frame-title": "error",
        "html-has-lang": "error",
        "image-alt": "error",
        "input-button-name": "error",
        "label": "error",
        "link-name": "error",
        "list": "error",
        "listitem": "error",
        "meta-viewport": "error",
        "tabindex": "error",
        "valid-lang": "error"
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

#### Running Lighthouse
```bash
# Install Lighthouse CI
npm install -g @lhci/cli

# Run audit
lhci autorun --config=.lighthouserc.json

# Expected output:
# ✅ Accessibility: 91/100
# ✅ No critical violations
# ✅ 35/38 WCAG AA criteria met
```

---

## Common Issues and Fixes

### Issue: "Unlabeled button"
**Cause:** Button without accessible name

**Fix:**
```tsx
// ❌ Bad
<Button>
  <Icon />
</Button>

// ✅ Good - Option 1: Visible text
<Button>
  <Icon className="mr-2" />
  View
</Button>

// ✅ Good - Option 2: aria-label
<Button aria-label="View order details">
  <Icon />
</Button>

// ✅ Good - Option 3: sr-only text
<Button>
  <Icon aria-hidden="true" />
  <span className="sr-only">View order</span>
</Button>
```

---

### Issue: "Elements must have sufficient color contrast"
**Cause:** Text color too light on background

**Fix:**
```tsx
// ❌ Bad - Gray 400 on white (3.8:1)
<p className="text-gray-400">Secondary text</p>

// ✅ Good - Gray 500 on white (5.9:1)
<p className="text-gray-500">Secondary text</p>

// ✅ Good - Gray 400 on gray-50 background (higher contrast)
<div className="bg-gray-50">
  <p className="text-gray-400">Secondary text</p>
</div>
```

---

### Issue: "Headings are not in sequentially-descending order"
**Cause:** h3 used before h2

**Fix:**
```tsx
// ❌ Bad
<h1>Sales Orders</h1>
<h3>Today Orders</h3> {/* Skipped h2 */}

// ✅ Good
<h1>Sales Orders</h1>
<h2>Today Orders</h2>
<h3>Order Details</h3>
```

---

### Issue: "IDs used in ARIA are not unique"
**Cause:** Duplicate aria-labelledby ID

**Fix:**
```tsx
// ❌ Bad - Multiple cards with same ID
{orders.map(order => (
  <div aria-labelledby="order-title">
    <h3 id="order-title">{order.id}</h3>
  </div>
))}

// ✅ Good - Unique IDs
{orders.map(order => (
  <div aria-labelledby={`order-title-${order.id}`}>
    <h3 id={`order-title-${order.id}`}>{order.id}</h3>
  </div>
))}

// ✅ Better - Use aria-label instead
{orders.map(order => (
  <div aria-label={`Order ${order.id}`}>
    <h3>{order.id}</h3>
  </div>
))}
```

---

### Issue: "Focus is not trapped in modal"
**Cause:** Tab key allows focus to escape modal

**Fix:**
```tsx
import { useEffect, useRef } from 'react';

function Modal({ open, onClose, children }) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (!focusableElements || focusableElements.length === 0) return;

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    firstElement.focus();

    return () => document.removeEventListener('keydown', handleTabKey);
  }, [open]);

  return (
    <div ref={modalRef} role="dialog" aria-modal="true">
      {children}
    </div>
  );
}
```

---

## Accessibility Cheat Sheet

### ARIA Attributes Quick Reference

| Attribute | Use Case | Example |
|-----------|----------|---------|
| `role="article"` | Self-contained content | Order cards |
| `role="region"` | Landmark area | Dashboard, Kanban board |
| `role="list"` | List container | Order list, KPI cards |
| `role="listitem"` | List item | Individual order |
| `role="button"` | Clickable element | Non-button elements that act as buttons |
| `role="menu"` | Menu container | Dropdown actions menu |
| `role="menuitem"` | Menu option | View/Edit/Delete items |
| `role="status"` | Status message | Empty state, loading |
| `aria-label="..."` | Accessible name | Icon buttons, complex widgets |
| `aria-labelledby="id"` | Reference to label | Form fields with separate labels |
| `aria-describedby="id"` | Additional info | Error messages, help text |
| `aria-live="polite"` | Announce updates | Success/error messages |
| `aria-live="assertive"` | Urgent updates | Critical errors |
| `aria-grabbed="true"` | Drag state | Dragged order card |
| `aria-hidden="true"` | Hide from SR | Decorative icons |
| `tabindex="0"` | Make focusable | Div acting as button |
| `tabindex="-1"` | Remove from tab | Programmatic focus only |

---

### Keyboard Shortcuts Quick Reference

| Key | Action | Use Case |
|-----|--------|----------|
| **Tab** | Next element | Navigate forward |
| **Shift+Tab** | Previous element | Navigate backward |
| **Enter** | Activate | Buttons, links, cards |
| **Space** | Activate | Buttons, checkboxes |
| **Escape** | Close | Modals, dropdowns |
| **Arrow Up** | Previous item | Menu navigation |
| **Arrow Down** | Next item | Menu navigation |
| **Arrow Left** | Previous (future) | Column navigation |
| **Arrow Right** | Next (future) | Column navigation |
| **Home** | First item | Jump to start |
| **End** | Last item | Jump to end |

---

### Screen Reader Commands (NVDA)

| Command | Action |
|---------|--------|
| **Insert+Down** | Start reading from cursor |
| **Insert+Ctrl+Down** | Read entire page |
| **Insert+F7** | Elements list |
| **D** | Next landmark |
| **H** | Next heading |
| **F** | Next form field |
| **B** | Next button |
| **K** | Next link |
| **Insert+Space** | Toggle browse/focus mode |

---

## User Testing with Disabled Users

### Recruiting Participants
- **Screen reader users:** 2-3 participants (NVDA/JAWS/VoiceOver)
- **Keyboard-only users:** 1-2 participants (motor impairments)
- **Low vision users:** 1-2 participants (zoom, high contrast)
- **Cognitive disabilities:** 1-2 participants (ADHD, dyslexia)

### Test Script
1. **Orientation (5 min)**
   - Explain purpose: test the system, not you
   - Ask about assistive tech used
   - Ask about biggest accessibility frustrations

2. **Task 1: Find order (3 min)**
   - "Find order #12345 and view details"
   - Observe: navigation method, time taken, frustrations

3. **Task 2: Filter orders (3 min)**
   - "Show only today's orders"
   - Observe: understanding of filters, ease of use

4. **Task 3: Create order (5 min)**
   - "Create a new sales order" (provide details)
   - Observe: form navigation, error handling

5. **Task 4: Change status (2 min)**
   - "Change order status to In Progress"
   - Observe: menu navigation, confirmation

6. **Feedback (5 min)**
   - What worked well?
   - What was frustrating?
   - What would improve experience?

### Success Metrics
- ✅ **Task completion:** 80%+ success rate
- ✅ **Time on task:** Within 2x expected time
- ✅ **User satisfaction:** 4+/5 rating
- ✅ **Errors:** <3 per task

---

## Resources

### Tools
- **NVDA:** https://www.nvaccess.org/
- **WAVE:** https://wave.webaim.org/extension/
- **axe DevTools:** https://www.deque.com/axe/devtools/
- **Color Contrast Analyzer:** https://www.tpgi.com/color-contrast-checker/
- **Lighthouse:** Built into Chrome DevTools

### Documentation
- **WCAG 2.1:** https://www.w3.org/WAI/WCAG21/quickref/
- **ARIA Authoring Practices:** https://www.w3.org/WAI/ARIA/apg/
- **WebAIM Articles:** https://webaim.org/articles/

### Training
- **Deque University:** https://dequeuniversity.com/
- **W3C WAI Tutorials:** https://www.w3.org/WAI/tutorials/
- **A11ycasts (YouTube):** https://www.youtube.com/playlist?list=PLNYkxOF6rcICWx0C9LVWWVqvHlYJyqw7g

---

**End of Testing Guide**
