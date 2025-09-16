import React, { useState, useEffect, useCallback } from 'react';
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

  const fetchAnalyticsData = useCallback(async () => {
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

    } catch (error: unknown) {
      console.error('Error fetching analytics data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error loading analytics data';
      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

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
        description: t('users.analytics.messages.export_success'),
      });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('users.analytics.messages.export_error');
      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange, dealerId, fetchAnalyticsData]);

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
          <h2 className="text-2xl font-bold">{t('users.analytics.title')}</h2>
          <p className="text-muted-foreground">{t('users.analytics.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_30_days">{t('users.analytics.time_ranges.last_30_days')}</SelectItem>
              <SelectItem value="last_3_months">{t('users.analytics.time_ranges.last_3_months')}</SelectItem>
              <SelectItem value="last_6_months">{t('users.analytics.time_ranges.last_6_months')}</SelectItem>
              <SelectItem value="last_year">{t('users.analytics.time_ranges.last_year')}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportAnalytics} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            {t('users.analytics.actions.export')}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('users.analytics.metrics.total_users')}</p>
                <p className="text-3xl font-bold">{analyticsData.userGrowth[analyticsData.userGrowth.length - 1]?.total}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
            <div className="flex items-center mt-2 text-sm">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-green-500">{t('users.analytics.metrics.growth_indicator')}</span>
              <span className="text-muted-foreground ml-1">{t('users.analytics.metrics.vs_last_period')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('users.analytics.metrics.active_this_month')}</p>
                <p className="text-3xl font-bold">{analyticsData.activityMetrics.activeThisMonth}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-500" />
            </div>
            <div className="flex items-center mt-2 text-sm">
              <Activity className="h-4 w-4 text-blue-500 mr-1" />
              <span className="text-muted-foreground">
                {Math.round((analyticsData.activityMetrics.activeThisMonth / analyticsData.userGrowth[analyticsData.userGrowth.length - 1]?.total) * 100)}% {t('users.analytics.metrics.of_total')}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('users.analytics.metrics.new_this_month')}</p>
                <p className="text-3xl font-bold">{analyticsData.userGrowth[analyticsData.userGrowth.length - 1]?.new}</p>
              </div>
              <UserPlus className="h-8 w-8 text-purple-500" />
            </div>
            <div className="flex items-center mt-2 text-sm">
              <Calendar className="h-4 w-4 text-purple-500 mr-1" />
              <span className="text-muted-foreground">{t('users.analytics.metrics.growth_rate')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('users.analytics.metrics.avg_session')}</p>
                <p className="text-3xl font-bold">{analyticsData.activityMetrics.avgSessionTime}m</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
            <div className="flex items-center mt-2 text-sm">
              <span className="text-muted-foreground">{t('users.analytics.metrics.per_user_session')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('users.analytics.metrics.retention_rate')}</p>
                <p className="text-3xl font-bold">{analyticsData.activityMetrics.retentionRate}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
            <div className="flex items-center mt-2 text-sm">
              <Badge variant="outline" className="text-xs">{t('users.analytics.metrics.excellent')}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="growth" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="growth">{t('users.analytics.tabs.user_growth')}</TabsTrigger>
          <TabsTrigger value="roles">{t('users.analytics.tabs.role_distribution')}</TabsTrigger>
          <TabsTrigger value="departments">{t('users.analytics.tabs.departments')}</TabsTrigger>
          <TabsTrigger value="comparison">{t('users.analytics.tabs.comparison')}</TabsTrigger>
        </TabsList>

        <TabsContent value="growth" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('users.analytics.charts.user_growth_trends')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={analyticsData.userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="total" stroke="#3B82F6" strokeWidth={2} name={t('users.analytics.charts.total_users_legend')} />
                  <Line type="monotone" dataKey="active" stroke="#10B981" strokeWidth={2} name={t('users.analytics.charts.active_users_legend')} />
                  <Line type="monotone" dataKey="new" stroke="#F59E0B" strokeWidth={2} name={t('users.analytics.charts.new_users_legend')} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('users.analytics.charts.role_distribution')}</CardTitle>
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
                <CardTitle>{t('users.analytics.charts.role_statistics')}</CardTitle>
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
                        <Badge variant="outline">{role.count} {t('users.analytics.labels.users')}</Badge>
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
              <CardTitle>{t('users.analytics.charts.department_distribution')}</CardTitle>
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
                {t('users.analytics.charts.dealership_comparison')}
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
                        <p className="text-sm text-muted-foreground">{dealer.users} {t('users.analytics.labels.users')}</p>
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