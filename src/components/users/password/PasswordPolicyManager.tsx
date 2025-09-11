import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Save, 
  Shield, 
  Clock, 
  Lock,
  AlertTriangle,
  CheckCircle,
  RotateCcw
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePasswordPolicies, defaultPasswordPolicy, type PasswordPolicy } from '@/hooks/usePasswordPolicies';

interface PasswordPolicyManagerProps {
  dealerId: number;
}

export const PasswordPolicyManager = ({ dealerId }: PasswordPolicyManagerProps) => {
  const { t } = useTranslation();
  const { 
    passwordPolicy, 
    updatePasswordPolicy, 
    validatePassword,
    generateSecurePassword,
    loading 
  } = usePasswordPolicies(dealerId);
  
  const [localPolicy, setLocalPolicy] = useState<PasswordPolicy>(passwordPolicy);
  const [testPassword, setTestPassword] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  const updateLocalPolicy = (updates: Partial<PasswordPolicy>) => {
    const newPolicy = { ...localPolicy, ...updates };
    setLocalPolicy(newPolicy);
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await updatePasswordPolicy(localPolicy);
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving policy:', error);
    }
  };

  const resetToDefaults = () => {
    setLocalPolicy(defaultPasswordPolicy);
    setHasChanges(true);
  };

  const testPasswordValidation = () => {
    return validatePassword(testPassword);
  };

  const generateSamplePassword = () => {
    const sample = generateSecurePassword();
    setTestPassword(sample);
  };

  const getSecurityLevel = (): { level: string; color: string; score: number } => {
    let score = 0;
    
    if (localPolicy.min_length >= 12) score += 25;
    else if (localPolicy.min_length >= 8) score += 15;
    
    if (localPolicy.require_uppercase) score += 15;
    if (localPolicy.require_lowercase) score += 15;
    if (localPolicy.require_numbers) score += 15;
    if (localPolicy.require_special) score += 20;
    
    if (localPolicy.max_age_days <= 30) score += 10;
    else if (localPolicy.max_age_days <= 90) score += 5;

    if (score >= 80) return { level: 'high', color: 'text-green-600', score };
    if (score >= 60) return { level: 'medium', color: 'text-yellow-600', score };
    return { level: 'low', color: 'text-red-600', score };
  };

  const securityLevel = getSecurityLevel();
  const passwordTest = testPasswordValidation();

  return (
    <div className="space-y-6">
      {/* Security Level Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              {t('password_management.security_level')}
            </div>
            <Badge variant={securityLevel.score >= 80 ? 'default' : securityLevel.score >= 60 ? 'secondary' : 'destructive'}>
              {t(`password_management.security.${securityLevel.level}`)} ({securityLevel.score}%)
            </Badge>
          </CardTitle>
          <CardDescription>
            {t('password_management.current_policy_strength')}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Password Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {t('password_management.password_requirements')}
          </CardTitle>
          <CardDescription>
            {t('password_management.configure_password_rules')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Minimum Length */}
          <div className="space-y-3">
            <Label>{t('password_management.minimum_length')}: {localPolicy.min_length}</Label>
            <Slider
              value={[localPolicy.min_length]}
              onValueChange={([value]) => updateLocalPolicy({ min_length: value })}
              max={20}
              min={6}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>6</span>
              <span>20</span>
            </div>
          </div>

          {/* Character Requirements */}
          <div className="space-y-4">
            <Label>{t('password_management.character_requirements')}</Label>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="require-uppercase" className="text-sm">
                  {t('password_management.require_uppercase')}
                </Label>
                <Switch
                  id="require-uppercase"
                  checked={localPolicy.require_uppercase}
                  onCheckedChange={(checked) => updateLocalPolicy({ require_uppercase: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="require-lowercase" className="text-sm">
                  {t('password_management.require_lowercase')}
                </Label>
                <Switch
                  id="require-lowercase"
                  checked={localPolicy.require_lowercase}
                  onCheckedChange={(checked) => updateLocalPolicy({ require_lowercase: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="require-numbers" className="text-sm">
                  {t('password_management.require_numbers')}
                </Label>
                <Switch
                  id="require-numbers"
                  checked={localPolicy.require_numbers}
                  onCheckedChange={(checked) => updateLocalPolicy({ require_numbers: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="require-special" className="text-sm">
                  {t('password_management.require_special')}
                </Label>
                <Switch
                  id="require-special"
                  checked={localPolicy.require_special}
                  onCheckedChange={(checked) => updateLocalPolicy({ require_special: checked })}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password Expiration & History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t('password_management.expiration_history')}
          </CardTitle>
          <CardDescription>
            {t('password_management.expiration_history_desc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Password Age */}
          <div className="space-y-3">
            <Label>{t('password_management.max_age_days')}: {localPolicy.max_age_days}</Label>
            <Slider
              value={[localPolicy.max_age_days]}
              onValueChange={([value]) => updateLocalPolicy({ max_age_days: value })}
              max={365}
              min={30}
              step={15}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>30 days</span>
              <span>365 days</span>
            </div>
          </div>

          {/* Password History */}
          <div className="space-y-3">
            <Label>{t('password_management.history_count')}: {localPolicy.history_count}</Label>
            <Slider
              value={[localPolicy.history_count]}
              onValueChange={([value]) => updateLocalPolicy({ history_count: value })}
              max={24}
              min={0}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>0</span>
              <span>24</span>
            </div>
          </div>

          {/* Account Lockout */}
          <div className="space-y-3">
            <Label>{t('password_management.max_attempts')}: {localPolicy.max_attempts}</Label>
            <Slider
              value={[localPolicy.max_attempts]}
              onValueChange={([value]) => updateLocalPolicy({ max_attempts: value })}
              max={10}
              min={3}
              step={1}
              className="w-full"
            />
          </div>

          <div className="space-y-3">
            <Label>{t('password_management.lockout_duration')}: {localPolicy.lockout_duration_minutes} min</Label>
            <Slider
              value={[localPolicy.lockout_duration_minutes]}
              onValueChange={([value]) => updateLocalPolicy({ lockout_duration_minutes: value })}
              max={180}
              min={5}
              step={5}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Password Tester */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t('password_management.test_password')}
          </CardTitle>
          <CardDescription>
            {t('password_management.test_password_desc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder={t('password_management.enter_test_password')}
              value={testPassword}
              onChange={(e) => setTestPassword(e.target.value)}
              className="flex-1"
            />
            <Button type="button" variant="outline" onClick={generateSamplePassword}>
              {t('password_management.generate_sample')}
            </Button>
          </div>

          {testPassword && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {passwordTest.isValid ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-600">
                      {t('password_management.password_valid')}
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium text-red-600">
                      {t('password_management.password_invalid')}
                    </span>
                  </>
                )}
              </div>
              
              {passwordTest.errors.length > 0 && (
                <ul className="text-sm text-red-600 ml-6 space-y-1">
                  {passwordTest.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={resetToDefaults}
          className="flex items-center gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          {t('password_management.reset_defaults')}
        </Button>

        <Button
          onClick={handleSave}
          disabled={loading || !hasChanges}
          className="flex items-center gap-2"
        >
          {loading ? (
            <Clock className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {t('common.save_changes')}
        </Button>
      </div>
    </div>
  );
};