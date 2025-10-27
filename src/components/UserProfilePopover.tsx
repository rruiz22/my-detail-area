import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { LogOut, Settings, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export function UserProfilePopover() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { enhancedUser } = usePermissions();

  const handleSignOut = async () => {
    await signOut();
  };

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email || ''} />
            <AvatarFallback>
              {user.email?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-1 leading-none">
            <p className="font-medium">{user.email}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="truncate text-sm text-muted-foreground">
                {user.user_metadata?.full_name || t('auth.user')}
              </p>
              {enhancedUser?.is_system_admin ? (
                <Badge variant="destructive" className="text-xs">
                  System Admin
                </Badge>
              ) : enhancedUser?.custom_roles && enhancedUser.custom_roles.length > 0 ? (
                enhancedUser.custom_roles.map((role) => (
                  <Badge key={role.id} variant="secondary" className="text-xs">
                    {role.display_name}
                  </Badge>
                ))
              ) : null}
            </div>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile" className="gap-2">
            <User className="h-4 w-4" />
            {t('profile.title')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/settings" className="gap-2">
            <Settings className="h-4 w-4" />
            {t('navigation.settings')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2 text-destructive focus:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          {t('app.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
