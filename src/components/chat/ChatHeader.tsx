import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AvatarSystem } from '@/components/ui/avatar-system';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChatConversation } from '@/hooks/useChatConversations';
import { useUserPresence } from '@/hooks/useUserPresence';
import { MoreVertical, Phone, Settings, User, UserPlus, Users, VideoIcon } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface ChatHeaderProps {
  conversationId: string;
  conversations: ChatConversation[];
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  conversationId,
  conversations
}) => {
  const { t } = useTranslation();
  const conversation = conversations.find(c => c.id === conversationId);
  const { usersPresence } = useUserPresence();

  if (!conversation) {
    return (
      <div className="h-16 border-b flex items-center justify-center bg-muted/20">
        <span className="text-muted-foreground">{t('chat.conversation_not_found')}</span>
      </div>
    );
  }

  const getConversationName = () => {
    // For direct conversations, show other participant's name
    if (conversation.conversation_type === 'direct' && conversation.other_participant) {
      return conversation.other_participant.name;
    }
    // For other types, use conversation name or fallback
    if (conversation.name) return conversation.name;
    return t('chat.unnamed_conversation');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getOnlineParticipants = () => {
    return usersPresence.filter(u => u.is_online).length;
  };

  const isDirectConversation = conversation.conversation_type === 'direct';
  const isOtherUserOnline = usersPresence.some(u => u.is_online);

  return (
    <div className="h-16 border-b bg-background flex items-center justify-between px-4">
      <div className="flex items-center space-x-3">
        {/* Avatar */}
        <div className="relative">
          {isDirectConversation && conversation.other_participant ? (
            <div className="h-10 w-10 rounded-full overflow-hidden">
              <AvatarSystem
                name={conversation.other_participant.name}
                email={conversation.other_participant.email}
                seed={conversation.other_participant.avatar_seed as any}
                size={40}
              />
            </div>
          ) : (
            <Avatar className="h-10 w-10">
              <AvatarFallback className="text-sm">
                {isDirectConversation ? <User className="h-4 w-4" /> : <Users className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
          )}

          {/* Online indicator for direct conversations */}
          {isDirectConversation && isOtherUserOnline && (
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
          )}

          {/* Group indicator */}
          {!isDirectConversation && (
            <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1">
              <Users className="h-2 w-2 text-primary-foreground" />
            </div>
          )}
        </div>

        {/* Conversation Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">
            {getConversationName()}
          </h3>

          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            {isDirectConversation ? (
              <span>
                {isOtherUserOnline ? t('chat.online') : t('chat.offline')}
              </span>
            ) : (
            <>
              <Users className="h-3 w-3" />
              <span>
                {conversation.max_participants || 0} {t('chat.members')}
              </span>
              {getOnlineParticipants() > 0 && (
                <>
                  <span>•</span>
                  <Badge variant="secondary" className="h-4 px-1.5 text-xs">
                    {getOnlineParticipants()} {t('chat.online')}
                  </Badge>
                </>
              )}
            </>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-2">
        {/* Quick Actions */}
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Phone className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <VideoIcon className="h-4 w-4" />
        </Button>

        {/* More Options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {!isDirectConversation && (
              <>
                <DropdownMenuItem>
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t('chat.add_members')}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Users className="h-4 w-4 mr-2" />
                  {t('chat.view_members')}
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem>
              <Settings className="h-4 w-4 mr-2" />
              {t('chat.conversation_settings')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
