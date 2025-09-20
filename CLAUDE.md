# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🔒 PUERTO 8080 EXCLUSIVO - CONFIGURACIÓN CRÍTICA

**IMPORTANTE**: Este proyecto DEBE usar ÚNICAMENTE el puerto 8080 para desarrollo.

- **Configuración Vite**: `strictPort: true` - No permite otros puertos
- **Resolución de Conflictos**: Si el puerto 8080 está ocupado, se debe liberar antes de iniciar
- **Comando verificación**: `netstat -ano | findstr :8080` (Windows)
- **Comando liberación**: Identificar y terminar el proceso que usa el puerto
- **URL de desarrollo**: http://localhost:8080 (FIJO - no cambia)

Esta configuración asegura consistencia en el desarrollo y evita conflictos de puerto entre sesiones.

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

## Project Architecture - My Detail Area Enterprise System

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

#### **Translation System (Critical)**
```typescript
// ALL user-facing text MUST use translations
const { t } = useTranslation();
return <h1>{t('page.title')}</h1>; // NEVER hardcode text

// Namespace organization by feature
'contacts.add_new'
'orders.vehicle_information' 
'reports.export.configuration'
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

### Critical Development Standards

#### **TypeScript Best Practices (Mandatory)**
- **NEVER use `any` types** - Always define proper interfaces and union types
- **Type safety first** - Use strict TypeScript configuration
- **Proper error handling** - Type errors at compile time, not runtime
- **Interface definitions** - Create specific types for all data structures
- **Union types** - Use `string | Interface` instead of `any`
- **Generic constraints** - Prefer `<T extends SomeType>` over `<T = any>`
- **Type guards** - Use `typeof` and `in` operators for type narrowing

#### **Translation Coverage (Mandatory)**
- **Run audit**: `node scripts/audit-translations.cjs` before major changes
- **100% coverage required** - No hardcoded user-facing text
- **3 language support** - English (base), Spanish, Portuguese (Brazilian)
- **Namespace structure** - Group by feature/component

#### **🚨 CRITICAL TRANSLATION REMINDER**
**ALWAYS add translations when creating/modifying UI elements:**

1. **English** - `public/translations/en.json`
2. **Spanish** - `public/translations/es.json`
3. **Portuguese (Brazil)** - `public/translations/pt-BR.json`

**Required for ALL user-facing text including:**
- Component titles and labels
- Button text and placeholders
- Error messages and tooltips
- Form validation messages
- Modal headers and descriptions
- Toast notifications and alerts

**Example pattern:**
```typescript
// ✅ CORRECT - With translations
const { t } = useTranslation();
<Button>{t('feature.button_text')}</Button>

// ❌ WRONG - Hardcoded text
<Button>Save Changes</Button>
```

**Translation key structure:**
- `auth.*` - Authentication pages
- `orders.*` - Order management
- `team_communication.*` - Comments/messaging
- `followers.*` - Team collaboration
- `attachments.*` - File uploads
- `common.*` - Shared elements

#### **Component Creation Pattern**
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

#### **Modal Design Pattern (Full-Screen Enterprise)**
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

### Specialized Features

#### **VIN Processing System**
- **Camera scanning** - Tesseract.js OCR with enhanced error handling
- **VIN validation** - 17-character validation + decode via Edge Function
- **Auto-population** - Vehicle year/make/model from successful decode

#### **QR Code Integration (mda.to)**
- **Auto-generation** - Short links created on order creation
- **5-digit slugs** - Random alphanumeric (ABC12, XYZ89)
- **Analytics tracking** - Scan counts, unique visitors
- **vCard QR** - Contact sharing with device auto-import

#### **Theme Customization System**
- **Location**: Management → Theme Studio
- **Capabilities**: Colors, shadows, typography, Notion presets
- **Persistence**: localStorage with CSS variable injection
- **Live preview** - Real-time theme changes

### Data Validation & Error Handling

#### **Form Validation Patterns**
```typescript
// Standard validation with translations
const errors = {
  email: !email ? t('validation.email_required') : null,
  vin: vin.length !== 17 ? t('validation.vin_invalid_length') : null
};
```

#### **Supabase Error Handling**
```typescript
try {
  const { data, error } = await supabase.from('table').select();
  if (error) throw error;
} catch (error) {
  console.error('Operation failed:', error);
  toast.error(t('messages.error'));
}
```

### Mobile & Responsive Design

#### **Breakpoint Strategy** 
- **Mobile-first design** - Base styles for mobile
- **Breakpoints**: sm(640px), md(768px), lg(1024px), xl(1280px)
- **Grid patterns**: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- **Full-screen modals** - Enterprise desktop experience

#### **Component Responsiveness**
- **Text sizing**: `text-sm sm:text-base`
- **Icon visibility**: `hidden sm:inline-flex`
- **Padding adaptation**: `p-2 sm:p-4 lg:p-6`

### Security & Authentication

#### **Role-Based Access Control**
- **Supabase Auth** - Email/password + profile creation
- **Admin setup** - `rruiz@lima.llc` configured as system admin
- **Permission inheritance** - Dealership-scoped data access
- **Module permissions** - Granular feature access (contacts.view, contacts.write, etc.)

### Performance & Optimization

#### **localStorage Optimization**
- **Debounced writes** - 50ms async saves for UI responsiveness
- **Tab persistence** - Users return to exact same state on refresh
- **Search persistence** - Search terms saved with 1-hour expiration
- **Error recovery** - Graceful degradation if storage fails

#### **Real-time Features**
- **Order status updates** - Live status changes across users
- **Chat system** - Real-time messaging with file attachments
- **Presence indicators** - User activity tracking

This is an enterprise-grade dealership management system with comprehensive internationalization, advanced theme customization, and sophisticated state persistence.

## 🤖 Claude Code Specialized Agents & Workflows

### **Frontend Agents (4)**
- **`react-architect`** - React/TypeScript architecture specialist with component composition, hooks patterns, and performance patterns
- **`ui-designer`** - UI/UX implementation specialist enforcing Notion design system (flat colors, muted palette, no gradients)
- **`state-manager`** - State management specialist (TanStack Query, Context API, Redux, Zustand, caching strategies)
- **`performance-optimizer`** - Frontend performance and Core Web Vitals expert (bundle analysis, lazy loading, optimization)

### **Backend Agents (4)**
- **`api-architect`** - REST/GraphQL API design and Supabase integration specialist (OpenAPI specs, middleware design)
- **`database-expert`** - Database design, optimization, and migrations specialist (PostgreSQL, RLS, query optimization)
- **`auth-security`** - Authentication, authorization, and security expert (Supabase Auth, JWT, RBAC, security audits)
- **`edge-functions`** - Supabase Edge Functions and serverless specialist (Deno, cold start optimization)

### **Quality Assurance Agents (3)**
- **`test-engineer`** - Comprehensive testing specialist (Vitest, Testing Library, Playwright, TDD, coverage analysis)
- **`code-reviewer`** - Code review with automated design system validation and security review
- **`accessibility-auditor`** - Web accessibility and WCAG 2.1 AA compliance expert (screen reader testing, keyboard navigation)

### **DevOps Agents (3)**
- **`deployment-engineer`** - CI/CD pipelines and deployment automation (Railway, Vercel, GitHub Actions, blue-green deployments)
- **`monitoring-specialist`** - Application monitoring and performance tracking (APM, log aggregation, alerting)
- **`infrastructure-provisioner`** - Infrastructure as Code and cloud provisioning (Terraform, Docker, cloud architecture)

### **Domain-Specific Agents (3)**
- **`dealership-expert`** - Automotive dealership business logic specialist (CRM, inventory, compliance, industry workflows)
- **`i18n-specialist`** - Multi-language internationalization expert (EN/ES/PT-BR, translation management, locale handling)
- **`analytics-implementer`** - Business intelligence and analytics tracking (event tracking, dashboards, funnel analysis)

### Agent Usage Patterns

#### Single Agent Tasks
```typescript
// Task(description, agentType)
Task("Analyze current translation coverage and identify optimization opportunities", "code-reviewer")
Task("Design contact groups database schema with proper relationships", "database-expert")
Task("Create comprehensive test suite for VIN scanner functionality", "test-engineer")
Task("Review security patterns in authentication and permission system", "auth-security")
Task("Implement Notion-style dashboard components", "ui-designer")
Task("Optimize React component performance and bundle size", "performance-optimizer")
```

#### Multi-Agent Workflows
```typescript
// Parallel agent coordination for complex features
Task("Research automotive dealership requirements for theme customization", "dealership-expert")
Task("Design theme studio architecture with real-time preview", "react-architect")
Task("Implement theme studio with Notion design system compliance", "ui-designer")
Task("Create test coverage for theme customization across all components", "test-engineer")
Task("Review theme implementation for security and performance", "code-reviewer")
```

#### Coordinated Development
```typescript
// Business domain + technical implementation
Task("Implement vehicle search with dealership-specific filtering", "dealership-expert,react-architect,ui-designer")
Task("Create multilingual order management interface", "i18n-specialist,ui-designer,state-manager")
Task("Build analytics dashboard with automotive KPIs", "analytics-implementer,react-architect,performance-optimizer")
```

### Workflow Recommendations

#### For New Features
1. **dealership-expert** → Business requirements and automotive workflow analysis
2. **react-architect** → Component architecture and technical design
3. **ui-designer** → Notion-compliant UI implementation with muted palette
4. **test-engineer** → Comprehensive test coverage (unit, integration, e2e)
5. **code-reviewer** → Quality assurance and design system compliance
6. **deployment-engineer** → Production deployment and monitoring

#### For Bug Fixes
1. **code-reviewer** → Root cause analysis and impact assessment
2. **react-architect** or **api-architect** → Targeted fix implementation
3. **test-engineer** → Regression testing and validation
4. **accessibility-auditor** → Accessibility impact check (if UI-related)

#### For Performance Optimization
1. **performance-optimizer** → Performance bottleneck identification and Core Web Vitals analysis
2. **react-architect** → Architecture optimization strategy
3. **database-expert** → Query and schema optimization (if backend-related)
4. **monitoring-specialist** → Performance monitoring and alerting setup

#### For API Development
1. **api-architect** → REST/GraphQL API design and Supabase integration
2. **database-expert** → Schema design and RLS policies
3. **auth-security** → Authentication and authorization implementation
4. **test-engineer** → API testing and validation

#### For Internationalization
1. **i18n-specialist** → Translation strategy and implementation (EN/ES/PT-BR)
2. **ui-designer** → Responsive design for different locales
3. **test-engineer** → Multi-language testing and validation

#### For Analytics & Business Intelligence
1. **analytics-implementer** → Event tracking and KPI dashboard design
2. **dealership-expert** → Automotive-specific metrics and reporting requirements
3. **react-architect** → Dashboard architecture and data visualization
4. **performance-optimizer** → Analytics performance optimization

### Integration with Project Standards

All agents understand and follow:
- **Translation requirements** - 100% coverage with 3-language support (EN/ES/PT-BR)
- **Permission patterns** - Role-based access control (system_admin > dealer_admin > dealer_manager > dealer_user)
- **Component architecture** - shadcn/ui + Radix UI primitives + feature-based organization
- **Data flow patterns** - Supabase integration (PostgreSQL + Auth + Edge Functions + Real-time)
- **Notion design system** - Flat colors, muted palette, NO gradients, approved color tokens
- **State persistence** - Advanced localStorage with tab memory and debounced writes
- **Port configuration** - Exclusive port 8080 with strictPort: true
- **Testing standards** - Vitest + Testing Library + Playwright E2E coverage

### Design System Enforcement (Automated)

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

Use these 17 specialized agents to maintain high development velocity while ensuring enterprise-grade quality, security, maintainability, and strict design system compliance throughout the My Detail Area dealership management system.