# Copilot Instructions - My Detail Area

## Project Overview

**My Detail Area** is an enterprise dealership management system built with React 18 + TypeScript + Supabase. Multi-tenant SaaS architecture with dealership-scoped data, role-based permissions, and real-time collaboration features.

**Core Stack:** React 18, TypeScript, Vite, Supabase (PostgreSQL + Auth + Edge Functions), TanStack Query, shadcn/ui, Tailwind CSS, i18next (EN/ES/PT-BR)

## Critical Development Rules

### 🔒 Port Configuration (MANDATORY)
Development server **MUST** use port 8080 exclusively:
```bash
npm run dev  # Runs on http://localhost:8080 with strictPort: true
```
If port conflict occurs, kill the conflicting process. Never change port in `vite.config.ts`.

### 🌍 Translation System (100% COVERAGE REQUIRED)
**ALL user-facing text must use translations.** Zero tolerance for hardcoded strings.

```typescript
// ✅ CORRECT
const { t } = useTranslation();
<Button>{t('orders.create_new')}</Button>

// ❌ WRONG - This is a bug
<Button>Create New Order</Button>
```

**Translation files:** `public/translations/{en,es,pt-BR}.json`
**Namespace structure:** `module.feature.action` (e.g., `orders.sales.create_button`)
**Verify coverage:** `node scripts/audit-translations.cjs` before major commits

### 🚫 TypeScript Standards (STRICT)
- **NEVER use `any` type** - Use proper interfaces, union types, or `unknown` with type guards
- **Type all function parameters and returns** - No implicit types
- **Create interfaces for all data structures** - Especially Supabase responses
- **Use type guards for runtime validation** - `typeof`, `in`, custom guards

```typescript
// ✅ CORRECT
interface OrderResponse {
  id: number;
  status: OrderStatus;
  dealer_id: number;
}

// ❌ WRONG
function processOrder(order: any) { ... }
```

## Architecture Essentials

### Supabase Integration Pattern
```typescript
// Standard data fetching with RLS
const { data, error } = await supabase
  .from('orders')
  .select('*, dealerships(name)')
  .eq('dealer_id', dealershipId)
  .order('created_at', { ascending: false });

if (error) throw error;
```

**Critical concept:** Row Level Security (RLS) policies enforce dealership isolation. All tables use `dealer_id` for scoping. RLS policies auto-filter data - never manually filter by dealer_id in app code.

### Permission System Architecture
Four-tier role hierarchy: `system_admin` > `dealer_admin` > `dealer_manager` > `dealer_user`

```typescript
// Component-level permission guards
<PermissionGuard module="contacts" permission="write">
  <Button>{t('contacts.add_new')}</Button>
</PermissionGuard>

// Hook-based permission checks
const { hasPermission } = usePermissions();
const canEdit = hasPermission('sales_orders', 'write');
```

**Modules:** `dashboard`, `sales_orders`, `service_orders`, `recon_orders`, `car_wash`, `stock`, `get_ready`, `chat`, `reports`, `settings`, `dealerships`, `users`, `management`, `productivity`, `contacts`

**Permission levels:** `read`, `write`, `delete`, `admin`

### State Management Layers
1. **Global Context:** `AuthContext` (user/session), `PermissionContext` (RBAC), `DealershipContext` (active dealer)
2. **TanStack Query:** Server state with optimistic updates, stale-while-revalidate caching
3. **localStorage Persistence:** Tab memory, view preferences, search history (1hr expiration)

```typescript
// Tab persistence pattern (maintains user state across refreshes)
import { useTabPersistence } from '@/hooks/useTabPersistence';
const [activeTab, setActiveTab] = useTabPersistence('orders');
```

### Modal Design System (Enterprise Pattern)
**Current standard:** `UnifiedOrderDetailModal` - full-screen modal for all order types (sales/service/recon/carwash)

```typescript
import { UnifiedOrderDetailModal } from '@/components/orders/UnifiedOrderDetailModal';
import { UnifiedOrderData, getOrderNumber } from '@/types/unifiedOrder';

<UnifiedOrderDetailModal
  orderType="sales"
  order={order as UnifiedOrderData}
  open={isOpen}
  onClose={handleClose}
/>
```

**Key file:** `src/types/unifiedOrder.ts` - Master type with helper functions (`getOrderNumber`, `getCustomerName`, `getVehicleDisplayName`)

**DO NOT** create new modals matching this pattern - use `UnifiedOrderDetailModal` instead.

### Supabase Edge Functions
Located in `supabase/functions/`, written in Deno (TypeScript). Key functions:
- `decode-vin` - VIN decoding via third-party API
- `generate-qr-shortlink` - mda.to short links (ABC12 format)
- `send-notification` / `send-sms` / `send-email` - Multi-channel notifications
- `push-notification-sender` - FCM push notifications
- `generate-excel-report` - Server-side report generation

**Edge function secrets:** Managed via `supabase secrets set KEY=value`, accessed via `Deno.env.get('KEY')`

## Component Creation Workflow

1. **Check translations exist first** - Add to all 3 language files before coding
2. **Use shadcn/ui primitives** - Located in `src/components/ui/`
3. **Apply permission guards** - Wrap sensitive UI in `<PermissionGuard>`
4. **Use custom hooks for data** - Located in `src/hooks/`
5. **Memoize expensive operations** - Use `useMemo`, `useCallback` liberally

### Standard Component Template
```typescript
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { useMyFeature } from '@/hooks/useMyFeature';

export function MyComponent() {
  const { t } = useTranslation();
  const { data, isLoading } = useMyFeature();

  return (
    <PermissionGuard module="my_module" permission="read">
      <Card className="card-enhanced">
        <CardHeader>
          <CardTitle>{t('my_module.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Content */}
        </CardContent>
      </Card>
    </PermissionGuard>
  );
}
```

## Design System Rules

**Notion-inspired flat design** - NO gradients, NO bright colors, NO heavy shadows.

**Approved colors:**
- Gray scale: `gray-50` (backgrounds), `gray-200` (borders), `gray-700` (text), `gray-900` (headings)
- Accents: `emerald-500` (success), `amber-500` (warning), `red-500` (error), `indigo-500` (info - muted only)

**Forbidden patterns:**
- ❌ `linear-gradient()`, `radial-gradient()`, `conic-gradient()`
- ❌ Bright blues (`blue-600+`, `#0066cc`, `#0099ff`)
- ❌ Saturated primary colors

**Card styling:** Use `.card-enhanced` class for consistent elevation.

## Testing & Quality

```bash
npm test                    # Vitest unit tests
npm run test:coverage       # Coverage report
npm run test:e2e            # Playwright E2E tests
npm run lint                # ESLint checks
node scripts/audit-translations.cjs  # Translation coverage
```

**Test file locations:**
- Unit: `src/tests/unit/**/*.test.{ts,tsx}`
- Integration: `src/tests/integration/**/*.test.{ts,tsx}`
- E2E: `tests/**/*.spec.ts`

**Always test:**
- Translation keys exist (no missing keys)
- Permission guards work correctly
- RLS policies enforced (use different user roles)

## Common Patterns & Gotchas

### Dealership Context (Multi-tenant)
All queries must respect current dealership context:

```typescript
import { useDealershipContext } from '@/contexts/DealershipContext';

const { currentDealership } = useDealershipContext();
const dealerId = currentDealership?.id;

// Use dealerId in queries - RLS policies will enforce access
```

### VIN Scanner Integration
Camera-based VIN scanning with Tesseract.js OCR:

```typescript
import { useVinScanner } from '@/hooks/useVinScanner';

const { scanVin, isScanning } = useVinScanner({
  onSuccess: (vin) => {
    // Auto-populate vehicle fields via decode-vin edge function
  }
});
```

### QR Code Generation (mda.to)
Orders auto-generate short links for tracking:

```typescript
// Automatically handled by order creation
// Format: https://mda.to/{5-digit-slug}
// Analytics tracked via track-qr-click edge function
```

### localStorage Patterns
All localStorage operations use debounced writes (50ms):

```typescript
import { setStorageItem, getStorageItem } from '@/utils/localStorageOptimized';

// Auto-debounced, error-safe
setStorageItem('key', value);
const value = getStorageItem('key', defaultValue);
```

## Migration & Database

**Migration location:** `supabase/migrations/`
**Naming:** `{timestamp}_{description}.sql`

**Key concepts:**
- All tables must have RLS enabled: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`
- Use helper functions: `user_has_dealer_membership(auth.uid(), dealer_id)`, `is_admin()`
- Index on `dealer_id` for performance: `CREATE INDEX idx_table_dealer ON table_name(dealer_id);`

**Common RLS pattern:**
```sql
CREATE POLICY "Users can view dealership data" ON table_name
  FOR SELECT USING (
    user_has_dealer_membership(auth.uid(), dealer_id)
  );
```

## Build & Deploy

```bash
npm run build              # Production build (Vite)
npm run build:dev          # Development build
npm run preview            # Preview production build
npm run version:generate   # Generate version.json
```

**Build artifacts:** `dist/` folder, deployed to Lovable/Railway
**Environment variables:** `.env` (local), Supabase Dashboard (edge functions)

**Critical env vars:**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Public anon key
- `VITE_FIREBASE_MESSAGING_SENDER_ID` - FCM push notifications (242154179799)

## Key Files Reference

- `src/contexts/AuthContext.tsx` - User authentication, session management
- `src/contexts/PermissionContext.tsx` - RBAC permission checks
- `src/hooks/usePermissions.tsx` - Permission checking hook
- `src/types/unifiedOrder.ts` - Master order type definitions
- `src/integrations/supabase/client.ts` - Supabase client configuration
- `public/translations/{en,es,pt-BR}.json` - All UI translations
- `vite.config.ts` - Vite configuration, PWA setup, port 8080
- `supabase/migrations/` - Database schema evolution

## Documentation Resources

- `CLAUDE.md` - Comprehensive AI agent guide (more detailed than this file)
- `README.md` - Project setup, modal system documentation
- `docs/MODAL_SYSTEM_GUIDE.md` - Complete modal architecture
- `docs/SECURITY_RLS_REVIEW.md` - RLS policy documentation
- `PERMISSIONS_SYSTEM_COMPLETE.md` - Permission system architecture

---

**When in doubt:** Check `CLAUDE.md` for extended guidance, search codebase for similar patterns, or verify translation coverage before committing.
