import { useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { BarChart, LineChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { TrendingUp, TrendingDown, Clock, Users, DollarSign, Target, Loader2, AlertCircle } from "lucide-react";
import {
  useHoursByEmployee,
  useHoursByDepartment,
  useAttendancePatterns,
  useProductivityMetrics,
  DateRange
} from "@/hooks/useDetailHubAnalytics";

const DetailHubAnalytics = () => {
  const { t } = useTranslation();

  // Date range state - default to last 30 days
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date()
  });

  // Quick range presets
  const setQuickRange = (days: number) => {
    setDateRange({
      from: new Date(new Date().setDate(new Date().getDate() - days)),
      to: new Date()
    });
  };

  // Fetch real analytics data
  const { data: employeeHours = [], isLoading: loadingEmployeeHours, error: errorEmployeeHours } = useHoursByEmployee(dateRange);
  const { data: departmentHours = [], isLoading: loadingDeptHours, error: errorDeptHours } = useHoursByDepartment(dateRange);
  const { data: attendance = [], isLoading: loadingAttendance, error: errorAttendance } = useAttendancePatterns(dateRange);
  const { data: metrics, isLoading: loadingMetrics, error: errorMetrics } = useProductivityMetrics(dateRange);

  const isLoading = loadingEmployeeHours || loadingDeptHours || loadingAttendance || loadingMetrics;
  const hasError = errorEmployeeHours || errorDeptHours || errorAttendance || errorMetrics;

  // Transform data for charts
  const employeeChartData = employeeHours.slice(0, 10).map(e => ({
    name: e.employee_name.split(' ').map(n => n[0]).join(''), // Initials for compact display
    fullName: e.employee_name,
    hours: parseFloat(e.total_hours.toFixed(1)),
    regular: parseFloat(e.regular_hours.toFixed(1)),
    overtime: parseFloat(e.overtime_hours.toFixed(1))
  }));

  const departmentChartData = departmentHours.map(d => ({
    name: d.department.charAt(0).toUpperCase() + d.department.slice(1),
    value: parseFloat(d.total_hours.toFixed(1)),
    employees: d.employee_count
  }));

  const attendanceChartData = attendance.map(a => ({
    date: format(new Date(a.date), 'MMM dd'),
    employees: a.unique_employees,
    hours: parseFloat(a.avg_hours_per_employee.toFixed(1)),
    totalHours: parseFloat(a.total_hours.toFixed(1))
  }));

  // Department colors - Notion-style muted palette
  const DEPARTMENT_COLORS = {
    'Detail': '#10b981',      // emerald-500
    'Car Wash': '#6366f1',    // indigo-500
    'Service': '#f59e0b',     // amber-500
    'Management': '#ef4444',  // red-500
  };

  const getDepartmentColor = (name: string): string => {
    return DEPARTMENT_COLORS[name as keyof typeof DEPARTMENT_COLORS] || '#6b7280';
  };

  const getTrendIcon = (value: number, threshold: number = 0) => {
    return value > threshold ? (
      <TrendingUp className="w-4 h-4 text-green-600" />
    ) : (
      <TrendingDown className="w-4 h-4 text-red-600" />
    );
  };

  const formatHours = (value: number) => `${value.toFixed(1)}h`;

  // Loading state
  if (isLoading && !metrics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">{t('detail_hub.analytics.loading')}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (hasError) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center space-y-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <p className="text-muted-foreground">{t('detail_hub.analytics.error')}</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (metrics && metrics.total_time_entries === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('detail_hub.analytics.title')}</h1>
            <p className="text-muted-foreground">{t('detail_hub.analytics.subtitle')}</p>
          </div>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('detail_hub.analytics.no_data')}</h3>
            <p className="text-muted-foreground text-center">{t('detail_hub.analytics.no_data_desc')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Date Range Picker */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('detail_hub.analytics.title')}</h1>
          <p className="text-muted-foreground">{t('detail_hub.analytics.subtitle')}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          {/* Quick range buttons */}
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickRange(7)}
            >
              {t('detail_hub.analytics.last_7_days')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickRange(30)}
            >
              {t('detail_hub.analytics.last_30_days')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickRange(90)}
            >
              {t('detail_hub.analytics.last_90_days')}
            </Button>
          </div>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('detail_hub.analytics.total_employees')}
                </p>
                <p className="text-2xl font-bold">{metrics?.total_employees || 0}</p>
                <div className="flex items-center space-x-1 text-sm">
                  <span className="text-muted-foreground">
                    {metrics?.total_time_entries || 0} {t('detail_hub.analytics.total_time_entries').toLowerCase()}
                  </span>
                </div>
              </div>
              <Users className="w-8 h-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('detail_hub.analytics.total_hours')}
                </p>
                <p className="text-2xl font-bold">{formatHours(metrics?.total_hours || 0)}</p>
                <div className="flex items-center space-x-1 text-sm">
                  <span className="text-muted-foreground">
                    {formatHours(metrics?.avg_hours_per_employee || 0)} {t('detail_hub.analytics.avg_hours_per_employee').toLowerCase()}
                  </span>
                </div>
              </div>
              <Clock className="w-8 h-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('detail_hub.analytics.total_regular_hours')}
                </p>
                <p className="text-2xl font-bold">{formatHours(metrics?.total_regular_hours || 0)}</p>
                <div className="flex items-center space-x-1 text-sm">
                  <span className="text-muted-foreground">
                    {((metrics?.total_regular_hours || 0) / (metrics?.total_hours || 1) * 100).toFixed(1)}% of total
                  </span>
                </div>
              </div>
              <Target className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {t('detail_hub.analytics.total_overtime')}
                </p>
                <p className="text-2xl font-bold">{formatHours(metrics?.total_overtime_hours || 0)}</p>
                <div className="flex items-center space-x-1 text-sm">
                  <span className="text-muted-foreground">
                    {((metrics?.total_overtime_hours || 0) / (metrics?.total_hours || 1) * 100).toFixed(1)}% of total
                  </span>
                </div>
              </div>
              <DollarSign className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="employees" className="space-y-4">
        <TabsList>
          <TabsTrigger value="employees">{t('detail_hub.analytics.hours_by_employee')}</TabsTrigger>
          <TabsTrigger value="departments">{t('detail_hub.analytics.department_comparison')}</TabsTrigger>
          <TabsTrigger value="attendance">{t('detail_hub.analytics.attendance_trend')}</TabsTrigger>
        </TabsList>

        {/* Hours by Employee */}
        <TabsContent value="employees" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('detail_hub.analytics.hours_by_employee')}</CardTitle>
            </CardHeader>
            <CardContent>
              {employeeChartData.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                  {t('detail_hub.analytics.no_data')}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={employeeChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="name"
                      stroke="#6b7280"
                      fontSize={12}
                    />
                    <YAxis
                      stroke="#6b7280"
                      fontSize={12}
                      tickFormatter={(value) => `${value}h`}
                    />
                    <Tooltip
                      formatter={(value: number, name: string, props: any) => {
                        const displayName = name === 'regular' ? 'Regular Hours' :
                                          name === 'overtime' ? 'Overtime Hours' : 'Total Hours';
                        return [`${value.toFixed(1)}h`, displayName];
                      }}
                      labelFormatter={(label, payload) => {
                        if (payload && payload.length > 0) {
                          return payload[0].payload.fullName;
                        }
                        return label;
                      }}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="regular" fill="#10b981" name="Regular Hours" />
                    <Bar dataKey="overtime" fill="#f59e0b" name="Overtime Hours" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Employee Ranking Table */}
          <Card>
            <CardHeader>
              <CardTitle>{t('detail_hub.analytics.top_employee_performance')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {employeeHours.slice(0, 10).map((employee, index) => (
                  <div
                    key={employee.employee_id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        index === 0 ? 'bg-amber-500' :
                        index === 1 ? 'bg-slate-400' :
                        index === 2 ? 'bg-orange-500' :
                        'bg-slate-300'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{employee.employee_name}</p>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>{t('detail_hub.analytics.total_hours')}: {formatHours(employee.total_hours)}</span>
                          <span>Regular: {formatHours(employee.regular_hours)}</span>
                          {employee.overtime_hours > 0 && (
                            <span className="text-amber-600">
                              Overtime: {formatHours(employee.overtime_hours)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">{employee.total_entries} entries</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hours by Department */}
        <TabsContent value="departments" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('detail_hub.analytics.department_distribution')}</CardTitle>
              </CardHeader>
              <CardContent>
                {departmentChartData.length === 0 ? (
                  <div className="flex items-center justify-center py-16 text-muted-foreground">
                    {t('detail_hub.analytics.no_data')}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={departmentChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}h`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {departmentChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getDepartmentColor(entry.name)} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `${value.toFixed(1)}h`} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('detail_hub.analytics.department_revenue')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {departmentHours.map((dept) => (
                    <div key={dept.department} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: getDepartmentColor(dept.department.charAt(0).toUpperCase() + dept.department.slice(1)) }}
                        />
                        <span className="font-medium">
                          {dept.department.charAt(0).toUpperCase() + dept.department.slice(1)}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatHours(dept.total_hours)}</p>
                        <p className="text-sm text-muted-foreground">
                          {dept.employee_count} {dept.employee_count === 1 ? 'employee' : 'employees'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Attendance Patterns */}
        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('detail_hub.analytics.attendance_trend')}</CardTitle>
            </CardHeader>
            <CardContent>
              {attendanceChartData.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                  {t('detail_hub.analytics.no_data')}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={attendanceChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      stroke="#6b7280"
                      fontSize={12}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="#6b7280"
                      fontSize={12}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="#6b7280"
                      fontSize={12}
                      tickFormatter={(value) => `${value}h`}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        if (name === 'employees') return [value, 'Employees'];
                        if (name === 'hours') return [`${value.toFixed(1)}h`, 'Avg Hours'];
                        if (name === 'totalHours') return [`${value.toFixed(1)}h`, 'Total Hours'];
                        return [value, name];
                      }}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px'
                      }}
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="employees"
                      stroke="#6366f1"
                      strokeWidth={2}
                      name="Employees"
                      dot={{ fill: '#6366f1', r: 4 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="totalHours"
                      stroke="#10b981"
                      strokeWidth={2}
                      name="Total Hours"
                      dot={{ fill: '#10b981', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DetailHubAnalytics;
