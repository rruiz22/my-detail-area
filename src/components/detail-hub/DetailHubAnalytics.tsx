import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, LineChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { TrendingUp, TrendingDown, Clock, Users, DollarSign, Target, AlertTriangle, CheckCircle } from "lucide-react";

const DetailHubAnalytics = () => {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState("7d");

  // Mock data for analytics
  const productivityData = [
    { day: 'Mon', efficiency: 88, hours: 8.2, revenue: 1200 },
    { day: 'Tue', efficiency: 92, hours: 8.5, revenue: 1350 },
    { day: 'Wed', efficiency: 85, hours: 7.8, revenue: 1100 },
    { day: 'Thu', efficiency: 95, hours: 8.7, revenue: 1450 },
    { day: 'Fri', efficiency: 90, hours: 8.3, revenue: 1280 },
    { day: 'Sat', efficiency: 78, hours: 6.5, revenue: 980 },
    { day: 'Sun', efficiency: 82, hours: 7.2, revenue: 1050 }
  ];

  const attendanceData = [
    { month: 'Jan', onTime: 95, late: 3, absent: 2 },
    { month: 'Feb', onTime: 97, late: 2, absent: 1 },
    { month: 'Mar', onTime: 93, late: 5, absent: 2 },
    { month: 'Apr', onTime: 98, late: 1, absent: 1 },
    { month: 'May', onTime: 94, late: 4, absent: 2 },
    { month: 'Jun', onTime: 96, late: 3, absent: 1 }
  ];

  const departmentPerformance = [
    { name: 'Detail Services', value: 45, revenue: 28500, color: '#3b82f6' },
    { name: 'Car Wash', value: 30, revenue: 18200, color: '#10b981' },
    { name: 'Quality Control', value: 15, revenue: 9800, color: '#f59e0b' },
    { name: 'Management', value: 10, revenue: 6500, color: '#ef4444' }
  ];

  const timeTrackingTrends = [
    { week: 'W1', regularHours: 320, overtimeHours: 24, totalPay: 8640 },
    { week: 'W2', regularHours: 336, overtimeHours: 18, totalPay: 8988 },
    { week: 'W3', regularHours: 344, overtimeHours: 32, totalPay: 9568 },
    { week: 'W4', regularHours: 328, overtimeHours: 16, totalPay: 8736 }
  ];

  const employeeMetrics = [
    { name: 'John Smith', productivity: 95, punctuality: 98, satisfaction: 4.8 },
    { name: 'Maria Garcia', productivity: 92, punctuality: 96, satisfaction: 4.6 },
    { name: 'Mike Johnson', productivity: 88, punctuality: 94, satisfaction: 4.4 },
    { name: 'Sarah Wilson', productivity: 90, punctuality: 99, satisfaction: 4.7 },
    { name: 'David Brown', productivity: 85, punctuality: 92, satisfaction: 4.2 }
  ];

  const kpiData = {
    totalEmployees: 24,
    activeToday: 22,
    avgEfficiency: 89.2,
    totalRevenue: 64800,
    overtimeHours: 90,
    attendanceRate: 96.5,
    customerSatisfaction: 4.6,
    profitMargin: 34.2
  };

  const getTrendIcon = (value: number, threshold: number = 0) => {
    return value > threshold ? (
      <TrendingUp className="w-4 h-4 text-green-600" />
    ) : (
      <TrendingDown className="w-4 h-4 text-red-600" />
    );
  };

  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('detail_hub.analytics.title')}</h1>
          <p className="text-muted-foreground">{t('detail_hub.analytics.subtitle')}</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="90d">Last 90 Days</SelectItem>
            <SelectItem value="1y">Last Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('detail_hub.dashboard.stats.active_employees')}</p>
                <p className="text-2xl font-bold">{kpiData.activeToday}/{kpiData.totalEmployees}</p>
                <div className="flex items-center space-x-1 text-sm">
                  {getTrendIcon(2)}
                  <span className="text-green-600">+2 from last week</span>
                </div>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Efficiency</p>
                <p className="text-2xl font-bold">{formatPercentage(kpiData.avgEfficiency)}</p>
                <div className="flex items-center space-x-1 text-sm">
                  {getTrendIcon(3.2)}
                  <span className="text-green-600">+3.2% from last month</span>
                </div>
              </div>
              <Target className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Monthly Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(kpiData.totalRevenue)}</p>
                <div className="flex items-center space-x-1 text-sm">
                  {getTrendIcon(8.5)}
                  <span className="text-green-600">+8.5% from last month</span>
                </div>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('detail_hub.analytics.overtime')}</p>
                <p className="text-2xl font-bold">{kpiData.overtimeHours}h</p>
                <div className="flex items-center space-x-1 text-sm">
                  {getTrendIcon(-5.2)}
                  <span className="text-green-600">-5.2% from last month</span>
                </div>
              </div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="productivity" className="space-y-4">
        <TabsList>
          <TabsTrigger value="productivity">{t('detail_hub.analytics.productivity')}</TabsTrigger>
          <TabsTrigger value="attendance">{t('detail_hub.analytics.attendance')}</TabsTrigger>
          <TabsTrigger value="departments">{t('detail_hub.analytics.department_comparison')}</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="employees">Employee Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="productivity" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Daily Efficiency Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={productivityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip formatter={(value, name) => [
                      name === 'efficiency' ? `${value}%` : 
                      name === 'hours' ? `${value}h` : 
                      `$${value}`, 
                      name === 'efficiency' ? 'Efficiency' :
                      name === 'hours' ? 'Hours Worked' : 'Revenue'
                    ]} />
                    <Line type="monotone" dataKey="efficiency" stroke="#3b82f6" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={productivityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip formatter={(value, name) => [
                      name === 'revenue' ? `$${value}` : `${value}h`,
                      name === 'revenue' ? 'Revenue' : 'Hours'
                    ]} />
                    <Area type="monotone" dataKey="revenue" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="hours" stackId="2" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Attendance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value}%`, ""]} />
                  <Bar dataKey="onTime" fill="#10b981" name="On Time" />
                  <Bar dataKey="late" fill="#f59e0b" name="Late" />
                  <Bar dataKey="absent" fill="#ef4444" name="Absent" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Department Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={departmentPerformance}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      {departmentPerformance.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Department Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {departmentPerformance.map((dept, index) => (
                    <div key={dept.name} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: dept.color }}
                        />
                        <span className="font-medium">{dept.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(dept.revenue)}</p>
                        <p className="text-sm text-muted-foreground">{dept.value}% of total</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payroll" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Payroll Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={timeTrackingTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip formatter={(value, name) => [
                    name === 'totalPay' ? `$${value}` : `${value}h`,
                    name === 'regularHours' ? 'Regular Hours' :
                    name === 'overtimeHours' ? 'Overtime Hours' : 'Total Pay'
                  ]} />
                  <Bar dataKey="regularHours" fill="#3b82f6" name="Regular Hours" />
                  <Bar dataKey="overtimeHours" fill="#f59e0b" name="Overtime Hours" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employees" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Employee Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {employeeMetrics.map((employee, index) => (
                  <div key={employee.name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-500' : 'bg-gray-300'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{employee.name}</p>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>Productivity: {employee.productivity}%</span>
                          <span>Punctuality: {employee.punctuality}%</span>
                          <span>Rating: {employee.satisfaction}★</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {employee.productivity >= 90 ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : employee.productivity >= 85 ? (
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DetailHubAnalytics;