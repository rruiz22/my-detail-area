import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Building2, 
  Shield, 
  TrendingUp, 
  Activity,
  ArrowRight,
  UserCheck,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface OverviewStats {
  totalUsers: number;
  activeUsers: number;
  totalDealerships: number;
  activeDealerships: number;
  rolesAssigned: number;
  systemHealth: number;
}

export const ManagementOverview = () => {
  const [stats, setStats] = useState<OverviewStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalDealerships: 0,
    activeDealerships: 0,
    rolesAssigned: 0,
    systemHealth: 95
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchOverviewStats();
  }, []);

  const fetchOverviewStats = async () => {
    try {
      setLoading(true);

      // Fetch user statistics
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id, user_type');

      if (usersError) throw usersError;

      // Fetch dealership statistics
      const { data: dealerships, error: dealershipsError } = await supabase
        .from('dealerships')
        .select('id, status')
        .is('deleted_at', null);

      if (dealershipsError) throw dealershipsError;

      // Fetch role assignments
      const { data: roleAssignments, error: rolesError } = await supabase
        .from('user_role_assignments')
        .select('id')
        .eq('is_active', true);

      if (rolesError) throw rolesError;

      setStats({
        totalUsers: users?.length || 0,
        activeUsers: users?.length || 0, // Assuming all users are active for now
        totalDealerships: dealerships?.length || 0,
        activeDealerships: dealerships?.filter(d => d.status === 'active').length || 0,
        rolesAssigned: roleAssignments?.length || 0,
        systemHealth: 95 // Mock system health percentage
      });
    } catch (error) {
      console.error('Error fetching overview stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch overview statistics',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      subtitle: `${stats.activeUsers} active`,
      icon: Users,
      trend: '+12%',
      color: 'text-primary',
      action: () => navigate('/users')
    },
    {
      title: 'Dealerships',
      value: stats.totalDealerships,
      subtitle: `${stats.activeDealerships} active`,
      icon: Building2,
      trend: '+8%',
      color: 'text-accent',
      action: () => navigate('/dealerships')
    },
    {
      title: 'Role Assignments',
      value: stats.rolesAssigned,
      subtitle: 'Total assignments',
      icon: Shield,
      trend: '+15%',
      color: 'text-success',
      action: () => {}
    },
    {
      title: 'System Health',
      value: `${stats.systemHealth}%`,
      subtitle: 'Overall status',
      icon: Activity,
      trend: 'Excellent',
      color: 'text-success',
      action: () => {}
    }
  ];

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, index) => (
          <Card 
            key={index} 
            className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]"
            onClick={card.action}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-xs text-muted-foreground">
                    {card.subtitle}
                  </p>
                </div>
                <div className={`${card.color}`}>
                  <card.icon className="h-8 w-8" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-xs">
                <TrendingUp className="h-3 w-3 mr-1 text-success" />
                <span className="text-success">{card.trend}</span>
                <span className="text-muted-foreground ml-1">from last month</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>
              Latest user and system activities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  <span className="text-sm">New user registered: john@example.com</span>
                </div>
                <span className="text-xs text-muted-foreground">2m ago</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-accent rounded-full" />
                  <span className="text-sm">Dealership updated: AutoMax Inc</span>
                </div>
                <span className="text-xs text-muted-foreground">5m ago</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-success rounded-full" />
                  <span className="text-sm">Role assigned: Manager to Sarah</span>
                </div>
                <span className="text-xs text-muted-foreground">12m ago</span>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full">
              View All Activities
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              System Status
            </CardTitle>
            <CardDescription>
              Monitor system health and performance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Database Performance</span>
                  <span className="text-success">Excellent</span>
                </div>
                <Progress value={95} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>API Response Time</span>
                  <span className="text-success">Good</span>
                </div>
                <Progress value={88} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>User Authentication</span>
                  <span className="text-success">Stable</span>
                </div>
                <Progress value={100} className="h-2" />
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full">
              View Detailed Metrics
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};