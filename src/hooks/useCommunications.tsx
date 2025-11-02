import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  order_id: string;
  parent_message_id?: string;
  user_id: string;
  message_type: 'text' | 'voice' | 'file' | 'system_update';
  content?: string;
  voice_file_path?: string;
  voice_duration_ms?: number;
  voice_transcription?: string;
  attachments: any[];
  mentions: string[];
  reactions: Record<string, string[]>;
  is_edited: boolean;
  edited_at?: string;
  reply_count: number;
  is_internal: boolean;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_avatar?: string;
  replies?: Message[];
}

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export function useCommunications(orderId: string) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [mentionUsers, setMentionUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Load messages with pagination
  const loadMessages = useCallback(async (offset = 0, limit = 50) => {
    try {
      setLoading(true);
      
      // Get messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('order_communications')
        .select('*')
        .eq('order_id', orderId)
        .is('parent_message_id', null) // Only root messages first
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (messagesError) throw messagesError;

      // Get user profiles for messages
      const userIds = [...new Set(messagesData?.map(m => m.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds);

      const profileMap = profiles?.reduce((acc: any, profile) => {
        acc[profile.id] = {
          name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown User',
          email: profile.email
        };
        return acc;
      }, {}) || {};

      // Format messages with user info
      const formattedMessages: Message[] = messagesData?.map(message => ({
        ...message,
        message_type: message.message_type as 'text' | 'voice' | 'file' | 'system_update',
        attachments: Array.isArray(message.attachments) ? 
          (message.attachments as any[]).filter(Boolean) : [],
        mentions: Array.isArray(message.mentions) ? 
          (message.mentions as any[]).filter(Boolean).map(String) : [],
        reactions: typeof message.reactions === 'object' && message.reactions !== null ? 
          message.reactions as Record<string, string[]> : {},
        user_name: profileMap[message.user_id]?.name,
        user_email: profileMap[message.user_id]?.email
      })) || [];

      // Load replies for each message
      for (const message of formattedMessages) {
        if (message.reply_count > 0) {
          const { data: replies } = await supabase
            .from('order_communications')
            .select('*')
            .eq('parent_message_id', message.id)
            .order('created_at', { ascending: true });

          message.replies = replies?.map(reply => ({
            ...reply,
            message_type: reply.message_type as 'text' | 'voice' | 'file' | 'system_update',
            attachments: Array.isArray(reply.attachments) ? 
              (reply.attachments as any[]).filter(Boolean) : [],
            mentions: Array.isArray(reply.mentions) ? 
              (reply.mentions as any[]).filter(Boolean).map(String) : [],
            reactions: typeof reply.reactions === 'object' && reply.reactions !== null ? 
              reply.reactions as Record<string, string[]> : {},
            user_name: profileMap[reply.user_id]?.name,
            user_email: profileMap[reply.user_id]?.email
          })) || [];
        }
      }

      if (offset === 0) {
        setMessages(formattedMessages.reverse()); // Reverse to show newest at bottom
      } else {
        setMessages(prev => [...formattedMessages.reverse(), ...prev]);
      }

      setHasMore(formattedMessages.length === limit);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({ variant: 'destructive', description: t('communication.error_loading_messages') });
    } finally {
      setLoading(false);
    }
  }, [orderId, t]);

  // Load mention users (dealership members)
  const loadMentionUsers = useCallback(async () => {
    try {
      // Get current user's dealer ID first
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      setCurrentUserId(userData.user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('dealership_id')
        .eq('id', userData.user.id)
        .single();

      if (!profile?.dealership_id) return;

      // Get all dealer members
      const { data: members } = await supabase
        .from('dealer_memberships')
        .select(`
          user_id,
          profiles!inner(
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('dealer_id', profile.dealership_id)
        .eq('is_active', true);

      const users: User[] = members?.map(member => ({
        id: member.profiles.id,
        name: `${member.profiles.first_name || ''} ${member.profiles.last_name || ''}`.trim(),
        email: member.profiles.email
      })) || [];

      setMentionUsers(users);
    } catch (error) {
      console.error('Error loading mention users:', error);
    }
  }, []);

  // Send text message
  const sendMessage = useCallback(async (
    content: string, 
    type: 'public' | 'internal', 
    mentions: string[], 
    attachments: File[]
  ) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      // Upload attachments first
      const uploadedAttachments = [];
      for (const file of attachments) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `communications/${orderId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('order-attachments')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        uploadedAttachments.push({
          name: file.name,
          path: filePath,
          size: file.size,
          type: file.type
        });
      }

      const { error } = await supabase
        .from('order_communications')
        .insert({
          order_id: orderId,
          user_id: userData.user.id,
          message_type: 'text',
          content: content,
          mentions: mentions,
          attachments: uploadedAttachments,
          is_internal: type === 'internal'
        });

      if (error) throw error;

      // Reload messages
      await loadMessages();
      
      toast({ description: t('communication.message_sent') });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({ variant: 'destructive', description: t('communication.error_sending_message') });
    }
  }, [orderId, loadMessages, t]);

  // Send voice message
  const sendVoiceMessage = useCallback(async (audioBlob: Blob, duration: number) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      // Upload audio file
      const fileName = `voice-${Date.now()}.webm`;
      const filePath = `communications/${orderId}/voice/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('order-attachments')
        .upload(filePath, audioBlob);

      if (uploadError) throw uploadError;

      const { error } = await supabase
        .from('order_communications')
        .insert({
          order_id: orderId,
          user_id: userData.user.id,
          message_type: 'voice',
          voice_file_path: filePath,
          voice_duration_ms: duration * 1000
        });

      if (error) throw error;

      await loadMessages();
      toast({ description: t('communication.voice_message_sent') });
    } catch (error) {
      console.error('Error sending voice message:', error);
      toast({ variant: 'destructive', description: t('communication.error_sending_voice') });
    }
  }, [orderId, loadMessages, t]);

  // Reply to message
  const replyToMessage = useCallback(async (parentMessageId: string, content: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('order_communications')
        .insert({
          order_id: orderId,
          parent_message_id: parentMessageId,
          user_id: userData.user.id,
          message_type: 'text',
          content: content
        });

      if (error) throw error;

      await loadMessages();
      toast({ description: t('communication.reply_sent') });
    } catch (error) {
      console.error('Error sending reply:', error);
      toast({ variant: 'destructive', description: t('communication.error_sending_reply') });
    }
  }, [orderId, loadMessages, t]);

  // Add reaction
  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('User not authenticated');

      // Get current message
      const { data: message } = await supabase
        .from('order_communications')
        .select('reactions')
        .eq('id', messageId)
        .single();

      if (!message) return;

      const reactions = message.reactions || {};
      const emojiReactions = reactions[emoji] || [];
      
      // Toggle user's reaction
      const userIndex = emojiReactions.indexOf(userData.user.id);
      if (userIndex > -1) {
        emojiReactions.splice(userIndex, 1);
      } else {
        emojiReactions.push(userData.user.id);
      }

      // Update reactions
      if (emojiReactions.length === 0) {
        delete reactions[emoji];
      } else {
        reactions[emoji] = emojiReactions;
      }

      const { error } = await supabase
        .from('order_communications')
        .update({ reactions })
        .eq('id', messageId);

      if (error) throw error;

      // Update local state immediately for better UX
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          return { ...msg, reactions: reactions as Record<string, string[]> };
        }
        if (msg.replies) {
          return {
            ...msg,
            replies: msg.replies.map(reply =>
              reply.id === messageId ? { ...reply, reactions: reactions as Record<string, string[]> } : reply
            )
          };
        }
        return msg;
      }));

    } catch (error) {
      console.error('Error adding reaction:', error);
      toast({ variant: 'destructive', description: t('communication.error_adding_reaction') });
    }
  }, [t]);

  // Load more messages
  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      loadMessages(messages.length);
    }
  }, [messages.length, hasMore, loading, loadMessages]);

  // Set up real-time subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('order_communications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_communications',
          filter: `order_id=eq.${orderId}`
        },
        () => {
          // Reload messages when changes occur
          loadMessages(0);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, loadMessages]);

  // Initial load
  useEffect(() => {
    loadMessages();
    loadMentionUsers();
  }, [loadMessages, loadMentionUsers]);

  return {
    messages,
    loading,
    hasMore,
    mentionUsers,
    currentUserId,
    sendMessage,
    sendVoiceMessage,
    replyToMessage,
    addReaction,
    loadMore
  };
}