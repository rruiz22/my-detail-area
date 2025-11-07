import { useState } from 'react';
import { Check, ChevronsUpDown, X, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { GetReadyUser } from '@/hooks/useGetReadyUsers';
import { useTranslation } from 'react-i18next';

interface MultiUserSelectProps {
  users: GetReadyUser[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Multi-User Select Component
 *
 * A searchable multi-select component for selecting multiple users.
 * Shows user avatars, names, and emails with a clean, modern design.
 *
 * Features:
 * - Searchable user list
 * - Multiple selection with badges
 * - User avatars and initials
 * - Remove selected users
 * - Keyboard navigation
 * - Mobile responsive
 *
 * @param users - List of available users
 * @param value - Array of selected user IDs
 * @param onChange - Callback when selection changes
 * @param placeholder - Placeholder text
 * @param disabled - Disable the component
 * @param className - Additional CSS classes
 */
export function MultiUserSelect({
  users,
  value,
  onChange,
  placeholder = 'Select users...',
  disabled = false,
  className,
}: MultiUserSelectProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const selectedUsers = users.filter((user) => value.includes(user.id));

  const handleSelect = (userId: string) => {
    if (value.includes(userId)) {
      // Remove user
      onChange(value.filter((id) => id !== userId));
    } else {
      // Add user
      onChange([...value, userId]);
    }
  };

  const handleRemove = (userId: string) => {
    onChange(value.filter((id) => id !== userId));
  };

  const getDisplayName = (user: GetReadyUser): string => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    if (user.first_name) {
      return user.first_name;
    }
    return user.email;
  };

  const getInitials = (user: GetReadyUser): string => {
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    if (user.first_name) {
      return user.first_name[0].toUpperCase();
    }
    return user.email[0].toUpperCase();
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* Popover for selecting users */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'w-full justify-between',
              !value.length && 'text-muted-foreground'
            )}
          >
            {value.length > 0
              ? `${value.length} user${value.length !== 1 ? 's' : ''} selected`
              : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput
              placeholder={t('common.search_placeholder') || 'Search users...'}
            />
            <CommandList>
              <CommandEmpty>
                {t('common.no_results') || 'No users found'}
              </CommandEmpty>
              <CommandGroup>
                <ScrollArea className="h-[300px]">
                  {users.map((user) => (
                    <CommandItem
                      key={user.id}
                      value={`${user.email} ${user.first_name || ''} ${user.last_name || ''}`}
                      onSelect={() => handleSelect(user.id)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        {/* Avatar */}
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          {user.avatar_url ? (
                            <AvatarImage
                              src={user.avatar_url}
                              alt={getDisplayName(user)}
                            />
                          ) : null}
                          <AvatarFallback className="text-xs">
                            {getInitials(user)}
                          </AvatarFallback>
                        </Avatar>

                        {/* User info */}
                        <div className="flex flex-col flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {getDisplayName(user)}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </div>
                        </div>

                        {/* Checkmark */}
                        <Check
                          className={cn(
                            'ml-auto h-4 w-4 flex-shrink-0',
                            value.includes(user.id)
                              ? 'opacity-100'
                              : 'opacity-0'
                          )}
                        />
                      </div>
                    </CommandItem>
                  ))}
                </ScrollArea>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected users badges */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted/30">
          {selectedUsers.map((user) => (
            <Badge
              key={user.id}
              variant="secondary"
              className="pl-2 pr-1 py-1 gap-2 text-sm"
            >
              {/* Avatar in badge */}
              <Avatar className="h-5 w-5">
                {user.avatar_url ? (
                  <AvatarImage
                    src={user.avatar_url}
                    alt={getDisplayName(user)}
                  />
                ) : null}
                <AvatarFallback className="text-[10px]">
                  {getInitials(user)}
                </AvatarFallback>
              </Avatar>

              {/* Name */}
              <span className="truncate max-w-[150px]">
                {getDisplayName(user)}
              </span>

              {/* Remove button */}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 w-4 h-4 hover:bg-transparent"
                onClick={(e) => {
                  e.preventDefault();
                  handleRemove(user.id);
                }}
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
