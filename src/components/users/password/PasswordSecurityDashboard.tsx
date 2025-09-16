import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  Activity
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePasswordManagement } from '@/hooks/usePasswordManagement';
import { usePasswordPolicies } from '@/hooks/usePasswordPolicies';

interface PasswordSecurityDashboardProps {
  dealerId: number;
}

export const PasswordSecurityDashboard = ({ dealerId }: PasswordSecurityDashboardProps) => {
  const { t } = useTranslation();
  const { getPasswordResetRequests, getBulkOperations } = usePasswordManagement();
  const { passwordPolicy } = usePasswordPolicies(dealerId);
  
  const [stats, setStats] = useState({
    pendingResets: 0,
    completedResets: 0,
    expiredResets: 0,
    bulkOperations: 0,
    securityScore: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      const [resetRequests, bulkOps] = await Promise.all([
        getPasswordResetRequests(dealerId),
        getBulkOperations(dealerId)
      ]);

      // Calculate stats
      const pendingResets = resetRequests.filter(r => r.status === 'pending').length;
      const completedResets = resetRequests.filter(r => r.status === 'completed').length;
      const expiredResets = resetRequests.filter(r => r.status === 'expired').length;
      const bulkOperations = bulkOps.length;

      // Calculate security score based on policies
      let securityScore = 0;
      if (passwordPolicy.min_length >= 8) securityScore += 20;
      if (passwordPolicy.require_uppercase) securityScore += 15;
      if (passwordPolicy.require_lowercase) securityScore += 15;
      if (passwordPolicy.require_numbers) securityScore += 15;
      if (passwordPolicy.require_special) securityScore += 10;
      if (passwordPolicy.max_age_days <= 90) securityScore += 15;
      if (passwordPolicy.history_count >= 5) securityScore += 10;

      setStats({
        pendingResets,
        completedResets,
        expiredResets,
        bulkOperations,
        securityScore
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [dealerId, getPasswordResetRequests, getBulkOperations, passwordPolicy]);

  useEffect(() => {
    if (dealerId) {
      fetchDashboardData();
    }
  }, [dealerId, fetchDashboardData]);

  const getSecurityScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSecurityScoreBadgeVariant = (score: number): "default" | "secondary" | "destructive" | "outline" => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-16 bg-muted animate-pulse rounded" />
              <div className="h-4 w-4 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-12 bg-muted animate-pulse rounded mb-2" />
              <div className="h-3 w-24 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Score Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('password_management.security_overview')}
          </CardTitle>
          <CardDescription>
            {t('password_management.security_overview_desc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className={`text-3xl font-bold ${getSecurityScoreColor(stats.securityScore)}`}>
                {stats.securityScore}%
              </div>
              <p className="text-sm text-muted-foreground">
                {t('password_management.security_score')}
              </p>
            </div>
            <Badge variant={getSecurityScoreBadgeVariant(stats.securityScore)}>
              {stats.securityScore >= 80 ? t('password_management.security.excellent') :
               stats.securityScore >= 60 ? t('password_management.security.good') :
               t('password_management.security.needs_improvement')}
            </Badge>
          </div>
          <Progress value={stats.securityScore} className="h-2" />
        </CardContent>
      </Card>

      {/* Statistics Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Pending Resets */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('password_management.pending_resets')}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.pendingResets}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('password_management.awaiting_action')}
            </p>
          </CardContent>
        </Card>

        {/* Completed Resets */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('password_management.completed_resets')}
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.completedResets}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('password_management.successfully_completed')}
            </p>
          </CardContent>
        </Card>

        {/* Expired Resets */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('password_management.expired_resets')}
            </CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.expiredResets}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('password_management.needs_attention')}
            </p>
          </CardContent>
        </Card>

        {/* Bulk Operations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('password_management.bulk_operations')}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.bulkOperations}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('password_management.total_operations')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Security Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            {t('password_management.security_recommendations')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.securityScore < 80 && (
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span>{t('password_management.recommendations.improve_policies')}</span>
              </div>
            )}
            
            {stats.expiredResets > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <XCircle className="h-4 w-4 text-red-600" />
                <span>{t('password_management.recommendations.handle_expired', { count: stats.expiredResets })}</span>
              </div>
            )}
            
            {stats.pendingResets > 5 && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span>{t('password_management.recommendations.many_pending')}</span>
              </div>
            )}
            
            {stats.securityScore >= 80 && stats.expiredResets === 0 && stats.pendingResets <= 5 && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>{t('password_management.recommendations.excellent_security')}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};