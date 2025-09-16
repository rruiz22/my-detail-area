import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Shield, 
  Bell, 
  Activity, 
  Database,
  MapPin,
  Mail,
  Building
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

  const getInitials = () => {
    const first = profile?.first_name?.[0] || '';
    const last = profile?.last_name?.[0] || '';
    return (first + last).toUpperCase() || profile?.email?.[0]?.toUpperCase() || 'U';
  };

  const getFullName = () => {
    const first = profile?.first_name || '';
    const last = profile?.last_name || '';
    return `${first} ${last}`.trim() || profile?.email || 'User';
  };

  const getRoleDisplay = () => {
    if (!profile?.role) return t('profile.no_role');
    
    const roleMap: Record<string, string> = {
      admin: t('profile.admin'),
      manager: t('profile.manager'),
      viewer: t('profile.viewer'),
      user: t('profile.user')
    };
    
    return roleMap[profile.role] || profile.role;
  };

  return (
    <div className="space-y-6">
        {/* Profile Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-6">
              <Avatar className="h-24 w-24 mx-auto sm:mx-0">
                <AvatarImage src={preferences?.avatar_url} />
                <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
              </Avatar>
              
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
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <Mail className="h-4 w-4" />
                    <span>{profile?.email}</span>
                  </div>
                  
                  {preferences?.phone && (
                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                      <User className="h-4 w-4" />
                      <span>{preferences.phone}</span>
                    </div>
                  )}
                  
                  {preferences?.department && (
                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                      <Building className="h-4 w-4" />
                      <span>{preferences.department}</span>
                    </div>
                  )}
                  
                  {preferences?.timezone && (
                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                      <MapPin className="h-4 w-4" />
                      <span>{preferences.timezone.replace('_', ' ')}</span>
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
              <span className="hidden sm:inline">{t('profile.personal_info')}</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">{t('profile.security')}</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">{t('profile.notifications')}</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">{t('profile.activity')}</span>
            </TabsTrigger>
            <TabsTrigger value="privacy" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">{t('profile.privacy')}</span>
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
    </div>
  );
}