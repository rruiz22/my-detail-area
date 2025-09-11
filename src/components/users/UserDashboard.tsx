import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PermissionGuard } from '@/components/permissions/PermissionGuard';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  UserCheck, 
  UserPlus, 
  Mail, 
  Shield, 
  Activity,
  Download,
  Filter,
  TrendingUp,
  Building2,
  Clock,
  CheckCircle
} from 'lucide-react';
import { UserStatsCards } from './UserStatsCards';
import { UserActivityFeed } from './UserActivityFeed';
import { AdvancedUserFilters } from './AdvancedUserFilters';
import { UnifiedUserManagement } from './UnifiedUserManagement';
import { InvitationManagement } from '../invitations/InvitationManagement';
import { AdvancedPermissionManager } from '@/components/permissions/AdvancedPermissionManager';
import { UserAnalytics } from './UserAnalytics';
import { UserAuditLog } from './UserAuditLog';
import { UserPasswordManagement } from './password/UserPasswordManagement';

interface UserDashboardStats {
  totalUsers: number;
  activeUsers: number;
  pendingInvitations: number;
  recentlyJoined: number;
  roleDistribution: Array<{ role: string; count: number; color: string }>;
  dealershipDistribution: Array<{ dealership: string; userCount: number }>;
  monthlyGrowth: number;
}

interface RecentActivity {
  id: string;
  type: 'user_joined' | 'role_assigned' | 'invitation_sent' | 'user_activated';
  description: string;
  timestamp: string;
  user?: string;
  metadata?: any;
}

export const UserDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  // State management
  const [stats, setStats] = useState<UserDashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);

  // Data fetching
  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch user statistics
      const [usersResult, invitationsResult, rolesResult, dealershipsResult] = await Promise.all([
        // Users with memberships (INNER JOIN - only users with memberships)
        supabase
          .from('profiles')
          .select(`
            *,
            dealer_memberships!inner (
              dealer_id,
              is_active,
              created_at
            )
          `),
        
        // Pending invitations
        supabase
          .from('dealer_invitations')
          .select('*')
          .is('accepted_at', null)
          .gt('expires_at', new Date().toISOString()),
        
        // Role distribution
        supabase.rpc('get_user_roles', { user_uuid: null }),
        
        // Dealerships for distribution
        supabase
          .from('dealerships')
          .select('id, name')
          .eq('status', 'active')
      ]);

      if (usersResult.error) throw usersResult.error;
      if (invitationsResult.error) throw invitationsResult.error;

      const users = usersResult.data || [];
      const invitations = invitationsResult.data || [];
      const dealerships = dealershipsResult.data || [];

      console.log('🔍 DEBUG UserDashboard: Invitations:', invitations.length);
      console.log('🔍 DEBUG UserDashboard: Dealerships:', dealerships.length);

      // Calculate stats
      const activeUsers = users.filter(user => 
        user.dealer_memberships?.some((m: any) => m.is_active)
      );

      const recentlyJoined = users.filter(user => {
        const joinDate = new Date(user.created_at);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return joinDate > weekAgo;
      });

      // Role distribution (mock data for now - would need proper role aggregation)
      const roleDistribution = [
        { role: 'Dealer Admin', count: Math.floor(users.length * 0.1), color: 'bg-blue-500' },
        { role: 'Sales Manager', count: Math.floor(users.length * 0.15), color: 'bg-green-500' },
        { role: 'Service Advisor', count: Math.floor(users.length * 0.25), color: 'bg-yellow-500' },
        { role: 'Detail Staff', count: Math.floor(users.length * 0.4), color: 'bg-purple-500' },
        { role: 'Viewer', count: Math.floor(users.length * 0.1), color: 'bg-gray-500' }
      ];

      // Dealership distribution
      const dealershipDistribution = dealerships.map(dealer => ({
        dealership: dealer.name,
        userCount: users.filter(user => 
          user.dealer_memberships?.some((m: any) => m.dealer_id === dealer.id)
        ).length
      }));

      const dashboardStats: UserDashboardStats = {
        totalUsers: users.length,
        activeUsers: activeUsers.length,
        pendingInvitations: invitations.length,
        recentlyJoined: recentlyJoined.length,
        roleDistribution,
        dealershipDistribution,
        monthlyGrowth: Math.round(((recentlyJoined.length * 4) / users.length) * 100) // Approximate monthly growth
      };

      setStats(dashboardStats);

      // Mock recent activity (in a real app, this would come from an activity log)
      const mockActivity: RecentActivity[] = [
        {
          id: '1',
          type: 'user_joined',
          description: 'New user joined the system',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          user: 'john@dealer.com'
        },
        {
          id: '2',
          type: 'role_assigned',
          description: 'Role assigned to user',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          user: 'sarah@dealer.com'
        },
        {
          id: '3',
          type: 'invitation_sent',
          description: 'Invitation sent to new user',
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          user: 'mike@dealer.com'
        }
      ];

      setRecentActivity(mockActivity);

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: t('common.error'),
        description: error.message || 'Error loading dashboard data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
    toast({
      title: t('common.success'),
      description: 'Dashboard data refreshed',
    });
  };

  const handleExportUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          email,
          first_name,
          last_name,
          user_type,
          created_at,
          dealer_memberships (
            dealer_id,
            is_active
          )
        `);

      if (error) throw error;

      // Convert to CSV format
      const csvContent = [
        ['Email', 'First Name', 'Last Name', 'Type', 'Created At', 'Active'].join(','),
        ...data.map(user => [
          user.email,
          user.first_name || '',
          user.last_name || '',
          user.user_type,
          new Date(user.created_at).toLocaleDateString(),
          user.dealer_memberships?.some((m: any) => m.is_active) ? 'Yes' : 'No'
        ].join(','))
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: t('common.success'),
        description: 'Users exported successfully',
      });
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message || 'Error exporting users',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

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

  return (
    <PermissionGuard module="users" permission="read">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('user_management.title')}</h1>
            <p className="text-muted-foreground">
              {t('user_management.manage_description')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              <Activity className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {t('common.refresh')}
            </Button>
            <PermissionGuard module="users" permission="admin">
              <Button
                variant="outline"
                onClick={handleExportUsers}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                {t('user_management.export_report')}
              </Button>
            </PermissionGuard>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && <UserStatsCards stats={stats} />}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="overview">{t('management.overview')}</TabsTrigger>
            <TabsTrigger value="users">{t('management.users')}</TabsTrigger>
            <TabsTrigger value="invitations">Invitations</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
            <TabsTrigger value="activity">{t('common.activity')}</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="password-security">Password Security</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Role Distribution Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Role Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats?.roleDistribution.map((role, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${role.color}`}></div>
                          <span className="text-sm font-medium">{role.role}</span>
                        </div>
                        <Badge variant="outline">{role.count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Dealership Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Dealership Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stats?.dealershipDistribution.slice(0, 5).map((dealer, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{dealer.dealership}</span>
                        <Badge variant="outline">{dealer.userCount} users</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <UnifiedUserManagement />
          </TabsContent>

          <TabsContent value="activity">
            <UserActivityFeed activities={recentActivity} />
          </TabsContent>

          <TabsContent value="analytics">
            <UserAnalytics dealerId={stats?.dealershipDistribution?.[0] ? 5 : undefined} />
          </TabsContent>

          <TabsContent value="invitations">
            <InvitationManagement />
          </TabsContent>

          <TabsContent value="permissions">
            <AdvancedPermissionManager />
          </TabsContent>

          <TabsContent value="audit">
            <UserAuditLog dealerId={stats?.dealershipDistribution?.[0] ? 5 : undefined} />
          </TabsContent>

        <TabsContent value="notifications">
          <div className="text-center py-8">
            <h3 className="text-lg font-medium">Notification Center</h3>
            <p className="text-muted-foreground">Smart notification management coming soon</p>
          </div>
        </TabsContent>

        <TabsContent value="password-security">
          <PermissionGuard module="users" permission="write">
            <UserPasswordManagement />
          </PermissionGuard>
        </TabsContent>
        </Tabs>
      </div>
    </PermissionGuard>
  );
};