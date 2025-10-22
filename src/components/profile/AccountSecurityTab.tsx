import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Shield,
  Key,
  Smartphone,
  Monitor,
  MapPin,
  Clock,
  AlertTriangle,
  Trash2
} from 'lucide-react';
import { useProfileMutations } from '@/hooks/useProfileMutations';
import { useUserSessions } from '@/hooks/useUserSessions';
import { PasswordStrengthMeter } from '@/components/profile/PasswordStrengthMeter';
import { formatDistanceToNow } from 'date-fns';

export function AccountSecurityTab() {
  const { t } = useTranslation();
  const { loading: profileLoading, changePassword } = useProfileMutations();
  const { sessions, loading: sessionsLoading, terminateSession, terminateAllOtherSessions } = useUserSessions();

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordStrength, setPasswordStrength] = useState(0);

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      return;
    }

    const success = await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
    if (success) {
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    }
  };

  const getDeviceIcon = (userAgent?: string) => {
    if (!userAgent) return <Monitor className="h-4 w-4" />;
    
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
      return <Smartphone className="h-4 w-4" />;
    }
    return <Monitor className="h-4 w-4" />;
  };

  const getBrowserInfo = (userAgent?: string) => {
    if (!userAgent) return 'Unknown Browser';
    
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown Browser';
  };

  return (
    <div className="space-y-6">
      {/* Password Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            {t('profile.password_management')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current_password">{t('profile.current_password')}</Label>
            <Input
              id="current_password"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
              placeholder={t('profile.enter_current_password')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new_password">{t('profile.new_password')}</Label>
            <Input
              id="new_password"
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
              placeholder={t('profile.enter_new_password')}
            />
            {/* Password Strength Meter */}
            <PasswordStrengthMeter
              password={passwordForm.newPassword}
              onStrengthChange={setPasswordStrength}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm_password">{t('profile.confirm_password')}</Label>
            <Input
              id="confirm_password"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
              placeholder={t('profile.confirm_new_password')}
            />
            {passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
              <Alert variant="destructive" className="mt-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {t('validation.passwords_no_match', 'Passwords do not match')}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <Button
            onClick={handlePasswordChange}
            disabled={
              profileLoading ||
              !passwordForm.currentPassword ||
              !passwordForm.newPassword ||
              passwordForm.newPassword !== passwordForm.confirmPassword ||
              passwordStrength < 3
            }
          >
            {profileLoading ? t('common.updating') : t('profile.change_password')}
          </Button>

          {passwordStrength < 3 && passwordForm.newPassword.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {t('profile.password_strength_requirement', 'Password must have at least "Good" strength to continue')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Two-Factor Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('profile.two_factor_auth')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">{t('profile.authenticator_app')}</p>
              <p className="text-sm text-muted-foreground">
                {t('profile.authenticator_description')}
              </p>
            </div>
            <Badge variant="outline">{t('profile.not_enabled')}</Badge>
          </div>
          
          <Button variant="outline" disabled>
            {t('profile.setup_2fa')}
          </Button>
          
          <p className="text-sm text-muted-foreground">
            {t('profile.2fa_coming_soon')}
          </p>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              {t('profile.active_sessions')}
            </CardTitle>
            {sessions.filter(s => !s.is_current).length > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={terminateAllOtherSessions}
                disabled={sessionsLoading}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                {t('profile.terminate_all_others')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sessions.map((session, index) => (
              <div key={session.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getDeviceIcon(session.user_agent)}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {getBrowserInfo(session.user_agent)}
                        </p>
                        {session.is_current && (
                          <Badge variant="default" className="text-xs">
                            {t('profile.current_session')}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {session.ip_address && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {String(session.ip_address)}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(session.last_activity), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {!session.is_current && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => terminateSession(session.id)}
                      disabled={sessionsLoading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {index < sessions.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
            
            {sessions.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                {t('profile.no_active_sessions')}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}