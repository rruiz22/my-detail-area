import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ChatMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  message_type: 'text' | 'voice' | 'file' | 'image' | 'system';
  content?: string;
  
  // Files and media
  file_url?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  
  // Voice messages
  voice_duration_ms?: number;
  voice_transcription?: string;
  
  // Threading
  parent_message_id?: string;
  thread_count: number;
  
  // State
  is_edited: boolean;
  is_deleted: boolean;
  is_system_message: boolean;
  
  // Social features
  reactions: Record<string, string[]>; // {emoji: [user_ids]}
  mentions: string[];
  
  // Timestamps
  created_at: string;
  updated_at: string;
  edited_at?: string;
  deleted_at?: string;
  
  metadata: Record<string, any>;
  
  // Computed fields
  sender?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  replies?: ChatMessage[];
  is_own_message?: boolean;
  is_mentioned?: boolean;
}

interface UseChatMessagesReturn {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  
  // Actions
  sendMessage: (content: string, mentions?: string[]) => Promise<ChatMessage | null>;
  sendVoiceMessage: (audioBlob: Blob, transcription?: string) => Promise<ChatMessage | null>;
  sendFileMessage: (file: File, description?: string) => Promise<ChatMessage | null>;
  replyToMessage: (parentId: string, content: string) => Promise<ChatMessage | null>;
  editMessage: (messageId: string, newContent: string) => Promise<boolean>;
  deleteMessage: (messageId: string) => Promise<boolean>;
  addReaction: (messageId: string, emoji: string) => Promise<boolean>;
  removeReaction: (messageId: string, emoji: string) => Promise<boolean>;
  
  // Pagination
  loadMore: () => void;
  loadNewerMessages: () => void;
  
  // Utils
  markAsRead: () => void;
  scrollToMessage: (messageId: string) => void;
  getMessageById: (messageId: string) => ChatMessage | undefined;
  
  // Typing indicators
  typingUsers: string[];
  setIsTyping: (typing: boolean) => void;
}

interface SendMessageOptions {
  content: string;
  mentions?: string[];
  parent_message_id?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  message_type?: 'text' | 'voice' | 'file' | 'image';
}

export const useChatMessages = (conversationId: string): UseChatMessagesReturn => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const lastMessageIdRef = useRef<string>();
  const PAGE_SIZE = 50;

  // Fetch messages with pagination
  const fetchMessages = useCallback(async (before?: string, limit = PAGE_SIZE) => {
    if (!user?.id || !conversationId) return;

    try {
      setError(null);

      let query = supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (before) {
        query = query.lt('created_at', before);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Process messages with sender info
      const processedMessages: ChatMessage[] = data?.map(msg => ({
        ...msg,
        reactions: (msg.reactions as Record<string, string[]>) || {},
        mentions: (msg.mentions as string[]) || [],
        metadata: (msg.metadata as Record<string, any>) || {},
        sender: {
          id: msg.user_id,
          name: 'User', // Simplified for now
          avatar_url: undefined
        },
        is_own_message: msg.user_id === user.id,
        is_mentioned: ((msg.mentions as string[]) || []).includes(user.id) || false
      })) || [];

      if (before) {
        setMessages(prev => [...processedMessages.reverse(), ...prev]);
      } else {
        setMessages(processedMessages.reverse());
        if (processedMessages.length > 0) {
          lastMessageIdRef.current = processedMessages[0].id;
        }
      }

      setHasMore(data?.length === limit);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError(err instanceof Error ? err.message : 'Error fetching messages');
    }
  }, [user?.id, conversationId]);

  // Load more older messages
  const loadMore = useCallback(() => {
    if (!hasMore || loading) return;
    
    const oldestMessage = messages[0];
    if (oldestMessage) {
      fetchMessages(oldestMessage.created_at);
    }
  }, [messages, hasMore, loading, fetchMessages]);

  // Load newer messages (for real-time updates)
  const loadNewerMessages = useCallback(async () => {
    if (!user?.id || !conversationId || !lastMessageIdRef.current) return;

    try {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('is_deleted', false)
        .gt('created_at', messages[messages.length - 1]?.created_at || new Date().toISOString())
        .order('created_at', { ascending: true });

      if (data && data.length > 0) {
        const processedMessages: ChatMessage[] = data.map(msg => ({
          ...msg,
          reactions: (msg.reactions as Record<string, string[]>) || {},
          mentions: (msg.mentions as string[]) || [],
          metadata: (msg.metadata as Record<string, any>) || {},
          sender: {
            id: msg.user_id,
            name: 'User',
            avatar_url: undefined
          },
          is_own_message: msg.user_id === user.id,
          is_mentioned: ((msg.mentions as string[]) || []).includes(user.id) || false
        }));

        setMessages(prev => [...prev, ...processedMessages]);
        lastMessageIdRef.current = processedMessages[processedMessages.length - 1].id;
      }
    } catch (err) {
      console.error('Error loading newer messages:', err);
    }
  }, [user?.id, conversationId, messages]);

  // Send text message
  const sendMessage = useCallback(async (content: string, mentions: string[] = []): Promise<ChatMessage | null> => {
    return sendMessageWithOptions({
      content,
      mentions,
      message_type: 'text'
    });
  }, []);

  // Generic send message function
  const sendMessageWithOptions = useCallback(async (options: SendMessageOptions): Promise<ChatMessage | null> => {
    if (!user?.id || !conversationId) return null;

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          user_id: user.id,
          message_type: options.message_type || 'text',
          content: options.content,
          mentions: options.mentions || [],
          parent_message_id: options.parent_message_id,
          file_url: options.file_url,
          file_name: options.file_name,
          file_size: options.file_size,
          file_type: options.file_type
        })
        .select()
        .single();

      if (error) throw error;

      const newMessage: ChatMessage = {
        ...data,
        reactions: (data.reactions as Record<string, string[]>) || {},
        mentions: (data.mentions as string[]) || [],
        metadata: (data.metadata as Record<string, any>) || {},
        sender: {
          id: data.user_id,
          name: 'You',
          avatar_url: undefined
        },
        is_own_message: true,
        is_mentioned: false
      };

      // Don't add to state here - real-time subscription will handle it
      return newMessage;
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Error sending message');
      return null;
    }
  }, [user?.id, conversationId]);

  // Send voice message
  const sendVoiceMessage = useCallback(async (audioBlob: Blob, transcription?: string): Promise<ChatMessage | null> => {
    if (!user?.id) return null;

    try {
      // Upload audio file
      const fileName = `voice_${Date.now()}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(`${conversationId}/${fileName}`, audioBlob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(uploadData.path);

        return sendMessageWithOptions({
          content: transcription || '',
          message_type: 'voice',
          file_url: publicUrl,
          file_name: fileName,
          file_size: audioBlob.size,
          file_type: audioBlob.type
        });
    } catch (err) {
      console.error('Error sending voice message:', err);
      setError(err instanceof Error ? err.message : 'Error sending voice message');
      return null;
    }
  }, [user?.id, conversationId, sendMessageWithOptions]);

  // Send file message
  const sendFileMessage = useCallback(async (file: File, description?: string): Promise<ChatMessage | null> => {
    if (!user?.id) return null;

    try {
      // Upload file
      const fileName = `${Date.now()}_${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(`${conversationId}/${fileName}`, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(uploadData.path);

      const messageType = file.type.startsWith('image/') ? 'image' : 'file';

      return sendMessageWithOptions({
        content: description || file.name,
        message_type: messageType,
        file_url: publicUrl,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type
      });
    } catch (err) {
      console.error('Error sending file message:', err);
      setError(err instanceof Error ? err.message : 'Error sending file message');
      return null;
    }
  }, [user?.id, conversationId, sendMessageWithOptions]);

  // Reply to message
  const replyToMessage = useCallback(async (parentId: string, content: string): Promise<ChatMessage | null> => {
    return sendMessageWithOptions({
      content,
      parent_message_id: parentId,
      message_type: 'text'
    });
  }, [sendMessageWithOptions]);

  // Edit message
  const editMessage = useCallback(async (messageId: string, newContent: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({
          content: newContent,
          is_edited: true,
          edited_at: new Date().toISOString()
        })
        .eq('id', messageId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error editing message:', err);
      setError(err instanceof Error ? err.message : 'Error editing message');
      return false;
    }
  }, []);

  // Delete message
  const deleteMessage = useCallback(async (messageId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString()
        })
        .eq('id', messageId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error deleting message:', err);
      setError(err instanceof Error ? err.message : 'Error deleting message');
      return false;
    }
  }, []);

  // Add reaction
  const addReaction = useCallback(async (messageId: string, emoji: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      // Get current message
      const { data: message } = await supabase
        .from('chat_messages')
        .select('reactions')
        .eq('id', messageId)
        .single();

      if (!message) return false;

      const reactions = message.reactions || {};
      const emojiReactions = reactions[emoji] || [];
      
      // Add user to emoji reactions if not already there
      if (!emojiReactions.includes(user.id)) {
        emojiReactions.push(user.id);
        reactions[emoji] = emojiReactions;

        const { error } = await supabase
          .from('chat_messages')
          .update({ reactions })
          .eq('id', messageId);

        if (error) throw error;
      }

      return true;
    } catch (err) {
      console.error('Error adding reaction:', err);
      setError(err instanceof Error ? err.message : 'Error adding reaction');
      return false;
    }
  }, [user?.id]);

  // Remove reaction
  const removeReaction = useCallback(async (messageId: string, emoji: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      // Get current message
      const { data: message } = await supabase
        .from('chat_messages')
        .select('reactions')
        .eq('id', messageId)
        .single();

      if (!message) return false;

      const reactions = message.reactions || {};
      const emojiReactions = reactions[emoji] || [];
      
      // Remove user from emoji reactions
      const filteredReactions = emojiReactions.filter((id: string) => id !== user.id);
      
      if (filteredReactions.length === 0) {
        delete reactions[emoji];
      } else {
        reactions[emoji] = filteredReactions;
      }

      const { error } = await supabase
        .from('chat_messages')
        .update({ reactions })
        .eq('id', messageId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error removing reaction:', err);
      setError(err instanceof Error ? err.message : 'Error removing reaction');
      return false;
    }
  }, [user?.id]);

  // Mark messages as read
  const markAsRead = useCallback(async () => {
    if (!user?.id || !conversationId || messages.length === 0) return;

    try {
      await supabase
        .from('chat_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  }, [user?.id, conversationId, messages]);

  // Typing indicator
  const setIsTyping = useCallback(async (typing: boolean) => {
    if (!user?.id || !conversationId) return;

    // Simplified typing indicator for now
    if (typing) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 3000);
    }
  }, [user?.id, conversationId]);

  // Utility functions
  const scrollToMessage = useCallback((messageId: string) => {
    const element = document.getElementById(`message-${messageId}`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const getMessageById = useCallback((messageId: string) => {
    return messages.find(msg => msg.id === messageId);
  }, [messages]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user?.id || !conversationId) return;

    // Subscribe to new messages
    const messageChannel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        () => {
          loadNewerMessages();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          setMessages(prev => prev.map(msg => 
            msg.id === payload.new.id 
              ? { ...msg, ...payload.new }
              : msg
          ));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [user?.id, conversationId, loadNewerMessages]);

  // Initial load
  useEffect(() => {
    if (conversationId) {
      setLoading(true);
      fetchMessages().finally(() => setLoading(false));
    }
  }, [conversationId, fetchMessages]);

  // Auto-scroll to bottom for new messages
  useEffect(() => {
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      if (latestMessage?.is_own_message) {
        // Auto-scroll for own messages
        setTimeout(() => {
          const element = document.getElementById(`message-${latestMessage.id}`);
          element?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [messages]);

  return {
    messages,
    loading,
    error,
    hasMore,
    sendMessage,
    sendVoiceMessage,
    sendFileMessage,
    replyToMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    loadMore,
    loadNewerMessages,
    markAsRead,
    scrollToMessage,
    getMessageById,
    typingUsers,
    setIsTyping
  };
};