---
name: mydetailarea-analytics
description: Advanced business intelligence and predictive analytics for MyDetailArea. Implements KPI tracking, revenue forecasting, performance analytics, anomaly detection, trend analysis, and custom dashboards using Recharts and statistical models. Use when building analytics dashboards, generating insights, forecasting metrics, or implementing data-driven decision support.
license: MIT
---

# MyDetailArea Advanced Analytics & BI

Advanced business intelligence, predictive analytics, and data-driven insights for dealership operations.

## Purpose

Provide comprehensive analytics capabilities including KPI tracking, trend analysis, revenue forecasting, anomaly detection, and custom BI dashboards to enable data-driven decision making.

## When to Use

Use this skill when:
- Building executive dashboards with KPIs
- Implementing revenue forecasting models
- Creating performance analytics
- Detecting anomalies in operations
- Analyzing trends and patterns
- Building custom BI reports
- Implementing predictive models
- Creating data visualization dashboards
- Generating insights from historical data

## Analytics Stack

### Data Visualization
- **Recharts 2.15.4** - Primary charting library
- **date-fns 3.6.0** - Date manipulation

### Data Processing
- **TanStack Query** - Data fetching and caching
- **PostgreSQL functions** - Server-side aggregations

### Statistics (Client-Side)
- **simple-statistics** - Statistical calculations
- **regression** - Trend line calculations

## Analytics Architecture

### Metrics Layer

```typescript
// Core metrics definitions
interface Metric {
  id: string;
  name: string;
  description: string;
  query: (filters: Filters) => Promise<MetricValue>;
  format: (value: number) => string;
  trend?: 'higher_is_better' | 'lower_is_better';
}

const coreMetrics: Metric[] = [
  {
    id: 'total_revenue',
    name: 'Total Revenue',
    description: 'Sum of all completed order revenue',
    query: async (filters) => {
      const { data } = await supabase
        .rpc('calculate_revenue', {
          start_date: filters.startDate,
          end_date: filters.endDate,
          dealer_id: filters.dealerId
        });
      return data;
    },
    format: (value) => `$${value.toLocaleString()}`,
    trend: 'higher_is_better'
  },
  {
    id: 'avg_order_value',
    name: 'Average Order Value',
    description: 'Average revenue per order',
    query: async (filters) => {
      const { data } = await supabase
        .rpc('calculate_avg_order_value', filters);
      return data;
    },
    format: (value) => `$${value.toFixed(2)}`,
    trend: 'higher_is_better'
  },
  {
    id: 'order_completion_time',
    name: 'Avg Completion Time',
    description: 'Average time from creation to completion',
    query: async (filters) => {
      const { data } = await supabase
        .rpc('calculate_avg_completion_time', filters);
      return data; // in hours
    },
    format: (value) => `${value.toFixed(1)}h`,
    trend: 'lower_is_better'
  }
];
```

### Forecasting Engine

```typescript
// Revenue forecasting using linear regression
import { linearRegression } from 'simple-statistics';

interface ForecastResult {
  predictions: Array<{ date: string; value: number }>;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

async function forecastRevenue(
  historicalMonths: number = 12,
  forecastMonths: number = 3
): Promise<ForecastResult> {
  // Get historical revenue data
  const { data: historical } = await supabase
    .rpc('get_monthly_revenue', {
      months: historicalMonths
    });

  // Prepare data for regression
  const dataPoints = historical.map((item, index) => [index, item.revenue]);

  // Calculate linear regression
  const regression = linearRegression(dataPoints);
  const { m: slope, b: intercept } = regression;

  // Generate predictions
  const predictions = [];
  const lastIndex = dataPoints.length - 1;

  for (let i = 1; i <= forecastMonths; i++) {
    const x = lastIndex + i;
    const predictedRevenue = slope * x + intercept;

    predictions.push({
      date: format(addMonths(new Date(), i), 'MMM yyyy'),
      value: Math.max(0, predictedRevenue) // Revenue can't be negative
    });
  }

  // Calculate confidence (R²)
  const confidence = calculateRSquared(dataPoints, slope, intercept);

  // Determine trend
  const trend = slope > 100 ? 'increasing' :
                slope < -100 ? 'decreasing' : 'stable';

  return { predictions, confidence, trend };
}

function calculateRSquared(
  points: number[][],
  slope: number,
  intercept: number
): number {
  const yMean = points.reduce((sum, [, y]) => sum + y, 0) / points.length;

  const ssTotal = points.reduce((sum, [, y]) => sum + Math.pow(y - yMean, 2), 0);
  const ssResidual = points.reduce(
    (sum, [x, y]) => sum + Math.pow(y - (slope * x + intercept), 2),
    0
  );

  return 1 - (ssResidual / ssTotal);
}
```

### Anomaly Detection

```typescript
// Detect unusual patterns in orders
interface Anomaly {
  date: string;
  metric: string;
  value: number;
  expectedRange: [number, number];
  severity: 'low' | 'medium' | 'high';
}

async function detectAnomalies(
  metric: string,
  lookbackDays: number = 30
): Promise<Anomaly[]> {
  // Get historical data
  const { data } = await supabase
    .rpc('get_daily_metric', {
      metric_name: metric,
      days: lookbackDays
    });

  // Calculate statistics
  const values = data.map(d => d.value);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(
    values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
  );

  // Detect anomalies (>2 standard deviations)
  const anomalies: Anomaly[] = [];

  data.forEach(item => {
    const zScore = Math.abs((item.value - mean) / stdDev);

    if (zScore > 2) {
      anomalies.push({
        date: item.date,
        metric,
        value: item.value,
        expectedRange: [mean - 2 * stdDev, mean + 2 * stdDev],
        severity: zScore > 3 ? 'high' : zScore > 2.5 ? 'medium' : 'low'
      });
    }
  });

  return anomalies;
}
```

### Performance Analytics

```typescript
// Technician performance metrics
interface TechPerformance {
  tech_id: string;
  tech_name: string;
  metrics: {
    orders_completed: number;
    avg_completion_time: number;
    quality_score: number;
    revenue_generated: number;
    customer_satisfaction: number;
  };
  rank: number;
}

async function analyzeTechPerformance(
  dealerId: number,
  period: DateRange
): Promise<TechPerformance[]> {
  const { data } = await supabase
    .rpc('calculate_tech_performance', {
      dealer_id: dealerId,
      start_date: period.start,
      end_date: period.end
    });

  // Rank by composite score
  const scored = data.map(tech => ({
    ...tech,
    composite_score:
      tech.orders_completed * 0.3 +
      (100 - tech.avg_completion_time) * 0.2 +
      tech.quality_score * 0.3 +
      (tech.revenue_generated / 1000) * 0.2
  }));

  return scored
    .sort((a, b) => b.composite_score - a.composite_score)
    .map((tech, idx) => ({ ...tech, rank: idx + 1 }));
}
```

### Dashboard Components

```typescript
// Executive Dashboard
export function ExecutiveDashboard() {
  const [period, setPeriod] = useState<DateRange>(last30Days());
  const { data: metrics } = useExecutiveMetrics(period);
  const { data: forecast } = useRevenueForecast();
  const { data: anomalies } = useAnomalies(period);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Revenue"
          value={metrics?.revenue}
          trend={metrics?.revenueTrend}
          icon={DollarSign}
        />
        <MetricCard
          label="Orders"
          value={metrics?.orderCount}
          trend={metrics?.orderTrend}
          icon={ShoppingCart}
        />
        <MetricCard
          label="Avg Order Value"
          value={metrics?.avgOrderValue}
          trend={metrics?.aovTrend}
          icon={TrendingUp}
        />
        <MetricCard
          label="Completion Rate"
          value={`${metrics?.completionRate}%`}
          trend={metrics?.completionTrend}
          icon={CheckCircle}
        />
      </div>

      {/* Revenue Forecast */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Forecast (Next 3 Months)</CardTitle>
          <CardDescription>
            Confidence: {(forecast?.confidence * 100).toFixed(1)}%
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={forecast?.predictions}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="hsl(211, 100%, 50%)"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Anomalies */}
      {anomalies?.length > 0 && (
        <Alert variant="warning">
          <AlertTitle>Anomalies Detected</AlertTitle>
          <AlertDescription>
            {anomalies.length} unusual patterns detected in the last 30 days
            <Button variant="link" onClick={() => viewAnomalies()}>
              View Details
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Performance Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performers</CardTitle>
        </CardHeader>
        <CardContent>
          <TechPerformanceTable data={metrics?.topTechs} />
        </CardContent>
      </Card>
    </div>
  );
}
```

## PostgreSQL Analytics Functions

```sql
-- Revenue by period with comparison
CREATE OR REPLACE FUNCTION calculate_revenue_with_comparison(
  p_dealer_id INTEGER,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  period_revenue DECIMAL,
  previous_revenue DECIMAL,
  change_percent DECIMAL
) AS $$
DECLARE
  v_period_days INTEGER;
BEGIN
  v_period_days := EXTRACT(EPOCH FROM (p_end_date - p_start_date)) / 86400;

  -- Current period revenue
  SELECT COALESCE(SUM(total_amount), 0)
  INTO period_revenue
  FROM orders
  WHERE dealer_id = p_dealer_id
    AND status = 'completed'
    AND completed_at BETWEEN p_start_date AND p_end_date;

  -- Previous period revenue
  SELECT COALESCE(SUM(total_amount), 0)
  INTO previous_revenue
  FROM orders
  WHERE dealer_id = p_dealer_id
    AND status = 'completed'
    AND completed_at BETWEEN
      (p_start_date - (v_period_days || ' days')::INTERVAL)
      AND p_start_date;

  -- Calculate change
  IF previous_revenue > 0 THEN
    change_percent := ((period_revenue - previous_revenue) / previous_revenue) * 100;
  ELSE
    change_percent := 0;
  END IF;

  RETURN QUERY SELECT period_revenue, previous_revenue, change_percent;
END;
$$ LANGUAGE plpgsql;
```

```sql
-- Top performing technicians
CREATE OR REPLACE FUNCTION get_top_technicians(
  p_dealer_id INTEGER,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  tech_id UUID,
  tech_name TEXT,
  orders_completed INTEGER,
  total_revenue DECIMAL,
  avg_completion_hours DECIMAL,
  quality_score DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id AS tech_id,
    u.name AS tech_name,
    COUNT(o.id)::INTEGER AS orders_completed,
    COALESCE(SUM(o.total_amount), 0) AS total_revenue,
    COALESCE(AVG(EXTRACT(EPOCH FROM (o.completed_at - o.created_at)) / 3600), 0)::DECIMAL AS avg_completion_hours,
    COALESCE(AVG(o.quality_rating), 0)::DECIMAL AS quality_score
  FROM users u
  LEFT JOIN orders o ON o.assigned_to = u.id
    AND o.status = 'completed'
    AND o.completed_at BETWEEN p_start_date AND p_end_date
  WHERE u.dealer_id = p_dealer_id
    AND u.role IN ('dealer_user', 'dealer_manager')
  GROUP BY u.id, u.name
  ORDER BY total_revenue DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
```

## Trend Analysis

```typescript
// Identify trends in key metrics
import { linearRegression, rSquared } from 'simple-statistics';

interface TrendAnalysis {
  metric: string;
  direction: 'increasing' | 'decreasing' | 'stable';
  strength: number; // R² value (0-1)
  changeRate: number; // Per day/month
  prediction: number; // Next period value
}

async function analyzeTrend(
  metric: string,
  period: 'daily' | 'weekly' | 'monthly',
  lookback: number = 12
): Promise<TrendAnalysis> {
  // Fetch historical data
  const { data } = await supabase
    .rpc(`get_${period}_${metric}`, { periods: lookback });

  // Prepare for regression
  const points = data.map((item, index) => [index, item.value]);

  // Calculate regression
  const regression = linearRegression(points);
  const r2 = rSquared(points, regression);

  // Determine direction
  let direction: 'increasing' | 'decreasing' | 'stable';
  if (regression.m > 0.05) direction = 'increasing';
  else if (regression.m < -0.05) direction = 'decreasing';
  else direction = 'stable';

  // Predict next period
  const prediction = regression.m * lookback + regression.b;

  return {
    metric,
    direction,
    strength: r2,
    changeRate: regression.m,
    prediction: Math.max(0, prediction)
  };
}
```

## Cohort Analysis

```typescript
// Customer retention cohort analysis
interface Cohort {
  cohort: string; // Month of first order
  customers: number;
  retention: {
    month1: number;
    month2: number;
    month3: number;
    month6: number;
    month12: number;
  };
}

async function analyzeCohorts(dealerId: number): Promise<Cohort[]> {
  const { data } = await supabase.rpc('calculate_cohort_retention', {
    dealer_id: dealerId
  });

  return data.map(cohort => ({
    cohort: format(new Date(cohort.cohort_month), 'MMM yyyy'),
    customers: cohort.total_customers,
    retention: {
      month1: (cohort.retained_month1 / cohort.total_customers) * 100,
      month2: (cohort.retained_month2 / cohort.total_customers) * 100,
      month3: (cohort.retained_month3 / cohort.total_customers) * 100,
      month6: (cohort.retained_month6 / cohort.total_customers) * 100,
      month12: (cohort.retained_month12 / cohort.total_customers) * 100
    }
  }));
}
```

## Custom Dashboard Builder

```typescript
// Configurable dashboard system
interface DashboardConfig {
  id: string;
  name: string;
  widgets: Widget[];
  filters: GlobalFilters;
  refreshInterval?: number;
}

interface Widget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'heatmap';
  title: string;
  dataSource: string;
  config: WidgetConfig;
  size: { cols: number; rows: number };
  position: { x: number; y: number };
}

export function CustomDashboard({ config }: { config: DashboardConfig }) {
  const [filters, setFilters] = useState(config.filters);

  // Auto-refresh
  useEffect(() => {
    if (!config.refreshInterval) return;

    const interval = setInterval(() => {
      queryClient.invalidateQueries(['dashboard', config.id]);
    }, config.refreshInterval);

    return () => clearInterval(interval);
  }, [config.refreshInterval]);

  return (
    <div className="space-y-6">
      {/* Global Filters */}
      <DashboardFilters filters={filters} onChange={setFilters} />

      {/* Widget Grid */}
      <div className="grid grid-cols-12 gap-4">
        {config.widgets.map(widget => (
          <div
            key={widget.id}
            className={`col-span-${widget.size.cols} row-span-${widget.size.rows}`}
          >
            <DashboardWidget widget={widget} filters={filters} />
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardWidget({ widget, filters }: WidgetProps) {
  const { data, isLoading } = useWidgetData(widget.dataSource, filters);

  if (isLoading) return <WidgetSkeleton />;

  switch (widget.type) {
    case 'metric':
      return <MetricWidget data={data} config={widget.config} />;
    case 'chart':
      return <ChartWidget data={data} config={widget.config} />;
    case 'table':
      return <TableWidget data={data} config={widget.config} />;
    case 'heatmap':
      return <HeatmapWidget data={data} config={widget.config} />;
  }
}
```

## Advanced Visualizations

```typescript
// Heatmap for order volume by hour/day
export function OrderHeatmap({ data }: { data: HeatmapData }) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="grid grid-cols-25 gap-1">
      {/* Header row */}
      <div className="col-span-1" />
      {hours.map(hour => (
        <div key={hour} className="text-xs text-center">
          {hour}
        </div>
      ))}

      {/* Data rows */}
      {days.map((day, dayIdx) => (
        <>
          <div className="text-xs flex items-center">{day}</div>
          {hours.map(hour => {
            const value = data[dayIdx]?.[hour] || 0;
            const intensity = Math.min(value / data.max * 100, 100);

            return (
              <div
                key={`${day}-${hour}`}
                className="aspect-square rounded"
                style={{
                  backgroundColor: `rgba(99, 102, 241, ${intensity / 100})`
                }}
                title={`${day} ${hour}:00 - ${value} orders`}
              />
            );
          })}
        </>
      ))}
    </div>
  );
}
```

## Real-Time Analytics

```typescript
// Live metrics with Supabase real-time
export function LiveMetricCard({ metric }: { metric: string }) {
  const [value, setValue] = useState<number>(0);

  useEffect(() => {
    // Subscribe to changes
    const channel = supabase
      .channel('live-metrics')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `status=eq.completed`
        },
        async () => {
          // Recalculate metric
          const newValue = await calculateMetric(metric);
          setValue(newValue);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [metric]);

  return (
    <MetricCard
      label={metric}
      value={value}
      icon={Activity}
      badge="LIVE"
    />
  );
}
```

## Export & Sharing

```typescript
// Export dashboard to PDF/Excel
async function exportDashboard(config: DashboardConfig) {
  // Fetch all widget data
  const widgetData = await Promise.all(
    config.widgets.map(async w => ({
      title: w.title,
      data: await fetchWidgetData(w.dataSource)
    }))
  );

  // Generate Excel workbook
  const workbook = XLSX.utils.book_new();

  widgetData.forEach(({ title, data }) => {
    const sheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, sheet, title.slice(0, 31));
  });

  XLSX.writeFile(workbook, `dashboard_${config.name}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
}
```

## Best Practices

1. **Server-Side Aggregation** - Use PostgreSQL functions for heavy calculations
2. **Caching Strategy** - Cache expensive analytics queries
3. **Incremental Updates** - Don't recalculate everything each time
4. **Date Range Validation** - Prevent querying excessive date ranges
5. **Performance Budgets** - Set max query times
6. **Visualization Limits** - Cap data points for charts (max 100-200)
7. **Real-Time Selectively** - Not all metrics need real-time updates
8. **Export Options** - Provide PDF/Excel export for all dashboards
9. **Accessibility** - Ensure charts are screen-reader friendly
10. **Mobile Responsive** - Dashboards work on tablets/mobile

## Reference Files

- **[Forecasting Models](./references/forecasting-models.md)** - Predictive analytics patterns
- **[Visualization Library](./references/visualization-library.md)** - Chart configurations
- **[PostgreSQL Analytics](./references/pg-analytics-functions.md)** - Server-side functions
- **[Dashboard Templates](./references/dashboard-templates.md)** - Pre-built dashboards
