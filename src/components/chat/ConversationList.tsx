import React, { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, Users, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ChatConversation } from '@/hooks/useChatConversations';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface ConversationListProps {
  conversations: ChatConversation[];
  loading: boolean;
  selectedId: string | null;
  onSelectConversation: (id: string) => void;
  dealerId: number;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  loading,
  selectedId,
  onSelectConversation,
  dealerId
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'direct' | 'group'>('all');

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || 
                         (filter === 'direct' && conv.conversation_type === 'direct') ||
                         (filter === 'group' && conv.conversation_type === 'group');
    
    return matchesSearch && matchesFilter;
  });

  const getConversationIcon = (type: string) => {
    return type === 'direct' ? User : Users;
  };

  const getConversationName = (conv: ChatConversation) => {
    if (conv.name) return conv.name;
    return t('chat.unnamed_conversation');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search and Filters */}
      <div className="p-3 space-y-3 border-b bg-background">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('chat.search_conversations')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        
        <div className="flex gap-1">
          <Button
            variant={filter === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('all')}
            className="flex-1 h-8"
          >
            {t('chat.all')}
          </Button>
          <Button
            variant={filter === 'direct' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('direct')}
            className="flex-1 h-8"
          >
            <User className="h-3 w-3 mr-1" />
            {t('chat.direct')}
          </Button>
          <Button
            variant={filter === 'group' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('group')}
            className="flex-1 h-8"
          >
            <Users className="h-3 w-3 mr-1" />
            {t('chat.groups')}
          </Button>
        </div>

        <Button size="sm" className="w-full h-8">
          <Plus className="h-3 w-3 mr-1" />
          {t('chat.new_conversation')}
        </Button>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center space-x-3 p-3 rounded-lg">
                  <div className="w-10 h-10 bg-muted rounded-full animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                    <div className="h-3 bg-muted rounded w-3/4 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                {searchQuery ? t('chat.no_conversations_found') : t('chat.no_conversations')}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredConversations.map((conversation) => {
                const Icon = getConversationIcon(conversation.conversation_type);
                const isSelected = conversation.id === selectedId;
                
                return (
                  <button
                    key={conversation.id}
                    onClick={() => onSelectConversation(conversation.id)}
                    className={cn(
                      "w-full flex items-center space-x-3 p-3 rounded-lg text-left hover:bg-muted/50 transition-colors",
                      isSelected && "bg-primary/10 border border-primary/20"
                    )}
                  >
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={conversation.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {conversation.avatar_url ? (
                            <Icon className="h-4 w-4" />
                          ) : (
                            getInitials(getConversationName(conversation))
                          )}
                        </AvatarFallback>
                      </Avatar>
                      
                      {conversation.conversation_type === 'group' && (
                        <div className="absolute -bottom-1 -right-1 bg-primary rounded-full p-1">
                          <Users className="h-2 w-2 text-primary-foreground" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className={cn(
                          "font-medium truncate text-sm",
                          isSelected ? "text-primary" : "text-foreground"
                        )}>
                          {getConversationName(conversation)}
                        </h4>
                        
                        {conversation.last_message_at && (
                          <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                            {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground truncate">
                          {t('chat.no_messages')}
                        </p>
                        
                        {conversation.unread_count > 0 && (
                          <Badge variant="default" className="ml-2 px-1.5 py-0 h-5 text-xs">
                            {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                          </Badge>
                        )}
                      </div>
                      
                      {conversation.conversation_type === 'group' && (
                        <div className="flex items-center mt-1">
                          <Users className="h-3 w-3 text-muted-foreground mr-1" />
                          <span className="text-xs text-muted-foreground">
                            {conversation.max_participants || 0} {t('chat.members')}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};