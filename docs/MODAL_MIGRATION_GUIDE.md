# Modal Migration Guide

**Version:** Phase 2
**Date:** October 2025
**Status:** Active Migration Period (Ends: November 2025)

---

## ⚠️ Deprecation Notice

The following modal components are **deprecated** and will be removed in **Phase 3 (November 2025)**:

1. ❌ `EnhancedOrderDetailModal`
2. ❌ `OptimizedEnhancedOrderDetailModal`
3. ❌ `OrderDetailModal`

### ✅ Replacement Component

**Use:** `UnifiedOrderDetailModal`

---

## 🎯 Why Migrate?

### Problems with Legacy Modals

| Issue | Legacy Modals | UnifiedOrderDetailModal |
|-------|--------------|-------------------------|
| Type System | Multiple inconsistent interfaces | Single unified type (UnifiedOrderData) |
| Maintenance | 3 separate components | 1 component, easier to maintain |
| Type Safety | Loose typing, many `any` | Strict TypeScript, zero `any` |
| Performance | Varied optimization levels | Consistently optimized |
| Test Coverage | Limited or missing | Comprehensive test suite |
| Documentation | Scattered/outdated | Complete and up-to-date |
| Order Type Support | Separate components per type | All types in one component |

### Benefits of UnifiedOrderDetailModal

✅ **Single Source of Truth:** One component for all order types
✅ **Unified Type System:** Uses `UnifiedOrderData` from `@/types/unifiedOrder`
✅ **Better Performance:** Built-in optimizations and memoization
✅ **Active Maintenance:** Actively developed and tested
✅ **Comprehensive Tests:** Full test coverage for reliability
✅ **Consistent Behavior:** Same UX across all order types
✅ **Modern Stack:** Latest React patterns and TypeScript

---

## 🚀 Quick Migration

### Step 1: Update Import

**Before:**
```typescript
import { EnhancedOrderDetailModal } from '@/components/orders/EnhancedOrderDetailModal';
// or
import { OptimizedEnhancedOrderDetailModal } from '@/components/orders/OptimizedEnhancedOrderDetailModal';
// or
import { OrderDetailModal } from '@/components/orders/OrderDetailModal';
```

**After:**
```typescript
import { UnifiedOrderDetailModal } from '@/components/orders/UnifiedOrderDetailModal';
```

### Step 2: Update Component Usage

**Before (EnhancedOrderDetailModal):**
```typescript
<EnhancedOrderDetailModal
  order={order}
  open={isOpen}
  onClose={handleClose}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onStatusChange={handleStatusChange}
/>
```

**After (UnifiedOrderDetailModal):**
```typescript
<UnifiedOrderDetailModal
  orderType="sales" // ⚠️ NEW REQUIRED PROP
  order={order}
  open={isOpen}
  onClose={handleClose}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onStatusChange={handleStatusChange}
/>
```

**Key Difference:** The `orderType` prop is now **required**.

---

## 📋 Migration Examples

### Example 1: Sales Order Modal

**Before:**
```typescript
import { EnhancedOrderDetailModal } from '@/components/orders/EnhancedOrderDetailModal';

function SalesOrderList() {
  const [selectedOrder, setSelectedOrder] = useState(null);

  return (
    <>
      {/* ... order list ... */}
      <EnhancedOrderDetailModal
        order={selectedOrder}
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </>
  );
}
```

**After:**
```typescript
import { UnifiedOrderDetailModal } from '@/components/orders/UnifiedOrderDetailModal';

function SalesOrderList() {
  const [selectedOrder, setSelectedOrder] = useState(null);

  return (
    <>
      {/* ... order list ... */}
      <UnifiedOrderDetailModal
        orderType="sales" // Add this
        order={selectedOrder}
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </>
  );
}
```

### Example 2: Service Order Modal

**Before:**
```typescript
import { OrderDetailModal } from '@/components/orders/OrderDetailModal';

function ServiceDashboard() {
  return (
    <OrderDetailModal
      order={currentOrder}
      open={showModal}
      onClose={handleClose}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onStatusChange={handleStatusChange}
    />
  );
}
```

**After:**
```typescript
import { UnifiedOrderDetailModal } from '@/components/orders/UnifiedOrderDetailModal';

function ServiceDashboard() {
  return (
    <UnifiedOrderDetailModal
      orderType="service" // Add this
      order={currentOrder}
      open={showModal}
      onClose={handleClose}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onStatusChange={handleStatusChange}
    />
  );
}
```

### Example 3: Dynamic Order Type

**Scenario:** You have different order types in the same component

**After:**
```typescript
import { UnifiedOrderDetailModal } from '@/components/orders/UnifiedOrderDetailModal';

function OrderManager() {
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Determine order type from order data
  const orderType = selectedOrder?.order_type || 'sales';

  return (
    <UnifiedOrderDetailModal
      orderType={orderType as 'sales' | 'service' | 'recon' | 'carwash'}
      order={selectedOrder}
      open={!!selectedOrder}
      onClose={() => setSelectedOrder(null)}
    />
  );
}
```

---

## 🔧 Props Mapping

### EnhancedOrderDetailModal → UnifiedOrderDetailModal

| Legacy Prop | New Prop | Required | Notes |
|------------|----------|----------|-------|
| `order` | `order` | ✅ Yes | Type changed to `UnifiedOrderData` |
| `open` | `open` | ✅ Yes | No change |
| `onClose` | `onClose` | ✅ Yes | No change |
| `onEdit` | `onEdit` | ❌ No | No change |
| `onDelete` | `onDelete` | ❌ No | No change |
| `onStatusChange` | `onStatusChange` | ❌ No | No change |
| - | `orderType` | ✅ Yes | **NEW:** Must be 'sales', 'service', 'recon', or 'carwash' |

### OptimizedEnhancedOrderDetailModal → UnifiedOrderDetailModal

Same as above, plus:

| Legacy Prop | New Prop | Required | Notes |
|------------|----------|----------|-------|
| Performance monitoring built-in | - | - | Now automatically included |
| Error boundaries built-in | - | - | Now automatically included |

### OrderDetailModal → UnifiedOrderDetailModal

| Legacy Prop | New Prop | Required | Notes |
|------------|----------|----------|-------|
| `order` | `order` | ✅ Yes | Type changed from `Order` to `UnifiedOrderData` |
| `open` | `open` | ✅ Yes | No change |
| `onClose` | `onClose` | ✅ Yes | No change |
| - | `orderType` | ✅ Yes | **NEW:** Must specify type |

---

## 🔄 Type System Changes

### Before: Multiple Type Definitions

Each modal had its own type definition:

```typescript
// EnhancedOrderDetailModal
interface OrderData {
  id: string;
  order_number?: string;
  // ... different fields
}

// OptimizedEnhancedOrderDetailModal
interface OrderData {
  id: string;
  orderNumber?: string;
  // ... slightly different fields
}

// OrderDetailModal
interface Order {
  id: string;
  customOrderNumber?: string;
  // ... completely different fields
}
```

### After: Single Unified Type

```typescript
// All modals use the same type
import { UnifiedOrderData } from '@/types/unifiedOrder';

interface Props {
  order: UnifiedOrderData;
  // ...
}
```

**Benefits:**
- ✅ Consistent field names across app
- ✅ Supports both snake_case (DB) and camelCase (frontend)
- ✅ Better TypeScript IntelliSense
- ✅ Type-safe helper functions included

---

## ⚙️ Advanced Migration Scenarios

### Scenario 1: Custom Fields

**Problem:** Your legacy modal accessed custom fields

**Solution:** UnifiedOrderData includes index signature for extensibility

```typescript
// Works automatically
order.custom_field // ✅ OK
order.anyOtherField // ✅ OK

// Type-safe for known fields
order.customer_name // ✅ Fully typed
order.vehicle_info // ✅ Fully typed
```

### Scenario 2: Data Transformation

**Problem:** You transformed data before passing to modal

**Solution:** Use helper functions from unifiedOrder.ts

```typescript
import {
  normalizeOrderData,
  getOrderNumber,
  getCustomerName
} from '@/types/unifiedOrder';

// Normalize raw data
const normalizedOrder = normalizeOrderData(rawOrderData);

// Use helper functions
const orderNumber = getOrderNumber(order);
const customerName = getCustomerName(order);
```

### Scenario 3: Performance-Critical Code

**Problem:** You used OptimizedEnhancedOrderDetailModal for performance

**Solution:** UnifiedOrderDetailModal includes all optimizations

```typescript
// Includes:
// ✅ Component memoization
// ✅ useMemo for expensive computations
// ✅ useCallback for event handlers
// ✅ Lazy loading of heavy components
// ✅ Code splitting ready
```

---

## 🧪 Testing After Migration

### Unit Tests

Update your test imports:

```typescript
// Before
import { EnhancedOrderDetailModal } from '@/components/orders/EnhancedOrderDetailModal';

// After
import { UnifiedOrderDetailModal } from '@/components/orders/UnifiedOrderDetailModal';
```

Update test data:

```typescript
const mockOrder: UnifiedOrderData = {
  id: '123',
  dealer_id: 1, // ⚠️ Must be number
  status: 'pending',
  order_number: 'ORD-001',
  customer_name: 'John Doe',
  // ...
};
```

### Integration Tests

Add `orderType` prop:

```typescript
render(
  <UnifiedOrderDetailModal
    orderType="sales" // Don't forget this
    order={mockOrder}
    open={true}
    onClose={vi.fn()}
  />
);
```

---

## 🐛 Common Migration Issues

### Issue 1: Missing orderType prop

**Error:**
```
Property 'orderType' is missing in type '{ order: ...; open: ...; }'
```

**Solution:**
```typescript
<UnifiedOrderDetailModal
  orderType="sales" // Add this
  order={order}
  open={open}
  onClose={onClose}
/>
```

### Issue 2: dealer_id type mismatch

**Error:**
```
Type 'string' is not assignable to type 'number'
```

**Solution:**
```typescript
// Convert dealer_id to number
const normalizedOrder = {
  ...order,
  dealer_id: Number(order.dealer_id)
};
```

### Issue 3: Undefined order fields

**Error:**
```
Property 'customOrderNumber' does not exist on type 'UnifiedOrderData'
```

**Solution:**
```typescript
// Use snake_case or camelCase (both supported)
order.custom_order_number // ✅ Preferred (DB format)
order.customOrderNumber   // ✅ Also works (frontend format)

// Or use helper function
import { getOrderNumber } from '@/types/unifiedOrder';
const orderNumber = getOrderNumber(order); // ✅ Best
```

---

## 📅 Migration Timeline

### Phase 2 (October 2025) - Current

- ✅ UnifiedOrderDetailModal ready for production
- ✅ All main pages already migrated
- ⚠️ Legacy modals deprecated with warnings
- 📝 Migration guide available (this document)

### Transition Period (October - November 2025)

- 🔄 Teams should migrate remaining usage
- 🔍 Code reviews check for legacy modal usage
- ⚠️ Development warnings active
- 📊 Monitor for any issues

### Phase 3 (November 2025)

- ❌ Legacy modals will be removed
- 🗑️ Deprecated files deleted from codebase
- ✅ Only UnifiedOrderDetailModal remains

---

## 📊 Migration Checklist

Use this checklist to track your migration progress:

### Component Updates

- [ ] Identify all files importing legacy modals
- [ ] Update imports to UnifiedOrderDetailModal
- [ ] Add required `orderType` prop
- [ ] Test component renders correctly
- [ ] Verify all functionality works
- [ ] Update related tests

### Type Updates

- [ ] Update order type definitions to use UnifiedOrderData
- [ ] Convert dealer_id to number where needed
- [ ] Update field access (vehicle_info not vehicleInfo)
- [ ] Use helper functions where appropriate

### Testing

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing in development
- [ ] Staging environment validation
- [ ] Production smoke tests

### Documentation

- [ ] Update component documentation
- [ ] Update code comments
- [ ] Update team wiki/docs
- [ ] Notify team members

---

## 🆘 Need Help?

### Resources

1. **Type Definitions:** `src/types/unifiedOrder.ts`
2. **Example Usage:** `src/pages/SalesOrders.tsx`
3. **Tests:** `src/tests/unit/UnifiedOrderDetailModal.test.tsx`
4. **Phase 1 Docs:** `docs/PHASE_1_STABILIZATION_COMPLETE.md`
5. **Phase 2 Docs:** `docs/PHASE_2_DAY_1_COMPLETE.md`

### Support Channels

- **Issues:** Report problems with migration
- **Questions:** Ask in team chat
- **PR Reviews:** Get help with migration PRs

### Example Migrations

Check these files for real examples:
- `src/pages/SalesOrders.tsx` ✅ Already migrated
- `src/pages/ServiceOrders.tsx` ✅ Already migrated
- `src/pages/ReconOrders.tsx` ✅ Already migrated
- `src/pages/CarWash.tsx` ✅ Already migrated

---

## 🎉 Migration Benefits Summary

After migration, you'll have:

✅ **Type Safety:** Strict TypeScript with UnifiedOrderData
✅ **Consistency:** Same behavior across all order types
✅ **Maintainability:** Single component to update
✅ **Performance:** Built-in optimizations
✅ **Testing:** Comprehensive test coverage
✅ **Documentation:** Clear, up-to-date docs
✅ **Support:** Active development and maintenance

---

**Last Updated:** October 2025
**Migration Deadline:** November 2025
**Status:** Active Migration Period

*For questions or issues, contact the development team.*
