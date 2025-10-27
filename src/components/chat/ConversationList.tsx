import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AvatarSystem } from '@/components/ui/avatar-system';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ChatConversation } from '@/hooks/useChatConversations';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { ImageIcon, MessageCircle, Mic, Paperclip, Plus, Search, User, Users, X } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarSeed?: string;
}

interface ConversationListProps {
  conversations: ChatConversation[];
  loading: boolean;
  selectedId: string | null;
  onSelectConversation: (id: string) => void;
  dealerId: number;
  onCreateConversation?: (data: any) => Promise<ChatConversation | null>;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  loading,
  selectedId,
  onSelectConversation,
  dealerId,
  onCreateConversation
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'direct' | 'group'>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newConvName, setNewConvName] = useState('');
  const [newConvType, setNewConvType] = useState<'direct' | 'group'>('direct');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  const filteredConversations = conversations.filter(conv => {
    // Search filter: pass if no search query OR name matches query
    const matchesSearch = !searchQuery || conv.name?.toLowerCase().includes(searchQuery.toLowerCase());

    // Type filter: pass if 'all' OR matches specific type
    const matchesFilter = filter === 'all' ||
                         (filter === 'direct' && conv.conversation_type === 'direct') ||
                         (filter === 'group' && conv.conversation_type === 'group');

    return matchesSearch && matchesFilter;
  });

  const getConversationIcon = (type: string) => {
    return type === 'direct' ? User : Users;
  };

  const getConversationName = (conv: ChatConversation) => {
    // For direct conversations, show other participant's name
    if (conv.conversation_type === 'direct' && conv.other_participant) {
      return conv.other_participant.name;
    }
    // For other types, use conversation name or fallback
    if (conv.name) return conv.name;
    return t('chat.unnamed_conversation');
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Format relative time for last message preview
  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('chat.just_now');
    if (diffMins < 60) return t('chat.minutes_ago', { count: diffMins });
    if (diffHours < 24) return t('chat.hours_ago', { count: diffHours });
    if (diffDays < 7) return t('chat.days_ago', { count: diffDays });

    // More than 7 days: show date
    return date.toLocaleDateString();
  };

  // Fetch team members when dialog opens
  const fetchTeamMembers = useCallback(async () => {
    console.log('💬 [CHAT] fetchTeamMembers called', { user: !!user, dealerId });

    if (!user || !dealerId) {
      console.log('❌ [CHAT] Missing user or dealerId, aborting');
      return;
    }

    setLoadingUsers(true);
    console.log('⏳ [CHAT] Loading team members...');

    try {
      const { data, error } = await supabase
        .from('dealer_memberships')
        .select(`
          user_id,
          profiles (
            id,
            first_name,
            last_name,
            email,
            avatar_seed
          )
        `)
        .eq('dealer_id', dealerId)
        .eq('is_active', true);

      console.log('📊 [CHAT] Query result:', { dataCount: data?.length, error });

      if (error) throw error;

      const members: TeamMember[] = (data || [])
        .filter(member => member.profiles?.id && member.profiles.id !== user.id)
        .map(member => ({
          id: member.profiles!.id,
          firstName: member.profiles!.first_name || '',
          lastName: member.profiles!.last_name || '',
          email: member.profiles!.email || '',
          avatarSeed: member.profiles!.avatar_seed || undefined
        }));

      console.log(`✅ [CHAT] Loaded ${members.length} team members (excluded self)`);
      setTeamMembers(members);

      if (members.length === 0) {
        toast({
          title: t('chat.no_team_members'),
          description: t('chat.no_team_members_desc'),
          variant: "default"
        });
      }
    } catch (error) {
      console.error('❌ [CHAT] Error fetching team members:', error);
      toast({
        variant: "destructive",
        title: t('chat.error_loading_users'),
        description: error instanceof Error ? error.message : t('common.error')
      });
    } finally {
      setLoadingUsers(false);
      console.log('🏁 [CHAT] fetchTeamMembers completed');
    }
  }, [user, dealerId, toast, t]);

  // Load team members when dialog opens
  useEffect(() => {
    console.log('🎭 [CHAT] Dialog state changed:', {
      isCreateDialogOpen,
      willFetch: isCreateDialogOpen
    });

    if (isCreateDialogOpen) {
      console.log('🚀 [CHAT] Triggering fetchTeamMembers...');
      fetchTeamMembers();
    }
  }, [isCreateDialogOpen, fetchTeamMembers]);

  // Handle participant selection
  const toggleParticipant = (userId: string) => {
    if (newConvType === 'direct') {
      // For direct, only allow one participant
      setSelectedParticipants([userId]);
    } else {
      // For group, allow multiple
      setSelectedParticipants(prev =>
        prev.includes(userId)
          ? prev.filter(id => id !== userId)
          : [...prev, userId]
      );
    }
  };

  // Auto-generate name for direct conversations
  useEffect(() => {
    if (newConvType === 'direct' && selectedParticipants.length === 1) {
      const participant = teamMembers.find(m => m.id === selectedParticipants[0]);
      if (participant) {
        setNewConvName(`${participant.firstName} ${participant.lastName}`.trim() || participant.email);
      }
    } else if (newConvType === 'group') {
      // Clear auto-generated name when switching to group
      if (selectedParticipants.length === 1) {
        const participant = teamMembers.find(m => m.id === selectedParticipants[0]);
        if (participant && newConvName === `${participant.firstName} ${participant.lastName}`.trim()) {
          setNewConvName('');
        }
      }
    }
  }, [newConvType, selectedParticipants, teamMembers]);

  const handleCreateConversation = async () => {
    if (!onCreateConversation) return;

    // Validate participants
    if (selectedParticipants.length === 0) {
      toast({
        variant: "destructive",
        title: t('chat.select_participants_required'),
        description: t('chat.please_select_at_least_one')
      });
      return;
    }

    // Validate direct conversation
    if (newConvType === 'direct' && selectedParticipants.length !== 1) {
      toast({
        variant: "destructive",
        title: t('chat.direct_one_participant'),
        description: t('chat.direct_conversation_requires_one')
      });
      return;
    }

    // Validate name for group
    if (newConvType === 'group' && !newConvName.trim()) {
      toast({
        variant: "destructive",
        title: t('chat.conversation_name_required'),
        description: t('chat.please_enter_name')
      });
      return;
    }

    try {
      const result = await onCreateConversation({
        conversation_type: newConvType,
        name: newConvType === 'direct' ? undefined : newConvName.trim(),
        is_private: true,
        participant_ids: selectedParticipants,
        dealer_id: dealerId
      });

      if (result) {
        toast({
          title: t('chat.conversation_created'),
          description: t('chat.conversation_created_desc', { name: newConvName })
        });
        setIsCreateDialogOpen(false);
        setNewConvName('');
        setNewConvType('direct');
        setSelectedParticipants([]);
        setUserSearchQuery('');
        onSelectConversation(result.id);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('chat.error_creating_conversation'),
        description: error instanceof Error ? error.message : t('common.error')
      });
    }
  };

  return (
    <div className="flex flex-col h-full" data-testid="conversation-list">
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

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="w-full h-8">
              <Plus className="h-3 w-3 mr-1" />
              {t('chat.new_conversation')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[85vh] p-0 gap-0 overflow-hidden flex flex-col">
            <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
              <DialogTitle>{t('chat.create_new_conversation')}</DialogTitle>
              <DialogDescription>
                {t('chat.create_conversation_desc')}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-4">
                {/* Conversation Type */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('chat.conversation_type')}</label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={newConvType === 'direct' ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setNewConvType('direct');
                        setSelectedParticipants([]);
                      }}
                    >
                      <User className="h-3 w-3 mr-1" />
                      {t('chat.direct')}
                    </Button>
                    <Button
                      type="button"
                      variant={newConvType === 'group' ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setNewConvType('group');
                        setSelectedParticipants([]);
                      }}
                    >
                      <Users className="h-3 w-3 mr-1" />
                      {t('chat.group')}
                    </Button>
                  </div>
                </div>

                {/* Conversation Name (only for groups) */}
                {newConvType === 'group' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('chat.conversation_name')}</label>
                    <Input
                      placeholder={t('chat.enter_conversation_name')}
                      value={newConvName}
                      onChange={(e) => setNewConvName(e.target.value)}
                    />
                  </div>
                )}

                {/* Selected Participants Preview */}
                {selectedParticipants.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {t('chat.selected_participants')} ({selectedParticipants.length})
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {selectedParticipants.map(participantId => {
                        const member = teamMembers.find(m => m.id === participantId);
                        if (!member) return null;
                        return (
                          <Badge key={participantId} variant="secondary" className="gap-1 pr-1">
                            {member.firstName} {member.lastName}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                              onClick={() => toggleParticipant(participantId)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* User Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    {newConvType === 'direct' ? t('chat.select_user') : t('chat.select_participants')}
                  </label>

                  {/* Search Users */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('chat.search_team_members')}
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  {/* User List */}
                  <div className="border rounded-lg max-h-64 overflow-y-auto">
                    {loadingUsers ? (
                      <div className="p-8 text-center text-sm text-muted-foreground">
                        {t('common.loading')}...
                      </div>
                    ) : teamMembers.filter(member =>
                      `${member.firstName} ${member.lastName} ${member.email}`
                        .toLowerCase()
                        .includes(userSearchQuery.toLowerCase())
                    ).length === 0 ? (
                      <div className="p-8 text-center text-sm text-muted-foreground">
                        {t('chat.no_team_members')}
                      </div>
                    ) : (
                      <div className="p-2 space-y-1">
                        {teamMembers
                          .filter(member =>
                            `${member.firstName} ${member.lastName} ${member.email}`
                              .toLowerCase()
                              .includes(userSearchQuery.toLowerCase())
                          )
                          .map(member => {
                            const isSelected = selectedParticipants.includes(member.id);
                            return (
                              <div
                                key={member.id}
                                className={cn(
                                  "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                                  isSelected ? "bg-primary/10 border border-primary/20" : "hover:bg-muted"
                                )}
                                onClick={() => toggleParticipant(member.id)}
                              >
                                {newConvType === 'group' && (
                                  <Checkbox checked={isSelected} />
                                )}
                                <Avatar className="h-8 w-8">
                                  <AvatarImage
                                    src={member.avatarSeed ? `https://api.dicebear.com/7.x/initials/svg?seed=${member.firstName} ${member.lastName}` : undefined}
                                  />
                                  <AvatarFallback className="text-xs">
                                    {getInitials(`${member.firstName} ${member.lastName}`)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm">
                                    {member.firstName} {member.lastName}
                                  </div>
                                  <div className="text-xs text-muted-foreground truncate">
                                    {member.email}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t flex justify-between items-center flex-shrink-0">
              <div className="text-sm text-muted-foreground">
                {selectedParticipants.length > 0 ? (
                  newConvType === 'direct' ? (
                    t('chat.one_participant_selected')
                  ) : (
                    t('chat.participants_selected_count', { count: selectedParticipants.length })
                  )
                ) : (
                  t('chat.no_participants_selected')
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setNewConvName('');
                    setSelectedParticipants([]);
                    setUserSearchQuery('');
                  }}
                >
                  {t('common.action_buttons.cancel')}
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateConversation}
                  disabled={selectedParticipants.length === 0 || (newConvType === 'group' && !newConvName.trim())}
                >
                  {t('chat.create')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {loading ? (
            <div className="flex flex-col gap-3 p-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-100 rounded w-full"></div>
                </div>
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <MessageCircle className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                {searchQuery ? t('chat.no_conversations_found') : t('chat.no_conversations')}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {t('chat.start_conversation_hint')}
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                {t('chat.new_conversation')}
              </Button>
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
                      "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
                      "hover:bg-gray-50",
                      isSelected && "bg-emerald-50/20 border border-emerald-500/30",
                      conversation.unread_count && conversation.unread_count > 0 && !isSelected &&
                        "bg-emerald-50/30 border-l-4 border-l-emerald-500"
                    )}
                    data-testid="conversation-item"
                  >
                    <div className="relative flex-shrink-0">
                      {conversation.conversation_type === 'direct' && conversation.other_participant ? (
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
                          <AvatarFallback className="text-xs bg-gray-100 text-gray-700">
                            <Icon className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                      )}

                      {conversation.conversation_type === 'group' && (
                        <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-1">
                          <Users className="h-2 w-2 text-white" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Desktop Layout (sm+) */}
                      <div className="hidden sm:block">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex-1 min-w-0">
                            <h4 className={cn(
                              "font-semibold truncate text-sm",
                              isSelected ? "text-emerald-600" : "text-gray-900"
                            )}>
                              {getConversationName(conversation)}
                            </h4>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {conversation.unread_count && conversation.unread_count > 0 && (
                              <Badge className="bg-emerald-500 text-white hover:bg-emerald-600 text-xs px-2 py-0.5 rounded-full border-0 font-semibold">
                                {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                              </Badge>
                            )}
                            {conversation.last_message_preview && (
                              <span className="text-xs text-gray-400">
                                {formatRelativeTime(conversation.last_message_preview.at)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Last Message Preview */}
                        {conversation.last_message_preview ? (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            {/* Icon based on message type */}
                            {conversation.last_message_preview.type === 'image' && (
                              <ImageIcon className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                            )}
                            {conversation.last_message_preview.type === 'file' && (
                              <Paperclip className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                            )}
                            {conversation.last_message_preview.type === 'voice' && (
                              <Mic className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                            )}

                            {/* Message content - truncate long messages */}
                            <p className="flex-1 truncate text-xs">
                              {conversation.last_message_preview.content}
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 italic">{t('chat.no_messages_yet')}</p>
                        )}

                        {/* Participant count for groups */}
                        {conversation.conversation_type === 'group' && conversation.participant_count && (
                          <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                            <Users className="h-3.5 w-3.5" />
                            <span>{conversation.participant_count} {t('chat.members')}</span>
                          </div>
                        )}
                      </div>

                      {/* Mobile Layout (<sm) */}
                      <div className="sm:hidden">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className={cn(
                            "font-semibold truncate text-sm flex-1",
                            isSelected ? "text-emerald-600" : "text-gray-900"
                          )}>
                            {getConversationName(conversation)}
                          </h4>
                          {conversation.unread_count && conversation.unread_count > 0 && (
                            <Badge className="ml-2 bg-emerald-500 text-white hover:bg-emerald-600 text-xs px-2 py-0.5 rounded-full border-0 font-semibold">
                              {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                            </Badge>
                          )}
                        </div>

                        {/* Preview in separate line on mobile */}
                        {conversation.last_message_preview ? (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-sm text-gray-500 flex-1 truncate">
                              {conversation.last_message_preview.type === 'image' && (
                                <ImageIcon className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                              )}
                              {conversation.last_message_preview.type === 'file' && (
                                <Paperclip className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                              )}
                              {conversation.last_message_preview.type === 'voice' && (
                                <Mic className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                              )}
                              <span className="truncate text-xs">{conversation.last_message_preview.content}</span>
                            </div>
                            <span className="text-xs text-gray-400 flex-shrink-0">
                              {formatRelativeTime(conversation.last_message_preview.at)}
                            </span>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 italic">{t('chat.no_messages_yet')}</p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
