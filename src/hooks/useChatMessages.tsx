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
    email?: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    avatar_seed?: string;
  };
  replies?: ChatMessage[];
  is_own_message?: boolean;
  is_mentioned?: boolean;
}

export interface UseChatMessagesReturn {
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
  getUserName: (userId: string) => string;

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
  const userProfilesCache = useRef<Record<string, {
    name: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    avatar_seed?: string;
  }>>({});
  const PAGE_SIZE = 50;

  // Fetch user profiles and cache them
  const fetchAndCacheProfiles = useCallback(async (userIds: string[]) => {
    const uncachedIds = userIds.filter(id => !userProfilesCache.current[id]);

    if (uncachedIds.length === 0) return;

    try {
      // Use RPC to bypass RLS caching issue
      const { data: allProfiles } = await supabase.rpc('get_dealer_user_profiles');
      const profiles = allProfiles?.filter(p => uncachedIds.includes(p.id));

      if (profiles) {
        profiles.forEach(profile => {
          userProfilesCache.current[profile.id] = {
            name: profile.first_name && profile.last_name
              ? `${profile.first_name} ${profile.last_name}`
              : profile.email,
            email: profile.email,
            first_name: profile.first_name,
            last_name: profile.last_name,
            avatar_url: profile.avatar_url,
            avatar_seed: profile.avatar_seed
          };
        });
      }
    } catch (err) {
      console.error('Error fetching user profiles:', err);
    }
  }, []);

  // Get user name from cache
  const getUserName = useCallback((userId: string): string => {
    const cachedName = userProfilesCache.current[userId]?.name;
    if (cachedName) {
      return cachedName;
    }

    // If not in cache, trigger a fetch (async) and return placeholder
    console.log(`⚠️ [CACHE] User ${userId} not in cache, fetching...`);
    fetchAndCacheProfiles([userId]).then(() => {
      // Force re-render after cache update
      setMessages(prev => [...prev]);
    });

    return 'Loading...';
  }, [fetchAndCacheProfiles]);

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

      // Get real sender information and cache profiles
      const userIds = [...new Set(data?.map(msg => msg.user_id) || [])];

      // Fetch and cache user profiles
      await fetchAndCacheProfiles(userIds);

      // Also cache user IDs from reactions
      const reactionUserIds = new Set<string>();
      data?.forEach(msg => {
        const reactions = (msg.reactions as Record<string, string[]>) || {};
        Object.values(reactions).forEach(userIdArray => {
          userIdArray.forEach(id => reactionUserIds.add(id));
        });
      });
      if (reactionUserIds.size > 0) {
        await fetchAndCacheProfiles([...reactionUserIds]);
      }

      let senderProfiles: Record<string, any> = {};

      if (userIds.length > 0) {
        senderProfiles = userIds.reduce((acc, userId) => {
          acc[userId] = userProfilesCache.current[userId] || {
            id: userId,
            name: 'Unknown User',
            email: undefined,
            first_name: undefined,
            last_name: undefined,
            avatar_url: undefined,
            avatar_seed: undefined
          };
          return acc;
        }, {} as Record<string, any>);
      }

      // Process messages with real sender info
      const processedMessages: ChatMessage[] = data?.map(msg => ({
        ...msg,
        reactions: (msg.reactions as Record<string, string[]>) || {},
        mentions: (msg.mentions as string[]) || [],
        metadata: (msg.metadata as Record<string, any>) || {},
        sender: senderProfiles[msg.user_id] || {
          id: msg.user_id,
          name: 'Unknown User',
          email: undefined,
          first_name: undefined,
          last_name: undefined,
          avatar_url: undefined,
          avatar_seed: undefined
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
        // Get sender profiles for new messages
        const userIds = [...new Set(data.map(msg => msg.user_id))];
        let senderProfiles: Record<string, any> = {};

        if (userIds.length > 0) {
          // Use RPC to bypass RLS caching issue
          const { data: allProfiles } = await supabase.rpc('get_dealer_user_profiles');
          const profiles = allProfiles?.filter(p => userIds.includes(p.id));

          if (profiles) {
            senderProfiles = profiles.reduce((acc, profile) => {
              acc[profile.id] = {
                id: profile.id,
                name: profile.first_name && profile.last_name
                  ? `${profile.first_name} ${profile.last_name}`
                  : profile.email,
                email: profile.email,
                first_name: profile.first_name,
                last_name: profile.last_name,
                avatar_url: profile.avatar_url,
                avatar_seed: profile.avatar_seed
              };
              return acc;
            }, {} as Record<string, any>);
          }
        }

        const processedMessages: ChatMessage[] = data.map(msg => ({
          ...msg,
          reactions: (msg.reactions as Record<string, string[]>) || {},
          mentions: (msg.mentions as string[]) || [],
          metadata: (msg.metadata as Record<string, any>) || {},
          sender: senderProfiles[msg.user_id] || {
            id: msg.user_id,
            name: 'Unknown User',
            email: undefined,
            first_name: undefined,
            last_name: undefined,
            avatar_url: undefined,
            avatar_seed: undefined
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

  // Generic send message function
  const sendMessageWithOptions = useCallback(async (options: SendMessageOptions): Promise<ChatMessage | null> => {
    console.log('📤 [MESSAGES] Sending message with options:', options);

    if (!user?.id || !conversationId) {
      console.error('❌ [MESSAGES] Missing user or conversation');
      return null;
    }

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

      if (error) {
        console.error('❌ [MESSAGES] Error inserting message:', error);
        throw error;
      }

      console.log('✅ [MESSAGES] Message inserted to DB:', data.id);

      const newMessage: ChatMessage = {
        ...data,
        reactions: (data.reactions as Record<string, string[]>) || {},
        mentions: (data.mentions as string[]) || [],
        metadata: (data.metadata as Record<string, any>) || {},
        sender: {
          id: data.user_id,
          name: getUserName(user.id) || 'You',
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          avatar_url: user.avatar_url,
          avatar_seed: user.avatar_seed
        },
        is_own_message: true,
        is_mentioned: false
      };

      console.log('⚡ [MESSAGES] Adding message optimistically to state...');

      // Optimistic update - add to state immediately
      setMessages(prev => {
        // Check if message already exists (avoid duplicates)
        if (prev.some(msg => msg.id === data.id)) {
          console.log('ℹ️ [MESSAGES] Message already in state, skipping');
          return prev;
        }
        console.log('✅ [MESSAGES] Message added to state optimistically');
        return [...prev, newMessage];
      });

      return newMessage;
    } catch (err) {
      console.error('❌ [MESSAGES] Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Error sending message');
      return null;
    }
  }, [user?.id, conversationId, getUserName]);

  // Send text message
  const sendMessage = useCallback(async (content: string, mentions: string[] = []): Promise<ChatMessage | null> => {
    console.log('📤 [MESSAGES] Sending message:', { content, mentions, conversationId });
    const result = await sendMessageWithOptions({
      content,
      mentions,
      message_type: 'text'
    });
    console.log('📤 [MESSAGES] Send result:', result ? 'success' : 'failed');
    return result;
  }, [sendMessageWithOptions, conversationId]);

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
  }, [sendMessageWithOptions]);

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
  }, [sendMessageWithOptions]);

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
    console.log('👍 [REACTIONS] Adding reaction:', { messageId, emoji, userId: user?.id });

    if (!user?.id) {
      console.error('❌ [REACTIONS] No user ID available');
      return false;
    }

    // Optimistic update - update UI immediately
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        const reactions = { ...msg.reactions };
        const emojiReactions = reactions[emoji] || [];

        if (!emojiReactions.includes(user.id)) {
          reactions[emoji] = [...emojiReactions, user.id];
          console.log('⚡ [REACTIONS] Optimistic update applied:', reactions);
          return { ...msg, reactions };
        }
      }
      return msg;
    }));

    try {
      // Get current message from DB
      const { data: message, error: fetchError } = await supabase
        .from('chat_messages')
        .select('reactions')
        .eq('id', messageId)
        .single();

      if (fetchError) {
        console.error('❌ [REACTIONS] Error fetching message:', fetchError);
        // Revert optimistic update
        setMessages(prev => prev.map(msg => {
          if (msg.id === messageId) {
            const reactions = { ...msg.reactions };
            const emojiReactions = reactions[emoji] || [];
            reactions[emoji] = emojiReactions.filter(id => id !== user.id);
            if (reactions[emoji].length === 0) delete reactions[emoji];
            return { ...msg, reactions };
          }
          return msg;
        }));
        throw fetchError;
      }

      if (!message) {
        console.error('❌ [REACTIONS] Message not found');
        return false;
      }

      console.log('📊 [REACTIONS] Current reactions in DB:', message.reactions);

      const reactions = (message.reactions as Record<string, string[]>) || {};
      const emojiReactions = reactions[emoji] || [];

      // Add user to emoji reactions if not already there
      if (!emojiReactions.includes(user.id)) {
        emojiReactions.push(user.id);
        reactions[emoji] = emojiReactions;

        console.log('💾 [REACTIONS] Updating DB with new reactions:', reactions);

        const { error: updateError } = await supabase
          .from('chat_messages')
          .update({ reactions })
          .eq('id', messageId);

        if (updateError) {
          console.error('❌ [REACTIONS] Error updating DB:', updateError);
          // Revert optimistic update on error
          setMessages(prev => prev.map(msg => {
            if (msg.id === messageId) {
              const reactions = { ...msg.reactions };
              const emojiReactions = reactions[emoji] || [];
              reactions[emoji] = emojiReactions.filter(id => id !== user.id);
              if (reactions[emoji].length === 0) delete reactions[emoji];
              return { ...msg, reactions };
            }
            return msg;
          }));
          throw updateError;
        }

        console.log('✅ [REACTIONS] Reaction added successfully to DB');
        return true;
      } else {
        console.log('ℹ️ [REACTIONS] User already reacted with this emoji');
        return true;
      }
    } catch (err) {
      console.error('❌ [REACTIONS] Error adding reaction:', err);
      setError(err instanceof Error ? err.message : 'Error adding reaction');
      return false;
    }
  }, [user?.id]);

  // Remove reaction
  const removeReaction = useCallback(async (messageId: string, emoji: string): Promise<boolean> => {
    console.log('👎 [REACTIONS] Removing reaction:', { messageId, emoji, userId: user?.id });

    if (!user?.id) {
      console.error('❌ [REACTIONS] No user ID available');
      return false;
    }

    // Optimistic update - update UI immediately
    const previousReactions = messages.find(m => m.id === messageId)?.reactions;
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        const reactions = { ...msg.reactions };
        const emojiReactions = reactions[emoji] || [];
        const filteredReactions = emojiReactions.filter(id => id !== user.id);

        if (filteredReactions.length === 0) {
          delete reactions[emoji];
        } else {
          reactions[emoji] = filteredReactions;
        }

        console.log('⚡ [REACTIONS] Optimistic remove applied:', reactions);
        return { ...msg, reactions };
      }
      return msg;
    }));

    try {
      // Get current message from DB
      const { data: message, error: fetchError } = await supabase
        .from('chat_messages')
        .select('reactions')
        .eq('id', messageId)
        .single();

      if (fetchError) {
        console.error('❌ [REACTIONS] Error fetching message:', fetchError);
        // Revert optimistic update
        if (previousReactions) {
          setMessages(prev => prev.map(msg =>
            msg.id === messageId ? { ...msg, reactions: previousReactions } : msg
          ));
        }
        throw fetchError;
      }

      if (!message) {
        console.error('❌ [REACTIONS] Message not found');
        return false;
      }

      console.log('📊 [REACTIONS] Current reactions in DB before remove:', message.reactions);

      const reactions = (message.reactions as Record<string, string[]>) || {};
      const emojiReactions = reactions[emoji] || [];

      // Remove user from emoji reactions
      const filteredReactions = emojiReactions.filter((id: string) => id !== user.id);

      if (filteredReactions.length === 0) {
        delete reactions[emoji];
      } else {
        reactions[emoji] = filteredReactions;
      }

      console.log('💾 [REACTIONS] Updating DB after remove:', reactions);

      const { error: updateError } = await supabase
        .from('chat_messages')
        .update({ reactions })
        .eq('id', messageId);

      if (updateError) {
        console.error('❌ [REACTIONS] Error updating DB:', updateError);
        // Revert optimistic update on error
        if (previousReactions) {
          setMessages(prev => prev.map(msg =>
            msg.id === messageId ? { ...msg, reactions: previousReactions } : msg
          ));
        }
        throw updateError;
      }

      console.log('✅ [REACTIONS] Reaction removed successfully from DB');
      return true;
    } catch (err) {
      console.error('❌ [REACTIONS] Error removing reaction:', err);
      setError(err instanceof Error ? err.message : 'Error removing reaction');
      return false;
    }
  }, [user?.id, messages]);

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
    if (!user?.id || !conversationId) {
      console.log('📡 [MESSAGES] Skipping subscription - missing user or conversation');
      return;
    }

    console.log(`📡 [MESSAGES] Setting up real-time subscription for conversation: ${conversationId}`);

    // Track if component is still mounted to avoid memory leaks
    let isMounted = true;
    const channelName = `messages:${conversationId}:${Date.now()}`;

    // Subscribe to new messages
    const messageChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          if (!isMounted) {
            console.log('📡 [MESSAGES] Component unmounted, ignoring real-time update');
            return;
          }

          console.log('📨 [MESSAGES] New message INSERT detected:', payload);

          // FIX: Check if message is from current user's optimistic update
          const isOwnMessage = payload.new.user_id === user.id;

          setMessages(prev => {
            // Skip if message already exists (from optimistic update)
            if (prev.some(msg => msg.id === payload.new.id)) {
              console.log('ℹ️ [MESSAGES] Message already in state (optimistic), skipping real-time update');
              return prev;
            }

            // If it's our own message, it should already be there via optimistic update
            // This is an extra safety check
            if (isOwnMessage) {
              console.log('⚠️ [MESSAGES] Own message not in state yet, adding now');
            }

            return prev;
          });

          // Only fetch details for messages from other users
          if (!isOwnMessage) {
            try {
              const { data: newMessageData } = await supabase
                .from('chat_messages')
                .select('*')
                .eq('id', payload.new.id)
                .single();

              if (!isMounted || !newMessageData) return;

              // Fetch and cache sender profile
              await fetchAndCacheProfiles([newMessageData.user_id]);

              if (!isMounted) return;

              const processedMessage: ChatMessage = {
                ...newMessageData,
                reactions: (newMessageData.reactions as Record<string, string[]>) || {},
                mentions: (newMessageData.mentions as string[]) || [],
                metadata: (newMessageData.metadata as Record<string, any>) || {},
                sender: userProfilesCache.current[newMessageData.user_id] || {
                  id: newMessageData.user_id,
                  name: getUserName(newMessageData.user_id),
                  email: undefined,
                  first_name: undefined,
                  last_name: undefined,
                  avatar_url: undefined,
                  avatar_seed: undefined
                },
                is_own_message: false,
                is_mentioned: ((newMessageData.mentions as string[]) || []).includes(user.id)
              };

              console.log('📨 [MESSAGES] Adding new message to state from real-time:', processedMessage);

              setMessages(prev => {
                // Final duplicate check
                if (prev.some(msg => msg.id === processedMessage.id)) {
                  console.log('ℹ️ [MESSAGES] Duplicate detected in final check, skipping');
                  return prev;
                }
                return [...prev, processedMessage];
              });
            } catch (error) {
              console.error('❌ [MESSAGES] Error processing new message:', error);
            }
          }
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
          if (!isMounted) return;

          console.log('✏️ [MESSAGES] Message UPDATE detected:', payload);
          setMessages(prev => prev.map(msg => {
            if (msg.id === payload.new.id) {
              // Process the updated data properly
              return {
                ...msg,
                ...payload.new,
                reactions: (payload.new.reactions as Record<string, string[]>) || {},
                mentions: (payload.new.mentions as string[]) || [],
                metadata: (payload.new.metadata as Record<string, any>) || {},
                is_mentioned: ((payload.new.mentions as string[]) || []).includes(user?.id || '') || false
              };
            }
            return msg;
          }));
        }
      )
      .subscribe((status) => {
        if (!isMounted) return;

        console.log(`📡 [MESSAGES] Subscription status:`, status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ [MESSAGES] Successfully subscribed to real-time updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ [MESSAGES] Subscription error');
        }
      });

    // Cleanup function
    return () => {
      console.log(`📡 [MESSAGES] Cleaning up subscription for: ${conversationId}`);
      isMounted = false;

      // Properly unsubscribe and remove channel
      messageChannel.unsubscribe().then(() => {
        supabase.removeChannel(messageChannel);
      });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, [user?.id, conversationId, getUserName, fetchAndCacheProfiles]);

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
    getUserName,
    typingUsers,
    setIsTyping
  };
};
