import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Users, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '@/hooks/usePermissions';
import { useTeamPerformance } from '@/hooks/useTeamPerformance';

export function TeamPerformance() {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();

  // Calculate allowed order types based on user permissions
  const allowedOrderTypes = useMemo(() => {
    const types: string[] = [];

    if (hasPermission('sales_orders', 'view')) types.push('sales');
    if (hasPermission('service_orders', 'view')) types.push('service');
    if (hasPermission('recon_orders', 'view')) types.push('recon');
    if (hasPermission('car_wash', 'view')) types.push('carwash');

    return types;
  }, [hasPermission]);

  const { data: teamMembers = [], isLoading } = useTeamPerformance(allowedOrderTypes);

  // Get user initials for avatar
  const getInitials = (name: string): string => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Map order type to department name
  const getDepartmentName = (orderType: string): string => {
    const map: Record<string, string> = {
      'sales': t('dashboard.departments.sales'),
      'service': t('dashboard.departments.service'),
      'recon': t('dashboard.departments.recon'),
      'carwash': t('dashboard.departments.car_wash')
    };
    return map[orderType] || orderType;
  };

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 bg-muted rounded w-48 animate-pulse"></div>
          <div className="h-4 bg-muted rounded w-64 animate-pulse mt-2"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-32"></div>
                  <div className="h-3 bg-muted rounded w-24"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state - no team members
  if (teamMembers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {t('dashboard.team_performance.title')}
          </CardTitle>
          <CardDescription>
            {t('dashboard.team_performance.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Users className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              {t('dashboard.team_performance.no_team_members')}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          {t('dashboard.team_performance.title')}
        </CardTitle>
        <CardDescription>
          {t('dashboard.team_performance.subtitle')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-4">
            {teamMembers.map((member, index) => (
              <div key={member.user_id}>
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {getInitials(member.user_name)}
                    </AvatarFallback>
                  </Avatar>

                  {/* User info and stats */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{member.user_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      </div>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-3 gap-3 mt-2">
                      {/* Completed 7d */}
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">{t('dashboard.team_performance.completed_7d')}</p>
                          <p className="text-sm font-semibold">{member.completed_7d}</p>
                        </div>
                      </div>

                      {/* In Progress */}
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">{t('dashboard.team_performance.in_progress')}</p>
                          <p className="text-sm font-semibold">{member.in_progress}</p>
                        </div>
                      </div>

                      {/* Active modules */}
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">{t('dashboard.team_performance.active_in')}</p>
                          <p className="text-sm font-semibold">{member.active_modules.length} {t('dashboard.team_performance.modules')}</p>
                        </div>
                      </div>
                    </div>

                    {/* Active modules badges */}
                    {member.active_modules.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {member.active_modules.map(orderType => (
                          <Badge
                            key={orderType}
                            variant="secondary"
                            className="text-xs px-2 py-0.5"
                          >
                            {getDepartmentName(orderType)}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {index < teamMembers.length - 1 && (
                  <Separator className="mt-4" />
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
