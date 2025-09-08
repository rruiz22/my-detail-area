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

      // Get unread counts for each conversation
      const conversationIds = conversationsData?.map(c => c.id) || [];
      
      // Simulate unread data for now
      const unreadData = conversationIds.map(id => ({ conversation_id: id, unread_count: 0 }));

      // Simplified participant data for now  
      const participantsData: any[] = [];

      // Process conversations with additional data
      const processedConversations: ChatConversation[] = conversationsData?.map(conv => {
        const unreadInfo = unreadData?.find((u: any) => u.conversation_id === conv.id);
        const otherParticipants = participantsData?.filter(p => p.conversation_id === conv.id);
        
        // For direct conversations, get the other participant
        let otherParticipant = undefined;
        if (conv.conversation_type === 'direct' && otherParticipants?.length > 0) {
          const participant = otherParticipants[0];
          otherParticipant = {
            id: participant.user_id,
            name: 'Direct Chat User', // Simplified for now
            avatar_url: undefined,
            is_online: false
          };
        }

        return {
          ...conv,
          metadata: (conv.metadata as Record<string, any>) || {},
          unread_count: unreadInfo?.unread_count || 0,
          participant_count: otherParticipants?.length || 0,
          other_participant: otherParticipant
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