import { useState, lazy, Suspense, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AvatarSystem, useAvatarPreferences } from '@/components/ui/avatar-system';
import { AvatarSelectionModal } from '@/components/ui/avatar-selection-modal';
import {
  User,
  Shield,
  Bell,
  Activity,
  Database,
  Mail,
  Edit,
  Building2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { useTabPersistence } from '@/hooks/useTabPersistence';
import { useQueryClient } from '@tanstack/react-query';

// Lazy load tab components for better performance
const PersonalInformationTab = lazy(() => import('@/components/profile/PersonalInformationTab').then(module => ({ default: module.PersonalInformationTab })));
const AccountSecurityTab = lazy(() => import('@/components/profile/AccountSecurityTab').then(module => ({ default: module.AccountSecurityTab })));
const NotificationsPreferencesTab = lazy(() => import('@/components/profile/NotificationsPreferencesTab').then(module => ({ default: module.NotificationsPreferencesTab })));
const ActivityAuditTab = lazy(() => import('@/components/profile/ActivityAuditTab').then(module => ({ default: module.ActivityAuditTab })));
const DataPrivacyTab = lazy(() => import('@/components/profile/DataPrivacyTab').then(module => ({ default: module.DataPrivacyTab })));

// Tab loading fallback component
function TabLoadingFallback() {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-full max-w-md" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Profile() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Tab persistence with localStorage - persists across page refreshes
  const [activeTab, setActiveTab] = useTabPersistence('profile');

  const { user, loading } = useAuth();
  const { enhancedUser } = usePermissions();
  const { currentDealership } = useAccessibleDealerships();
  const { seed, setSeed } = useAvatarPreferences();
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  // ✅ PERFORMANCE FIX: Prefetch tab data in background for instant tab switching
  useEffect(() => {
    if (user?.id) {
      // Prefetch all tab data in parallel (non-blocking)
      Promise.all([
        // Personal Information tab data
        queryClient.prefetchQuery({
          queryKey: ['user_preferences', user.id],
          queryFn: async () => {
            const { data } = await import('@/integrations/supabase/client').then(m => m.supabase
              .from('user_preferences')
              .select('*')
              .eq('user_id', user.id)
              .maybeSingle()
            );
            return data;
          },
          staleTime: 1000 * 60 * 5,
        }),
        // Account Security tab data
        queryClient.prefetchQuery({
          queryKey: ['user_sessions', user.id],
          queryFn: async () => {
            const { data } = await import('@/integrations/supabase/client').then(m => m.supabase
              .from('user_sessions')
              .select('*')
              .eq('user_id', user.id)
              .order('last_activity', { ascending: false })
            );
            return data || [];
          },
          staleTime: 1000 * 60 * 5,
        }),
      ]).catch(err => console.log('Prefetch failed (non-critical):', err));
    }
  }, [user?.id, queryClient]);

  // Memoized full name computation
  const fullName = useMemo(() => {
    const first = user?.first_name || '';
    const last = user?.last_name || '';
    return `${first} ${last}`.trim() || user?.email || 'User';
  }, [user?.first_name, user?.last_name, user?.email]);

  // Memoized role display
  const roleDisplay = useMemo(() => {
    if (enhancedUser?.is_system_admin) return t('roles.system_admin');
    if (enhancedUser?.custom_roles.some(role => role.role_name === 'dealer_admin')) return t('roles.dealer_admin');
    if (enhancedUser?.custom_roles.some(role => role.role_name === 'dealer_manager')) return t('roles.dealer_manager');
    return t('roles.user');
  }, [enhancedUser?.is_system_admin, enhancedUser?.custom_roles, t]);

  // Memoized callbacks for better performance
  const handleAvatarClick = useCallback(() => {
    setShowAvatarModal(true);
  }, []);

  const handleAvatarChange = useCallback((newSeed: typeof seed) => {
    setSeed(newSeed);
  }, [setSeed]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-6">
              <Skeleton className="h-24 w-24 rounded-full mx-auto sm:mx-0" />
              <div className="flex-1 space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-full max-w-md" />
                <Skeleton className="h-4 w-full max-w-xs" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Profile Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-6">
              <AvatarSystem
                name={user?.email || 'User'}
                firstName={user?.first_name}
                lastName={user?.last_name}
                email={user?.email}
                seed={seed}
                size={96}
                className="mx-auto sm:mx-0"
              />

              <div className="flex-1 space-y-4 text-center sm:text-left">
                <div>
                  <h1 className="text-2xl font-bold">{fullName}</h1>
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-2">
                    <Badge variant="secondary" className="flex items-center gap-1.5">
                      <Shield className="h-3 w-3" />
                      {roleDisplay}
                    </Badge>
                    {currentDealership && (
                      <Badge variant="outline" className="flex items-center gap-1.5">
                        <Building2 className="h-3 w-3" />
                        {currentDealership.name}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 justify-center sm:justify-start text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{user?.email}</span>
                  </div>

                  {/* Change Avatar Button */}
                  <div className="flex justify-center sm:justify-start">
                    <button
                      onClick={handleAvatarClick}
                      className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                      <span>{t('profile.change_avatar', 'Change Avatar')}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
            <TabsTrigger value="personal" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{t('profile.personal_info', 'Personal Info')}</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">{t('profile.security', 'Security')}</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">{t('profile.notifications', 'Notifications')}</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">{t('profile.activity', 'Activity')}</span>
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">{t('profile.privacy', 'Privacy')}</span>
            </TabsTrigger>
          </TabsList>


          <TabsContent value="personal">
            <Suspense fallback={<TabLoadingFallback />}>
              <PersonalInformationTab />
            </Suspense>
          </TabsContent>

          <TabsContent value="security">
            <Suspense fallback={<TabLoadingFallback />}>
              <AccountSecurityTab />
            </Suspense>
          </TabsContent>

          <TabsContent value="notifications">
            <Suspense fallback={<TabLoadingFallback />}>
              <NotificationsPreferencesTab />
            </Suspense>
          </TabsContent>

          <TabsContent value="activity">
            <Suspense fallback={<TabLoadingFallback />}>
              <ActivityAuditTab />
            </Suspense>
          </TabsContent>

          <TabsContent value="privacy">
            <Suspense fallback={<TabLoadingFallback />}>
              <DataPrivacyTab />
            </Suspense>
          </TabsContent>
        </Tabs>

        {/* Avatar Selection Modal */}
        <AvatarSelectionModal
          open={showAvatarModal}
          onClose={() => setShowAvatarModal(false)}
          userName={user?.email || 'User'}
          firstName={user?.first_name}
          lastName={user?.last_name}
          email={user?.email}
          currentSeed={seed}
          onSeedChange={handleAvatarChange}
        />
    </div>
  );
}