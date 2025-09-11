import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';

export interface ChatConversation {
  id: string;
  dealer_id: number;
  conversation_type: 'direct' | 'group' | 'channel' | 'announcement';
  name?: string;
  description?: string;
  avatar_url?: string;
  is_private: boolean;
  is_archived: boolean;
  is_muted: boolean;
  last_message_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  max_participants?: number;
  allow_external_users: boolean;
  metadata: Record<string, any>;
  
  // Computed fields
  participant_count?: number;
  unread_count?: number;
  last_message_preview?: string;
  other_participant?: {
    id: string;
    name: string;
    avatar_url?: string;
    is_online?: boolean;
  };
}

interface UseChatConversationsReturn {
  conversations: ChatConversation[];
  loading: boolean;
  error: string | null;
  
  // Actions
  createConversation: (data: CreateConversationData) => Promise<ChatConversation | null>;
  updateConversation: (id: string, updates: Partial<ChatConversation>) => Promise<boolean>;
  archiveConversation: (id: string) => Promise<boolean>;
  deleteConversation: (id: string) => Promise<boolean>;
  
  // Search and filters
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  conversationType: string;
  setConversationType: (type: string) => void;
  
  // Utils
  refreshConversations: () => void;
  getConversationById: (id: string) => ChatConversation | undefined;
}

interface CreateConversationData {
  conversation_type: 'direct' | 'group' | 'channel' | 'announcement';
  name?: string;
  description?: string;
  is_private?: boolean;
  participant_ids: string[];
  dealer_id: number;
}

export const useChatConversations = (dealerId?: number): UseChatConversationsReturn => {
  const { user } = useAuth();
  const { dealerships } = useAccessibleDealerships();
  
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [conversationType, setConversationType] = useState('all');

  const activeDealerId = dealerId || dealerships[0]?.id;

  // Fetch conversations with participants and unread counts
  const fetchConversations = useCallback(async () => {
    if (!user?.id || !activeDealerId) return;

    try {
      setLoading(true);
      setError(null);

      // Get conversations where user is participant
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('chat_conversations')
        .select(`
          *,
          chat_participants!inner (
            user_id,
            is_active,
            last_read_at,
            notification_frequency
          )
        `)
        .eq('dealer_id', activeDealerId)
        .eq('chat_participants.user_id', user.id)
        .eq('chat_participants.is_active', true)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (conversationsError) throw conversationsError;

      // Get real unread counts for each conversation
      const conversationIds = conversationsData?.map(c => c.id) || [];
      
      let unreadData: { conversation_id: string; unread_count: number }[] = [];
      if (conversationIds.length > 0) {
        const { data: unreadCounts, error: unreadError } = await supabase
          .rpc('get_unread_message_counts', {
            conversation_ids: conversationIds,
            user_id: user.id
          });

        if (!unreadError && unreadCounts) {
          unreadData = unreadCounts;
        }
      }

      // Get real last message previews
      let lastMessages: any[] = [];
      if (conversationIds.length > 0) {
        const { data: lastMessageData, error: lastMessageError } = await supabase
          .rpc('get_conversation_last_messages', {
            conversation_ids: conversationIds
          });

        if (!lastMessageError && lastMessageData) {
          lastMessages = lastMessageData;
        }
      }

      // Get participants data with real profiles
      const participantsPromises = conversationIds.map(async (convId) => {
        const { data: participants } = await supabase
          .rpc('get_conversation_participants', {
            conversation_uuid: convId,
            requesting_user_id: user.id
          });
        return { convId, participants: participants || [] };
      });

      const participantsResults = await Promise.all(participantsPromises);

      // Process conversations with real data
      const processedConversations: ChatConversation[] = conversationsData?.map(conv => {
        const unreadInfo = unreadData?.find((u: any) => u.conversation_id === conv.id);
        const lastMessage = lastMessages?.find(m => m.conversation_id === conv.id);
        const participantsInfo = participantsResults.find(p => p.convId === conv.id);
        const otherParticipants = participantsInfo?.participants?.filter((p: any) => p.user_id !== user.id) || [];
        
        // For direct conversations, get the other participant
        let otherParticipant = undefined;
        if (conv.conversation_type === 'direct' && otherParticipants?.length > 0) {
          const participant = otherParticipants[0];
          otherParticipant = {
            id: participant.user_id,
            name: participant.user_name,
            avatar_url: participant.avatar_url,
            is_online: participant.presence_status === 'online'
          };
        }

        return {
          ...conv,
          metadata: (conv.metadata as Record<string, any>) || {},
          unread_count: unreadInfo?.unread_count || 0,
          participant_count: participantsInfo?.participants?.length || 0,
          other_participant: otherParticipant,
          last_message_preview: lastMessage?.last_message_content,
          last_message_at: lastMessage?.last_message_at || conv.last_message_at
        };
      }) || [];

      setConversations(processedConversations);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError(err instanceof Error ? err.message : 'Error fetching conversations');
    } finally {
      setLoading(false);
    }
  }, [user?.id, activeDealerId]);

  // Create new conversation
  const createConversation = useCallback(async (data: CreateConversationData): Promise<ChatConversation | null> => {
    if (!user?.id) return null;

    try {
      // For direct conversations, check if one already exists
      if (data.conversation_type === 'direct' && data.participant_ids.length === 1) {
        const { data: existing } = await supabase
          .from('chat_conversations')
          .select(`
            *,
            chat_participants!inner (user_id)
          `)
          .eq('dealer_id', data.dealer_id)
          .eq('conversation_type', 'direct');

        // Find existing direct conversation between these users
        const existingConv = existing?.find(conv => {
          const participantIds = conv.chat_participants.map((p: any) => p.user_id);
          return participantIds.includes(user.id) && 
                 participantIds.includes(data.participant_ids[0]) &&
                 participantIds.length === 2;
        });

        if (existingConv) {
          return existingConv as ChatConversation;
        }
      }

      // Create conversation
      const { data: conversation, error: convError } = await supabase
        .from('chat_conversations')
        .insert({
          dealer_id: data.dealer_id,
          conversation_type: data.conversation_type,
          name: data.name,
          description: data.description,
          is_private: data.is_private ?? true,
          created_by: user.id
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add participants (including creator)
      const allParticipantIds = [user.id, ...data.participant_ids];
      const participantsToInsert = allParticipantIds.map((participantId, index) => ({
        conversation_id: conversation.id,
        user_id: participantId,
        permission_level: index === 0 ? 'admin' : 'write' as 'admin' | 'write'
      }));

      const { error: participantsError } = await supabase
        .from('chat_participants')
        .insert(participantsToInsert);

      if (participantsError) throw participantsError;

      await refreshConversations();
      return conversation as ChatConversation;
    } catch (err) {
      console.error('Error creating conversation:', err);
      setError(err instanceof Error ? err.message : 'Error creating conversation');
      return null;
    }
  }, [user?.id]);

  // Update conversation
  const updateConversation = useCallback(async (id: string, updates: Partial<ChatConversation>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('chat_conversations')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      await refreshConversations();
      return true;
    } catch (err) {
      console.error('Error updating conversation:', err);
      setError(err instanceof Error ? err.message : 'Error updating conversation');
      return false;
    }
  }, []);

  // Archive conversation
  const archiveConversation = useCallback(async (id: string): Promise<boolean> => {
    return updateConversation(id, { is_archived: true });
  }, [updateConversation]);

  // Delete conversation
  const deleteConversation = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('chat_conversations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await refreshConversations();
      return true;
    } catch (err) {
      console.error('Error deleting conversation:', err);
      setError(err instanceof Error ? err.message : 'Error deleting conversation');
      return false;
    }
  }, []);

  // Utility functions
  const refreshConversations = useCallback(() => {
    fetchConversations();
  }, [fetchConversations]);

  const getConversationById = useCallback((id: string) => {
    return conversations.find(conv => conv.id === id);
  }, [conversations]);

  // Filter conversations based on search and type
  const filteredConversations = conversations.filter(conv => {
    // Type filter
    if (conversationType !== 'all' && conv.conversation_type !== conversationType) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const searchTerms = [
        conv.name?.toLowerCase(),
        conv.description?.toLowerCase(),
        conv.other_participant?.name?.toLowerCase()
      ].filter(Boolean);
      
      return searchTerms.some(term => term?.includes(query));
    }

    return true;
  });

  // Real-time subscriptions
  useEffect(() => {
    if (!user?.id || !activeDealerId) return;

    // Subscribe to conversation changes
    const conversationChannel = supabase
      .channel(`conversations:${activeDealerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_conversations',
          filter: `dealer_id=eq.${activeDealerId}`
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    // Subscribe to participant changes
    const participantChannel = supabase
      .channel(`participants:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_participants',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(conversationChannel);
      supabase.removeChannel(participantChannel);
    };
  }, [user?.id, activeDealerId, fetchConversations]);

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return {
    conversations: filteredConversations,
    loading,
    error,
    createConversation,
    updateConversation,
    archiveConversation,
    deleteConversation,
    searchQuery,
    setSearchQuery,
    conversationType,
    setConversationType,
    refreshConversations,
    getConversationById
  };
};