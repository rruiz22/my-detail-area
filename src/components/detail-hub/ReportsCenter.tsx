import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BarChart, LineChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { CalendarIcon, Download, TrendingUp, Clock, DollarSign, Users, Target, FileText } from "lucide-react";
import { format } from "date-fns";

const ReportsCenter = () => {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const hoursData = [
    { name: 'Mon', hours: 185, overtime: 15 },
    { name: 'Tue', hours: 190, overtime: 12 },
    { name: 'Wed', hours: 180, overtime: 8 },
    { name: 'Thu', hours: 195, overtime: 18 },
    { name: 'Fri', hours: 200, overtime: 22 },
    { name: 'Sat', hours: 120, overtime: 5 },
    { name: 'Sun', hours: 80, overtime: 2 }
  ];

  const revenueData = [
    { name: 'Jan', revenue: 15600, expenses: 8200 },
    { name: 'Feb', revenue: 18200, expenses: 9100 },
    { name: 'Mar', revenue: 21400, expenses: 10500 },
    { name: 'Apr', revenue: 19800, expenses: 9800 },
    { name: 'May', revenue: 23100, expenses: 11200 },
    { name: 'Jun', revenue: 25400, expenses: 12100 },
    { name: 'Jul', revenue: 22900, expenses: 11800 },
    { name: 'Aug', revenue: 24600, expenses: 12400 },
    { name: 'Sep', revenue: 26100, expenses: 13200 },
    { name: 'Oct', revenue: 28400, expenses: 14100 },
    { name: 'Nov', revenue: 30200, expenses: 15000 },
    { name: 'Dec', revenue: 32800, expenses: 16200 }
  ];

  const serviceDistribution = [
    { name: 'Detail Services', value: 45, color: '#3b82f6' },
    { name: 'Car Wash', value: 30, color: '#10b981' },
    { name: 'Recon Services', value: 20, color: '#f59e0b' },
    { name: 'Other', value: 5, color: '#ef4444' }
  ];

  const employeePerformance = [
    { name: 'John Smith', hours: 172, revenue: 4300, efficiency: 95 },
    { name: 'Maria Garcia', hours: 168, revenue: 3900, efficiency: 92 },
    { name: 'Mike Johnson', hours: 165, revenue: 3200, efficiency: 88 },
    { name: 'Sarah Wilson', hours: 160, revenue: 3600, efficiency: 90 },
    { name: 'David Brown', hours: 155, revenue: 3100, efficiency: 85 }
  ];

  const monthlyStats = {
    totalRevenue: 32800,
    totalHours: 1280,
    avgEfficiency: 90,
    customerSatisfaction: 4.7,
    totalEmployees: 24,
    overtimeHours: 82
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('detail_hub.reports.title')}</h1>
          <p className="text-muted-foreground">{t('detail_hub.reports.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <CalendarIcon className="w-4 h-4 mr-2" />
                {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button>
            <Download className="w-4 h-4 mr-2" />
            {t('detail_hub.common.export')}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Monthly Revenue</p>
                <p className="text-2xl font-bold text-green-600">${monthlyStats.totalRevenue.toLocaleString()}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Hours</p>
                <p className="text-2xl font-bold">{monthlyStats.totalHours.toLocaleString()}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Efficiency</p>
                <p className="text-2xl font-bold">{monthlyStats.avgEfficiency}%</p>
              </div>
              <Target className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('detail_hub.dashboard.stats.active_employees')}</p>
                <p className="text-2xl font-bold">{monthlyStats.totalEmployees}</p>
              </div>
              <Users className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="employee">Employee Performance</TabsTrigger>
          <TabsTrigger value="services">Service Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Hours Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Weekly Hours Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={hoursData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="hours" fill="#3b82f6" name="Regular Hours" />
                    <Bar dataKey="overtime" fill="#f59e0b" name="Overtime Hours" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Service Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Service Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={serviceDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      {serviceDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue vs Expenses (Monthly)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, ""]} />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    name="Revenue"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="expenses" 
                    stroke="#ef4444" 
                    strokeWidth={3}
                    name="Expenses"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground">Profit Margin</p>
                  <p className="text-3xl font-bold text-green-600">51.6%</p>
                  <p className="text-sm text-muted-foreground">+2.3% from last month</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground">Revenue Growth</p>
                  <p className="text-3xl font-bold text-blue-600">+8.6%</p>
                  <p className="text-sm text-muted-foreground">Year over year</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground">Cost per Hour</p>
                  <p className="text-3xl font-bold text-orange-600">$12.66</p>
                  <p className="text-sm text-muted-foreground">-1.2% from last month</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="employee" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Employee Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {employeePerformance.map((employee, index) => (
                  <div key={employee.name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-500' : 'bg-gray-300'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{employee.name}</p>
                        <p className="text-sm text-muted-foreground">{employee.hours} hours this month</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${employee.revenue.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{employee.efficiency}% efficiency</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Detailed service analysis coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsCenter;