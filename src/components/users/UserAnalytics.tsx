import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { 
  Users, 
  TrendingUp, 
  Calendar, 
  Download,
  Activity,
  UserCheck,
  UserPlus,
  Clock,
  Building2
} from 'lucide-react';

interface UserAnalyticsProps {
  dealerId?: number;
}

interface AnalyticsData {
  userGrowth: Array<{ month: string; total: number; new: number; active: number }>;
  roleDistribution: Array<{ role: string; count: number; percentage: number }>;
  departmentDistribution: Array<{ department: string; users: number; percentage: number }>;
  invitationStats: Array<{ status: string; count: number; percentage: number }>;
  activityMetrics: {
    totalLogins: number;
    avgSessionTime: number;
    activeThisWeek: number;
    activeThisMonth: number;
    retentionRate: number;
  };
  dealershipComparison: Array<{ dealership: string; users: number; growth: number }>;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

export const UserAnalytics: React.FC<UserAnalyticsProps> = ({ dealerId }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('last_6_months');

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);

      // Simulate comprehensive analytics data - in production, this would come from actual queries
      const mockData: AnalyticsData = {
        userGrowth: [
          { month: 'Jan', total: 45, new: 8, active: 42 },
          { month: 'Feb', total: 52, new: 7, active: 48 },
          { month: 'Mar', total: 61, new: 9, active: 55 },
          { month: 'Apr', total: 68, new: 7, active: 62 },
          { month: 'May', total: 74, new: 6, active: 69 },
          { month: 'Jun', total: 82, new: 8, active: 76 }
        ],
        roleDistribution: [
          { role: 'Dealer Admin', count: 8, percentage: 10 },
          { role: 'Sales Manager', count: 12, percentage: 15 },
          { role: 'Service Advisor', count: 20, percentage: 24 },
          { role: 'Detail Staff', count: 32, percentage: 39 },
          { role: 'Viewer', count: 10, percentage: 12 }
        ],
        departmentDistribution: [
          { department: 'Sales', users: 32, percentage: 39 },
          { department: 'Service', users: 28, percentage: 34 },
          { department: 'Detail', users: 18, percentage: 22 },
          { department: 'Management', users: 4, percentage: 5 }
        ],
        invitationStats: [
          { status: 'Accepted', count: 45, percentage: 75 },
          { status: 'Pending', count: 12, percentage: 20 },
          { status: 'Expired', count: 3, percentage: 5 }
        ],
        activityMetrics: {
          totalLogins: 1247,
          avgSessionTime: 45,
          activeThisWeek: 68,
          activeThisMonth: 76,
          retentionRate: 89
        },
        dealershipComparison: [
          { dealership: 'Main Location', users: 82, growth: 12 },
          { dealership: 'North Branch', users: 45, growth: 8 },
          { dealership: 'South Branch', users: 38, growth: 15 },
          { dealership: 'West Branch', users: 29, growth: -2 }
        ]
      };

      // Add slight delay to simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setAnalyticsData(mockData);

    } catch (error: any) {
      console.error('Error fetching analytics data:', error);
      toast({
        title: t('common.error'),
        description: error.message || 'Error loading analytics data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const exportAnalytics = async () => {
    if (!analyticsData) return;

    try {
      const report = {
        generatedAt: new Date().toISOString(),
        timeRange,
        dealerId,
        summary: {
          totalUsers: analyticsData.userGrowth[analyticsData.userGrowth.length - 1]?.total || 0,
          activeUsers: analyticsData.activityMetrics.activeThisMonth,
          retentionRate: analyticsData.activityMetrics.retentionRate,
          growthRate: 12 // Calculate from data
        },
        data: analyticsData
      };

      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-analytics-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: t('common.success'),
        description: 'Analytics report exported successfully',
      });

    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message || 'Error exporting analytics',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange, dealerId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="h-96 bg-muted rounded animate-pulse"></div>
      </div>
    );
  }

  if (!analyticsData) return null;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">User Analytics</h2>
          <p className="text-muted-foreground">Comprehensive user insights and metrics</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_30_days">Last 30 Days</SelectItem>
              <SelectItem value="last_3_months">Last 3 Months</SelectItem>
              <SelectItem value="last_6_months">Last 6 Months</SelectItem>
              <SelectItem value="last_year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportAnalytics} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-3xl font-bold">{analyticsData.userGrowth[analyticsData.userGrowth.length - 1]?.total}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
            <div className="flex items-center mt-2 text-sm">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-500">+12%</span>
              <span className="text-muted-foreground ml-1">vs last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active This Month</p>
                <p className="text-3xl font-bold">{analyticsData.activityMetrics.activeThisMonth}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-500" />
            </div>
            <div className="flex items-center mt-2 text-sm">
              <Activity className="h-4 w-4 text-blue-500 mr-1" />
              <span className="text-muted-foreground">
                {Math.round((analyticsData.activityMetrics.activeThisMonth / analyticsData.userGrowth[analyticsData.userGrowth.length - 1]?.total) * 100)}% of total
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">New This Month</p>
                <p className="text-3xl font-bold">{analyticsData.userGrowth[analyticsData.userGrowth.length - 1]?.new}</p>
              </div>
              <UserPlus className="h-8 w-8 text-purple-500" />
            </div>
            <div className="flex items-center mt-2 text-sm">
              <Calendar className="h-4 w-4 text-purple-500 mr-1" />
              <span className="text-muted-foreground">Growth rate</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Session</p>
                <p className="text-3xl font-bold">{analyticsData.activityMetrics.avgSessionTime}m</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
            <div className="flex items-center mt-2 text-sm">
              <span className="text-muted-foreground">Per user session</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Retention Rate</p>
                <p className="text-3xl font-bold">{analyticsData.activityMetrics.retentionRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
            <div className="flex items-center mt-2 text-sm">
              <Badge variant="outline" className="text-xs">Excellent</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="growth" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="growth">User Growth</TabsTrigger>
          <TabsTrigger value="roles">Role Distribution</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="growth" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Growth Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={analyticsData.userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="total" stroke="#3B82F6" strokeWidth={2} name="Total Users" />
                  <Line type="monotone" dataKey="active" stroke="#10B981" strokeWidth={2} name="Active Users" />
                  <Line type="monotone" dataKey="new" stroke="#F59E0B" strokeWidth={2} name="New Users" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Role Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analyticsData.roleDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ role, percentage }) => `${role}: ${percentage}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {analyticsData.roleDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Role Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData.roleDistribution.map((role, index) => (
                    <div key={role.role} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium">{role.role}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{role.count} users</Badge>
                        <span className="text-sm text-muted-foreground">{role.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="departments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Department Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analyticsData.departmentDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="department" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="users" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Dealership Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData.dealershipComparison.map((dealer, index) => (
                  <div key={dealer.dealership} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium">{dealer.dealership}</h4>
                        <p className="text-sm text-muted-foreground">{dealer.users} users</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={dealer.growth >= 0 ? "default" : "destructive"}>
                        {dealer.growth >= 0 ? '+' : ''}{dealer.growth}%
                      </Badge>
                      {dealer.growth >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />
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