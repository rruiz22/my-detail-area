import { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ChartDataItem {
  name: string;
  avgDays: number;
  color: string;
  count: number;
}

interface SafeBarChartProps {
  data: ChartDataItem[];
}

/**
 * SafeBarChart - Deferred Rendering Wrapper for Recharts
 *
 * PROBLEM: Recharts BarChart is a CLASS COMPONENT that validates props in its constructor
 * BEFORE React's conditional rendering can prevent the render. This causes DecimalError
 * when transitioning from empty → valid data states.
 *
 * SOLUTION: Use useEffect to defer chart rendering until AFTER data validation completes.
 * This ensures the BarChart constructor only runs when data is confirmed valid.
 *
 * ✅ Prevents race condition between React reconciliation and class component lifecycle
 * ✅ Enterprise-grade error handling with graceful degradation
 * ✅ Maintains all existing functionality (colors, tooltips, animations)
 */
export function SafeBarChart({ data }: SafeBarChartProps) {
  const { t } = useTranslation();
  const [shouldRender, setShouldRender] = useState(false);
  const [validatedData, setValidatedData] = useState<ChartDataItem[]>([]);

  useEffect(() => {
    // Reset rendering state when data changes
    setShouldRender(false);

    // Comprehensive validation before allowing render
    const isDataValid =
      data &&
      Array.isArray(data) &&
      data.length > 0 &&
      data.every(item =>
        item &&
        typeof item.avgDays === 'number' &&
        !isNaN(item.avgDays) &&
        isFinite(item.avgDays) &&
        item.avgDays > 0 &&
        item.name &&
        item.color
      );

    if (isDataValid) {
      console.log('✅ SafeBarChart: Data validated successfully', data);
      setValidatedData(data);
      // Defer render to next tick to ensure state updates complete
      requestAnimationFrame(() => {
        setShouldRender(true);
      });
    } else {
      console.warn('⚠️ SafeBarChart: Invalid data detected', {
        hasData: !!data,
        isArray: Array.isArray(data),
        length: data?.length || 0,
        firstItem: data?.[0]
      });
      setValidatedData([]);
    }
  }, [data]);

  // ✅ FIX: Calculate domain BEFORE early returns to satisfy Rules of Hooks
  // CRITICAL: ALL useMemo hooks must be called unconditionally on every render
  const { minDomain, maxDomain, isValidDomain, ticks } = useMemo(() => {
    // If no validated data, return safe fallback domain
    if (!validatedData || validatedData.length === 0) {
      return { minDomain: 0, maxDomain: 10, isValidDomain: false, ticks: [0, 2.5, 5, 7.5, 10] };
    }

    const maxValue = Math.max(...validatedData.map(item => item.avgDays));

    // Safety checks for domain calculation
    if (isNaN(maxValue) || !isFinite(maxValue) || maxValue <= 0) {
      console.error('❌ SafeBarChart: Invalid maxValue for domain', maxValue);
      return { minDomain: 0, maxDomain: 10, isValidDomain: false, ticks: [0, 2.5, 5, 7.5, 10] };
    }

    // Ensure upperBound is never NaN or invalid
    let upperBound = Math.ceil(maxValue * 1.1);

    // Additional validation after calculation
    if (isNaN(upperBound) || !isFinite(upperBound) || upperBound <= 0) {
      console.error('❌ SafeBarChart: Invalid upperBound calculated', upperBound);
      return { minDomain: 0, maxDomain: 10, isValidDomain: false, ticks: [0, 2.5, 5, 7.5, 10] };
    }

    // ✅ Calculate explicit ticks to prevent Recharts' DecimalError
    // Generate 5 evenly-spaced ticks from 0 to upperBound
    const tickCount = 5;
    const tickStep = upperBound / (tickCount - 1);
    const calculatedTicks = Array.from({ length: tickCount }, (_, i) => {
      const tick = i * tickStep;
      return Number(tick.toFixed(1)); // Round to 1 decimal place
    });

    console.log('✅ SafeBarChart: Domain calculated', { maxValue, upperBound, ticks: calculatedTicks });

    return { minDomain: 0, maxDomain: upperBound, isValidDomain: true, ticks: calculatedTicks };
  }, [validatedData]);

  // ✅ Memoize domain array BEFORE early returns (Rules of Hooks!)
  const domainArray = useMemo<[number, number]>(() => {
    console.log('📊 Creating domain array:', [minDomain, maxDomain]);
    return [minDomain, maxDomain];
  }, [minDomain, maxDomain]);

  // Early return for loading state (AFTER all hooks)
  if (!shouldRender || validatedData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        <div className="text-center">
          <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">
            {data && data.length > 0
              ? t('get_ready.analytics.validatingChartData')
              : t('get_ready.analytics.noStepDataAvailable')}
          </p>
        </div>
      </div>
    );
  }

  // Early return for invalid domain (AFTER all hooks)
  if (!isValidDomain) {
    console.error('❌ SafeBarChart: Invalid domain detected, cannot render chart', { minDomain, maxDomain });
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        <div className="text-center">
          <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">Chart data validation error. Please try again.</p>
        </div>
      </div>
    );
  }

  // Chart render (only when data is validated)
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={validatedData}
          layout="horizontal"
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            type="number"
            domain={domainArray}
            ticks={ticks}
            label={{ value: t('get_ready.analytics.days'), position: 'insideBottom', offset: -5 }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={100}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null;
              const itemData = payload[0].payload as ChartDataItem;
              return (
                <div className="rounded-lg border bg-background p-3 shadow-lg">
                  <div className="font-semibold text-sm mb-1">{itemData.name}</div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>{t('get_ready.analytics.average')}: <span className="font-semibold text-foreground">{itemData.avgDays} {t('get_ready.analytics.days')}</span></div>
                    <div>{t('get_ready.analytics.vehicles')}: <span className="font-semibold text-foreground">{itemData.count}</span></div>
                  </div>
                </div>
              );
            }}
          />
          <Bar
            dataKey="avgDays"
            radius={[0, 4, 4, 0]}
          >
            {validatedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
