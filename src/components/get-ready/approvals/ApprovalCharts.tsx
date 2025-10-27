import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useApprovalAnalytics } from '@/hooks/useApprovalAnalytics';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';

const COLORS = {
  approved: '#10b981', // green
  rejected: '#ef4444', // red
  pending: '#f59e0b', // amber
};

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[200px] w-full" />
      </CardContent>
    </Card>
  );
}

export function ApprovalCharts() {
  const { t } = useTranslation();
  const { data: analytics, isLoading } = useApprovalAnalytics();

  if (isLoading) {
    return (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <ChartSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  // Prepare data for daily trends (show last 30 days for readability)
  const last30DaysTrends = analytics.dailyTrends.slice(-30);

  // Prepare data for approver performance
  const approverData = analytics.approvalsByApprover.slice(0, 8).map(approver => ({
    name: approver.approver_name.split(' ')[0], // First name only for chart
    approved: approver.total_approved,
    rejected: approver.total_rejected,
    rate: approver.approval_rate
  }));

  // Prepare data for status distribution pie chart
  const statusData = [
    { name: 'Pending', value: analytics.totalPending, color: COLORS.pending },
    { name: 'Approved', value: analytics.totalApproved90Days, color: COLORS.approved },
    { name: 'Rejected', value: analytics.totalRejected90Days, color: COLORS.rejected }
  ].filter(item => item.value > 0);

  // Prepare data for rejection reasons
  const rejectionData = analytics.topRejectionReasons.slice(0, 5);

  // Prepare data for cost trends
  const costTrends = last30DaysTrends.map(day => ({
    date: format(new Date(day.date), 'MMM dd'),
    approved: day.cost_approved,
    rejected: day.cost_rejected
  }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      notation: 'compact'
    }).format(value);
  };

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {/* Daily Approval Trends */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            {t('get_ready.approvals.charts.daily_trends') || 'Daily Approval Trends'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={last30DaysTrends}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => format(new Date(value), 'MM/dd')}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Line
                type="monotone"
                dataKey="approved"
                stroke={COLORS.approved}
                name="Approved"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="rejected"
                stroke={COLORS.rejected}
                name="Rejected"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Approvals by Approver */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            {t('get_ready.approvals.charts.by_approver') || 'Approvals by Approver'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={approverData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="approved" fill={COLORS.approved} name="Approved" />
              <Bar dataKey="rejected" fill={COLORS.rejected} name="Rejected" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Status Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            {t('get_ready.approvals.charts.status_distribution') || 'Status Distribution'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={60}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cost Trends */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            {t('get_ready.approvals.charts.cost_trends') || 'Cost Trends'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={costTrends}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={formatCurrency} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px'
                }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Area
                type="monotone"
                dataKey="approved"
                stackId="1"
                stroke={COLORS.approved}
                fill={COLORS.approved}
                fillOpacity={0.6}
                name="Approved"
              />
              <Area
                type="monotone"
                dataKey="rejected"
                stackId="2"
                stroke={COLORS.rejected}
                fill={COLORS.rejected}
                fillOpacity={0.6}
                name="Rejected"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
