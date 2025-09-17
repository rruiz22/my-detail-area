import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AvatarSystem, useAvatarPreferences } from '@/components/ui/avatar-system';
import { AvatarSelectionModal } from '@/components/ui/avatar-selection-modal';
import {
  User,
  Shield,
  Bell,
  Activity,
  Database,
  Mail,
  Edit
} from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { PersonalInformationTab } from '@/components/profile/PersonalInformationTab';
import { AccountSecurityTab } from '@/components/profile/AccountSecurityTab';
import { NotificationsPreferencesTab } from '@/components/profile/NotificationsPreferencesTab';
import { ActivityAuditTab } from '@/components/profile/ActivityAuditTab';
import { DataPrivacyTab } from '@/components/profile/DataPrivacyTab';

export default function Profile() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('personal');
  const { profile, preferences, loading } = useUserProfile();
  const { seed, setSeed } = useAvatarPreferences();
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  const getFullName = () => {
    const first = profile?.first_name || '';
    const last = profile?.last_name || '';
    return `${first} ${last}`.trim() || profile?.email || 'User';
  };

  const getRoleDisplay = () => {
    if (!profile?.role) return t('profile.no_role', 'No Role');

    const roleMap: Record<string, string> = {
      admin: t('profile.admin', 'Admin'),
      manager: t('profile.manager', 'Manager'),
      viewer: t('profile.viewer', 'Viewer'),
      user: t('profile.user', 'User')
    };

    return roleMap[profile.role] || profile.role;
  };

  const handleAvatarClick = () => {
    setShowAvatarModal(true);
  };

  const handleAvatarChange = (newSeed: typeof seed) => {
    setSeed(newSeed);
  };

  return (
    <div className="space-y-6">
        {/* Profile Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-6">
              <AvatarSystem
                name={profile?.email || 'User'}
                firstName={profile?.first_name}
                lastName={profile?.last_name}
                email={profile?.email}
                seed={seed}
                size={96}
                className="mx-auto sm:mx-0"
              />
              
              <div className="flex-1 space-y-4 text-center sm:text-left">
                <div>
                  <h1 className="text-2xl font-bold">{getFullName()}</h1>
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-2">
                    <Badge variant="secondary">
                      {getRoleDisplay()}
                    </Badge>
                    {preferences?.job_title && (
                      <Badge variant="outline">
                        {preferences.job_title}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2 justify-center sm:justify-start text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{profile?.email}</span>
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

                  {preferences?.phone && (
                    <div className="flex items-center gap-2 justify-center sm:justify-start text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>{preferences.phone}</span>
                    </div>
                  )}
                </div>
                
                {preferences?.bio && (
                  <p className="text-sm text-muted-foreground">
                    {preferences.bio}
                  </p>
                )}
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
            <PersonalInformationTab />
          </TabsContent>

          <TabsContent value="security">
            <AccountSecurityTab />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationsPreferencesTab />
          </TabsContent>

          <TabsContent value="activity">
            <ActivityAuditTab />
          </TabsContent>

          <TabsContent value="privacy">
            <DataPrivacyTab />
          </TabsContent>
        </Tabs>

        {/* Avatar Selection Modal */}
        <AvatarSelectionModal
          open={showAvatarModal}
          onClose={() => setShowAvatarModal(false)}
          userName={profile?.email || 'User'}
          firstName={profile?.first_name}
          lastName={profile?.last_name}
          email={profile?.email}
          currentSeed={seed}
          onSeedChange={handleAvatarChange}
        />
    </div>
  );
}