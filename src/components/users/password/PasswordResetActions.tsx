import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Key, 
  Mail, 
  Lock, 
  RefreshCw, 
  Eye, 
  EyeOff,
  Copy,
  Search,
  User
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePasswordManagement } from '@/hooks/usePasswordManagement';
import { usePasswordPolicies } from '@/hooks/usePasswordPolicies';
import { supabase } from '@/integrations/supabase/client';

interface PasswordResetActionsProps {
  dealerId: number;
}

export const PasswordResetActions = ({ dealerId }: PasswordResetActionsProps) => {
  const { t } = useTranslation();
  const { resetUserPassword, loading } = usePasswordManagement();
  const { generateSecurePassword } = usePasswordPolicies(dealerId);
  
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [resetType, setResetType] = useState<'email_reset' | 'temp_password' | 'force_change'>('email_reset');
  const [tempPassword, setTempPassword] = useState('');
  const [forceChange, setForceChange] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchLoading(true);

      // Search directly in profiles table with dealer_memberships filter
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          first_name,
          last_name,
          dealer_memberships!inner(dealer_id, is_active)
        `)
        .eq('dealer_memberships.dealer_id', dealerId)
        .eq('dealer_memberships.is_active', true)
        .or(`email.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`);

      if (error) throw error;

      // Transform data to match expected format
      const transformed = (data || []).map(profile => ({
        user_id: profile.id,
        profiles: {
          id: profile.id,
          email: profile.email,
          first_name: profile.first_name,
          last_name: profile.last_name
        }
      }));

      setSearchResults(transformed);

    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const generatePassword = () => {
    const newPassword = generateSecurePassword();
    setTempPassword(newPassword);
  };

  const copyPassword = async () => {
    await navigator.clipboard.writeText(tempPassword);
  };

  const handleReset = async () => {
    if (!selectedUser) return;

    try {
      await resetUserPassword(
        selectedUser.user_id,
        resetType,
        dealerId,
        {
          tempPassword: resetType === 'temp_password' ? tempPassword : undefined,
          forceChange
        }
      );

      // Reset form
      setSelectedUser(null);
      setUserSearch('');
      setTempPassword('');
      setSearchResults([]);

    } catch (error) {
      console.error('Error resetting password:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* User Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            {t('password_management.select_user')}
          </CardTitle>
          <CardDescription>
            {t('password_management.search_user_desc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user-search">{t('password_management.search_users')}</Label>
            <Input
              id="user-search"
              placeholder={t('password_management.search_placeholder')}
              value={userSearch}
              onChange={(e) => {
                setUserSearch(e.target.value);
                searchUsers(e.target.value);
              }}
            />
          </div>

          {searchLoading && (
            <div className="text-sm text-muted-foreground">
              {t('common.searching')}...
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {searchResults.map((user) => (
                <div
                  key={user.user_id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedUser?.user_id === user.user_id
                      ? 'bg-primary/10 border-primary'
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => setSelectedUser(user)}
                >
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <div>
                      <div className="font-medium">
                        {user.profiles?.first_name} {user.profiles?.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {user.profiles?.email}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedUser && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {t('password_management.selected')}
                </Badge>
                <span className="font-medium">
                  {selectedUser.profiles?.first_name} {selectedUser.profiles?.last_name}
                </span>
                <span className="text-sm text-muted-foreground">
                  ({selectedUser.profiles?.email})
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reset Options */}
      {selectedUser && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              {t('password_management.reset_options')}
            </CardTitle>
            <CardDescription>
              {t('password_management.choose_reset_method')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Reset Type Selection */}
            <div className="space-y-2">
              <Label>{t('password_management.reset_type')}</Label>
              <Select value={resetType} onValueChange={(value: any) => setResetType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email_reset">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {t('password_management.email_reset')}
                    </div>
                  </SelectItem>
                  <SelectItem value="temp_password">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      {t('password_management.temp_password')}
                    </div>
                  </SelectItem>
                  <SelectItem value="force_change">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4" />
                      {t('password_management.force_change')}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Temporary Password */}
            {resetType === 'temp_password' && (
              <div className="space-y-2">
                <Label htmlFor="temp-password">
                  {t('password_management.temporary_password')}
                </Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="temp-password"
                      type={showPassword ? 'text' : 'password'}
                      value={tempPassword}
                      onChange={(e) => setTempPassword(e.target.value)}
                      placeholder={t('password_management.enter_temp_password')}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generatePassword}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  {tempPassword && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={copyPassword}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Force Change Option */}
            <div className="flex items-center space-x-2">
              <Switch
                id="force-change"
                checked={forceChange}
                onCheckedChange={setForceChange}
              />
              <Label htmlFor="force-change">
                {t('password_management.force_change_next_login')}
              </Label>
            </div>

            {/* Reset Button */}
            <Button
              onClick={handleReset}
              disabled={loading || !selectedUser}
              className="w-full"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Key className="h-4 w-4 mr-2" />
              )}
              {t('password_management.reset_password')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};