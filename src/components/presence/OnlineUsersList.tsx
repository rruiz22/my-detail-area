import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AvatarSystem } from '@/components/ui/avatar-system';
import { UserPresenceIndicator } from './UserPresenceIndicator';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es, ptBR, enUS } from 'date-fns/locale';

export interface UserPresence {
  user_id: string;
  dealer_id: number;
  status: 'online' | 'away' | 'busy' | 'offline';
  last_activity_at: string;
  is_online: boolean;
  is_mobile?: boolean;
  custom_status?: string;
  status_emoji?: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    avatar_seed?: string | null;
  };
}

interface OnlineUsersListProps {
  users: UserPresence[];
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  showSearch?: boolean;
  onUserClick?: (userId: string) => void;
}

export function OnlineUsersList({
  users,
  loading = false,
  emptyMessage,
  className,
  showSearch = true,
  onUserClick
}: OnlineUsersListProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // Get date-fns locale based on current language
  const getDateLocale = () => {
    switch (i18n.language) {
      case 'es':
        return es;
      case 'pt-BR':
        return ptBR;
      default:
        return enUS;
    }
  };

  // Format last active time
  const formatLastActive = (lastActivityAt: string) => {
    try {
      const date = new Date(lastActivityAt);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

      if (diffInMinutes < 1) {
        return t('presence.just_now');
      }

      return formatDistanceToNow(date, {
        addSuffix: true,
        locale: getDateLocale()
      });
    } catch {
      return '';
    }
  };

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;

    const query = searchQuery.toLowerCase();
    return users.filter((user) => {
      const firstName = user.profiles?.first_name?.toLowerCase() || '';
      const lastName = user.profiles?.last_name?.toLowerCase() || '';
      const email = user.profiles?.email?.toLowerCase() || '';
      const customStatus = user.custom_status?.toLowerCase() || '';

      return (
        firstName.includes(query) ||
        lastName.includes(query) ||
        email.includes(query) ||
        customStatus.includes(query)
      );
    });
  }, [users, searchQuery]);

  // Handle user click - navigate to chat
  const handleUserClick = (userId: string) => {
    if (onUserClick) {
      onUserClick(userId);
    } else {
      // Default behavior: navigate to chat
      navigate(`/chat?user=${userId}`);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className={cn('space-y-3 p-4', className)}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (users.length === 0 && !searchQuery) {
    return (
      <div className={cn('p-8 text-center', className)}>
        <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-3">
          <svg
            className="w-8 h-8 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
        <p className="text-sm text-muted-foreground">
          {emptyMessage || t('presence.no_users_online')}
        </p>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Search bar */}
      {showSearch && users.length > 3 && (
        <div className="p-3 border-b sticky top-0 bg-background z-10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t('presence.search_users')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>
      )}

      {/* User list */}
      <div className="divide-y">
        {filteredUsers.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {t('presence.no_results')}
            </p>
          </div>
        ) : (
          filteredUsers.map((user) => {
            const firstName = user.profiles?.first_name || '';
            const lastName = user.profiles?.last_name || '';
            const email = user.profiles?.email || '';
            const fullName = `${firstName} ${lastName}`.trim() || email || 'Unknown User';
            const avatarSeed = user.profiles?.avatar_seed;
            const lastActive = formatLastActive(user.last_activity_at);
            const showLastActive = user.status !== 'online' && lastActive;

            return (
              <div
                key={user.user_id}
                className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors cursor-pointer group"
                onClick={() => handleUserClick(user.user_id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleUserClick(user.user_id);
                  }
                }}
              >
                {/* Avatar with presence indicator */}
                <div className="relative flex-shrink-0">
                  <AvatarSystem
                    name={fullName}
                    firstName={firstName}
                    lastName={lastName}
                    email={email}
                    seed={avatarSeed}
                    size={40}
                  />
                  <div className="absolute -bottom-0.5 -right-0.5">
                    <UserPresenceIndicator
                      status={user.status}
                      size="sm"
                      showRing
                    />
                  </div>
                </div>

                {/* User info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-medium truncate">
                      {fullName}
                    </p>
                    {user.is_mobile && (
                      <span
                        className="text-xs"
                        title={t('presence.mobile_user')}
                      >
                        📱
                      </span>
                    )}
                  </div>

                  {/* Custom status with emoji */}
                  {user.custom_status && (
                    <div className="flex items-center gap-1 mb-0.5">
                      {user.status_emoji && (
                        <span className="text-xs">{user.status_emoji}</span>
                      )}
                      <p className="text-xs text-muted-foreground truncate">
                        {user.custom_status}
                      </p>
                    </div>
                  )}

                  {/* Email or last active */}
                  {!user.custom_status && (
                    <p className="text-xs text-muted-foreground truncate">
                      {showLastActive ? lastActive : email}
                    </p>
                  )}

                  {/* Show last active if has custom status */}
                  {user.custom_status && showLastActive && (
                    <p className="text-xs text-muted-foreground/70 truncate">
                      {lastActive}
                    </p>
                  )}
                </div>

                {/* Status badge + Chat button */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge
                    variant="secondary"
                    className={cn(
                      'text-xs font-medium px-2 py-0.5',
                      user.status === 'online' && 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
                      user.status === 'away' && 'bg-amber-500/10 text-amber-600 border-amber-500/20',
                      user.status === 'busy' && 'bg-red-500/10 text-red-600 border-red-500/20',
                      user.status === 'offline' && 'bg-gray-500/10 text-gray-600 border-gray-500/20'
                    )}
                  >
                    {t(`presence.status_${user.status}`)}
                  </Badge>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUserClick(user.user_id);
                    }}
                    title={t('presence.start_chat')}
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
