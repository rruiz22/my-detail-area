import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, UserCheck, UserPlus, Mail, TrendingUp, TrendingDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface UserDashboardStats {
  totalUsers: number;
  activeUsers: number;
  pendingInvitations: number;
  recentlyJoined: number;
  roleDistribution: Array<{ role: string; count: number; color: string }>;
  dealershipDistribution: Array<{ dealership: string; userCount: number }>;
  monthlyGrowth: number;
}

interface UserStatsCardsProps {
  stats: UserDashboardStats;
}

export const UserStatsCards: React.FC<UserStatsCardsProps> = ({ stats }) => {
  const { t } = useTranslation();

  const statsCards = [
    {
      title: t('management.total_users'),
      value: stats.totalUsers,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      change: stats.monthlyGrowth,
      changeType: stats.monthlyGrowth > 0 ? 'increase' : 'decrease'
    },
    {
      title: t('management.active_users'),
      value: stats.activeUsers,
      icon: UserCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      subtitle: `${Math.round((stats.activeUsers / stats.totalUsers) * 100)}% activation rate`
    },
    {
      title: 'Pending Invitations',
      value: stats.pendingInvitations,
      icon: Mail,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      subtitle: 'Awaiting response'
    },
    {
      title: 'Recently Joined',
      value: stats.recentlyJoined,
      icon: UserPlus,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      subtitle: 'Last 7 days'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsCards.map((stat, index) => {
        const IconComponent = stat.icon;
        
        return (
          <Card key={index} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <IconComponent className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
                {stat.change !== undefined && (
                  <div className="flex items-center gap-1">
                    {stat.changeType === 'increase' ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                    <span className={`text-xs font-medium ${
                      stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {Math.abs(stat.change)}%
                    </span>
                  </div>
                )}
              </div>
              {stat.subtitle && (
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.subtitle}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};