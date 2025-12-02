---
name: mydetailarea-reports
description: Professional report generation system for MyDetailArea dealership management. Creates business intelligence reports with data visualization, multi-format export (HTML/PDF/Excel/CSV), and Notion-style design. Use when generating operational reports, financial analytics, performance dashboards, or custom data exports for the dealership system.
license: MIT
---

# MyDetailArea Reports Generator

Professional report generation system for the MyDetailArea dealership management platform.

## Purpose

This skill provides comprehensive report generation capabilities specifically designed for the MyDetailArea enterprise system. It enables creation of data-driven reports with charts, metrics, and professional layouts that match the Notion-style design system.

## When to Use

Use this skill when:
- Creating operational reports (order volume, status distribution, performance metrics)
- Generating financial analytics (revenue, expenses, profit margins)
- Building custom dashboards with data visualization
- Exporting reports in multiple formats (HTML/PDF/Excel/CSV)
- Creating summary reports for management or clients
- Designing metric cards and KPI displays

## Technology Stack

### Data Fetching
- **TanStack Query** - Server state management with caching
- **Custom Hooks:**
  - `useOrdersAnalytics(filters)` - Order KPIs and metrics
  - `useRevenueAnalytics(filters, grouping)` - Revenue trends
  - `usePerformanceTrends(filters)` - Efficiency/SLA metrics
  - `useInvoiceSummary(filters)` - Invoice aggregations

### Visualization
- **Recharts 2.15.4** - Charts (Bar, Line, Pie, Area, Composed)
- **date-fns 3.6.0** - Date formatting and manipulation

### Export Formats
- **XLSX 0.18.5** - Excel file generation
- **Native Blob API** - CSV downloads
- **HTML** - Print-optimized layouts
- **PDF** - Via browser print API or HTML conversion

### Design System
- **Tailwind CSS 3.4.17** - Notion-style utilities
- **shadcn/ui** - Base components (Card, Table, Badge, etc.)
- **Design Tokens:**
  - Grays: 50, 100, 200, 500, 700, 900
  - Accents: emerald-500, amber-500, red-500, indigo-500
  - Shadows: sm, md, elegant, glow, modal
  - **NO gradients**, **NO bright blues**, **NO saturated colors**

## Project Paths

All paths are absolute for reliable access:

- **Components:** `C:\Users\rudyr\apps\mydetailarea\src\components\reports\`
- **Hooks:** `C:\Users\rudyr\apps\mydetailarea\src\hooks\`
- **Utils:** `C:\Users\rudyr\apps\mydetailarea\src\utils\exportUtils.ts`
- **Types:** `C:\Users\rudyr\apps\mydetailarea\src\types\`
- **Database:** `C:\Users\rudyr\apps\mydetailarea\supabase\migrations\`
- **Translations:** `C:\Users\rudyr\apps\mydetailarea\public\translations\`

## Report Architecture Patterns

### 1. Report Layout Component

Every report should follow this structure:

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Filter } from "lucide-react";
import { useTranslation } from "react-i18next";

export function ReportName() {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('reports.title')}</h1>
          <p className="text-muted-foreground">{t('reports.description')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            {t('common.filter')}
          </Button>
          <Button size="sm">
            <Download className="h-4 w-4 mr-2" />
            {t('common.export')}
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric cards here */}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart cards here */}
      </div>

      {/* Data Table */}
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle>{t('reports.data_table')}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Table component here */}
        </CardContent>
      </Card>
    </div>
  );
}
```

### 2. Metric Card Pattern

```tsx
interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: { value: number; direction: 'up' | 'down' };
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
}

function MetricCard({ label, value, trend, icon: Icon, iconColor = "blue" }: MetricCardProps) {
  return (
    <Card className="border-none shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-2xl font-semibold">{value}</p>
            {trend && (
              <p className={`text-xs ${trend.direction === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
                {trend.direction === 'up' ? '↑' : '↓'} {Math.abs(trend.value)}%
              </p>
            )}
          </div>
          <div className={`p-3 rounded-lg bg-${iconColor}-50`}>
            <Icon className={`h-5 w-5 text-${iconColor}-600`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### 3. Chart Card Pattern

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

function ChartCard({ title, description, data }: ChartCardProps) {
  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="border-b bg-gray-50/50">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="value" fill="hsl(211, 100%, 50%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

### 4. Data Table Pattern

```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

function DataTable({ data, columns }: DataTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50/50">
            {columns.map((col) => (
              <TableHead key={col.key} className="font-semibold">
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, idx) => (
            <TableRow key={idx} className="hover:bg-gray-50/50 cursor-pointer">
              {columns.map((col) => (
                <TableCell key={col.key}>{row[col.key]}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

## Export Implementation

### CSV Export

```tsx
import { exportToCSV } from '@/utils/exportUtils';

function handleExportCSV() {
  const exportData = data.map(item => ({
    'Order Number': item.order_number,
    'Customer': item.customer_name,
    'Total': `$${item.total_amount.toFixed(2)}`,
    'Status': item.status,
    'Date': format(new Date(item.created_at), 'yyyy-MM-dd')
  }));

  exportToCSV(exportData, `report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
}
```

### Excel Export

```tsx
import { exportToExcel } from '@/utils/exportUtils';

function handleExportExcel() {
  const sheets = {
    'Summary': summaryData,
    'Detailed': detailedData,
    'Charts': chartData
  };

  exportToExcel(sheets, `financial-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
}
```

### HTML/PDF Export

```tsx
function handlePrintPDF() {
  window.print(); // Browser print dialog for PDF
}

// Add print styles in component
<style jsx>{`
  @media print {
    .no-print { display: none; }
    @page { margin: 2cm; }
  }
`}</style>
```

## Data Fetching Patterns

### Using Analytics Hooks

```tsx
import { useOrdersAnalytics } from '@/hooks/useOrdersAnalytics';
import { useRevenueAnalytics } from '@/hooks/useRevenueAnalytics';

function ReportComponent() {
  const [filters, setFilters] = useState({
    startDate: startOfMonth(new Date()),
    endDate: new Date(),
    dealerId: null,
    orderType: null
  });

  const { data: ordersData, isLoading: ordersLoading } = useOrdersAnalytics(filters);
  const { data: revenueData, isLoading: revenueLoading } = useRevenueAnalytics(filters, 'daily');

  if (ordersLoading || revenueLoading) {
    return <ReportSkeleton />;
  }

  return (
    // Render report with data
  );
}
```

### Filtering UI

```tsx
import { DatePickerWithRange } from '@/components/ui/date-picker';
import { Select } from '@/components/ui/select';

function ReportFilters({ filters, onFiltersChange }: FiltersProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <DatePickerWithRange
            date={filters.dateRange}
            onDateChange={(range) => onFiltersChange({ ...filters, dateRange: range })}
          />

          <Select
            value={filters.orderType}
            onValueChange={(val) => onFiltersChange({ ...filters, orderType: val })}
          >
            <option value="">All Types</option>
            <option value="sales">Sales</option>
            <option value="service">Service</option>
            <option value="recon">Recon</option>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
```

## Internationalization

All text must support EN/ES/PT-BR:

```tsx
// In component
const { t } = useTranslation();

<h1>{t('reports.operational.title')}</h1>
<p>{t('reports.operational.description')}</p>
```

Translation files location:
- `C:\Users\rudyr\apps\mydetailarea\public\translations\en.json`
- `C:\Users\rudyr\apps\mydetailarea\public\translations\es.json`
- `C:\Users\rudyr\apps\mydetailarea\public\translations\pt-BR.json`

## Responsive Design

```tsx
// Mobile-first responsive grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

// Adaptive text sizing
<h1 className="text-2xl sm:text-3xl font-bold">

// Conditional visibility
<Button className="hidden sm:inline-flex">

// Flexible layouts
<div className="flex flex-col sm:flex-row gap-4">
```

## Reference Files

Load these files when creating reports:

- **[Design Tokens Reference](./references/design-tokens.md)** - Complete color palette, shadows, typography
- **[Chart Patterns Reference](./references/chart-patterns.md)** - Recharts examples for all chart types
- **[Export Templates Reference](./references/export-templates.md)** - CSV/Excel export patterns
- **[Component Library Reference](./references/component-library.md)** - shadcn/ui component usage

## Examples

Load these examples when implementing specific report types:

- **[examples/operational-report.tsx](./examples/operational-report.tsx)** - Order volume & status reports
- **[examples/financial-report.tsx](./examples/financial-report.tsx)** - Revenue & profit analytics
- **[examples/performance-dashboard.tsx](./examples/performance-dashboard.tsx)** - KPI dashboard with metrics
- **[examples/custom-export.tsx](./examples/custom-export.tsx)** - Multi-format export implementation

## Best Practices

1. **Always use TanStack Query** - Leverage caching, automatic refetching
2. **Follow Notion design** - Gray palette, muted accents, subtle shadows
3. **Support all 3 languages** - EN/ES/PT-BR via react-i18next
4. **Responsive by default** - Mobile-first grid layouts
5. **Loading states** - Use Skeleton components during data fetch
6. **Empty states** - Provide helpful messages when no data
7. **Error handling** - Display user-friendly error messages
8. **Accessibility** - Proper ARIA labels, keyboard navigation
9. **Performance** - Virtualize large tables, lazy load charts
10. **Print optimization** - Add print CSS for PDF generation

## Common Pitfalls

❌ **Avoid:**
- Hardcoded text (use translations)
- Bright colors (use gray + muted accents)
- Inline styles (use Tailwind classes)
- `any` types (use proper TypeScript)
- Direct Supabase calls (use hooks)

✅ **Do:**
- Use custom hooks for data fetching
- Apply Notion design tokens
- Support responsive breakpoints
- Include loading/error/empty states
- Export in multiple formats
- Add proper TypeScript types
