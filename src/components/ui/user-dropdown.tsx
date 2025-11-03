import { AvatarSystem, useAvatarPreferences } from '@/components/ui/avatar-system';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ClearCacheButton } from '@/components/ui/ClearCacheButton';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { usePermissions } from '@/hooks/usePermissions';
import { Building2, LogOut, Settings, Shield, User, UserCog } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export function UserDropdown() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { enhancedUser } = usePermissions();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { seed } = useAvatarPreferences();
  const { currentDealership } = useAccessibleDealerships();

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      setIsSigningOut(false);
    }
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const handleManagementClick = () => {
    navigate('/management');
  };

  const handleSettingsClick = () => {
    navigate('/management?tab=settings');
  };

  const getUserDisplayName = () => {
    // Priority: first_name + last_name > email username
    // Use AuthContext.user which has the fresh data from DB
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    if (user?.first_name) {
      return user.first_name;
    }
    if (user?.last_name) {
      return user.last_name;
    }
    return user?.email?.split('@')[0] || 'User';
  };

  const getUserRole = () => {
    if (enhancedUser?.is_system_admin) return t('roles.system_admin');
    if (enhancedUser?.custom_roles.some(role => role.role_name === 'dealer_admin')) return t('roles.dealer_admin');
    if (enhancedUser?.custom_roles.some(role => role.role_name === 'dealer_manager')) return t('roles.dealer_manager');
    return t('roles.user');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 overflow-hidden">
          <AvatarSystem
            name={user?.email || 'User'}
            firstName={user?.first_name}
            lastName={user?.last_name}
            email={user?.email}
            avatarUrl={user?.avatar_url}
            seed={seed}
            size={30}
            className="absolute inset-1"
          />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-64" align="end" forceMount>
        {/* User Info Header */}
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center gap-3">
              <AvatarSystem
                name={user?.email || 'User'}
                firstName={user?.first_name}
                lastName={user?.last_name}
                email={user?.email}
                avatarUrl={user?.avatar_url}
                seed={seed}
                size={36}
                className="rounded-full flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-none truncate">
                  {getUserDisplayName()}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-1">
                  {user?.email}
                </p>
              </div>
            </div>

            {/* Dealership Info */}
            {currentDealership && (
              <div className="flex items-center gap-2 px-2 py-1.5 bg-muted/50 rounded-md">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-muted-foreground truncate">
                  {currentDealership.name}
                </span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {enhancedUser?.is_system_admin ? (
                <Badge variant="destructive" className="text-xs px-2 py-1 flex-shrink-0">
                  <Shield className="w-3 h-3 mr-1" />
                  System Admin
                </Badge>
              ) : enhancedUser?.custom_roles && enhancedUser.custom_roles.length > 0 ? (
                enhancedUser.custom_roles.map((role) => (
                  <Badge key={role.id} variant="secondary" className="text-xs px-2 py-1 flex-shrink-0">
                    {role.display_name}
                  </Badge>
                ))
              ) : (
                <Badge variant="secondary" className="text-xs px-2 py-1 flex-shrink-0">
                  {getUserRole()}
                </Badge>
              )}
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Profile & Settings */}
        <DropdownMenuItem onClick={handleProfileClick} className="cursor-pointer">
          <User className="mr-2 h-4 w-4" />
          <span>{t('navigation.profile')}</span>
        </DropdownMenuItem>

        {/* Management (if admin) */}
        {enhancedUser?.is_system_admin && (
          <DropdownMenuItem onClick={handleManagementClick} className="cursor-pointer">
            <UserCog className="mr-2 h-4 w-4" />
            <span>{t('navigation.management')}</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem onClick={handleSettingsClick} className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          <span>{t('navigation.settings')}</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Clear Cache Button (for when role changes don't reflect) */}
        <div className="px-2 py-1.5">
          <ClearCacheButton />
        </div>

        <DropdownMenuSeparator />

        {/* Sign Out */}
        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{isSigningOut ? t('navigation.signing_out') : t('navigation.sign_out')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
