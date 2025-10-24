import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Search, Users, User, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ChatConversation } from '@/hooks/useChatConversations';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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
                    data-testid="conversation-item"
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
                          {conversation.last_message_preview || t('chat.no_messages')}
                        </p>

                        {conversation.unread_count && conversation.unread_count > 0 && (
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
      </div>
    </div>
  );
};