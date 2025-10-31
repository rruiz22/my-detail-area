# Notification Analytics Dashboard

## Overview

Enterprise-grade analytics dashboard for the MyDetailArea notification delivery system. Provides comprehensive insights into notification performance, delivery metrics, engagement rates, and failure debugging.

## Features

### 📊 **Metrics Overview**
- **Total Sent**: Total notifications sent across all channels
- **Delivery Rate**: Percentage of successfully delivered notifications
- **Open Rate**: Percentage of notifications opened by recipients
- **Click-Through Rate**: Percentage of notifications that received clicks
- **Average Time to Read**: Mean time between delivery and first open
- **Failed Deliveries**: Count of failed delivery attempts
- **Active Users**: Number of users engaged with notifications
- **Trend Analysis**: Period-over-period comparison with percentage change

### 📈 **Charts & Visualizations**

#### 1. **Delivery Timeline Chart**
- Line chart showing sent, delivered, and failed notifications over time
- Configurable time intervals (hourly, daily, weekly)
- Interactive tooltips with detailed metrics
- Notion-style muted color palette

#### 2. **Engagement Funnel**
- Visual funnel showing conversion from sent → delivered → opened → clicked
- Drop-off indicators at each stage
- Percentage calculations for each stage
- Conversion summary with key rates

#### 3. **Channel Performance Chart**
- Grouped bar chart comparing push, email, in-app, and SMS channels
- Side-by-side comparison of sent, delivered, and failed metrics
- Channel-specific delivery rates

#### 4. **Provider Comparison**
- Horizontal performance bars for each notification provider
- Metrics: delivery rate, volume, latency, cost per notification
- Performance ratings (Excellent, Good, Fair, Poor)
- Provider ranking by delivery success

#### 5. **Failed Deliveries Table**
- Sortable/filterable data table of failed notifications
- Columns: timestamp, user, channel, provider, error message, retry count
- Search functionality (user, provider, error)
- Retry and view details actions
- Export to CSV functionality

### 🎛️ **Advanced Filters**
- **Time Range**: 24h, 7d, 30d, 90d, custom date range
- **Channels**: Push, Email, In-App, SMS (multi-select)
- **Status**: Sent, Delivered, Failed, Opened, Clicked (multi-select)
- **Priority**: Low, Medium, High, Urgent, Critical (multi-select)
- **User Search**: Filter by email or name
- **Active Filter Indicator**: Shows applied filters with reset option

### 🔄 **Real-time Features**
- **Auto-refresh**: Configurable refresh interval (default: 30s)
- **Manual Refresh**: On-demand data refresh button
- **Live Status Indicator**: Visual indicator when auto-refresh is active
- **Supabase Subscriptions**: Real-time updates for new notifications

### 📤 **Export Functionality**
- Export filtered data to CSV
- Export to Excel (planned)
- Generate PDF reports (planned)
- Schedule automated reports (planned)

## Technical Architecture

### **Frontend Stack**
- **React 18** with TypeScript
- **shadcn/ui** components (Card, Table, Badge, etc.)
- **Recharts** for data visualization
- **TanStack Query** for state management (planned integration)
- **i18n** multi-language support (EN, ES, PT-BR)

### **Backend Integration**
- **Supabase RPC Functions**:
  - `get_delivery_metrics()` - Delivery rates by channel
  - `get_engagement_metrics()` - Open/click rates
  - `get_provider_performance()` - Provider comparison
  - `get_failed_deliveries()` - Failed delivery logs
  - `get_delivery_timeline()` - Time-series data
  - `get_user_delivery_summary()` - Per-user analytics

### **Custom Hooks**
```typescript
// Fetch delivery and engagement metrics
const { deliveryMetrics, engagementMetrics, overview, loading, error, refetch } =
  useNotificationMetrics(dealerId, filters);

// Fetch time-series data for charts
const { timeSeriesData, loading, error, refetch } =
  useDeliveryTimeline(dealerId, filters);

// Fetch provider performance data
const { providers, loading, error, refetch } =
  useProviderPerformance(dealerId, filters);

// Fetch failed deliveries with retry capability
const { failures, loading, error, retry, refetch } =
  useFailedDeliveries(dealerId, filters);
```

## File Structure

```
src/
├── components/
│   └── notifications/
│       └── analytics/
│           ├── NotificationAnalyticsDashboard.tsx   # Main dashboard component
│           ├── MetricsOverview.tsx                   # Metrics cards
│           ├── DeliveryTimelineChart.tsx             # Line chart
│           ├── EngagementFunnel.tsx                  # Funnel visualization
│           ├── ChannelPerformanceChart.tsx           # Bar chart
│           ├── ProviderComparisonChart.tsx           # Provider ranking
│           ├── FailedDeliveriesTable.tsx             # Data table
│           ├── FiltersPanel.tsx                      # Filter controls
│           └── index.ts                              # Barrel exports
├── hooks/
│   ├── useNotificationMetrics.ts                     # Metrics hook
│   ├── useDeliveryTimeline.ts                        # Timeline hook
│   ├── useProviderPerformance.ts                     # Providers hook
│   └── useFailedDeliveries.ts                        # Failures hook
├── types/
│   └── notification-analytics.ts                     # TypeScript types
└── lib/
    └── notification-analytics.ts                     # Helper functions

public/
└── translations/
    ├── en.json                                       # English translations
    ├── es.json                                       # Spanish translations
    └── pt-BR.json                                    # Portuguese translations
```

## Usage

### **Basic Integration**

```typescript
import { NotificationAnalyticsDashboard } from '@/components/notifications/analytics';

function SettingsPage() {
  return (
    <div>
      <h1>Notification Settings</h1>
      <NotificationAnalyticsDashboard dealerId={123} />
    </div>
  );
}
```

### **With Custom Filters**

```typescript
import { NotificationAnalyticsDashboard } from '@/components/notifications/analytics';

function AnalyticsPage() {
  return (
    <NotificationAnalyticsDashboard
      dealerId={123}
      defaultFilters={{
        timeRange: '30d',
        channels: ['push', 'email'],
        priorities: ['high', 'urgent']
      }}
    />
  );
}
```

### **Standalone Components**

```typescript
import {
  MetricsOverview,
  DeliveryTimelineChart,
  EngagementFunnel,
} from '@/components/notifications/analytics';

function CustomDashboard() {
  const { overview, loading } = useNotificationMetrics(dealerId);
  const { timeSeriesData } = useDeliveryTimeline(dealerId);

  return (
    <div>
      <MetricsOverview overview={overview} loading={loading} />
      <DeliveryTimelineChart data={timeSeriesData} />
      <EngagementFunnel overview={overview} />
    </div>
  );
}
```

## Design System

### **Notion-Style Color Palette**

```css
/* Foundation Colors */
--gray-50: #f9fafb;   /* Backgrounds */
--gray-100: #f3f4f6;  /* Subtle backgrounds */
--gray-200: #e5e7eb;  /* Borders */
--gray-500: #6b7280;  /* Secondary text */
--gray-700: #374151;  /* Primary text */
--gray-900: #111827;  /* Headings */

/* Muted Accents Only */
--emerald-500: #10b981;  /* Success/Delivered */
--amber-500: #f59e0b;    /* Warning */
--red-500: #ef4444;      /* Error/Failed */
--indigo-500: #6366f1;   /* Info/Engagement */
```

### **Forbidden Patterns**
- ❌ **NO GRADIENTS**: No linear, radial, or conic gradients
- ❌ **NO STRONG BLUES**: Avoid bright blue colors (#0066cc, #0099ff)
- ❌ **NO BRIGHT COLORS**: Keep palette muted and professional

## Translations

### **Adding Translations**

1. Open `docs/analytics-translations.json`
2. Copy the relevant language section (EN, ES, or PT_BR)
3. Merge into `public/translations/{language}.json`
4. Add under the `notifications.analytics` key

### **Translation Keys**

```json
{
  "notifications": {
    "analytics": {
      "title": "Notification Analytics",
      "metrics": { ... },
      "charts": { ... },
      "filters": { ... },
      "tabs": { ... }
    }
  }
}
```

## Performance Optimization

### **Memoization**
- Components use `React.memo` for re-render prevention
- Hooks use `useMemo` for expensive calculations
- Filters use `useCallback` for stable function references

### **Data Fetching**
- Parallel fetches using `Promise.all`
- Automatic caching with time-based invalidation
- Debounced filter updates (300ms)

### **Chart Optimization**
- Recharts `ResponsiveContainer` for responsive sizing
- Limited data points for large datasets (max 90 days)
- Lazy loading for tab content

## Error Handling

### **Error States**
```typescript
// Component-level error boundaries
if (error) {
  return <ErrorDisplay error={error} onRetry={refetch} />;
}

// Hook-level error handling
try {
  const { data, error } = await supabase.rpc('get_delivery_metrics', params);
  if (error) throw error;
} catch (err) {
  setError(err);
}
```

### **Loading States**
- Skeleton loaders for all components
- Shimmer effect for cards and charts
- Loading spinners for actions (retry, refresh)

## Accessibility

### **WCAG AA Compliance**
- Semantic HTML structure
- Keyboard navigation support
- ARIA labels for interactive elements
- Focus indicators on all interactive elements
- Color contrast ratios meeting WCAG AA standards

### **Screen Reader Support**
- Table headers with proper scope
- Form labels with input associations
- Live region announcements for status updates

## Testing

### **Unit Tests** (Planned)
```bash
npm test src/hooks/useNotificationMetrics.test.ts
npm test src/components/notifications/analytics/MetricsOverview.test.tsx
```

### **Integration Tests** (Planned)
```bash
npm test src/components/notifications/analytics/NotificationAnalyticsDashboard.test.tsx
```

### **E2E Tests** (Planned)
```bash
npx playwright test tests/analytics-dashboard.spec.ts
```

## Deployment

### **Environment Variables**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### **Build**
```bash
npm run build
```

### **Preview**
```bash
npm run preview
```

## Troubleshooting

### **Common Issues**

#### 1. **No data showing**
- Verify Supabase RPC functions exist and are callable
- Check if `notification_delivery_log` table has data
- Verify dealerId is correct and has permissions

#### 2. **Slow loading**
- Check network tab for slow RPC calls
- Reduce time range for better performance
- Consider adding database indexes

#### 3. **Translation missing**
- Verify translation keys in `public/translations/{lang}.json`
- Check browser console for missing key warnings
- Ensure i18n is properly initialized

## Future Enhancements

### **Planned Features**
- [ ] Real-time websocket updates
- [ ] Advanced AI-powered anomaly detection
- [ ] Predictive analytics and forecasting
- [ ] A/B testing integration
- [ ] Custom report builder
- [ ] Slack/Email alert integration
- [ ] Mobile app analytics view
- [ ] Multi-dealership comparison
- [ ] Cost optimization recommendations
- [ ] Heatmap for time-to-read analysis

## Support

For issues or questions:
1. Check the [documentation](./NOTIFICATION_ANALYTICS_README.md)
2. Review [Supabase RPC functions](../supabase/functions/)
3. Contact the development team

## License

Proprietary - MyDetailArea Enterprise System
