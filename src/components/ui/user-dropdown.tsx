import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { User, Settings, LogOut, Shield, UserCog } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useNavigate } from 'react-router-dom';
import { AvatarSystem, useAvatarPreferences } from '@/components/ui/avatar-system';
import { useUserProfile } from '@/hooks/useUserProfile';

export function UserDropdown() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { enhancedUser } = usePermissions();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { profile } = useUserProfile();
  const { seed } = useAvatarPreferences();

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

  const getUserDisplayName = () => {
    return user?.email?.split('@')[0] || 'User';
  };

  const getUserRole = () => {
    if (enhancedUser?.is_system_admin) return 'System Admin';
    if (enhancedUser?.custom_roles.some(role => role.role_name === 'dealer_admin')) return 'Dealer Admin';
    if (enhancedUser?.custom_roles.some(role => role.role_name === 'dealer_manager')) return 'Manager';
    return 'User';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 overflow-hidden">
          <AvatarSystem
            name={user?.email || 'User'}
            firstName={profile?.first_name}
            lastName={profile?.last_name}
            email={user?.email}
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
                firstName={profile?.first_name}
                lastName={profile?.last_name}
                email={user?.email}
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
            <div className="flex justify-between items-center">
              <Badge variant="secondary" className="text-xs px-2 py-1">
                {getUserRole()}
              </Badge>
              {enhancedUser?.is_system_admin && (
                <Badge variant="outline" className="text-xs px-2 py-1 border-orange-200 text-orange-700">
                  <Shield className="w-3 h-3 mr-1" />
                  Admin
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

        <DropdownMenuItem className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          <span>{t('common.settings')}</span>
        </DropdownMenuItem>

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