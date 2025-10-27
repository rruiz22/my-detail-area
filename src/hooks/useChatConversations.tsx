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

  // Computed fields from RPCs
  participant_count?: number;
  unread_count?: number;

  // Enhanced last message preview from get_conversation_last_messages RPC
  last_message_preview?: {
    content: string;
    type: string;
    at: string;
    user_id: string;
  };

  // Other participant info for direct conversations
  other_participant?: {
    id: string;
    name: string;
    avatar_url?: string;
    is_online?: boolean;
  };

  // Full participants list (populated on-demand via getConversationParticipants)
  participants?: Array<{
    user_id: string;
    user_name: string;
    user_email: string;
    user_avatar_url: string;
    permission_level: string;
    is_active: boolean;
    last_read_at: string;
    presence_status: string;
  }>;
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

  // NEW: On-demand participant fetching from get_conversation_participants RPC
  getConversationParticipants: (conversationId: string) => Promise<ChatConversation['participants']>;
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

  // Fetch conversations with optimized batch RPC calls
  const fetchConversations = useCallback(async () => {
    if (!user?.id || !activeDealerId) return;

    try {
      setLoading(true);
      setError(null);

      // Step 1: Get base conversations where user is participant
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
      if (!conversationsData || conversationsData.length === 0) {
        setConversations([]);
        return;
      }

      const conversationIds = conversationsData.map(c => c.id);

      // Step 2: Batch call RPC #1 - get_unread_message_counts
      let unreadData: Array<{ conversation_id: string; unread_count: number }> = [];
      try {
        const { data: unreadCounts, error: unreadError } = await supabase
          .rpc('get_unread_message_counts', {
            conversation_ids: conversationIds,
            user_id: user.id
          });

        if (unreadError) {
          console.error('Error fetching unread counts (non-critical):', unreadError);
          // Graceful degradation - continue without unread counts
        } else if (unreadCounts) {
          unreadData = unreadCounts;
        }
      } catch (error) {
        console.error('Failed to fetch unread counts (non-critical):', error);
        // Graceful degradation - continue without unread counts
      }

      // Step 3: Batch call RPC #2 - get_conversation_last_messages
      let lastMessages: Array<{
        conversation_id: string;
        last_message_content: string;
        last_message_at: string;
        last_message_type: string;
        last_message_user_id: string;
      }> = [];
      try {
        const { data: lastMessageData, error: lastMessageError } = await supabase
          .rpc('get_conversation_last_messages', {
            conversation_ids: conversationIds
          });

        if (lastMessageError) {
          console.error('Error fetching last messages (non-critical):', lastMessageError);
          // Graceful degradation - continue without last messages
        } else if (lastMessageData) {
          lastMessages = lastMessageData;
        }
      } catch (error) {
        console.error('Failed to fetch last messages (non-critical):', error);
        // Graceful degradation - continue without last messages
      }

      // Step 4: Batch call RPC #3 - get_conversation_participants (for participant count and direct chat info)
      const participantsPromises = conversationIds.map(async (convId) => {
        try {
          const { data: participants, error: participantsError } = await supabase
            .rpc('get_conversation_participants', {
              conversation_uuid: convId,
              requesting_user_id: user.id
            });

          if (participantsError) {
            console.error(`Error fetching participants for ${convId} (non-critical):`, participantsError);
            return { convId, participants: [] };
          }

          return { convId, participants: participants || [] };
        } catch (error) {
          console.error(`Failed to fetch participants for ${convId} (non-critical):`, error);
          return { convId, participants: [] };
        }
      });

      const participantsResults = await Promise.all(participantsPromises);

      // Step 5: Merge all RPC results into conversations
      const enrichedConversations: ChatConversation[] = conversationsData.map(conv => {
        const unreadInfo = unreadData.find((u) => u.conversation_id === conv.id);
        const lastMessage = lastMessages.find(m => m.conversation_id === conv.id);
        const participantsInfo = participantsResults.find(p => p.convId === conv.id);
        const otherParticipants = participantsInfo?.participants?.filter((p: any) => p.user_id !== user.id) || [];

        // For direct conversations, extract the other participant
        let otherParticipant = undefined;
        if (conv.conversation_type === 'direct' && otherParticipants.length > 0) {
          const participant = otherParticipants[0];
          otherParticipant = {
            id: participant.user_id,
            name: participant.user_name,
            avatar_url: participant.user_avatar_url || undefined,
            is_online: participant.presence_status === 'online'
          };
        }

        return {
          ...conv,
          metadata: (conv.metadata as Record<string, any>) || {},
          unread_count: unreadInfo?.unread_count || 0,
          participant_count: participantsInfo?.participants?.length || 0,
          last_message_preview: lastMessage ? {
            content: lastMessage.last_message_content,
            type: lastMessage.last_message_type,
            at: lastMessage.last_message_at,
            user_id: lastMessage.last_message_user_id
          } : undefined,
          last_message_at: lastMessage?.last_message_at || conv.last_message_at,
          other_participant: otherParticipant
        };
      });

      setConversations(enrichedConversations);
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

  /**
   * Fetch detailed participants for a specific conversation on-demand
   * Uses RPC #3: get_conversation_participants
   * @param conversationId - UUID of the conversation
   * @returns Array of participant objects with full details
   */
  const getConversationParticipants = useCallback(async (conversationId: string): Promise<ChatConversation['participants']> => {
    if (!user?.id) {
      console.error('Cannot fetch participants: user not authenticated');
      return [];
    }

    try {
      const { data, error } = await supabase
        .rpc('get_conversation_participants', {
          conversation_uuid: conversationId,
          requesting_user_id: user.id
        });

      if (error) {
        console.error('Error fetching conversation participants:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch conversation participants:', error);
      return [];
    }
  }, [user?.id]);

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

  // Real-time subscriptions - invalidate RPC cache on changes
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
          // Invalidate and re-fetch to update all RPC data
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
          // Invalidate and re-fetch to update participant counts
          fetchConversations();
        }
      )
      .subscribe();

    // Subscribe to new messages to update unread counts and last message previews
    const messagesChannel = supabase
      .channel(`messages:${activeDealerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        () => {
          // Invalidate and re-fetch to update unread counts and last messages
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(conversationChannel);
      supabase.removeChannel(participantChannel);
      supabase.removeChannel(messagesChannel);
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
    getConversationById,
    getConversationParticipants  // NEW: On-demand participant fetching
  };
};