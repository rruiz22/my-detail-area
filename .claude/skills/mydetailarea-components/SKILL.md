---
name: mydetailarea-components
description: Professional React component library for MyDetailArea dealership system. Creates enterprise-grade, accessible, and performant components following Notion-style design patterns with shadcn/ui, Tailwind CSS, and TypeScript. Includes data tables, forms, modals, metric cards, charts, and complex UI patterns. Use when building new features, creating reusable components, or implementing professional UI patterns.
license: MIT
---

# MyDetailArea Component Architect

Enterprise-grade React component development system for the MyDetailArea platform.

## Purpose

This skill provides comprehensive guidance for creating professional, accessible, and performant React components that seamlessly integrate with the MyDetailArea design system. It ensures consistency, maintainability, and enterprise-quality user interfaces.

## When to Use

Use this skill when:
- Creating new feature components
- Building reusable UI components
- Implementing data tables with sorting/filtering
- Designing form components with validation
- Creating modal dialogs and drawers
- Building metric cards and dashboards
- Implementing responsive layouts
- Adding loading/error/empty states
- Creating accessible components (WCAG 2.1 AA)
- Optimizing component performance

## Design System (Notion-Style)

### Color Palette (HSL Format)

**Grays (Foundation) - Primary Use**
```typescript
const colors = {
  gray: {
    50: 'hsl(0, 0%, 100%)',   // White backgrounds
    100: 'hsl(0, 0%, 98%)',   // Subtle backgrounds
    200: 'hsl(0, 0%, 96%)',   // Muted backgrounds
    300: 'hsl(0, 0%, 90%)',   // Borders
    500: 'hsl(0, 0%, 45%)',   // Secondary text
    700: 'hsl(0, 0%, 20%)',   // Primary text
    900: 'hsl(0, 0%, 9%)'     // Headings
  }
};
```

**Muted Accents (ONLY) - Spartan Use**
```typescript
const accents = {
  emerald: {
    50: 'hsl(120, 60%, 97%)',
    500: 'hsl(120, 60%, 45%)'  // Success states
  },
  amber: {
    50: 'hsl(38, 92%, 95%)',
    500: 'hsl(38, 92%, 50%)'   // Warning states
  },
  red: {
    50: 'hsl(0, 84%, 97%)',
    500: 'hsl(0, 84%, 60%)'    // Error/destructive states
  },
  indigo: {
    50: 'hsl(211, 100%, 97%)',
    500: 'hsl(211, 100%, 50%)' // Info/pending states
  }
};
```

**STRICTLY FORBIDDEN:**
- ❌ NO gradients (except subtle 2-color)
- ❌ NO bright/strong blues (blue-600+)
- ❌ NO saturated colors
- ❌ NO neon or vibrant colors

### Shadows (Enhanced System)

```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-elegant: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-glow: 0 0 0 3px rgba(59, 130, 246, 0.1);
--shadow-modal: 0 25px 50px -12px rgb(0 0 0 / 0.25);
```

### Typography

```typescript
const typography = {
  fontFamily: 'system-ui, -apple-system, sans-serif',
  sizes: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem' // 30px
  },
  weights: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700
  }
};
```

## Technology Stack

### Core
- **React 18.3.1** - UI framework
- **TypeScript 5.8.3** - Type safety
- **Vite 5.4.19** - Build tool
- **Tailwind CSS 3.4.17** - Styling

### UI Components
- **shadcn/ui** - Base component library (Radix UI primitives)
- **Radix UI 1.x** - Accessible primitives
- **Lucide React 0.462.0** - Icons
- **Framer Motion 12.23.12** - Animations

### Forms & Validation
- **React Hook Form 7.x** - Form management
- **Zod** - Schema validation
- **@hookform/resolvers** - Form validation integration

### Data Management
- **TanStack Query 5.83.0** - Server state
- **Zustand 5.0.8** - Client state

### Charts & Visualization
- **Recharts 2.15.4** - Data visualization
- **date-fns 3.6.0** - Date manipulation

### Internationalization
- **react-i18next 15.7.3** - Translations
- **Supported:** EN, ES, PT-BR

## Component Architecture Patterns

### 1. Feature Component Structure

```
components/
├── feature-name/
│   ├── FeatureName.tsx              # Main component
│   ├── FeatureNameForm.tsx          # Form subcomponent
│   ├── FeatureNameCard.tsx          # Card subcomponent
│   ├── FeatureNameDialog.tsx        # Modal subcomponent
│   ├── FeatureNameTable.tsx         # Table subcomponent
│   ├── types.ts                     # TypeScript types
│   ├── hooks.ts                     # Custom hooks
│   ├── utils.ts                     # Helper functions
│   └── index.ts                     # Barrel export
```

### 2. Component Template

```tsx
import { FC, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface FeatureComponentProps {
  id?: string;
  onSuccess?: () => void;
  className?: string;
}

export const FeatureComponent: FC<FeatureComponentProps> = ({
  id,
  onSuccess,
  className
}) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  // Data fetching with TanStack Query
  const { data, isLoading: dataLoading, error } = useQuery({
    queryKey: ['feature', id],
    queryFn: () => fetchFeatureData(id)
  });

  // Loading state
  if (dataLoading) {
    return <FeatureComponentSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <Card className="border-none shadow-sm">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <p className="text-red-600">{t('errors.failed_to_load')}</p>
            <Button onClick={() => refetch()} className="mt-4">
              {t('common.retry')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <Card className="border-none shadow-sm">
        <CardContent className="p-6">
          <div className="text-center py-12">
            <p className="text-muted-foreground">{t('feature.no_data')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Main render
  return (
    <Card className={`border-none shadow-sm hover:shadow-md transition-shadow ${className}`}>
      <CardHeader className="border-b bg-gray-50/50">
        <CardTitle>{t('feature.title')}</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {/* Component content */}
      </CardContent>
    </Card>
  );
};

// Loading skeleton
function FeatureComponentSkeleton() {
  return (
    <Card className="border-none shadow-sm">
      <CardContent className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 3. Form Component Pattern

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number')
});

type FormValues = z.infer<typeof formSchema>;

interface FeatureFormProps {
  initialData?: FormValues;
  onSubmit: (data: FormValues) => Promise<void>;
  onCancel?: () => void;
}

export function FeatureForm({ initialData, onSubmit, onCancel }: FeatureFormProps) {
  const { t } = useTranslation();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      name: '',
      email: '',
      phone: ''
    }
  });

  const handleSubmit = async (data: FormValues) => {
    try {
      await onSubmit(data);
      form.reset();
    } catch (error) {
      // Handle error
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('common.name')}</FormLabel>
              <FormControl>
                <Input placeholder={t('common.name_placeholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('common.email')}</FormLabel>
              <FormControl>
                <Input type="email" placeholder={t('common.email_placeholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('common.phone')}</FormLabel>
              <FormControl>
                <Input type="tel" placeholder="+1234567890" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              {t('common.cancel')}
            </Button>
          )}
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('common.saving')}
              </>
            ) : (
              t('common.save')
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
```

### 4. Data Table Pattern

```tsx
import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown, Search } from 'lucide-react';

interface Column<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchable?: boolean;
  onRowClick?: (row: T) => void;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchable = true,
  onRowClick
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const filteredData = useMemo(() => {
    if (!search) return data;

    return data.filter(row =>
      Object.values(row).some(value =>
        String(value).toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [data, search]);

  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortKey, sortDirection]);

  const handleSort = (key: keyof T) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  return (
    <div className="space-y-4">
      {searchable && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50">
              {columns.map((column) => (
                <TableHead key={String(column.key)} className="font-semibold">
                  {column.sortable ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort(column.key)}
                      className="-ml-4 h-8 data-[state=open]:bg-accent"
                    >
                      {column.label}
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    column.label
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No results found
                </TableCell>
              </TableRow>
            ) : (
              sortedData.map((row, idx) => (
                <TableRow
                  key={idx}
                  className="hover:bg-gray-50/50 cursor-pointer"
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column) => (
                    <TableCell key={String(column.key)}>
                      {column.render
                        ? column.render(row[column.key], row)
                        : row[column.key]}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

### 5. Modal Dialog Pattern (Full-Screen Enterprise)

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface FeatureDialogProps {
  open: boolean;
  onClose: () => void;
  data?: any;
}

export function FeatureDialog({ open, onClose, data }: FeatureDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-none w-screen h-screen m-0 p-0 rounded-none">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b px-6 py-4 flex items-center justify-between">
          <DialogHeader className="flex-1">
            <DialogTitle className="text-2xl">Feature Title</DialogTitle>
            <DialogDescription>Feature description</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              Quick Action
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-[2fr,1fr] gap-6">
            {/* Main Content */}
            <div className="space-y-6">
              {/* Content here */}
            </div>

            {/* Sidebar */}
            <aside className="space-y-6">
              {/* Sidebar content */}
            </aside>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex items-center justify-between">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <div className="flex gap-2">
            <Button variant="outline">Secondary</Button>
            <Button>Primary Action</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### 6. Metric Card Pattern

```tsx
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: 'emerald' | 'amber' | 'red' | 'indigo';
  onClick?: () => void;
}

export function MetricCard({
  label,
  value,
  trend,
  icon: Icon,
  iconColor = 'indigo',
  onClick
}: MetricCardProps) {
  const iconColorClasses = {
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    indigo: 'bg-indigo-50 text-indigo-600'
  };

  return (
    <Card
      className={`border-none shadow-sm hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold tracking-tight">{value}</p>
            {trend && (
              <div className="flex items-center gap-1">
                {trend.direction === 'up' ? (
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
                <span
                  className={`text-sm font-medium ${
                    trend.direction === 'up' ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {Math.abs(trend.value)}%
                </span>
              </div>
            )}
          </div>
          <div className={`p-3 rounded-lg ${iconColorClasses[iconColor]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

## Performance Optimization

### Memoization

```tsx
import { memo, useMemo, useCallback } from 'react';

// Memoize expensive components
export const ExpensiveComponent = memo(({ data }: Props) => {
  return <div>{/* Render */}</div>;
});

// Memoize expensive calculations
const sortedData = useMemo(() => {
  return data.sort((a, b) => a.value - b.value);
}, [data]);

// Memoize callbacks
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);
```

### Lazy Loading

```tsx
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

export function Parent() {
  return (
    <Suspense fallback={<Loading />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

### Virtual Lists (for large datasets)

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualList({ items }: { items: any[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60
  });

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`
            }}
          >
            {items[virtualItem.index]}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Accessibility (WCAG 2.1 AA)

### Keyboard Navigation

```tsx
<button
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
  aria-label="Action description"
  tabIndex={0}
>
  Click me
</button>
```

### ARIA Labels

```tsx
<div role="region" aria-labelledby="section-title">
  <h2 id="section-title">Section Title</h2>
  {/* Content */}
</div>

<button aria-expanded={isOpen} aria-controls="dropdown-menu">
  Toggle Menu
</button>

<div id="dropdown-menu" aria-hidden={!isOpen}>
  {/* Menu items */}
</div>
```

### Focus Management

```tsx
import { useEffect, useRef } from 'react';

function Dialog({ open }: { open: boolean }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [open]);

  return (
    <div role="dialog" aria-modal="true">
      <button ref={closeButtonRef}>Close</button>
    </div>
  );
}
```

## Responsive Design Patterns

```tsx
// Mobile-first grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

// Responsive text
<h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">

// Conditional rendering
<div className="hidden sm:block">Desktop only</div>
<div className="block sm:hidden">Mobile only</div>

// Responsive flex direction
<div className="flex flex-col sm:flex-row gap-4">

// Responsive padding/margin
<div className="p-4 sm:p-6 lg:p-8">
```

## Internationalization

```tsx
import { useTranslation } from 'react-i18next';

function Component() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('feature.title')}</h1>
      <p>{t('feature.description')}</p>
      <Button>{t('common.save')}</Button>
    </div>
  );
}

// Translation files: public/translations/{en,es,pt-BR}.json
{
  "feature": {
    "title": "Feature Title",
    "description": "Feature description"
  },
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete"
  }
}
```

## Reference Files

- **[Component Patterns Reference](./references/component-patterns.md)** - Complete pattern library
- **[Design Tokens Reference](./references/design-tokens.md)** - All colors, shadows, typography
- **[shadcn/ui Components Reference](./references/shadcn-components.md)** - Component usage guide
- **[Form Patterns Reference](./references/form-patterns.md)** - Form and validation patterns
- **[Accessibility Guidelines](./references/accessibility.md)** - WCAG 2.1 AA compliance

## Examples

- **[examples/dashboard-component.tsx](./examples/dashboard-component.tsx)** - Full dashboard with metrics
- **[examples/data-table-advanced.tsx](./examples/data-table-advanced.tsx)** - Advanced table with features
- **[examples/form-wizard.tsx](./examples/form-wizard.tsx)** - Multi-step form pattern
- **[examples/modal-patterns.tsx](./examples/modal-patterns.tsx)** - Various modal implementations

## Best Practices

1. **TypeScript strict mode** - No `any` types, proper interfaces
2. **Composition over inheritance** - Build with small, reusable components
3. **Single Responsibility** - Each component does one thing well
4. **Controlled components** - Use controlled inputs with state
5. **Error boundaries** - Wrap components to catch errors
6. **Loading states** - Always show feedback during async operations
7. **Empty states** - Provide guidance when no data exists
8. **Responsive by default** - Mobile-first approach
9. **Accessibility first** - WCAG 2.1 AA compliance
10. **Internationalization** - Support EN/ES/PT-BR

## TypeScript Best Practices

```typescript
// ✅ Good - Explicit types
interface ComponentProps {
  id: string;
  onSuccess: (data: Data) => void;
  optional?: string;
}

// ❌ Bad - Using any
interface ComponentProps {
  data: any;  // Never use any
}

// ✅ Good - Generic types
function DataTable<T extends Record<string, any>>({ data }: { data: T[] }) {}

// ✅ Good - Union types
type Status = 'pending' | 'active' | 'completed';

// ✅ Good - Type guards
function isOrder(data: unknown): data is Order {
  return typeof data === 'object' && data !== null && 'order_number' in data;
}
```

## Common Pitfalls to Avoid

❌ **Avoid:**
- Hardcoded strings (use translations)
- Inline styles (use Tailwind)
- Bright colors (stick to gray + muted accents)
- Missing loading states
- Missing error states
- Missing empty states
- Uncontrolled inputs
- Missing accessibility attributes
- Non-responsive layouts
- `any` types in TypeScript

✅ **Do:**
- Use semantic HTML
- Implement proper TypeScript types
- Add loading/error/empty states
- Support keyboard navigation
- Use ARIA attributes
- Test on mobile devices
- Follow Notion design tokens
- Memoize expensive operations
- Implement proper error handling
- Support all 3 languages (EN/ES/PT-BR)
