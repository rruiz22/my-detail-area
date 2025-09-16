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

#### **Translation Coverage (Mandatory)**
- **Run audit**: `node scripts/audit-translations.cjs` before major changes
- **100% coverage required** - No hardcoded user-facing text
- **3 language support** - English (base), Spanish, Portuguese (Brazilian)
- **Namespace structure** - Group by feature/component

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

### Core Development Agents
- **`coder`** - Implementation specialist for writing clean, efficient code
- **`reviewer`** - Code review and quality assurance specialist  
- **`tester`** - Comprehensive testing and quality assurance specialist
- **`planner`** - Strategic planning and task orchestration agent
- **`researcher`** - Deep research and information gathering specialist

### Architecture & Design Specialists
- **`system-architect`** - Expert agent for system architecture design and technical decisions
- **`code-analyzer`** - Advanced code quality analysis for comprehensive reviews
- **`production-validator`** - Production validation ensuring deployment readiness

### Domain-Specific Specialists
- **`backend-dev`** - Specialized agent for backend API development (REST/GraphQL)
- **`mobile-dev`** - Expert agent for React Native mobile development (iOS/Android)
- **`ml-developer`** - Machine learning model development and deployment specialist
- **`api-docs`** - Expert for creating and maintaining OpenAPI/Swagger documentation

### DevOps & Automation
- **`cicd-engineer`** - GitHub Actions CI/CD pipeline creation and optimization
- **`workflow-automation`** - Intelligent workflow automation with adaptive coordination
- **`pr-manager`** - Comprehensive pull request management with automated workflows
- **`issue-tracker`** - Intelligent issue management and project coordination
- **`release-manager`** - Automated release coordination and deployment

### Methodology Specialists
- **`sparc-coder`** - SPARC methodology (Specification, Pseudocode, Architecture, Refinement, Completion)
- **`tdd-london-swarm`** - TDD London School specialist for mock-driven development

### Agent Usage Patterns

#### Single Agent Tasks
```typescript
// Task(description, agentType)
Task("Analyze current translation coverage and identify optimization opportunities", "code-analyzer")
Task("Design contact groups database schema with proper relationships", "system-architect") 
Task("Create comprehensive test suite for VIN scanner functionality", "tester")
Task("Review security patterns in authentication and permission system", "reviewer")
```

#### Multi-Agent Workflows
```typescript
// Parallel agent coordination for complex features
Task("Research best practices for theme customization in enterprise apps", "researcher")
Task("Design theme studio architecture with performance considerations", "system-architect") 
Task("Implement theme studio with real-time preview functionality", "coder")
Task("Create test coverage for theme customization across all components", "tester")
Task("Review theme implementation for security and performance", "reviewer")
```

#### Methodology-Driven Development
```typescript
// SPARC methodology for systematic development
Task("Apply SPARC methodology to implement contact groups feature", "sparc-coder")
Task("Use TDD approach for new order communication features", "tdd-london-swarm")
```

### Workflow Recommendations

#### For New Features
1. **Planner** → Strategic planning and requirements analysis
2. **System-Architect** → Technical design and architecture
3. **Coder** → Implementation with enterprise standards
4. **Tester** → Comprehensive test coverage
5. **Reviewer** → Quality assurance and optimization

#### For Bug Fixes  
1. **Code-Analyzer** → Root cause analysis and impact assessment
2. **Coder** → Targeted fix implementation
3. **Tester** → Regression testing and validation

#### For Performance Optimization
1. **Code-Analyzer** → Performance bottleneck identification
2. **System-Architect** → Optimization strategy design
3. **Coder** → Performance improvements implementation
4. **Production-Validator** → Production readiness validation

#### For API Development
1. **Backend-Dev** → API design and implementation
2. **API-Docs** → OpenAPI documentation creation
3. **Tester** → API testing and validation

### Integration with Project Standards

All agents understand and follow:
- **Translation requirements** - 100% coverage with 3-language support
- **Permission patterns** - Role-based access control implementation
- **Component architecture** - shadcn/ui + feature-based organization
- **Data flow patterns** - Supabase integration standards
- **Enterprise design** - Professional UI/UX requirements
- **State persistence** - localStorage integration patterns

Use these agents to maintain high development velocity while ensuring enterprise-grade quality, security, and maintainability throughout the My Detail Area system.