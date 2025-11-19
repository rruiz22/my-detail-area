# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 📑 Table of Contents

1. [🔒 Puerto 8080 - Configuración Crítica](#-puerto-8080---configuración-crítica)
2. [⚡ Performance Optimization](#-performance-optimization)
3. [Essential Development Commands](#essential-development-commands)
4. [Project Architecture](#project-architecture)
5. [🌐 Translation System](#-translation-system)
6. [Critical Development Standards](#critical-development-standards)
7. [Component Patterns](#component-patterns)
8. [Specialized Features](#specialized-features)
9. [Security & Performance](#security--performance)
10. [🔌 MCP Configuration](#-mcp-configuration)
11. [🤖 Specialized Agents](#-specialized-agents)
12. [💾 Cache Configuration](#-cache-configuration)

---

## 🔒 Puerto 8080 - Configuración Crítica

**IMPORTANTE**: Este proyecto DEBE usar ÚNICAMENTE el puerto 8080 para desarrollo.

- **Configuración Vite**: `strictPort: true` - No permite otros puertos
- **Resolución de Conflictos**: Si el puerto 8080 está ocupado, se debe liberar antes de iniciar
- **Comando verificación**: `netstat -ano | findstr :8080` (Windows)
- **Comando liberación**: Identificar y terminar el proceso que usa el puerto
- **URL de desarrollo**: http://localhost:8080 (FIJO - no cambia)

Esta configuración asegura consistencia en el desarrollo y evita conflictos de puerto entre sesiones.

---

## ⚡ Performance Optimization

### **CRITICAL: Maximum Velocity Guidelines**

**Root Causes of Slow Performance**:
1. ❌ Sequential tool execution - Running tools one at a time instead of in parallel
2. ❌ No agent delegation - Not using specialized agents proactively
3. ❌ Excessive verbosity - Too much explanation before action
4. ❌ Manual searches - Not using Task tool with "Explore" agent for codebase exploration

### **Mandatory Speed Optimizations**

#### 1. Parallel Tool Execution (ALWAYS)
```typescript
// ❌ WRONG - Sequential (slow)
1. Read file A → Wait → Read file B → Wait → Search pattern C

// ✅ CORRECT - Parallel (fast)
Read(file A) + Read(file B) + Grep(pattern C)
```

#### 2. Proactive Agent Delegation
```typescript
// ✅ CORRECT - Immediate agent launch
User: "Optimize the dashboard performance"
Assistant: *Launches performance-optimizer agent immediately*

// ✅ CORRECT - Multiple agents in parallel
Task("Design analytics schema", "database-expert")
Task("Create dashboard UI", "react-architect")
Task("Implement visualizations", "analytics-implementer")
```

#### 3. Action First, Explanation After
```typescript
// ❌ WRONG - Verbose
"I'm going to read the button component to understand its structure..."
*Finally executes Read tool*

// ✅ CORRECT - Immediate action
*Executes Read tool immediately*
"Button component uses Radix UI primitives. Here's the optimization..."
```

#### 4. Use Explore Agent for Codebase Searches
```typescript
// ❌ WRONG - Manual search
Assistant: *Uses Grep manually for 'error', then 'catch', then 'throw'...*

// ✅ CORRECT - Delegate to Explore agent
Assistant: Task("Find error handling patterns", "Explore", thoroughness: "medium")
```

### **Performance Checklist**

Before every response, verify:
- [ ] **Can I run tools in parallel?** → Launch all independent tools together
- [ ] **Should I delegate this?** → Use specialized agent if applicable
- [ ] **Am I over-explaining?** → Execute first, explain after
- [ ] **Is this exploratory?** → Use Explore agent instead of manual search

### **Speed Metrics**

**Velocity multipliers:**
- Parallel tool execution: **3-5x faster**
- Agent delegation: **2-4x faster**
- Action-first approach: **2x faster**
- Explore agent: **5-10x faster** for search tasks

---

## Essential Development Commands

```bash
# Development
npm run dev              # Start development server (localhost:8080 - STRICT PORT)
npm run build           # Production build
npm run build:dev       # Development build
npm run lint            # ESLint code quality check
npm run preview         # Preview production build

# Translation Audit System
node scripts/audit-translations.cjs  # Comprehensive translation coverage analysis
```

---

## Project Architecture

### Core Technology Stack
- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: shadcn/ui + Radix UI primitives
- **Styling**: Tailwind CSS with custom design system + CSS variables
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions + Real-time)
- **State Management**: TanStack Query + React Context + localStorage persistence
- **Internationalization**: react-i18next (EN, ES, PT-BR)
- **Testing**: Vitest + Testing Library + Playwright E2E

### Business Domain - Dealership Management System

**Core Modules:**
- **Sales Orders** - Vehicle sales with VIN decoding + QR generation
- **Service Orders** - Service department workflow management
- **Recon Orders** - Vehicle reconditioning process tracking
- **Car Wash** - Quick service order management
- **Contacts** - Customer/dealer contact management with vCard QR
- **User Management** - Role-based access control + invitation system
- **Reports** - Business intelligence with export functionality
- **Chat** - Real-time team communication
- **Dealerships** - Multi-dealership management
- **Management** - Administrative oversight + Theme Studio

### Critical Architecture Patterns

#### **Permission System (Enterprise-Grade)**
```typescript
// Role hierarchy: system_admin > dealer_admin > dealer_manager > dealer_user
// Module-based permissions: 'dashboard' | 'sales_orders' | 'contacts' etc.
// Permission levels: 'read' | 'write' | 'delete' | 'admin'

<PermissionGuard module="contacts" permission="write">
  <Button>Add Contact</Button>
</PermissionGuard>
```

#### **Data Flow Architecture**
```
User Action → Component → Custom Hook → Supabase → Real-time Update → UI Refresh
```

#### **Component Structure (Modular)**
```
src/
├── components/
│   ├── ui/              # shadcn/ui base components
│   ├── orders/          # Order management (Sales, Service, Recon, CarWash)
│   ├── users/           # User management + Direct creation
│   ├── contacts/        # Contact management + vCard QR
│   ├── dealer/          # Dealership-specific components
│   ├── reports/         # Business intelligence + export
│   ├── theme/           # Theme Studio customization
│   └── permissions/     # Role-based access guards
├── hooks/               # Business logic + data fetching
├── contexts/           # Global state (Auth, Permissions)
├── services/           # External integrations (vCard, shortLink, mda.to)
└── utils/              # Helpers (localStorage, validation, formatting)
```

### Supabase Integration Patterns

#### **Database Architecture**
- **Row Level Security (RLS)** - Dealership-scoped data access
- **Edge Functions** - VIN decoding, QR generation, SMS/Email, mda.to integration
- **Real-time subscriptions** - Live updates for collaborative features
- **File storage** - Order attachments + document management

#### **Key Tables & Relationships**
```sql
profiles (users) → dealer_memberships → dealerships
dealership_contacts → dealerships (contact management)
orders (sales/service/recon/carwash) → dealerships (order management)
dealer_groups → dealer_memberships (permission groups)
```

### State Management Architecture

#### **Persistence Layers**
1. **Global State**: AuthContext, PermissionContext
2. **Feature State**: Custom hooks (useOrderManagement, useVinScanner)
3. **UI State**: Local component state for interactions
4. **Persistent State**: localStorage for user preferences + tab memory

#### **localStorage System (Advanced)**
```typescript
// Tab persistence across page refreshes
const [activeTab, setActiveTab] = useTabPersistence('sales_orders');
const [viewMode, setViewMode] = useViewModePersistence('sales_orders'); // kanban | table

// Auto-restores user's last active tab/view on page refresh
```

---

## 🌐 Translation System

### **Overview**

MyDetailArea uses **code splitting for translations** to optimize load times. Translations are divided into **80 namespaces** (~3-40KB each) instead of one monolithic file (500KB).

**Performance improvement**: 5-6x faster initial load (10-15s → 2-3s on 3G)

### **Critical Rules**

**⚠️ MANDATORY**: ALL user-facing text MUST use translations:
- Component titles and labels
- Button text and placeholders
- Error messages and tooltips
- Form validation messages
- Modal headers and descriptions
- Toast notifications and alerts

**Status**: ✅ English (complete), ✅ Portuguese (complete), ⚠️ Spanish (partial - auto-fallback to English enabled)

### **Architecture**

**Hybrid Approach**: All namespaces are preloaded on init for zero-config component compatibility.

```
public/translations/
├── en/                           # English (80 files, ~256KB total)
│   ├── common.json              # Shared elements (3.8KB)
│   ├── navigation.json          # Navigation menus (1.1KB)
│   ├── dashboard.json           # Dashboard (5.5KB)
│   ├── orders.json              # Orders general (3.2KB)
│   ├── sales_orders.json        # Sales orders (2.8KB)
│   ├── contacts.json            # Contacts (3.4KB)
│   ├── reports.json             # Reports (12.6KB)
│   ├── get_ready.json           # Get Ready module (44KB - largest)
│   └── ... (72 more namespaces)
├── pt-BR/                        # Portuguese (76 files, ~260KB total)
│   └── ... (same structure)
└── _backup_monolithic/           # Original 500KB files (backup)
```

**Configuration** (`src/lib/i18n.ts`):
```typescript
nsSeparator: '.'        // Enables t('namespace.key')
keySeparator: false     // Allows dots in keys
ns: ALL_NAMESPACES      // Preloads all 80 namespaces
defaultNS: 'common'     // Fallback namespace
```

### **Usage Pattern**

```typescript
// ✅ CORRECT - With namespace.key notation
import { useTranslation } from 'react-i18next';

export function ComponentName() {
  const { t } = useTranslation(); // No namespace needed!

  return (
    <div>
      <h1>{t('reports.title')}</h1>
      <Button>{t('reports.export_pdf_button')}</Button>
      {/* ↑ Notation: namespace.key */}
    </div>
  );
}

// ❌ WRONG - Hardcoded text
<Button>Export to PDF</Button>
```

### **Adding New Translations - Quick Guide**

#### 1. Identify Correct Namespace

| Feature | Namespace | File |
|---------|-----------|------|
| Dashboard widgets | `dashboard` | `dashboard.json` |
| Sales orders | `sales_orders` | `sales_orders.json` |
| Contacts CRM | `contacts` | `contacts.json` |
| Reports/BI | `reports` | `reports.json` |
| Admin panel | `admin` | `admin.json` |
| Shared elements | `common` | `common.json` |

**Complete list**: Run `ls public/translations/en/` (80 namespaces)

#### 2. Add Key to All 3 Languages

**English** (`public/translations/en/reports.json`):
```json
{
  "title": "Reports",
  "export_pdf_button": "Export to PDF"
}
```

**Spanish** (`public/translations/es/reports.json`):
```json
{
  "title": "Reportes",
  "export_pdf_button": "Exportar a PDF"
}
```

**Portuguese** (`public/translations/pt-BR/reports.json`):
```json
{
  "title": "Relatórios",
  "export_pdf_button": "Exportar para PDF"
}
```

#### 3. Naming Conventions

```javascript
✅ GOOD:
t('orders.create_new_order')
t('contacts.import_csv_button')
t('dashboard.total_orders_label')
t('validation.vin_required_error')

❌ BAD:
t('orders.btn1')
t('contacts.text')
t('dashboard.label')
```

### **Validation Scripts**

```bash
# Translation coverage audit
npm run translation:audit

# Fix missing translations
npm run translation:fix

# Coverage report (runs in pre-commit hook)
npm run translation:coverage
```

---

## Critical Development Standards

### **TypeScript Best Practices (Mandatory)**
- **NEVER use `any` types** - Always define proper interfaces and union types
- **Type safety first** - Use strict TypeScript configuration
- **Proper error handling** - Type errors at compile time, not runtime
- **Interface definitions** - Create specific types for all data structures
- **Union types** - Use `string | Interface` instead of `any`
- **Generic constraints** - Prefer `<T extends SomeType>` over `<T = any>`
- **Type guards** - Use `typeof` and `in` operators for type narrowing

### **Translation Coverage (Mandatory)**
- **Run audit**: `node scripts/audit-translations.cjs` before major changes
- **100% coverage required** - No hardcoded user-facing text
- **3 language support** - English (base), Spanish, Portuguese (Brazilian)
- **Namespace structure** - Group by feature/component

---

## Component Patterns

### **Component Creation Pattern**
```tsx
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';

export function ComponentName() {
  const { t } = useTranslation();

  return (
    <PermissionGuard module="feature" permission="read">
      <Card className="card-enhanced"> {/* Enhanced shadows */}
        <CardHeader>
          <CardTitle>{t('feature.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Content with translations */}
        </CardContent>
      </Card>
    </PermissionGuard>
  );
}
```

### **Modal Design Pattern (Full-Screen Enterprise)**
```tsx
// Order detail modals use full-screen layout matching CI4/PHP design
<DialogContent className="max-w-none w-screen h-screen">
  <header>Order info + Quick actions</header>
  <div className="grid lg:grid-cols-[2fr,1fr]">
    <main>Vehicle Info + Schedule + Communication Hub</main>
    <aside>QR Code + Followers + Activities</aside>
  </div>
  <footer>Close button</footer>
</DialogContent>
```

### **Form Validation Patterns**
```typescript
// Standard validation with translations
const errors = {
  email: !email ? t('validation.email_required') : null,
  vin: vin.length !== 17 ? t('validation.vin_invalid_length') : null
};
```

### **Supabase Error Handling**
```typescript
try {
  const { data, error } = await supabase.from('table').select();
  if (error) throw error;
} catch (error) {
  console.error('Operation failed:', error);
  toast.error(t('messages.error'));
}
```

---

## Specialized Features

### **VIN Processing System**
- **Camera scanning** - Tesseract.js OCR with enhanced error handling
- **VIN validation** - 17-character validation + decode via Edge Function
- **Auto-population** - Vehicle year/make/model from successful decode

### **QR Code Integration (mda.to)**
- **Auto-generation** - Short links created on order creation
- **5-digit slugs** - Random alphanumeric (ABC12, XYZ89)
- **Analytics tracking** - Scan counts, unique visitors
- **vCard QR** - Contact sharing with device auto-import

### **Theme Customization System**
- **Location**: Management → Theme Studio
- **Capabilities**: Colors, shadows, typography, Notion presets
- **Persistence**: localStorage with CSS variable injection
- **Live preview** - Real-time theme changes

---

## Security & Performance

### **Mobile & Responsive Design**

**Breakpoint Strategy**:
- **Mobile-first design** - Base styles for mobile
- **Breakpoints**: sm(640px), md(768px), lg(1024px), xl(1280px)
- **Grid patterns**: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- **Full-screen modals** - Enterprise desktop experience

**Component Responsiveness**:
- **Text sizing**: `text-sm sm:text-base`
- **Icon visibility**: `hidden sm:inline-flex`
- **Padding adaptation**: `p-2 sm:p-4 lg:p-6`

### **Role-Based Access Control**
- **Supabase Auth** - Email/password + profile creation
- **Admin setup** - `rruiz@lima.llc` configured as system admin
- **Permission inheritance** - Dealership-scoped data access
- **Module permissions** - Granular feature access (contacts.view, contacts.write, etc.)

### **localStorage Optimization**
- **Debounced writes** - 50ms async saves for UI responsiveness
- **Tab persistence** - Users return to exact same state on refresh
- **Search persistence** - Search terms saved with 1-hour expiration
- **Error recovery** - Graceful degradation if storage fails

### **Real-time Features**
- **Order status updates** - Live status changes across users
- **Chat system** - Real-time messaging with file attachments
- **Presence indicators** - User activity tracking

---

## 🔌 MCP Configuration

### **Primary MCP Server**

#### **Supabase MCP Server** ⭐ ALWAYS USE FOR DATABASE OPERATIONS

**Capabilities:**
- Direct database query execution via `execute_sql`
- Table schema inspection via `list_tables`
- Migration management via `apply_migration`, `list_migrations`
- TypeScript type generation via `generate_typescript_types`
- Edge Function deployment via `deploy_edge_function`, `list_edge_functions`, `get_edge_function`
- Real-time logs access via `get_logs`
- Connection to project: `swfnnrpzpkdypbrzmgnr`

**Usage patterns:**
```typescript
mcp__supabase__execute_sql("SELECT * FROM profiles WHERE id = 'xxx'")
mcp__supabase__list_tables()
mcp__supabase__apply_migration("path/to/migration.sql")
mcp__supabase__generate_typescript_types()
```

### **Secondary MCP Servers** (Use when needed)

| Server | Use Case |
|--------|----------|
| **github** | Git operations, PR management, issue tracking |
| **memory** | Session context persistence |
| **railway** | Deployment operations |

### **Best Practices**

1. **Always prefer Supabase MCP** for database operations over native SQL tools
2. **Use MCP tools** when they provide better abstraction (migrations, type generation)
3. **Avoid redundancy** - Don't use multiple MCP servers for the same task
4. **MCP tool naming** - All MCP tools are prefixed with `mcp__<server>__<tool>`

---

## 🤖 Specialized Agents

### **Agent Categories**

**Frontend Agents (4)**:
- `react-architect` - React/TypeScript architecture specialist
- `ui-designer` - UI/UX implementation with Notion design system
- `state-manager` - State management (TanStack Query, Context API)
- `performance-optimizer` - Frontend performance and Core Web Vitals

**Backend Agents (4)**:
- `api-architect` - REST/GraphQL API design and Supabase integration
- `database-expert` - Database design, optimization, and migrations
- `auth-security` - Authentication, authorization, and security
- `edge-functions` - Supabase Edge Functions and serverless

**Quality Assurance Agents (3)**:
- `test-engineer` - Comprehensive testing (Vitest, Testing Library, Playwright)
- `code-reviewer` - Code review with design system validation
- `accessibility-auditor` - Web accessibility and WCAG 2.1 AA compliance

**DevOps Agents (3)**:
- `deployment-engineer` - CI/CD pipelines and deployment automation
- `monitoring-specialist` - Application monitoring and performance tracking
- `infrastructure-provisioner` - Infrastructure as Code and cloud provisioning

**Domain-Specific Agents (3)**:
- `dealership-expert` - Automotive dealership business logic
- `i18n-specialist` - Multi-language internationalization (EN/ES/PT-BR)
- `analytics-implementer` - Business intelligence and analytics tracking

### **Workflow Recommendations**

#### For New Features
1. **dealership-expert** → Business requirements
2. **react-architect** → Component architecture
3. **ui-designer** → Notion-compliant UI implementation
4. **test-engineer** → Comprehensive test coverage
5. **code-reviewer** → Quality assurance
6. **deployment-engineer** → Production deployment

#### For Bug Fixes
1. **code-reviewer** → Root cause analysis
2. **react-architect** or **api-architect** → Targeted fix
3. **test-engineer** → Regression testing
4. **accessibility-auditor** → Accessibility impact check (if UI-related)

#### For Performance Optimization
1. **performance-optimizer** → Bottleneck identification
2. **react-architect** → Architecture optimization
3. **database-expert** → Query and schema optimization
4. **monitoring-specialist** → Performance monitoring setup

### **Design System Enforcement (Automated)**

**Forbidden Patterns** (all frontend agents enforce):
- ❌ **NO GRADIENTS**: `linear-gradient()`, `radial-gradient()`, `conic-gradient()`
- ❌ **NO STRONG BLUES**: `#0066cc`, `#0099ff`, `#3366ff`, `blue-600+` variants
- ❌ **NO BRIGHT COLORS**: Avoid saturated primary colors

**Approved Notion Color Palette**:
```css
/* Gray-based foundation */
--gray-50: #f9fafb;   /* Backgrounds */
--gray-100: #f3f4f6;  /* Subtle backgrounds */
--gray-200: #e5e7eb;  /* Borders */
--gray-300: #d1d5db;  /* Disabled states */
--gray-500: #6b7280;  /* Secondary text */
--gray-700: #374151;  /* Primary text */
--gray-900: #111827;  /* Headings */

/* Muted accents only */
--emerald-500: #10b981;  /* Success */
--amber-500: #f59e0b;    /* Warning */
--red-500: #ef4444;      /* Error */
--indigo-500: #6366f1;   /* Info (muted) */
```

---

## 💾 Cache Configuration

### **Global QueryClient Configuration**

**Location**: `src/App.tsx:71-88`

MyDetailArea uses TanStack Query v5 with optimized global defaults:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: CACHE_TIMES.MEDIUM,      // 5 minutes
      gcTime: GC_TIMES.MEDIUM,            // 10 minutes
      refetchOnWindowFocus: false,        // Reduce unnecessary refetches
      refetchOnMount: 'stale',            // Only refetch if data is stale
      retry: 2,                           // Retry failed requests twice
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
    },
    mutations: {
      retry: 1
    }
  }
});
```

### **Cache Time Constants**

**Location**: `src/constants/cacheConfig.ts`

```typescript
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';

// Available cache times
CACHE_TIMES.INSTANT     // 0ms - always fetch fresh
CACHE_TIMES.SHORT       // 1 minute - dashboards, analytics
CACHE_TIMES.MEDIUM      // 5 minutes - standard application data
CACHE_TIMES.LONG        // 15 minutes - memberships, dealerships
CACHE_TIMES.VERY_LONG   // 30 minutes - platform config

// Garbage collection times (2x staleTime recommended)
GC_TIMES.SHORT          // 5 minutes
GC_TIMES.MEDIUM         // 10 minutes
GC_TIMES.LONG           // 30 minutes
GC_TIMES.VERY_LONG      // 60 minutes
```

### **When to Use Each Cache Time**

#### 🔴 **INSTANT (0ms)** - Real-time Data
```typescript
useQuery({
  queryKey: ['deleted-vehicles'],
  queryFn: fetchDeletedVehicles,
  staleTime: CACHE_TIMES.INSTANT,
  gcTime: GC_TIMES.SHORT
});
```
**Use for**: Live feeds, deleted items requiring immediate refresh, real-time status

#### 🟡 **SHORT (1 min)** - Dashboard Data
```typescript
useQuery({
  queryKey: ['dashboard-metrics'],
  queryFn: fetchDashboardMetrics,
  staleTime: CACHE_TIMES.SHORT,
  gcTime: GC_TIMES.MEDIUM
});
```
**Use for**: Dashboard metrics, analytics, frequently changing operational data

#### 🟢 **MEDIUM (5 min)** - Standard Data (DEFAULT)
```typescript
useQuery({
  queryKey: ['orders', { dealerId }],
  queryFn: fetchOrders,
  // Uses global defaults - no need to specify
});
```
**Use for**: Orders, contacts, users, vehicles, most application data

#### 🔵 **LONG (15 min)** - Semi-Static Data
```typescript
useQuery({
  queryKey: ['dealer-memberships'],
  queryFn: fetchMemberships,
  staleTime: CACHE_TIMES.LONG,
  gcTime: GC_TIMES.LONG
});
```
**Use for**: Memberships, dealerships, organizational structure, permissions

#### 🟣 **VERY_LONG (30 min)** - System Configuration
```typescript
useQuery({
  queryKey: ['platform-config'],
  queryFn: fetchPlatformConfig,
  staleTime: CACHE_TIMES.VERY_LONG,
  gcTime: GC_TIMES.VERY_LONG
});
```
**Use for**: Platform settings, system configuration, rarely changing static data

### **Cache Invalidation Patterns**

#### After Mutations
```typescript
const { mutate } = useMutation({
  mutationFn: createOrder,
  onSuccess: () => {
    // Invalidate related queries
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
  }
});
```

#### Optimistic Updates
```typescript
const { mutate } = useMutation({
  mutationFn: updateOrder,
  onMutate: async (newOrder) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['orders', newOrder.id] });

    // Snapshot previous value
    const previousOrder = queryClient.getQueryData(['orders', newOrder.id]);

    // Optimistically update
    queryClient.setQueryData(['orders', newOrder.id], newOrder);

    return { previousOrder };
  },
  onError: (err, newOrder, context) => {
    // Rollback on error
    queryClient.setQueryData(['orders', newOrder.id], context.previousOrder);
  }
});
```

### **localStorage Persistence**

```typescript
import { usePersistedState } from '@/hooks/usePersistedState';

const [value, setValue, { isLoading, error, clear }] = usePersistedState(
  'my-key',
  defaultValue,
  {
    debounceMs: 100,           // Debounce writes
    expiration: 60 * 60 * 1000, // 1 hour TTL
    cloudSync: false           // Optional cloud sync
  }
);
```

**Tab/View Persistence**:
```typescript
import { useTabPersistence } from '@/hooks/useTabPersistence';

const [activeTab, setActiveTab] = useTabPersistence('sales_orders');
// Automatically persists and restores tab state across page refreshes
```

### **Performance Best Practices**

1. **Always use constants** from `cacheConfig.ts` instead of hardcoded values
2. **Match gcTime to staleTime**: `gcTime` should be ~2x `staleTime`
3. **Disable refetchOnWindowFocus globally** (already configured)
4. **Use refetchOnMount: 'stale'** to avoid unnecessary refetches
5. **Invalidate queries after mutations** to keep data fresh
6. **Use optimistic updates** for better UX in slow networks
7. **Monitor cache behavior** with React Query Devtools in development (bottom-right corner)

### **Common Mistakes to Avoid**

❌ **Don't hardcode cache times**:
```typescript
// Bad
staleTime: 300000  // What is this magic number?

// Good
staleTime: CACHE_TIMES.MEDIUM  // Clear and consistent
```

❌ **Don't set staleTime without gcTime**:
```typescript
// Bad - data might be GC'd before going stale
staleTime: CACHE_TIMES.LONG  // 15 min

// Good
staleTime: CACHE_TIMES.LONG,
gcTime: GC_TIMES.LONG  // 30 min
```

❌ **Don't use INSTANT everywhere**:
```typescript
// Bad - unnecessary network requests
staleTime: CACHE_TIMES.INSTANT  // For static user list?

// Good
staleTime: CACHE_TIMES.MEDIUM  // Standard data
```

❌ **Don't forget to invalidate after mutations**:
```typescript
// Bad
useMutation({ mutationFn: updateUser });

// Good
useMutation({
  mutationFn: updateUser,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] })
});
```

---

**This is an enterprise-grade dealership management system with comprehensive internationalization, advanced theme customization, and sophisticated state persistence.**
