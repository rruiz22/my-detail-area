import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { LayoutDashboard, LogOut, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export function LandingHeader() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { enhancedUser } = usePermissions();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
            style={{ boxShadow: 'var(--shadow-header)' }}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-primary to-primary-glow">
              <span className="text-sm font-bold text-primary-foreground">MDA</span>
            </div>
            <span className="hidden font-bold sm:inline-block text-foreground">
              {t('landing.app_name')}
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
              {t('landing.navigation.features')}
            </a>
            <a href="#benefits" className="text-muted-foreground hover:text-foreground transition-colors">
              {t('landing.navigation.benefits')}
            </a>
            <a href="#testimonials" className="text-muted-foreground hover:text-foreground transition-colors">
              {t('landing.navigation.testimonials')}
            </a>
          </nav>

          {/* Navigation - depends on auth state */}
          <div className="flex items-center space-x-4">
            {user ? (
              // Authenticated user menu
              <>
                <Button asChild variant="outline" size="sm">
                  <Link to="/dashboard" className="gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    {t('app.dashboard')}
                  </Link>
                </Button>

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
                      <Link to="/settings" className="gap-2">
                        <Settings className="h-4 w-4" />
                        {t('navigation.settings')}
                      </Link>
                    </DropdownMenuItem>
                    {/* DEPRECATED: User management moved to individual dealer pages (/dealers/:id → Invitations tab) */}
                    {/* <DropdownMenuItem asChild>
                      <Link to="/users" className="gap-2">
                        <User className="h-4 w-4" />
                        {t('pages.user_management')}
                      </Link>
                    </DropdownMenuItem> */}
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
              </>
            ) : (
              // Guest user menu
              <>
                <Button variant="outline" size="sm">
                  {t('landing.navigation.learn_more')}
                </Button>
                <Button asChild size="sm">
                  <Link to="/auth">{t('landing.navigation.start_trial')}</Link>
                </Button>
              </>
            )}

            {/* Theme and language controls */}
            <div className="flex items-center space-x-2">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
