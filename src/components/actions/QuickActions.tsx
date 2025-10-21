import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useContextualActions } from '@/hooks/useContextualActions';
import { Zap } from 'lucide-react';

/**
 * QuickActions Component
 *
 * Displays contextual quick action buttons based on:
 * - Current page/route
 * - User permissions
 * - Selected dealership
 *
 * Shows up to 2 primary actions as buttons, rest in dropdown menu
 */
export const QuickActions = () => {
  const { t } = useTranslation();
  const { actions, hasActions } = useContextualActions();

  // Don't render if no actions available
  if (!hasActions) {
    return null;
  }

  // Split actions: First 1-2 as buttons, rest in dropdown
  const primaryActions = actions.slice(0, 2);
  const dropdownActions = actions.slice(2);

  return (
    <div className="flex items-center gap-2">
      {/* Primary action buttons (desktop only) */}
      <div className="hidden lg:flex items-center gap-2">
        {primaryActions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.id}
              variant={action.variant || 'default'}
              size="sm"
              onClick={action.action}
              className="gap-2"
            >
              <Icon className="h-4 w-4" />
              <span className="hidden xl:inline">{t(action.label)}</span>
            </Button>
          );
        })}
      </div>

      {/* Dropdown menu for additional actions OR mobile view */}
      {(dropdownActions.length > 0 || actions.length > 0) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 lg:hidden"
              aria-label={t('quick_actions.title')}
            >
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">{t('quick_actions.title')}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{t('quick_actions.title')}</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* Mobile: Show all actions */}
            <div className="lg:hidden">
              {actions.map((action) => {
                const Icon = action.icon;
                return (
                  <DropdownMenuItem
                    key={action.id}
                    onClick={action.action}
                    className="gap-2 cursor-pointer"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span>{t(action.label)}</span>
                  </DropdownMenuItem>
                );
              })}
            </div>

            {/* Desktop: Show only overflow actions */}
            <div className="hidden lg:block">
              {dropdownActions.map((action) => {
                const Icon = action.icon;
                return (
                  <DropdownMenuItem
                    key={action.id}
                    onClick={action.action}
                    className="gap-2 cursor-pointer"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span>{t(action.label)}</span>
                  </DropdownMenuItem>
                );
              })}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Dropdown for overflow actions on desktop (if more than 2 actions) */}
      {dropdownActions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="hidden lg:flex gap-2"
              aria-label={t('quick_actions.more')}
            >
              <Zap className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{t('quick_actions.more_actions')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {dropdownActions.map((action) => {
              const Icon = action.icon;
              return (
                <DropdownMenuItem
                  key={action.id}
                  onClick={action.action}
                  className="gap-2 cursor-pointer"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span>{t(action.label)}</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
};
